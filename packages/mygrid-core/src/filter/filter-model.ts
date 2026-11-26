import type { ColumnRecord } from '../columns/column-model';
import { GridError } from '../errors';
import { assertExactKeys, assertKnownKeys, isRecord, isUnknownArray } from '../guards';
import { parseUtcDay } from './match';
import type {
  ColumnFilter,
  ColumnFilterPredicate,
  ColumnId,
  DateColumnFilter,
  DateFilterCondition,
  DateFilterOperator,
  FilterJoin,
  FilterModel,
  FilterModelItem,
  NumberColumnFilter,
  NumberFilterCondition,
  NumberFilterOperator,
  RowData,
  SetColumnFilter,
  SetFilterValue,
  TextColumnFilter,
  TextFilterCondition,
  TextFilterOperator,
} from '../types';

const TEXT_OPERATORS = new Set<string>([
  'contains',
  'notContains',
  'equals',
  'notEqual',
  'startsWith',
  'endsWith',
]);
const NUMBER_OPERATORS = new Set<string>([
  'equals',
  'notEqual',
  'greaterThan',
  'greaterThanOrEqual',
  'lessThan',
  'lessThanOrEqual',
  'inRange',
]);
const DATE_OPERATORS = new Set<string>(['equals', 'before', 'after', 'inRange']);

export const EMPTY_FILTER_MODEL: FilterModel = Object.freeze({
  join: 'and',
  filters: Object.freeze([]),
});

export interface ParsedFilterModel<TData extends RowData> {
  readonly model: FilterModel;
  readonly predicates: ReadonlyMap<ColumnId, ColumnFilterPredicate<TData>>;
}

export function emptyFilterModel(join: FilterJoin): FilterModel {
  if (join === 'and') {
    return EMPTY_FILTER_MODEL;
  }
  return Object.freeze({ join, filters: EMPTY_FILTER_MODEL.filters });
}

export function sameFilterModel(left: FilterModel, right: FilterModel): boolean {
  if (left.join !== right.join || left.filters.length !== right.filters.length) {
    return false;
  }
  for (let index = 0; index < left.filters.length; index += 1) {
    const leftItem = left.filters[index];
    const rightItem = right.filters[index];
    if (leftItem === undefined || rightItem === undefined || !sameFilterItem(leftItem, rightItem)) {
      return false;
    }
  }
  return true;
}

/** Drops filters whose columns are gone or no longer filterable. */
export function filterModelAfterColumnChange<TData extends RowData>(
  previous: FilterModel,
  nextRecords: readonly ColumnRecord<TData>[],
): FilterModel {
  const nextById = new Map(nextRecords.map((record) => [record.definition.colId, record]));
  const kept: FilterModelItem[] = [];
  for (const item of previous.filters) {
    const record = nextById.get(item.colId);
    if (record?.definition.filterable === true) {
      kept.push(item);
    }
  }
  if (kept.length === previous.filters.length) {
    return previous;
  }
  return freezeFilterModel(previous.join, kept);
}

export function filterModelWithColumn(
  model: FilterModel,
  columnId: ColumnId,
  filter: ColumnFilter | null,
): FilterModel {
  const kept = model.filters.filter((item) => item.colId !== columnId);
  if (filter === null) {
    return freezeFilterModel(model.join, kept);
  }
  return freezeFilterModel(model.join, [...kept, { colId: columnId, filter }]);
}

/** Validates a caller-supplied model. Predicate functions are returned separately. */
export function parseFilterModelInput<TData extends RowData>(
  value: unknown,
  records: readonly ColumnRecord<TData>[],
  currentJoin: FilterJoin,
): ParsedFilterModel<TData> {
  if (!isRecord(value)) {
    throw new GridError('invalid-column', 'Filter model must be an object.');
  }
  assertKnownKeys(value, ['join', 'filters'], 'Filter model', 'invalid-column');
  if (!Object.hasOwn(value, 'filters')) {
    throw new GridError('invalid-column', 'Filter model is missing "filters".');
  }
  const join = Object.hasOwn(value, 'join')
    ? readJoin(value.join, 'Filter model join')
    : currentJoin;
  return parseFilterList(value.filters, records, join, true);
}

/** Validates one column filter. Null clears that column. */
export function parseColumnFilterInput<TData extends RowData>(
  value: unknown,
): {
  readonly filter: ColumnFilter | null;
  readonly predicate: ColumnFilterPredicate<TData> | undefined;
} {
  if (value === null) {
    return { filter: null, predicate: undefined };
  }
  const parsed = parseOneFilter<TData>(value, 'Column filter', true);
  return { filter: parsed.filter, predicate: parsed.predicate };
}

