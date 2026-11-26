import {
  columnIdSet,
  sameColumnDefinition,
  sameColumnState,
  type ColumnRecord,
} from '../columns/column-model';
import { GRID_STATE_FORMAT_VERSION } from '../format';
import { GridError } from '../errors';
import { isRecord, isUnknownArray } from '../guards';
import { samePagination } from '../pagination/page-model';
import type { RowPlan } from '../rows/row-model';
import { sameFilterModel } from '../filter/filter-model';
import { parseSelectionMode } from '../selection/selection';
import { sameIdList } from '../sort/sort-model';
import type {
  CellPosition,
  ColumnId,
  FilterModel,
  GridConfiguration,
  GridState,
  GridStateChange,
  PaginationModel,
  RowData,
  RowId,
  RowNode,
  SelectionMode,
  SortModelItem,
} from '../types';

export function createGridState<TData extends RowData>(parts: {
  readonly nodes: readonly RowNode<TData>[];
  readonly displayed: readonly RowNode<TData>[];
  readonly records: readonly ColumnRecord<TData>[];
  readonly selectedRowIds: readonly RowId[];
  readonly focusedCell: CellPosition | null;
  readonly sortModel: readonly SortModelItem[];
  readonly filterModel: FilterModel;
  readonly pagination: PaginationModel;
  readonly caseSensitive: boolean;
  readonly filterCaseSensitive: boolean;
  readonly selectionMode: SelectionMode;
}): GridState<TData> {
  const rowIds = Object.freeze(parts.nodes.map((node) => node.id));
  const displayIds = parts.displayed.map((node) => node.id);
  return Object.freeze({
    rowData: Object.freeze(parts.nodes.map((node) => node.data)),
    rowIds,
    displayedRowIds: sameIdList(rowIds, displayIds) ? rowIds : Object.freeze([...displayIds]),
    columnDefs: Object.freeze(parts.records.map((record) => record.definition)),
    columnState: Object.freeze(parts.records.map((record) => record.state)),
    sortModel: Object.freeze(parts.sortModel.map((item) => Object.freeze({ ...item }))),
    filterModel: parts.filterModel,
    pagination: Object.freeze({
      enabled: parts.pagination.enabled,
      page: parts.pagination.page,
      pageSize: parts.pagination.pageSize,
      pageSizeOptions: parts.pagination.pageSizeOptions,
    }),
    selectedRowIds: Object.freeze([...parts.selectedRowIds]),
    focusedCell:
      parts.focusedCell === null
        ? null
        : Object.freeze({
            rowIndex: parts.focusedCell.rowIndex,
            rowId: parts.focusedCell.rowId,
            columnId: parts.focusedCell.columnId,
          }),
    configuration: Object.freeze({
      formatVersion: GRID_STATE_FORMAT_VERSION,
      caseSensitive: parts.caseSensitive,
      filterCaseSensitive: parts.filterCaseSensitive,
      selectionMode: parts.selectionMode,
    }),
  });
}

export function diffState<TData extends RowData>(
  previous: GridState<TData>,
  next: GridState<TData>,
): GridStateChange[] {
  const changes: GridStateChange[] = [];
  if (!sameItems(previous.rowData, next.rowData, Object.is)) {
    changes.push('rowData');
  }
  if (!sameItems(previous.rowIds, next.rowIds, Object.is)) {
    changes.push('rowIds');
  }
  if (!sameItems(previous.displayedRowIds, next.displayedRowIds, Object.is)) {
    changes.push('displayedRowIds');
  }
  if (!sameItems(previous.columnDefs, next.columnDefs, sameColumnDefinition)) {
    changes.push('columnDefs');
  }
  if (!sameItems(previous.columnState, next.columnState, sameColumnState)) {
    changes.push('columnState');
  }
  if (!sameItems(previous.sortModel, next.sortModel, sameSortEntry)) {
    changes.push('sortModel');
  }
  if (!sameFilterModel(previous.filterModel, next.filterModel)) {
    changes.push('filterModel');
  }
  if (!samePagination(previous.pagination, next.pagination)) {
    changes.push('pagination');
  }
  if (!sameItems(previous.selectedRowIds, next.selectedRowIds, Object.is)) {
    changes.push('selectedRowIds');
  }
  if (!sameFocus(previous.focusedCell, next.focusedCell)) {
    changes.push('focusedCell');
  }
  if (
    previous.configuration.caseSensitive !== next.configuration.caseSensitive ||
    previous.configuration.filterCaseSensitive !== next.configuration.filterCaseSensitive ||
    previous.configuration.selectionMode !== next.configuration.selectionMode
  ) {
    changes.push('configuration');
  }
  return changes;
}

