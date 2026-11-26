import { ColumnModel } from '../columns/column-model';
import { GRID_STATE_FORMAT_VERSION } from '../format';
import { GridError } from '../errors';
import { assertExactKeys, assertKnownKeys, isRecord } from '../guards';
import { assertJsonValue } from '../json-value';
import { assertRowId, assertRowObject } from '../rows/row-id';
import { RowModel } from '../rows/row-model';
import { parseStoredFilterModel } from '../filter/filter-model';
import { nodesInIdOrder } from '../sort/order-rows';
import { assertPageInRange, parseStoredPagination } from '../pagination/page-model';
import { parseStoredSortModel } from '../sort/sort-model';
import { assertSelectionFits } from '../selection/selection';
import {
  parseConfiguration,
  parseDisplayedRowIds,
  parseExactFocus,
  parseExactSelection,
  parseGridStateInput,
  stateFromPlans,
} from '../state/grid-state';
import type { GetRowId, GridState, RowData, RowNode } from '../types';

/** Optional identity function used while restoring a snapshot. */
export interface RestoreGridStateOptions<TData extends RowData> {
  /**
   * Required when row ids were produced by `getRowId` and would not match each row's `id` field.
   * Use the same function that created the grid.
   */
  readonly getRowId?: GetRowId<TData>;
}

/**
 * Writes a versioned JSON snapshot.
 * Functions, class instances, and circular references are rejected.
 * `getRowId` and host context are not part of grid state, so they are not written.
 */
export function serializeGridState<TData extends RowData>(state: GridState<TData>): string {
  assertStructuralState(state);
  assertJsonValue(state, 'state', new WeakSet());
  return JSON.stringify({
    version: GRID_STATE_FORMAT_VERSION,
    state,
  });
}

/**
 * Reads a version 1 snapshot and checks that rows, columns, selection, and focus agree.
 * Pass `getRowId` when the saved ids came from that function.
 */
export function restoreGridState<TData extends RowData>(
  serialized: string,
  options?: RestoreGridStateOptions<TData>,
): GridState<TData> {
  if (typeof serialized !== 'string') {
    throw new GridError('invalid-serialization', 'Serialized grid state must be a string.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new GridError('invalid-serialization', 'Grid state JSON could not be parsed.');
  }
  if (!isRecord(parsed)) {
    throw new GridError('invalid-serialization', 'Serialized grid state must be an object.');
  }
  assertExactKeys(parsed, ['version', 'state'], 'Serialized grid state', 'invalid-serialization');
  if (parsed.version !== GRID_STATE_FORMAT_VERSION) {
    throw new GridError(
      'invalid-serialization',
      `Unsupported grid state version ${describeVersion(parsed.version)}.`,
    );
  }
  const input = parseGridStateInput(parsed.state);
  const configuration = parseConfiguration(input.configuration);
  const rows = new RowModel<TData>(readGetRowId(options));
  const rowPlan = rows.planExplicit(input.rowData, input.rowIds);
  const columns = new ColumnModel<TData>();
  const records = columns.planColumnModel(input.columnDefs, input.columnState);
  const sortModel = parseStoredSortModel(input.sortModel, records);
  const filterModel = parseStoredFilterModel(input.filterModel, records);
  const displayed = displayedNodes(rowPlan.nodes, input.displayedRowIds);
  const selectedRowIds = parseExactSelection(input.selectedRowIds, rowPlan.nodes);
  assertSelectionFits(selectedRowIds, configuration.selectionMode);
  const pagination = parseStoredPagination(input.pagination);
  assertPageInRange(pagination.page, displayed.length, pagination);
  return stateFromPlans(
    rowPlan,
    displayed,
    records,
    selectedRowIds,
    parseExactFocus(input.focusedCell, displayed, records),
    sortModel,
    filterModel,
    configuration.caseSensitive,
    configuration.filterCaseSensitive,
    pagination,
    configuration.selectionMode,
  );
}

function assertStructuralState<TData extends RowData>(state: GridState<TData>): void {
  const input = parseGridStateInput(state);
  const configuration = parseConfiguration(input.configuration);
  const columns = new ColumnModel<TData>();
  const records = columns.planColumnModel(input.columnDefs, input.columnState);
  const nodes = structuralNodes<TData>(input.rowData, input.rowIds);
  parseStoredSortModel(input.sortModel, records);
  parseStoredFilterModel(input.filterModel, records);
  const displayed = displayedNodes(nodes, input.displayedRowIds);
  const selectedRowIds = parseExactSelection(input.selectedRowIds, nodes);
  assertSelectionFits(selectedRowIds, configuration.selectionMode);
  const pagination = parseStoredPagination(input.pagination);
  assertPageInRange(pagination.page, displayed.length, pagination);
  parseExactFocus(input.focusedCell, displayed, records);
}

function displayedNodes<TData extends RowData>(
  nodes: readonly RowNode<TData>[],
  displayedRowIds: unknown,
): readonly RowNode<TData>[] {
  return nodesInIdOrder(
    nodes,
    parseDisplayedRowIds(
      displayedRowIds,
      nodes.map((node) => node.id),
    ),
  );
}

function structuralNodes<TData extends RowData>(
  rowData: readonly unknown[],
  rowIds: readonly unknown[],
): readonly RowNode<TData>[] {
  if (rowData.length !== rowIds.length) {
    throw new GridError('invalid-row', 'Row data and row ids must have the same length.');
  }
  const seen = new Set<string>();
  const nodes: RowNode<TData>[] = [];
  for (let index = 0; index < rowData.length; index += 1) {
    const data = assertRowObject<TData>(rowData[index], `Row ${index}`);
    const id = assertRowId(rowIds[index], `Row ${index} id`);
    if (seen.has(id)) {
      throw new GridError('invalid-row', `Duplicate row id "${id}".`);
    }
    seen.add(id);
    nodes.push(Object.freeze({ id, data, rowIndex: index }));
  }
  return nodes;
}

function readGetRowId<TData extends RowData>(
  options: RestoreGridStateOptions<TData> | undefined,
): GetRowId<TData> | undefined {
  if (options === undefined) {
    return undefined;
  }
  if (!isRecord(options)) {
    throw new GridError('invalid-serialization', 'Restore options must be an object.');
  }
  assertKnownKeys(options, ['getRowId'], 'Restore options', 'invalid-serialization');
  if (!Object.hasOwn(options, 'getRowId')) {
    return undefined;
  }
  if (typeof options.getRowId !== 'function') {
    throw new GridError('invalid-serialization', 'getRowId must be a function.');
  }
  return options.getRowId as GetRowId<TData>;
}

function describeVersion(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return 'value';
}
