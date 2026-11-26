import { GridError } from '../errors';
import { assertExactKeys, assertKnownKeys, isRecord, isUnknownArray } from '../guards';
import type {
  ColumnId,
  ColumnPinning,
  ColumnFilterPredicate,
  ColumnState,
  FieldName,
  GridColumn,
  ResolvedColumnDefinition,
  RowData,
  SortComparator,
  SortDirection,
} from '../types';
import { DEFAULT_SORTING_ORDER } from '../types';

const DEFINITION_KEYS = [
  'colId',
  'field',
  'headerName',
  'hide',
  'width',
  'minWidth',
  'maxWidth',
  'pinned',
  'sortable',
  'filterable',
  'sort',
  'comparator',
  'sortingOrder',
  'caseSensitive',
  'filter',
] as const;

const STATE_KEYS = ['colId', 'hide', 'width', 'pinned'] as const;

/**
 * One column held by the model.
 * The definition is the validated host input. The state is the runtime overlay.
 */
export interface ColumnRecord<TData extends RowData> {
  readonly definition: ResolvedColumnDefinition<TData>;
  readonly state: ColumnState;
  /** Live comparator. Not copied into the serializable definition. */
  readonly comparator: SortComparator<TData> | null;
  /** Predicate used by a custom filter. Not copied into the serializable definition. */
  readonly filterPredicate: ColumnFilterPredicate<TData> | null;
  /** Direction applied when this column id is new. Null leaves it out of the model. */
  readonly initialSort: SortDirection | null;
}

interface NormalizedColumn<TData extends RowData> {
  readonly definition: ResolvedColumnDefinition<TData>;
  readonly comparator: SortComparator<TData> | null;
  readonly filterPredicate: ColumnFilterPredicate<TData> | null;
  readonly initialSort: SortDirection | null;
}

/** Stores column definitions and the runtime column state derived from them. */
export class ColumnModel<TData extends RowData> {
  private records: readonly ColumnRecord<TData>[] = [];

  getRecords(): readonly ColumnRecord<TData>[] {
    return this.records;
  }

  commit(records: readonly ColumnRecord<TData>[]): void {
    this.records = records;
  }

  getColumns(): readonly GridColumn<TData>[] {
    return Object.freeze(this.records.map((record) => toGridColumn(record)));
  }

  getColumn(id: ColumnId): GridColumn<TData> | undefined {
    const record = this.records.find((item) => item.definition.colId === id);
    return record === undefined ? undefined : toGridColumn(record);
  }

  getDefinitions(): readonly ResolvedColumnDefinition<TData>[] {
    return Object.freeze(this.records.map((record) => record.definition));
  }

  getState(): readonly ColumnState[] {
    return Object.freeze(this.records.map((record) => record.state));
  }

  /** Validates definitions. Keeps runtime state for ids that already exist. */
  planColumnDefs(defs: unknown): readonly ColumnRecord<TData>[] {
    const normalized = normalizeDefinitions<TData>(defs);
    const current = new Map(this.records.map((record) => [record.definition.colId, record]));
    return Object.freeze(
      normalized.map((column) => {
        const existing = current.get(column.definition.colId);
        if (existing === undefined) {
          return toRecord(column, stateFromDefinition(column.definition));
        }
        assertWidthInRange(
          existing.state.width,
          column.definition.minWidth,
          column.definition.maxWidth,
          column.definition.colId,
        );
        return toRecord(column, existing.state);
      }),
    );
  }

  /**
   * Applies a partial column-state update.
   * Columns omitted from `state` keep their current runtime values.
   */
  planColumnState(state: unknown): readonly ColumnRecord<TData>[] {
    const updates = parseStateList(state);
    const known = new Set(this.records.map((record) => record.definition.colId));
    for (const columnState of updates) {
      if (!known.has(columnState.colId)) {
        throw new GridError('invalid-column', `Unknown column "${columnState.colId}".`);
      }
    }
    const byId = new Map(updates.map((columnState) => [columnState.colId, columnState]));
    return Object.freeze(
      this.records.map((record) => {
        const next = byId.get(record.definition.colId);
        if (next === undefined || sameColumnState(record.state, next)) {
          return record;
        }
        assertWidthInRange(
          next.width,
          record.definition.minWidth,
          record.definition.maxWidth,
          record.definition.colId,
        );
        return Object.freeze({
          definition: record.definition,
          state: next,
          comparator: record.comparator,
          filterPredicate: record.filterPredicate,
          initialSort: record.initialSort,
        });
      }),
    );
  }

