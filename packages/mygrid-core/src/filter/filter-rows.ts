import type { ColumnRecord } from '../columns/column-model';
import { GridError } from '../errors';
import { readOwnValue } from '../guards';
import { orderRows } from '../sort/order-rows';
import type { RowData, RowId, RowNode, SortModelItem } from '../types';
import type { ColumnFilter, FilterJoin, FilterModel, SetFilterValue } from '../types';
import { dateMatches, numberMatches, textMatches } from './match';

interface PreparedFilter<TData extends RowData> {
  readonly columnId: string;
  readonly field: string | null;
  readonly filter: ColumnFilter;
  readonly predicate: ColumnRecord<TData>['filterPredicate'];
  readonly caseSensitive: boolean;
  readonly setKeys: ReadonlySet<string> | null;
}

/**
 * Filters source rows, then sorts the rows that pass.
 * The source array and its nodes are not modified.
 * With no filters and no sort, the source array is returned.
 */
export function displayRows<TData extends RowData>(
  source: readonly RowNode<TData>[],
  filterModel: FilterModel,
  sortModel: readonly SortModelItem[],
  records: readonly ColumnRecord<TData>[],
  sortCaseSensitive: boolean,
  filterCaseSensitive: boolean,
  previousDisplay?: readonly RowNode<TData>[],
): readonly RowNode<TData>[] {
  const filtered = filterRows(source, filterModel, records, filterCaseSensitive);
  const ordered = orderRows(filtered, sortModel, records, sortCaseSensitive, previousDisplay);
  return indexDisplayed(ordered, previousDisplay);
}

function filterRows<TData extends RowData>(
  source: readonly RowNode<TData>[],
  model: FilterModel,
  records: readonly ColumnRecord<TData>[],
  filterCaseSensitive: boolean,
): readonly RowNode<TData>[] {
  if (model.filters.length === 0) {
    return source;
  }
  const prepared = prepareFilters(model, records, filterCaseSensitive);
  const matched: RowNode<TData>[] = [];
  for (const node of source) {
    if (rowMatches(node, prepared, model.join)) {
      matched.push(node);
    }
  }
  return matched.length === source.length ? source : matched;
}

function prepareFilters<TData extends RowData>(
  model: FilterModel,
  records: readonly ColumnRecord<TData>[],
  filterCaseSensitive: boolean,
): readonly PreparedFilter<TData>[] {
  const byId = new Map(records.map((record) => [record.definition.colId, record]));
  return model.filters.map((item) => {
    const record = byId.get(item.colId);
    if (record?.definition.filterable !== true) {
      throw new GridError('invalid-column', `Column "${item.colId}" is not filterable.`);
    }
    if (item.filter.filterType === 'custom' && record.filterPredicate === null) {
      throw new GridError(
        'invalid-column',
        `Column "${item.colId}" has a custom filter but no filter function.`,
      );
    }
    const caseSensitive =
      item.filter.filterType === 'text'
        ? (item.filter.caseSensitive ?? filterCaseSensitive)
        : filterCaseSensitive;
    return {
      columnId: item.colId,
      field: record.definition.field,
      filter: item.filter,
      predicate: record.filterPredicate,
      caseSensitive,
      setKeys: item.filter.filterType === 'set' ? setKeys(item.filter.values) : null,
    };
  });
}

function rowMatches<TData extends RowData>(
  node: RowNode<TData>,
  filters: readonly PreparedFilter<TData>[],
  join: FilterJoin,
): boolean {
  if (join === 'or') {
    for (const filter of filters) {
      if (valueMatches(node, filter)) {
        return true;
      }
    }
    return false;
  }
  for (const filter of filters) {
    if (!valueMatches(node, filter)) {
      return false;
    }
  }
  return true;
}

function valueMatches<TData extends RowData>(
  node: RowNode<TData>,
  prepared: PreparedFilter<TData>,
): boolean {
  const value = prepared.field === null ? undefined : readOwnValue(node.data, prepared.field);
  const filter = prepared.filter;
  if (filter.filterType === 'text') {
    return combine(
      filter.operator,
      filter.conditions.map((condition) => textMatches(value, condition, prepared.caseSensitive)),
    );
  }
  if (filter.filterType === 'number') {
    return combine(
      filter.operator,
      filter.conditions.map((condition) => numberMatches(value, condition)),
    );
  }
  if (filter.filterType === 'date') {
    return combine(
      filter.operator,
      filter.conditions.map((condition) => dateMatches(value, condition)),
    );
  }
  if (filter.filterType === 'set') {
    return prepared.setKeys?.has(cellSetKey(value)) === true;
  }
  if (prepared.predicate === null) {
    throw new GridError(
      'invalid-column',
      `Column "${prepared.columnId}" has a custom filter but no filter function.`,
    );
  }
  const result = prepared.predicate({
    value,
    node,
    columnId: prepared.columnId,
    data: node.data,
  });
  if (typeof result !== 'boolean') {
    throw new GridError(
      'invalid-column',
      `Filter for column "${prepared.columnId}" must return a boolean.`,
    );
  }
  return result;
}

function combine(join: FilterJoin, results: readonly boolean[]): boolean {
  if (join === 'or') {
    return results.some((item) => item);
  }
  return results.every((item) => item);
}

function setKeys(values: readonly SetFilterValue[]): ReadonlySet<string> {
  return new Set(values.map((value) => cellSetKey(value)));
}

function cellSetKey(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `number:${String(value)}`;
  }
  if (typeof value === 'boolean') {
    return `boolean:${value ? '1' : '0'}`;
  }
  if (typeof value === 'string') {
    return `string:${value}`;
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return `string:${value.toISOString().slice(0, 10)}`;
  }
  return `other:${typeof value}`;
}

function indexDisplayed<TData extends RowData>(
  nodes: readonly RowNode<TData>[],
  previousDisplay: readonly RowNode<TData>[] | undefined,
): readonly RowNode<TData>[] {
  let aligned = true;
  for (let index = 0; index < nodes.length; index += 1) {
    if (nodes[index]?.rowIndex !== index) {
      aligned = false;
      break;
    }
  }
  if (aligned) {
    return nodes;
  }
  const previousById = new Map<RowId, RowNode<TData>>();
  if (previousDisplay !== undefined) {
    for (const node of previousDisplay) {
      previousById.set(node.id, node);
    }
  }
  const projected: RowNode<TData>[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node === undefined) {
      throw new GridError('invalid-state', 'Filter produced an invalid row index.');
    }
    const prior = previousById.get(node.id);
    if (prior?.data === node.data && prior.rowIndex === index) {
      projected.push(prior);
      continue;
    }
    projected.push(Object.freeze({ id: node.id, data: node.data, rowIndex: index }));
  }
  return Object.freeze(projected);
}