/** Validates a filter model read from grid state. */
export function parseStoredFilterModel<TData extends RowData>(
  value: unknown,
  records: readonly ColumnRecord<TData>[],
): FilterModel {
  if (!isRecord(value)) {
    throw new GridError('invalid-state', 'Filter model must be an object.');
  }
  assertExactKeys(value, ['join', 'filters'], 'Filter model', 'invalid-state');
  const join = readJoin(value.join, 'Filter model join');
  return parseFilterList(value.filters, records, join, false).model;
}

function parseFilterList<TData extends RowData>(
  value: unknown,
  records: readonly ColumnRecord<TData>[],
  join: FilterJoin,
  acceptPredicate: boolean,
): ParsedFilterModel<TData> {
  if (!isUnknownArray(value)) {
    throw new GridError('invalid-column', 'Filter model filters must be an array.');
  }
  const byId = new Map(records.map((record) => [record.definition.colId, record]));
  const seen = new Set<string>();
  const filters: FilterModelItem[] = [];
  const predicates = new Map<ColumnId, ColumnFilterPredicate<TData>>();
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    const label = `Filter model item ${index}`;
    if (!isRecord(entry)) {
      throw new GridError('invalid-column', `${label} must be an object.`);
    }
    assertExactKeys(entry, ['colId', 'filter'], label, 'invalid-column');
    if (typeof entry.colId !== 'string' || entry.colId.trim().length === 0) {
      throw new GridError('invalid-column', `${label} colId must be a non-empty string.`);
    }
    if (seen.has(entry.colId)) {
      throw new GridError('invalid-column', `Duplicate filter column "${entry.colId}".`);
    }
    const record = byId.get(entry.colId);
    if (record === undefined) {
      throw new GridError('invalid-column', `Unknown filter column "${entry.colId}".`);
    }
    if (!record.definition.filterable) {
      throw new GridError('invalid-column', `Column "${entry.colId}" is not filterable.`);
    }
    seen.add(entry.colId);
    const parsed = parseOneFilter(entry.filter, `${label} filter`, acceptPredicate);
    filters.push({ colId: entry.colId, filter: parsed.filter });
    if (parsed.predicate !== undefined) {
      predicates.set(entry.colId, parsed.predicate);
    }
  }
  return { model: freezeFilterModel(join, filters), predicates };
}

function parseOneFilter<TData extends RowData>(
  value: unknown,
  label: string,
  acceptPredicate: boolean,
): { readonly filter: ColumnFilter; readonly predicate: ColumnFilterPredicate<TData> | undefined } {
  if (!isRecord(value)) {
    throw new GridError('invalid-column', `${label} must be an object.`);
  }
  const filterType = value.filterType;
  if (filterType === 'text') {
    return { filter: parseTextFilter(value, label), predicate: undefined };
  }
  if (filterType === 'number') {
    return { filter: parseNumberFilter(value, label), predicate: undefined };
  }
  if (filterType === 'date') {
    return { filter: parseDateFilter(value, label), predicate: undefined };
  }
  if (filterType === 'set') {
    return { filter: parseSetFilter(value, label), predicate: undefined };
  }
  if (filterType === 'custom') {
    return parseCustomFilter(value, label, acceptPredicate);
  }
  throw new GridError(
    'invalid-column',
    `${label} filterType must be "text", "number", "date", "set", or "custom".`,
  );
}

function parseTextFilter(value: Record<string, unknown>, label: string): TextColumnFilter {
  assertKnownKeys(
    value,
    ['filterType', 'operator', 'conditions', 'caseSensitive'],
    label,
    'invalid-column',
  );
  return Object.freeze({
    filterType: 'text',
    operator: readOptionalJoin(value, label),
    caseSensitive: readOptionalCase(value, label),
    conditions: Object.freeze(
      readConditions(value, label).map((entry, index) =>
        parseTextCondition(entry, `${label} condition ${index}`),
      ),
    ),
  });
}

function parseNumberFilter(value: Record<string, unknown>, label: string): NumberColumnFilter {
  assertKnownKeys(value, ['filterType', 'operator', 'conditions'], label, 'invalid-column');
  return Object.freeze({
    filterType: 'number',
    operator: readOptionalJoin(value, label),
    conditions: Object.freeze(
      readConditions(value, label).map((entry, index) =>
        parseNumberCondition(entry, `${label} condition ${index}`),
      ),
    ),
  });
}

function parseDateFilter(value: Record<string, unknown>, label: string): DateColumnFilter {
  assertKnownKeys(value, ['filterType', 'operator', 'conditions'], label, 'invalid-column');
  return Object.freeze({
    filterType: 'date',
    operator: readOptionalJoin(value, label),
    conditions: Object.freeze(
      readConditions(value, label).map((entry, index) =>
        parseDateCondition(entry, `${label} condition ${index}`),
      ),
    ),
  });
}