  /**
   * Builds a column model from definitions plus a complete column state.
   * Every definition id must appear once. State order does not change column order.
   */
  planColumnModel(defs: unknown, state: unknown): readonly ColumnRecord<TData>[] {
    const normalized = normalizeDefinitions<TData>(defs);
    const updates = parseStateList(state);
    if (updates.length !== normalized.length) {
      throw new GridError('invalid-column', 'Column state must include every column exactly once.');
    }
    const byId = new Map<ColumnId, ColumnState>();
    for (const columnState of updates) {
      if (byId.has(columnState.colId)) {
        throw new GridError('invalid-column', `Duplicate column id "${columnState.colId}".`);
      }
      byId.set(columnState.colId, columnState);
    }
    return Object.freeze(
      normalized.map((column) => {
        const columnState = byId.get(column.definition.colId);
        if (columnState === undefined) {
          throw new GridError(
            'invalid-column',
            `Column state is missing "${column.definition.colId}".`,
          );
        }
        assertWidthInRange(
          columnState.width,
          column.definition.minWidth,
          column.definition.maxWidth,
          column.definition.colId,
        );
        return toRecord(column, columnState);
      }),
    );
  }
}

/**
 * Keeps comparators and filter predicates that a serialized snapshot cannot carry.
 * A definition that includes one of those functions replaces the previous one.
 */
export function preserveComparators<TData extends RowData>(
  previous: readonly ColumnRecord<TData>[],
  next: readonly ColumnRecord<TData>[],
): readonly ColumnRecord<TData>[] {
  const previousById = new Map(previous.map((record) => [record.definition.colId, record]));
  return Object.freeze(
    next.map((record) => {
      const prior = previousById.get(record.definition.colId);
      const comparator = record.comparator ?? prior?.comparator ?? null;
      const filterPredicate = record.filterPredicate ?? prior?.filterPredicate ?? null;
      if (comparator === record.comparator && filterPredicate === record.filterPredicate) {
        return record;
      }
      return Object.freeze({
        definition: record.definition,
        state: record.state,
        comparator,
        filterPredicate,
        initialSort: record.initialSort,
      });
    }),
  );
}

export function toGridColumn<TData extends RowData>(
  record: ColumnRecord<TData>,
): GridColumn<TData> {
  return Object.freeze({
    colId: record.definition.colId,
    field: record.definition.field,
    headerName: record.definition.headerName,
    hide: record.state.hide,
    width: record.state.width,
    minWidth: record.definition.minWidth,
    maxWidth: record.definition.maxWidth,
    pinned: record.state.pinned,
    sortable: record.definition.sortable,
    filterable: record.definition.filterable,
    sortingOrder: record.definition.sortingOrder,
    caseSensitive: record.definition.caseSensitive,
    comparator: record.comparator,
    filter: record.filterPredicate,
  });
}

export function sameColumnDefinition<TData extends RowData>(
  left: ResolvedColumnDefinition<TData>,
  right: ResolvedColumnDefinition<TData>,
): boolean {
  return (
    left.colId === right.colId &&
    left.field === right.field &&
    left.headerName === right.headerName &&
    left.hide === right.hide &&
    left.width === right.width &&
    left.minWidth === right.minWidth &&
    left.maxWidth === right.maxWidth &&
    left.pinned === right.pinned &&
    left.sortable === right.sortable &&
    left.filterable === right.filterable &&
    left.caseSensitive === right.caseSensitive &&
    sameSortingOrder(left.sortingOrder, right.sortingOrder)
  );
}

export function sameColumnState(left: ColumnState, right: ColumnState): boolean {
  return (
    left.colId === right.colId &&
    left.hide === right.hide &&
    left.width === right.width &&
    left.pinned === right.pinned
  );
}

export function columnIdSet<TData extends RowData>(
  records: readonly ColumnRecord<TData>[],
): ReadonlySet<ColumnId> {
  return new Set(records.map((record) => record.definition.colId));
}

function stateFromDefinition<TData extends RowData>(
  definition: ResolvedColumnDefinition<TData>,
): ColumnState {
  return Object.freeze({
    colId: definition.colId,
    hide: definition.hide,
    width: definition.width,
    pinned: definition.pinned,
  });
}

function toRecord<TData extends RowData>(
  column: NormalizedColumn<TData>,
  state: ColumnState,
): ColumnRecord<TData> {
  return Object.freeze({
    definition: column.definition,
    state,
    comparator: column.comparator,
    filterPredicate: column.filterPredicate,
    initialSort: column.initialSort,
  });
}

