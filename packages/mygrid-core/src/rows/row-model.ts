import { GridError } from '../errors';
import { assertExactKeys, assertKnownKeys, isRecord } from '../guards';
import type {
  GetRowId,
  RowData,
  RowDataTransaction,
  RowDataTransactionResult,
  RowId,
  RowNode,
  RowUpdate,
} from '../types';
import { assertRowId, assertRowObject, bumpGeneratedCounter, readOwnRowId } from './row-id';

interface PlannedItem<TData extends RowData> {
  readonly id: RowId;
  readonly data: TData;
  readonly previous: RowNode<TData> | undefined;
}

/** Next row list, plus identity bookkeeping applied only if the plan is committed. */
export interface RowPlan<TData extends RowData> {
  readonly nodes: readonly RowNode<TData>[];
  readonly pendingObjectIds: readonly (readonly [TData, RowId])[];
  readonly nextGenerated: number;
}

export interface PlannedTransaction<TData extends RowData> {
  readonly plan: RowPlan<TData>;
  readonly result: RowDataTransactionResult<TData>;
}

/**
 * In-memory rows.
 * Identity comes from `getRowId`, then an own `id` field, then a generated id
 * remembered for that object. Generated ids are not reused after deletion.
 */
export class RowModel<TData extends RowData> {
  private nodes: readonly RowNode<TData>[] = [];
  private byId = new Map<RowId, RowNode<TData>>();
  private readonly objectIds = new WeakMap<object, RowId>();
  private nextGenerated = 1;

  constructor(private readonly getRowId?: GetRowId<TData>) {}

  getNodes(): readonly RowNode<TData>[] {
    return this.nodes;
  }

  getNode(id: RowId): RowNode<TData> | undefined {
    return this.byId.get(id);
  }

  getNodeAt(index: number): RowNode<TData> | undefined {
    if (!Number.isInteger(index) || index < 0) {
      return undefined;
    }
    return this.nodes[index];
  }

  /** A plan that republishes the current nodes without changing identity. */
  snapshotPlan(): RowPlan<TData> {
    return {
      nodes: this.nodes,
      pendingObjectIds: [],
      nextGenerated: this.nextGenerated,
    };
  }

  commit(plan: RowPlan<TData>): void {
    this.nodes = plan.nodes;
    this.byId = new Map(plan.nodes.map((node) => [node.id, node]));
    for (const [data, id] of plan.pendingObjectIds) {
      this.objectIds.set(data, id);
    }
    this.nextGenerated = plan.nextGenerated;
  }

  planSetData(rowData: readonly unknown[]): RowPlan<TData> {
    if (!Array.isArray(rowData)) {
      throw new GridError('invalid-row', 'Row data must be an array.');
    }
    const planner = new IdPlanner(this.getRowId, this.objectIds, this.nextGenerated);
    const seen = new Set<RowId>();
    const items: PlannedItem<TData>[] = [];
    for (let index = 0; index < rowData.length; index += 1) {
      const data = assertRowObject<TData>(rowData[index], `Row ${index}`);
      const id = planner.preview(data, index, seen);
      if (seen.has(id)) {
        throw new GridError('invalid-row', `Duplicate row id "${id}".`);
      }
      seen.add(id);
      items.push({ id, data, previous: this.byId.get(id) });
    }
    return finishPlan(items, planner);
  }

  planExplicit(rowData: readonly unknown[], rowIds: readonly unknown[]): RowPlan<TData> {
    if (!Array.isArray(rowData)) {
      throw new GridError('invalid-row', 'Row data must be an array.');
    }
    if (!Array.isArray(rowIds)) {
      throw new GridError('invalid-row', 'Row ids must be an array.');
    }
    if (rowData.length !== rowIds.length) {
      throw new GridError('invalid-row', 'Row data and row ids must have the same length.');
    }
    const planner = new IdPlanner(this.getRowId, this.objectIds, this.nextGenerated);
    const seen = new Set<RowId>();
    const items: PlannedItem<TData>[] = [];
    for (let index = 0; index < rowData.length; index += 1) {
      const data = assertRowObject<TData>(rowData[index], `Row ${index}`);
      const id = assertRowId(rowIds[index], `Row ${index} id`);
      if (seen.has(id)) {
        throw new GridError('invalid-row', `Duplicate row id "${id}".`);
      }
      const natural = planner.naturalId(data, index);
      if (natural !== undefined && natural !== id) {
        throw new GridError(
          'invalid-row',
          `Row ${index} id "${id}" does not match its row identity "${natural}".`,
        );
      }
      if (natural === undefined) {
        planner.remember(data, id);
      }
      seen.add(id);
      items.push({ id, data, previous: this.byId.get(id) });
    }
    return finishPlan(items, planner);
  }