export function stateFromPlans<TData extends RowData>(
  rowPlan: RowPlan<TData>,
  displayed: readonly RowNode<TData>[],
  records: readonly ColumnRecord<TData>[],
  selectedRowIds: readonly RowId[],
  focusedCell: CellPosition | null,
  sortModel: readonly SortModelItem[],
  filterModel: FilterModel,
  caseSensitive: boolean,
  filterCaseSensitive: boolean,
  pagination: PaginationModel,
  selectionMode: SelectionMode,
): GridState<TData> {
  return createGridState({
    nodes: rowPlan.nodes,
    displayed,
    records,
    selectedRowIds,
    focusedCell,
    sortModel,
    filterModel,
    pagination,
    caseSensitive,
    filterCaseSensitive,
    selectionMode,
  });
}

export function pruneSelection<TData extends RowData>(
  selected: readonly RowId[],
  nodes: readonly RowNode<TData>[],
): readonly RowId[] {
  const available = new Set(nodes.map((node) => node.id));
  const next = selected.filter((id) => available.has(id));
  return next.length === selected.length ? selected : next;
}

export function alignFocus<TData extends RowData>(
  focus: CellPosition | null,
  nodes: readonly RowNode<TData>[],
  records: readonly ColumnRecord<TData>[],
): CellPosition | null {
  if (focus === null) {
    return null;
  }
  const ids = columnIdSet(records);
  const node = nodes.find((item) => item.id === focus.rowId);
  if (node === undefined || !ids.has(focus.columnId)) {
    return null;
  }
  if (node.rowIndex === focus.rowIndex) {
    return focus;
  }
  return Object.freeze({
    rowIndex: node.rowIndex,
    rowId: node.id,
    columnId: focus.columnId,
  });
}

export function parseExactSelection<TData extends RowData>(
  value: unknown,
  nodes: readonly RowNode<TData>[],
): readonly RowId[] {
  if (!isUnknownArray(value)) {
    throw new GridError('invalid-selection', 'Selected row ids must be an array.');
  }
  const available = new Set(nodes.map((node) => node.id));
  const seen = new Set<string>();
  const ids: RowId[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      throw new GridError(
        'invalid-selection',
        `Selected row id ${index} must be a non-empty string.`,
      );
    }
    if (seen.has(entry)) {
      throw new GridError('invalid-selection', `Duplicate selected row id "${entry}".`);
    }
    if (!available.has(entry)) {
      throw new GridError('invalid-selection', `Selected row "${entry}" does not exist.`);
    }
    seen.add(entry);
    ids.push(entry);
  }
  return ids;
}

export function parseExactFocus<TData extends RowData>(
  value: unknown,
  nodes: readonly RowNode<TData>[],
  records: readonly ColumnRecord<TData>[],
): CellPosition | null {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    throw new GridError('invalid-focus', 'Focused cell must be an object or null.');
  }
  const allowed = ['rowIndex', 'rowId', 'columnId'];
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new GridError('invalid-focus', `Focused cell has unknown property "${key}".`);
    }
  }
  for (const key of allowed) {
    if (!Object.hasOwn(value, key)) {
      throw new GridError('invalid-focus', `Focused cell is missing "${key}".`);
    }
  }
  const { rowIndex, rowId, columnId } = value;
  if (typeof rowIndex !== 'number' || !Number.isInteger(rowIndex) || rowIndex < 0) {
    throw new GridError(
      'invalid-focus',
      'Focused cell rowIndex must be an integer of 0 or greater.',
    );
  }
  if (typeof rowId !== 'string' || rowId.trim().length === 0) {
    throw new GridError('invalid-focus', 'Focused cell rowId must be a non-empty string.');
  }
  if (typeof columnId !== 'string' || columnId.trim().length === 0) {
    throw new GridError('invalid-focus', 'Focused cell columnId must be a non-empty string.');
  }
  const ids: ReadonlySet<ColumnId> = columnIdSet(records);
  if (!ids.has(columnId)) {
    throw new GridError('invalid-focus', `Focused column "${columnId}" does not exist.`);
  }
  const node = nodes[rowIndex];
  if (node?.id !== rowId) {
    throw new GridError('invalid-focus', 'Focused cell rowIndex does not match rowId.');
  }
  return Object.freeze({ rowIndex, rowId, columnId });
}

export interface GridStateInput {
  readonly rowData: readonly unknown[];
  readonly rowIds: readonly unknown[];
  readonly displayedRowIds: unknown;
  readonly columnDefs: unknown;
  readonly columnState: unknown;
  readonly sortModel: unknown;
  readonly filterModel: unknown;
  readonly pagination: unknown;
  readonly selectedRowIds: unknown;
  readonly focusedCell: unknown;
  readonly configuration: unknown;
}