function sameSortingOrder(
  left: readonly (SortDirection | null)[],
  right: readonly (SortDirection | null)[],
): boolean {
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

function normalizeDefinitions<TData extends RowData>(
  defs: unknown,
): readonly NormalizedColumn<TData>[] {
  if (!Array.isArray(defs)) {
    throw new GridError('invalid-column', 'Column definitions must be an array.');
  }
  const seen = new Set<string>();
  const normalized: NormalizedColumn<TData>[] = [];
  for (let index = 0; index < defs.length; index += 1) {
    const column = normalizeDefinition<TData>(defs[index], index);
    if (seen.has(column.definition.colId)) {
      throw new GridError('invalid-column', `Duplicate column id "${column.definition.colId}".`);
    }
    seen.add(column.definition.colId);
    normalized.push(column);
  }
  return normalized;
}

function normalizeDefinition<TData extends RowData>(
  value: unknown,
  index: number,
): NormalizedColumn<TData> {
  if (!isRecord(value)) {
    throw new GridError('invalid-column', `Column definition ${index} must be an object.`);
  }
  assertKnownKeys(value, DEFINITION_KEYS, `Column definition ${index}`, 'invalid-column');

  const label = `Column definition ${index}`;
  const colId = Object.hasOwn(value, 'colId')
    ? readIdentifier(value.colId, `${label} colId`)
    : null;
  const field = Object.hasOwn(value, 'field') ? readField(value.field, `${label} field`) : null;
  const resolvedId = colId ?? field;
  if (resolvedId === null) {
    throw new GridError('invalid-column', `${label} must include a colId or a field.`);
  }

  const headerName = readHeaderName(value, resolvedId, field, label);
  const hide = readBoolean(value, 'hide', false, label);
  const width = readOptionalWidth(value, 'width', label);
  const minWidth = readOptionalWidth(value, 'minWidth', label);
  const maxWidth = readOptionalWidth(value, 'maxWidth', label);
  const pinned = readPinned(value, label);
  const sortable = readBoolean(value, 'sortable', false, label);
  const filterable = readBoolean(value, 'filterable', false, label);
  const initialSort = readInitialSort(value, label);
  const comparator = readComparator<TData>(value, label);
  const filterPredicate = readFilterPredicate<TData>(value, label);
  const sortingOrder = readSortingOrder(value, label);
  const caseSensitive = readCaseSensitive(value, label);
  if (initialSort !== null && !sortable) {
    throw new GridError(
      'invalid-column',
      `${label} sets a sort direction but the column is not sortable.`,
    );
  }
  assertWidthInRange(width, minWidth, maxWidth, resolvedId);

  return {
    comparator,
    filterPredicate,
    initialSort,
    definition: Object.freeze({
      colId: resolvedId,
      field: field as FieldName<TData> | null,
      headerName,
      hide,
      width,
      minWidth,
      maxWidth,
      pinned,
      sortable,
      filterable,
      sortingOrder,
      caseSensitive,
    }),
  };
}

function parseStateList(state: unknown): readonly ColumnState[] {
  if (!Array.isArray(state)) {
    throw new GridError('invalid-column', 'Column state must be an array.');
  }
  const seen = new Set<string>();
  const parsed: ColumnState[] = [];
  for (let index = 0; index < state.length; index += 1) {
    const columnState = parseColumnState(state[index], index);
    if (seen.has(columnState.colId)) {
      throw new GridError('invalid-column', `Duplicate column id "${columnState.colId}".`);
    }
    seen.add(columnState.colId);
    parsed.push(columnState);
  }
  return parsed;
}

function parseColumnState(value: unknown, index: number): ColumnState {
  if (!isRecord(value)) {
    throw new GridError('invalid-column', `Column state ${index} must be an object.`);
  }
  assertExactKeys(value, STATE_KEYS, `Column state ${index}`, 'invalid-column');
  const colId = readIdentifier(value.colId, `Column state ${index} colId`);
  if (typeof value.hide !== 'boolean') {
    throw new GridError('invalid-column', `Column state ${index} hide must be a boolean.`);
  }
  const width = readWidthValue(value.width, `Column state ${index} width`);
  const pinned = readPinValue(value.pinned, `Column state ${index} pinned`);
  return Object.freeze({ colId, hide: value.hide, width, pinned });
}

function readHeaderName(
  source: Record<string, unknown>,
  colId: string,
  field: string | null,
  label: string,
): string {
  if (!Object.hasOwn(source, 'headerName')) {
    return field ?? colId;
  }
  return readIdentifier(source.headerName, `${label} headerName`);
}

function readField(value: unknown, label: string): string | null {
  if (value === null) {
    return null;
  }
  return readIdentifier(value, label);
}

function readIdentifier(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new GridError('invalid-column', `${label} must be a non-empty string.`);
  }
  return value;
}