function parseSetFilter(value: Record<string, unknown>, label: string): SetColumnFilter {
  assertExactKeys(value, ['filterType', 'values'], label, 'invalid-column');
  if (!isUnknownArray(value.values)) {
    throw new GridError('invalid-column', `${label} values must be an array.`);
  }
  const seen = new Set<string>();
  const values: SetFilterValue[] = [];
  for (let index = 0; index < value.values.length; index += 1) {
    const entry = readSetValue(value.values[index], `${label} values ${index}`);
    const key = setValueKey(entry);
    if (seen.has(key)) {
      throw new GridError('invalid-column', `${label} values contain a duplicate.`);
    }
    seen.add(key);
    values.push(entry);
  }
  return Object.freeze({ filterType: 'set', values: Object.freeze(values) });
}

function parseCustomFilter<TData extends RowData>(
  value: Record<string, unknown>,
  label: string,
  acceptPredicate: boolean,
): { readonly filter: ColumnFilter; readonly predicate: ColumnFilterPredicate<TData> | undefined } {
  const allowed = acceptPredicate ? ['filterType', 'predicate'] : ['filterType'];
  assertKnownKeys(value, allowed, label, 'invalid-column');
  if (!Object.hasOwn(value, 'predicate')) {
    return { filter: Object.freeze({ filterType: 'custom' }), predicate: undefined };
  }
  if (typeof value.predicate !== 'function') {
    throw new GridError('invalid-column', `${label} predicate must be a function.`);
  }
  return {
    filter: Object.freeze({ filterType: 'custom' }),
    predicate: value.predicate as ColumnFilterPredicate<TData>,
  };
}

function parseTextCondition(value: unknown, label: string): TextFilterCondition {
  if (!isRecord(value)) {
    throw new GridError('invalid-column', `${label} must be an object.`);
  }
  assertExactKeys(value, ['type', 'filter'], label, 'invalid-column');
  if (!isTextOperator(value.type)) {
    throw new GridError('invalid-column', `${label} type is not a text operator.`);
  }
  if (typeof value.filter !== 'string') {
    throw new GridError('invalid-column', `${label} filter must be a string.`);
  }
  return Object.freeze({ type: value.type, filter: value.filter });
}

function parseNumberCondition(value: unknown, label: string): NumberFilterCondition {
  if (!isRecord(value)) {
    throw new GridError('invalid-column', `${label} must be an object.`);
  }
  assertKnownKeys(value, ['type', 'filter', 'filterTo'], label, 'invalid-column');
  if (!isNumberOperator(value.type)) {
    throw new GridError('invalid-column', `${label} type is not a number operator.`);
  }
  const filter = readFiniteNumber(value.filter, `${label} filter`);
  const filterTo = readBound(value, 'filterTo', label);
  if (value.type === 'inRange') {
    if (filterTo === null) {
      throw new GridError('invalid-column', `${label} inRange requires filterTo.`);
    }
    if (filter > filterTo) {
      throw new GridError(
        'invalid-column',
        `${label} inRange minimum cannot be greater than filterTo.`,
      );
    }
  } else if (filterTo !== null) {
    throw new GridError('invalid-column', `${label} filterTo is only valid for inRange.`);
  }
  return Object.freeze({ type: value.type, filter, filterTo });
}

function parseDateCondition(value: unknown, label: string): DateFilterCondition {
  if (!isRecord(value)) {
    throw new GridError('invalid-column', `${label} must be an object.`);
  }
  assertKnownKeys(value, ['type', 'dateFrom', 'dateTo'], label, 'invalid-column');
  if (!isDateOperator(value.type)) {
    throw new GridError('invalid-column', `${label} type is not a date operator.`);
  }
  const dateFrom = readDateOnly(value.dateFrom, `${label} dateFrom`);
  const dateTo = readOptionalDate(value, label);
  if (value.type === 'inRange') {
    if (dateTo === null) {
      throw new GridError('invalid-column', `${label} inRange requires dateTo.`);
    }
    const from = parseUtcDay(dateFrom);
    const to = parseUtcDay(dateTo);
    if (from === null || to === null || from > to) {
      throw new GridError('invalid-column', `${label} inRange start cannot be after dateTo.`);
    }
  } else if (dateTo !== null) {
    throw new GridError('invalid-column', `${label} dateTo is only valid for inRange.`);
  }
  return Object.freeze({ type: value.type, dateFrom, dateTo });
}

function readConditions(value: Record<string, unknown>, label: string): readonly unknown[] {
  if (!isUnknownArray(value.conditions) || value.conditions.length === 0) {
    throw new GridError('invalid-column', `${label} conditions must be a non-empty array.`);
  }
  return value.conditions;
}

