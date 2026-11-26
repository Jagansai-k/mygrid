import { GridError } from '../errors';
import type { RowData, RowId } from '../types';

const GENERATED_ROW_ID = /^row:(\d+)$/;

/** Reads a usable `id` field. A missing field returns undefined. A present bad value throws. */
export function readOwnRowId(data: object): RowId | undefined {
  if (!Object.hasOwn(data, 'id')) {
    return undefined;
  }
  const value = (data as { id: unknown }).id;
  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      throw new GridError('invalid-row', 'Row id must be a non-empty string.');
    }
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  throw new GridError('invalid-row', 'Row id must be a string or a finite number.');
}

export function assertRowId(value: unknown, label: string): RowId {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new GridError('invalid-row', `${label} must be a non-empty string.`);
  }
  return value;
}

// TData is the caller's row type. There is no runtime value that can name it twice.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function assertRowObject<TData extends RowData>(value: unknown, label: string): TData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new GridError('invalid-row', `${label} must be an object.`);
  }
  return value as TData;
}

/** Moves a generated-id counter past every `row:N` id in the list. */
export function bumpGeneratedCounter(counter: number, ids: readonly RowId[]): number {
  let next = counter;
  for (const id of ids) {
    const match = GENERATED_ROW_ID.exec(id);
    const digits = match?.[1];
    if (digits === undefined) {
      continue;
    }
    const value = Number(digits);
    if (value >= next) {
      next = value + 1;
    }
  }
  return next;
}