  planTransaction(transaction: RowDataTransaction<TData>): PlannedTransaction<TData> {
    const parsed = parseTransaction(transaction);
    const removeSet = new Set<RowId>();
    for (const id of parsed.remove) {
      if (removeSet.has(id)) {
        throw new GridError('invalid-row', `Duplicate remove id "${id}".`);
      }
      if (!this.byId.has(id)) {
        throw new GridError('invalid-row', `Cannot remove missing row "${id}".`);
      }
      removeSet.add(id);
    }

    const updateMap = new Map<RowId, TData>();
    for (const update of parsed.update) {
      if (removeSet.has(update.id)) {
        throw new GridError(
          'invalid-row',
          `Row "${update.id}" cannot be updated and removed together.`,
        );
      }
      if (updateMap.has(update.id)) {
        throw new GridError('invalid-row', `Duplicate update id "${update.id}".`);
      }
      if (!this.byId.has(update.id)) {
        throw new GridError('invalid-row', `Cannot update missing row "${update.id}".`);
      }
      updateMap.set(update.id, update.data);
    }

    const remaining: PlannedItem<TData>[] = [];
    for (const node of this.nodes) {
      if (removeSet.has(node.id)) {
        continue;
      }
      const replacement = updateMap.get(node.id);
      remaining.push({
        id: node.id,
        data: replacement ?? node.data,
        previous: node,
      });
    }

    const addIndex = parsed.addIndex ?? remaining.length;
    if (addIndex < 0 || addIndex > remaining.length) {
      throw new GridError(
        'invalid-row',
        `addIndex must be an integer from 0 to ${remaining.length}.`,
      );
    }

    const used = new Set(remaining.map((item) => item.id));
    const planner = new IdPlanner(this.getRowId, this.objectIds, this.nextGenerated);
    const added: PlannedItem<TData>[] = [];
    for (let offset = 0; offset < parsed.add.length; offset += 1) {
      const data = assertRowObject<TData>(parsed.add[offset], `Added row ${offset}`);
      const id = planner.preview(data, addIndex + offset, used);
      if (used.has(id)) {
        throw new GridError('invalid-row', `Duplicate row id "${id}".`);
      }
      used.add(id);
      added.push({ id, data, previous: undefined });
    }

    const finalItems = [...remaining.slice(0, addIndex), ...added, ...remaining.slice(addIndex)];
    for (let index = 0; index < finalItems.length; index += 1) {
      const item = finalItems[index];
      if (item === undefined || !updateMap.has(item.id)) {
        continue;
      }
      const natural = planner.naturalId(item.data, index);
      if (natural !== undefined && natural !== item.id) {
        throw new GridError(
          'invalid-row',
          `Updated row "${item.id}" does not match its row identity "${natural}".`,
        );
      }
      if (natural === undefined) {
        planner.remember(item.data, item.id);
      }
    }

    const plan = finishPlan(finalItems, planner);
    const addedIds = new Set(added.map((item) => item.id));
    return {
      plan,
      result: {
        added: Object.freeze(plan.nodes.filter((node) => addedIds.has(node.id))),
        updated: Object.freeze(plan.nodes.filter((node) => updateMap.has(node.id))),
        removed: Object.freeze(this.nodes.filter((node) => removeSet.has(node.id))),
      },
    };
  }
}

class IdPlanner<TData extends RowData> {
  private counter: number;
  private readonly pending = new Map<TData, RowId>();

  constructor(
    private readonly getRowId: GetRowId<TData> | undefined,
    private readonly objectIds: WeakMap<object, RowId>,
    counter: number,
  ) {
    this.counter = counter;
  }

  get currentCounter(): number {
    return this.counter;
  }

  pendingEntries(): readonly (readonly [TData, RowId])[] {
    return [...this.pending.entries()].map(([data, id]) => [data, id] as const);
  }

  naturalId(data: TData, rowIndex: number): RowId | undefined {
    if (this.getRowId) {
      return callGetRowId(this.getRowId, data, rowIndex);
    }
    return readOwnRowId(data);
  }