function readOptionalJoin(value: Record<string, unknown>, label: string): FilterJoin {
  if (!Object.hasOwn(value, 'operator')) {
    return 'and';
  }
  return readJoin(value.operator, `${label} operator`);
}

function readJoin(value: unknown, label: string): FilterJoin {
  if (value !== 'and' && value !== 'or') {
    throw new GridError('invalid-column', `${label} must be "and" or "or".`);
  }
  return value;
}

function readOptionalCase(value: Record<string, unknown>, label: string): boolean | null {
  if (!Object.hasOwn(value, 'caseSensitive')) {
    return null;
  }
  if (value.caseSensitive === null) {
    return null;
  }
  if (typeof value.caseSensitive !== 'boolean') {
    throw new GridError('invalid-column', `${label} caseSensitive must be a boolean or null.`);
  }
  return value.caseSensitive;
}

function readBound(value: Record<string, unknown>, key: 'filterTo', label: string): number | null {
  if (!Object.hasOwn(value, key) || value[key] === null) {
    return null;
  }
  return readFiniteNumber(value[key], `${label} ${key}`);
}

function readOptionalDate(value: Record<string, unknown>, label: string): string | null {
  if (!Object.hasOwn(value, 'dateTo') || value.dateTo === null) {
    return null;
  }
  return readDateOnly(value.dateTo, `${label} dateTo`);
}

function readFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new GridError('invalid-column', `${label} must be a finite number.`);
  }
  return value;
}

function readDateOnly(value: unknown, label: string): string {
  if (typeof value !== 'string' || parseUtcDay(value) === null) {
    throw new GridError('invalid-column', `${label} must be a YYYY-MM-DD date.`);
  }
  return value;
}

function readSetValue(value: unknown, label: string): SetFilterValue {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  throw new GridError(
    'invalid-column',
    `${label} must be a string, finite number, boolean, or null.`,
  );
}

function setValueKey(value: SetFilterValue): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'number') {
    return `number:${String(value)}`;
  }
  if (typeof value === 'boolean') {
    return `boolean:${value ? '1' : '0'}`;
  }
  return `string:${value}`;
}

function freezeFilterModel(join: FilterJoin, filters: readonly FilterModelItem[]): FilterModel {
  return Object.freeze({
    join,
    filters: Object.freeze(
      filters.map((item) => Object.freeze({ colId: item.colId, filter: item.filter })),
    ),
  });
}

function sameFilterItem(left: FilterModelItem, right: FilterModelItem): boolean {
  return left.colId === right.colId && sameColumnFilter(left.filter, right.filter);
}

function sameColumnFilter(left: ColumnFilter, right: ColumnFilter): boolean {
  if (left.filterType !== right.filterType) {
    return false;
  }
  if (left.filterType === 'text' && right.filterType === 'text') {
    return (
      left.operator === right.operator &&
      left.caseSensitive === right.caseSensitive &&
      sameList(left.conditions, right.conditions, sameTextCondition)
    );
  }
  if (left.filterType === 'number' && right.filterType === 'number') {
    return (
      left.operator === right.operator &&
      sameList(left.conditions, right.conditions, sameNumberCondition)
    );
  }
  if (left.filterType === 'date' && right.filterType === 'date') {
    return (
      left.operator === right.operator &&
      sameList(left.conditions, right.conditions, sameDateCondition)
    );
  }
  if (left.filterType === 'set' && right.filterType === 'set') {
    return sameList(left.values, right.values, Object.is);
  }
  return left.filterType === 'custom' && right.filterType === 'custom';
}

function sameTextCondition(left: TextFilterCondition, right: TextFilterCondition): boolean {
  return left.type === right.type && left.filter === right.filter;
}

function sameNumberCondition(left: NumberFilterCondition, right: NumberFilterCondition): boolean {
  return (
    left.type === right.type && left.filter === right.filter && left.filterTo === right.filterTo
  );
}

function sameDateCondition(left: DateFilterCondition, right: DateFilterCondition): boolean {
  return (
    left.type === right.type && left.dateFrom === right.dateFrom && left.dateTo === right.dateTo
  );
}

function sameList<T>(
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

function isTextOperator(value: unknown): value is TextFilterOperator {
  return typeof value === 'string' && TEXT_OPERATORS.has(value);
}

function isNumberOperator(value: unknown): value is NumberFilterOperator {
  return typeof value === 'string' && NUMBER_OPERATORS.has(value);
}

function isDateOperator(value: unknown): value is DateFilterOperator {
  return typeof value === 'string' && DATE_OPERATORS.has(value);
}
