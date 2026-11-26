import type { SortDirection } from '../types';

/**
 * Compares two field values.
 * Null, undefined, NaN, and invalid dates stay after defined values in both directions.
 * Defined values use ascending order, then the direction reverses that result.
 */
export function compareValues(
  left: unknown,
  right: unknown,
  direction: SortDirection,
  caseSensitive: boolean,
): number {
  const leftEmpty = isEmptySortValue(left);
  const rightEmpty = isEmptySortValue(right);
  if (leftEmpty || rightEmpty) {
    if (leftEmpty && rightEmpty) {
      return 0;
    }
    return leftEmpty ? 1 : -1;
  }
  const ascending = compareDefined(left, right, caseSensitive);
  if (ascending === 0) {
    return 0;
  }
  return direction === 'desc' ? -ascending : ascending;
}

function compareDefined(left: unknown, right: unknown, caseSensitive: boolean): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return compareOrdered(left, right);
  }
  if (typeof left === 'string' && typeof right === 'string') {
    return compareStrings(left, right, caseSensitive);
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }
  if (left instanceof Date && right instanceof Date) {
    return compareOrdered(left.getTime(), right.getTime());
  }
  return typeRank(left) - typeRank(right);
}

function compareStrings(left: string, right: string, caseSensitive: boolean): number {
  if (!caseSensitive) {
    const folded = compareOrdered(left.toLowerCase(), right.toLowerCase());
    if (folded !== 0) {
      return folded;
    }
  }
  return compareOrdered(left, right);
}

function compareOrdered(left: number | string, right: number | string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function isEmptySortValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'number') {
    return !Number.isFinite(value);
  }
  return value instanceof Date && !Number.isFinite(value.getTime());
}

function typeRank(value: unknown): number {
  if (typeof value === 'number') {
    return 0;
  }
  if (typeof value === 'string') {
    return 1;
  }
  if (typeof value === 'boolean') {
    return 2;
  }
  if (value instanceof Date) {
    return 3;
  }
  return 4;
}