function readBoolean(
  source: Record<string, unknown>,
  key: string,
  fallback: boolean,
  label: string,
): boolean {
  if (!Object.hasOwn(source, key)) {
    return fallback;
  }
  const value = source[key];
  if (typeof value !== 'boolean') {
    throw new GridError('invalid-column', `${label} ${key} must be a boolean.`);
  }
  return value;
}

function readOptionalWidth(
  source: Record<string, unknown>,
  key: string,
  label: string,
): number | null {
  if (!Object.hasOwn(source, key)) {
    return null;
  }
  return readWidthValue(source[key], `${label} ${key}`);
}

function readWidthValue(value: unknown, label: string): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  throw new GridError(
    'invalid-column',
    `${label} must be a finite number greater than 0, or null.`,
  );
}

function readPinned(source: Record<string, unknown>, label: string): ColumnPinning {
  if (!Object.hasOwn(source, 'pinned')) {
    return null;
  }
  return readPinValue(source.pinned, `${label} pinned`);
}

function readPinValue(value: unknown, label: string): ColumnPinning {
  if (value === null || value === 'none') {
    return null;
  }
  if (value === 'left' || value === 'right') {
    return value;
  }
  throw new GridError('invalid-column', `${label} must be "left", "right", "none", or null.`);
}

function readInitialSort(source: Record<string, unknown>, label: string): SortDirection | null {
  if (!Object.hasOwn(source, 'sort')) {
    return null;
  }
  if (source.sort === null) {
    return null;
  }
  if (source.sort === 'asc' || source.sort === 'desc') {
    return source.sort;
  }
  throw new GridError('invalid-column', `${label} sort must be "asc", "desc", or null.`);
}

function readComparator<TData extends RowData>(
  source: Record<string, unknown>,
  label: string,
): SortComparator<TData> | null {
  if (!Object.hasOwn(source, 'comparator')) {
    return null;
  }
  if (typeof source.comparator !== 'function') {
    throw new GridError('invalid-column', `${label} comparator must be a function.`);
  }
  return source.comparator as SortComparator<TData>;
}

function readFilterPredicate<TData extends RowData>(
  source: Record<string, unknown>,
  label: string,
): ColumnFilterPredicate<TData> | null {
  if (!Object.hasOwn(source, 'filter')) {
    return null;
  }
  if (typeof source.filter !== 'function') {
    throw new GridError('invalid-column', `${label} filter must be a function.`);
  }
  return source.filter as ColumnFilterPredicate<TData>;
}

function readSortingOrder(
  source: Record<string, unknown>,
  label: string,
): readonly (SortDirection | null)[] {
  if (!Object.hasOwn(source, 'sortingOrder')) {
    return DEFAULT_SORTING_ORDER;
  }
  const sortingOrder = source.sortingOrder;
  if (!isUnknownArray(sortingOrder) || sortingOrder.length === 0) {
    throw new GridError('invalid-column', `${label} sortingOrder must be a non-empty array.`);
  }
  const seen = new Set<string>();
  const order: (SortDirection | null)[] = [];
  for (let index = 0; index < sortingOrder.length; index += 1) {
    const entry = sortingOrder[index];
    if (entry !== 'asc' && entry !== 'desc' && entry !== null) {
      throw new GridError(
        'invalid-column',
        `${label} sortingOrder ${index} must be "asc", "desc", or null.`,
      );
    }
    const key = entry ?? 'null';
    if (seen.has(key)) {
      throw new GridError('invalid-column', `${label} sortingOrder contains a duplicate.`);
    }
    seen.add(key);
    order.push(entry);
  }
  return Object.freeze(order);
}

function readCaseSensitive(source: Record<string, unknown>, label: string): boolean | null {
  if (!Object.hasOwn(source, 'caseSensitive')) {
    return null;
  }
  if (source.caseSensitive === null) {
    return null;
  }
  if (typeof source.caseSensitive !== 'boolean') {
    throw new GridError('invalid-column', `${label} caseSensitive must be a boolean or null.`);
  }
  return source.caseSensitive;
}

function assertWidthInRange(
  width: number | null,
  minWidth: number | null,
  maxWidth: number | null,
  colId: string,
): void {
  if (minWidth !== null && maxWidth !== null && minWidth > maxWidth) {
    throw new GridError(
      'invalid-column',
      `Column "${colId}" minWidth cannot be greater than maxWidth.`,
    );
  }
  if (width !== null && minWidth !== null && width < minWidth) {
    throw new GridError('invalid-column', `Column "${colId}" width is below minWidth.`);
  }
  if (width !== null && maxWidth !== null && width > maxWidth) {
    throw new GridError('invalid-column', `Column "${colId}" width is above maxWidth.`);
  }
}
