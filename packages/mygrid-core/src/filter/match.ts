import type {
  DateFilterCondition,
  DateFilterOperator,
  NumberFilterCondition,
  NumberFilterOperator,
  TextFilterCondition,
  TextFilterOperator,
} from '../types';

const DAY_MS = 86_400_000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * UTC calendar-day number for a `YYYY-MM-DD` string.
 * Returns null when the string is not that form or is not a real date.
 */
export function parseUtcDay(value: string): number | null {
  const match = DATE_ONLY.exec(value);
  if (match === null) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  const parsed = new Date(utc);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return utc / DAY_MS;
}

/** Text filters see strings, finite numbers, booleans, and valid dates. Other values are blank. */
export function textValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }
  return null;
}

export function textMatches(
  value: unknown,
  condition: TextFilterCondition,
  caseSensitive: boolean,
): boolean {
  const text = textValue(value);
  const expected = caseSensitive ? condition.filter : condition.filter.toLowerCase();
  const actual = text === null ? null : caseSensitive ? text : text.toLowerCase();
  return compareText(actual, expected, condition.type);
}

function compareText(
  actual: string | null,
  expected: string,
  operator: TextFilterOperator,
): boolean {
  if (actual === null) {
    return operator === 'notContains' || operator === 'notEqual';
  }
  switch (operator) {
    case 'contains':
      return actual.includes(expected);
    case 'notContains':
      return !actual.includes(expected);
    case 'equals':
      return actual === expected;
    case 'notEqual':
      return actual !== expected;
    case 'startsWith':
      return actual.startsWith(expected);
    case 'endsWith':
      return actual.endsWith(expected);
    default: {
      const unreachable: never = operator;
      return unreachable;
    }
  }
}

/** Number filters accept finite numbers only. */
export function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function numberMatches(value: unknown, condition: NumberFilterCondition): boolean {
  const actual = numberValue(value);
  if (actual === null) {
    return false;
  }
  return compareNumber(actual, condition.filter, condition.filterTo, condition.type);
}

function compareNumber(
  actual: number,
  expected: number,
  upper: number | null,
  operator: NumberFilterOperator,
): boolean {
  switch (operator) {
    case 'equals':
      return actual === expected;
    case 'notEqual':
      return actual !== expected;
    case 'greaterThan':
      return actual > expected;
    case 'greaterThanOrEqual':
      return actual >= expected;
    case 'lessThan':
      return actual < expected;
    case 'lessThanOrEqual':
      return actual <= expected;
    case 'inRange':
      return upper !== null && actual >= expected && actual <= upper;
    default: {
      const unreachable: never = operator;
      return unreachable;
    }
  }
}

/**
 * Date filters use the UTC calendar day.
 * A cell may be a `Date`, a finite timestamp, or a `YYYY-MM-DD` string.
 */
export function dateValue(value: unknown): number | null {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? Math.floor(time / DAY_MS) : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.floor(value / DAY_MS) : null;
  }
  if (typeof value === 'string') {
    return parseUtcDay(value);
  }
  return null;
}

export function dateMatches(value: unknown, condition: DateFilterCondition): boolean {
  const actual = dateValue(value);
  if (actual === null) {
    return false;
  }
  const from = parseUtcDay(condition.dateFrom);
  if (from === null) {
    return false;
  }
  return compareDate(actual, from, condition.dateTo, condition.type);
}

function compareDate(
  actual: number,
  from: number,
  dateTo: string | null,
  operator: DateFilterOperator,
): boolean {
  switch (operator) {
    case 'equals':
      return actual === from;
    case 'before':
      return actual < from;
    case 'after':
      return actual > from;
    case 'inRange': {
      if (dateTo === null) {
        return false;
      }
      const to = parseUtcDay(dateTo);
      return to !== null && actual >= from && actual <= to;
    }
    default: {
      const unreachable: never = operator;
      return unreachable;
    }
  }
}