const STATE_KEYS = [
  'rowData',
  'rowIds',
  'displayedRowIds',
  'columnDefs',
  'columnState',
  'sortModel',
  'filterModel',
  'pagination',
  'selectedRowIds',
  'focusedCell',
  'configuration',
] as const;

const STATE_KEY_SET = new Set<string>(STATE_KEYS);

export function parseGridStateInput(input: unknown): GridStateInput {
  if (!isRecord(input)) {
    throw new GridError('invalid-state', 'Grid state must be an object.');
  }
  for (const key of Object.keys(input)) {
    if (!STATE_KEY_SET.has(key)) {
      throw new GridError('invalid-state', `Grid state has unknown property "${key}".`);
    }
  }
  for (const key of STATE_KEYS) {
    if (!Object.hasOwn(input, key) && key !== 'filterModel' && key !== 'pagination') {
      throw new GridError('invalid-state', `Grid state is missing "${key}".`);
    }
  }
  const rowData = input.rowData;
  const rowIds = input.rowIds;
  if (!Array.isArray(rowData)) {
    throw new GridError('invalid-state', 'Grid state rowData must be an array.');
  }
  if (!Array.isArray(rowIds)) {
    throw new GridError('invalid-state', 'Grid state rowIds must be an array.');
  }
  return {
    rowData,
    rowIds,
    displayedRowIds: input.displayedRowIds,
    columnDefs: input.columnDefs,
    columnState: input.columnState,
    sortModel: input.sortModel,
    filterModel: Object.hasOwn(input, 'filterModel')
      ? input.filterModel
      : { join: 'and', filters: [] },
    pagination: Object.hasOwn(input, 'pagination') ? input.pagination : undefined,
    selectedRowIds: input.selectedRowIds,
    focusedCell: input.focusedCell,
    configuration: input.configuration,
  };
}

/**
 * Checks that displayed ids are unique source ids.
 * A filter may omit source rows. It cannot add or repeat an id.
 */
export function parseDisplayedRowIds(
  value: unknown,
  sourceIds: readonly RowId[],
): readonly RowId[] {
  if (!isUnknownArray(value)) {
    throw new GridError('invalid-state', 'Displayed row ids must be an array.');
  }
  const available = new Set(sourceIds);
  const seen = new Set<string>();
  const ids: RowId[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      throw new GridError('invalid-state', `Displayed row id ${index} must be a non-empty string.`);
    }
    if (seen.has(entry) || !available.has(entry)) {
      throw new GridError(
        'invalid-state',
        'Displayed row ids must be unique ids from the source rows.',
      );
    }
    seen.add(entry);
    ids.push(entry);
  }
  return ids;
}

export function parseConfiguration(value: unknown): GridConfiguration {
  if (!isRecord(value)) {
    throw new GridError('invalid-state', 'Grid configuration must be an object.');
  }
  const keys = Object.keys(value);
  for (const key of keys) {
    if (
      key !== 'formatVersion' &&
      key !== 'caseSensitive' &&
      key !== 'filterCaseSensitive' &&
      key !== 'selectionMode'
    ) {
      throw new GridError('invalid-state', `Grid configuration has unknown property "${key}".`);
    }
  }
  if (value.formatVersion !== GRID_STATE_FORMAT_VERSION) {
    throw new GridError(
      'invalid-state',
      `Unsupported grid state version ${describeVersion(value.formatVersion)}.`,
    );
  }
  return Object.freeze({
    formatVersion: GRID_STATE_FORMAT_VERSION,
    caseSensitive: readConfigFlag(value, 'caseSensitive'),
    filterCaseSensitive: readConfigFlag(value, 'filterCaseSensitive'),
    selectionMode: Object.hasOwn(value, 'selectionMode')
      ? parseSelectionMode(value.selectionMode)
      : 'multiple',
  });
}

function readConfigFlag(value: Record<string, unknown>, key: string): boolean {
  if (!Object.hasOwn(value, key)) {
    return true;
  }
  const flag = value[key];
  if (typeof flag !== 'boolean') {
    throw new GridError('invalid-state', `Grid configuration ${key} must be a boolean.`);
  }
  return flag;
}

function describeVersion(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return 'value';
}

function sameSortEntry(left: SortModelItem, right: SortModelItem): boolean {
  return (
    left.colId === right.colId && left.sort === right.sort && left.sortIndex === right.sortIndex
  );
}

function sameItems<T>(
  left: readonly T[],
  right: readonly T[],
  equal: (leftItem: T, rightItem: T) => boolean,
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (leftItem === undefined || rightItem === undefined || !equal(leftItem, rightItem)) {
      return false;
    }
  }
  return true;
}

function sameFocus(left: CellPosition | null, right: CellPosition | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }
  return (
    left.rowIndex === right.rowIndex &&
    left.rowId === right.rowId &&
    left.columnId === right.columnId
  );
}
