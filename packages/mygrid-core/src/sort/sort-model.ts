import type { ColumnRecord } from '../columns/column-model';
import { GridError } from '../errors';
import { assertExactKeys, isRecord, isUnknownArray } from '../guards';
import type { ColumnId, RowData, SortDirection, SortModelItem } from '../types';

const STORED_KEYS = ['colId', 'sort', 'sortIndex'] as const;
const INPUT_KEYS = ['colId', 'sort'] as const;

export const EMPTY_SORT_MODEL: readonly SortModelItem[] = Object.freeze([]);

export function sameSortModel(
  left: readonly SortModelItem[],
  right: readonly SortModelItem[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (
      leftItem?.colId !== rightItem?.colId ||
      leftItem?.sort !== rightItem?.sort ||
      leftItem?.sortIndex !== rightItem?.sortIndex
    ) {
      return false;
    }
  }
  return true;
}

export function sameIdList(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

/** Builds the model after column definitions change. New columns pick up their initial `sort`. */
export function sortModelAfterColumnChange<TData extends RowData>(
  previousModel: readonly SortModelItem[],
  previousRecords: readonly ColumnRecord<TData>[],
  nextRecords: readonly ColumnRecord<TData>[],
): readonly SortModelItem[] {
  const previousIds = new Set(previousRecords.map((record) => record.definition.colId));
  const nextById = new Map(nextRecords.map((record) => [record.definition.colId, record]));
  const kept: SortModelItem[] = [];
  for (const item of previousModel) {
    const record = nextById.get(item.colId);
    if (record?.definition.sortable === true) {
      kept.push({ colId: item.colId, sort: item.sort, sortIndex: kept.length });
    }
  }
  for (const record of nextRecords) {
    if (previousIds.has(record.definition.colId) || record.initialSort === null) {
      continue;
    }
    if (!record.definition.sortable) {
      continue;
    }
    kept.push({
      colId: record.definition.colId,
      sort: record.initialSort,
      sortIndex: kept.length,
    });
  }
  return freezeSortModel(kept);
}

export function sortModelWithColumn(
  model: readonly SortModelItem[],
  columnId: ColumnId,
  sort: SortDirection | null,
  multi: boolean,
): readonly SortModelItem[] {
  if (!multi) {
    if (sort === null) {
      return EMPTY_SORT_MODEL;
    }
    return freezeSortModel([{ colId: columnId, sort, sortIndex: 0 }]);
  }
  const without = model.filter((item) => item.colId !== columnId);
  if (sort === null) {
    return freezeSortModel(without.map((item, sortIndex) => ({ ...item, sortIndex })));
  }
  const next = model.some((item) => item.colId === columnId)
    ? model.map((item) => (item.colId === columnId ? { ...item, sort } : item))
    : [...without, { colId: columnId, sort, sortIndex: without.length }];
  return freezeSortModel(next.map((item, sortIndex) => ({ ...item, sortIndex })));
}

export function toggleSortModel<TData extends RowData>(
  model: readonly SortModelItem[],
  record: ColumnRecord<TData>,
  multi: boolean,
): readonly SortModelItem[] {
  const current = model.find((item) => item.colId === record.definition.colId)?.sort ?? null;
  const cycle = record.definition.sortingOrder;
  const currentIndex = cycle.indexOf(current);
  const nextIndex = (currentIndex === -1 ? 0 : currentIndex + 1) % cycle.length;
  const next = cycle[nextIndex] ?? null;
  return sortModelWithColumn(model, record.definition.colId, next, multi);
}

/** Validates a caller-supplied model. Array order is the sort priority. */
export function parseSortModelInput<TData extends RowData>(
  value: unknown,
  records: readonly ColumnRecord<TData>[],
): readonly SortModelItem[] {
  return parseSortList(value, records, INPUT_KEYS, false);
}

/** Validates a sort model read from grid state. */
export function parseStoredSortModel<TData extends RowData>(
  value: unknown,
  records: readonly ColumnRecord<TData>[],
): readonly SortModelItem[] {
  return parseSortList(value, records, STORED_KEYS, true);
}

function parseSortList<TData extends RowData>(
  value: unknown,
  records: readonly ColumnRecord<TData>[],
  keys: readonly string[],
  stored: boolean,
): readonly SortModelItem[] {
  if (!isUnknownArray(value)) {
    throw new GridError('invalid-column', 'Sort model must be an array.');
  }
  const sortable = new Map(records.map((record) => [record.definition.colId, record]));
  const seen = new Set<string>();
  const items: SortModelItem[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    if (!isRecord(entry)) {
      throw new GridError('invalid-column', `Sort model item ${index} must be an object.`);
    }
    assertExactKeys(entry, keys, `Sort model item ${index}`, 'invalid-column');
    const colId = readColumnId(entry.colId, `Sort model item ${index} colId`);
    if (seen.has(colId)) {
      throw new GridError('invalid-column', `Duplicate sort column "${colId}".`);
    }
    seen.add(colId);
    const record = sortable.get(colId);
    if (record === undefined) {
      throw new GridError('invalid-column', `Unknown sort column "${colId}".`);
    }
    if (!record.definition.sortable) {
      throw new GridError('invalid-column', `Column "${colId}" is not sortable.`);
    }
    const sort = readDirection(entry.sort, `Sort model item ${index} sort`);
    if (stored && entry.sortIndex !== index) {
      throw new GridError('invalid-column', `Sort model item ${index} sortIndex must be ${index}.`);
    }
    items.push({ colId, sort, sortIndex: index });
  }
  return freezeSortModel(items);
}

export function freezeSortModel(items: readonly SortModelItem[]): readonly SortModelItem[] {
  if (items.length === 0) {
    return EMPTY_SORT_MODEL;
  }
  return Object.freeze(items.map((item) => Object.freeze({ ...item })));
}

function readColumnId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new GridError('invalid-column', `${label} must be a non-empty string.`);
  }
  return value;
}

function readDirection(value: unknown, label: string): SortDirection {
  if (value === 'asc' || value === 'desc') {
    return value;
  }
  throw new GridError('invalid-column', `${label} must be "asc" or "desc".`);
}