  preview(data: TData, rowIndex: number, used: ReadonlySet<RowId>): RowId {
    const natural = this.naturalId(data, rowIndex);
    if (natural !== undefined) {
      return natural;
    }
    const remembered = this.objectIds.get(data) ?? this.pending.get(data);
    if (remembered !== undefined) {
      return remembered;
    }
    const id = this.generate(used);
    this.pending.set(data, id);
    return id;
  }

  remember(data: TData, id: RowId): void {
    this.pending.set(data, id);
  }

  private generate(used: ReadonlySet<RowId>): RowId {
    let id = `row:${this.counter}`;
    this.counter += 1;
    while (used.has(id) || this.pendingHasId(id)) {
      id = `row:${this.counter}`;
      this.counter += 1;
    }
    return id;
  }

  private pendingHasId(id: RowId): boolean {
    for (const pendingId of this.pending.values()) {
      if (pendingId === id) {
        return true;
      }
    }
    return false;
  }
}

function callGetRowId<TData extends RowData>(
  getRowId: GetRowId<TData>,
  data: TData,
  rowIndex: number,
): RowId {
  const id: unknown = getRowId({ data, rowIndex });
  return assertRowId(id, 'getRowId');
}

function finishPlan<TData extends RowData>(
  items: readonly PlannedItem<TData>[],
  planner: IdPlanner<TData>,
): RowPlan<TData> {
  const nodes = Object.freeze(items.map((item, index) => reuseNode(item, index)));
  return {
    nodes,
    pendingObjectIds: planner.pendingEntries(),
    nextGenerated: bumpGeneratedCounter(
      planner.currentCounter,
      nodes.map((node) => node.id),
    ),
  };
}

function reuseNode<TData extends RowData>(
  item: PlannedItem<TData>,
  rowIndex: number,
): RowNode<TData> {
  const previous = item.previous;
  if (previous?.id === item.id && previous.data === item.data && previous.rowIndex === rowIndex) {
    return previous;
  }
  return Object.freeze({ id: item.id, data: item.data, rowIndex });
}

interface ParsedTransaction<TData extends RowData> {
  readonly add: readonly unknown[];
  readonly addIndex: number | undefined;
  readonly update: readonly RowUpdate<TData>[];
  readonly remove: readonly RowId[];
}

function parseTransaction<TData extends RowData>(
  transaction: RowDataTransaction<TData>,
): ParsedTransaction<TData> {
  if (!isRecord(transaction)) {
    throw new GridError('invalid-row', 'Row transaction must be an object.');
  }
  assertKnownKeys(
    transaction,
    ['add', 'addIndex', 'update', 'remove'],
    'Row transaction',
    'invalid-row',
  );
  const add = readUnknownArray(transaction, 'add', 'Transaction add');
  const update = readUpdates<TData>(transaction);
  const remove = readRemoveIds(transaction);
  let addIndex: number | undefined;
  if (Object.hasOwn(transaction, 'addIndex')) {
    const value = transaction.addIndex;
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new GridError('invalid-row', 'addIndex must be an integer.');
    }
    addIndex = value;
  }
  return { add, addIndex, update, remove };
}

function readUnknownArray(
  source: Record<string, unknown>,
  key: string,
  label: string,
): readonly unknown[] {
  if (!Object.hasOwn(source, key)) {
    return [];
  }
  const value = source[key];
  if (!Array.isArray(value)) {
    throw new GridError('invalid-row', `${label} must be an array.`);
  }
  return value;
}

function readRemoveIds(source: Record<string, unknown>): readonly RowId[] {
  return readUnknownArray(source, 'remove', 'Transaction remove').map((entry, index) =>
    assertRowId(entry, `Transaction remove ${index}`),
  );
}

function readUpdates<TData extends RowData>(
  source: Record<string, unknown>,
): readonly RowUpdate<TData>[] {
  const entries = readUnknownArray(source, 'update', 'Transaction update');
  return entries.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new GridError('invalid-row', `Transaction update ${index} must be an object.`);
    }
    assertExactKeys(entry, ['id', 'data'], `Transaction update ${index}`, 'invalid-row');
    const id = assertRowId(entry.id, `Transaction update ${index} id`);
    const data = assertRowObject<TData>(entry.data, `Transaction update ${index} data`);
    return { id, data };
  });
}
