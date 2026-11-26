import type { ColumnRecord } from '../columns/column-model';
import { GridError } from '../errors';
import { readOwnValue } from '../guards';
import type {
  ColumnId,
  RowData,
  RowId,
  RowNode,
  SortComparator,
  SortDirection,
  SortModelItem,
} from '../types';
import { compareValues } from './compare';

interface SortBinding<TData extends RowData> {
  readonly colId: ColumnId;
  readonly sort: SortDirection;
  readonly field: string | null;
  readonly comparator: SortComparator<TData> | null;
  readonly caseSensitive: boolean;
}

/**
 * Returns row nodes in displayed order.
 * The source array and its nodes are not modified.
 * Equal values keep their source order. The same node object is reused when its
 * displayed index still matches the node it already has.
 */
export function orderRows<TData extends RowData>(
  source: readonly RowNode<TData>[],
  model: readonly SortModelItem[],
  records: readonly ColumnRecord<TData>[],
  gridCaseSensitive: boolean,
  previousDisplay?: readonly RowNode<TData>[],
): readonly RowNode<TData>[] {
  if (model.length === 0 || source.length < 2) {
    return source;
  }
  const bindings = bindColumns(model, records, gridCaseSensitive);
  const values = readKeys(source, bindings);
  const indexes = source.map((_, index) => index);
  const width = bindings.length;
  indexes.sort((left, right) => compareRows(left, right, source, values, bindings, width));
  return projectRows(source, indexes, previousDisplay);
}

/** Places source nodes in an id order. Used when a snapshot already stores that order. */
export function nodesInIdOrder<TData extends RowData>(
  source: readonly RowNode<TData>[],
  ids: readonly RowId[],
): readonly RowNode<TData>[] {
  if (ids.length === source.length && ids.every((id, index) => source[index]?.id === id)) {
    return source;
  }
  const byId = new Map(source.map((node) => [node.id, node]));
  const ordered: RowNode<TData>[] = [];
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    const node = id === undefined ? undefined : byId.get(id);
    if (node === undefined) {
      throw new GridError('invalid-state', `Displayed row "${id ?? ''}" does not exist.`);
    }
    ordered.push(node.rowIndex === index ? node : Object.freeze({ ...node, rowIndex: index }));
  }
  return Object.freeze(ordered);
}

function bindColumns<TData extends RowData>(
  model: readonly SortModelItem[],
  records: readonly ColumnRecord<TData>[],
  gridCaseSensitive: boolean,
): readonly SortBinding<TData>[] {
  const byId = new Map(records.map((record) => [record.definition.colId, record]));
  return model.map((item) => {
    const record = byId.get(item.colId);
    if (record === undefined) {
      throw new GridError('invalid-column', `Unknown sort column "${item.colId}".`);
    }
    return {
      colId: item.colId,
      sort: item.sort,
      field: record.definition.field,
      comparator: record.comparator,
      caseSensitive: record.definition.caseSensitive ?? gridCaseSensitive,
    };
  });
}

function readKeys<TData extends RowData>(
  source: readonly RowNode<TData>[],
  bindings: readonly SortBinding<TData>[],
): readonly unknown[] {
  const values = new Array<unknown>(source.length * bindings.length);
  for (let row = 0; row < source.length; row += 1) {
    const node = source[row];
    if (node === undefined) {
      continue;
    }
    for (let column = 0; column < bindings.length; column += 1) {
      const binding = bindings[column];
      if (binding === undefined) {
        continue;
      }
      values[row * bindings.length + column] =
        binding.field === null ? undefined : readOwnValue(node.data, binding.field);
    }
  }
  return values;
}

function compareRows<TData extends RowData>(
  left: number,
  right: number,
  source: readonly RowNode<TData>[],
  values: readonly unknown[],
  bindings: readonly SortBinding<TData>[],
  width: number,
): number {
  for (let column = 0; column < width; column += 1) {
    const binding = bindings[column];
    const leftNode = source[left];
    const rightNode = source[right];
    if (binding === undefined || leftNode === undefined || rightNode === undefined) {
      throw new GridError('invalid-state', 'Sort produced an invalid row index.');
    }
    const compared = compareBinding(
      values[left * width + column],
      values[right * width + column],
      leftNode,
      rightNode,
      binding,
    );
    if (compared !== 0) {
      return compared;
    }
  }
  return left - right;
}

function compareBinding<TData extends RowData>(
  leftValue: unknown,
  rightValue: unknown,
  leftNode: RowNode<TData>,
  rightNode: RowNode<TData>,
  binding: SortBinding<TData>,
): number {
  if (binding.comparator === null) {
    return compareValues(leftValue, rightValue, binding.sort, binding.caseSensitive);
  }
  const result = binding.comparator({
    valueA: leftValue,
    valueB: rightValue,
    nodeA: leftNode,
    nodeB: rightNode,
    columnId: binding.colId,
    descending: binding.sort === 'desc',
  });
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new GridError(
      'invalid-column',
      `Sort comparator for column "${binding.colId}" must return a finite number.`,
    );
  }
  if (result === 0) {
    return 0;
  }
  return binding.sort === 'desc' ? -result : result;
}

function projectRows<TData extends RowData>(
  source: readonly RowNode<TData>[],
  indexes: readonly number[],
  previousDisplay: readonly RowNode<TData>[] | undefined,
): readonly RowNode<TData>[] {
  const previousById = new Map<RowId, RowNode<TData>>();
  if (previousDisplay !== undefined) {
    for (const node of previousDisplay) {
      previousById.set(node.id, node);
    }
  }
  let matchesSource = true;
  const projected: RowNode<TData>[] = [];
  for (let displayIndex = 0; displayIndex < indexes.length; displayIndex += 1) {
    const sourceIndex = indexes[displayIndex];
    const sourceNode = sourceIndex === undefined ? undefined : source[sourceIndex];
    if (sourceNode === undefined) {
      throw new GridError('invalid-state', 'Sort produced an invalid row index.');
    }
    if (sourceIndex !== displayIndex) {
      matchesSource = false;
    }
    if (sourceNode.rowIndex === displayIndex) {
      projected.push(sourceNode);
      continue;
    }
    const prior = previousById.get(sourceNode.id);
    if (prior?.data === sourceNode.data && prior.rowIndex === displayIndex) {
      projected.push(prior);
      continue;
    }
    projected.push(
      Object.freeze({ id: sourceNode.id, data: sourceNode.data, rowIndex: displayIndex }),
    );
  }
  if (matchesSource) {
    return source;
  }
  return Object.freeze(projected);
}
