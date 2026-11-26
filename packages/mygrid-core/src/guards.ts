import { GridError, type GridErrorCode } from './errors';

/** A non-null, non-array object. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Array.isArray typed as unknown entries instead of any. */
export function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

/**
 * Rejects keys that this version of the engine does not understand.
 * Missing keys are allowed so optional fields can be omitted.
 */
export function assertKnownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
  code: GridErrorCode,
): void {
  const permitted = new Set<string>(allowed);
  for (const key of Object.keys(value)) {
    if (!permitted.has(key)) {
      throw new GridError(code, `${label} has unknown property "${key}".`);
    }
  }
}

/** Requires every listed key and rejects every other key. */
export function assertExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
  code: GridErrorCode,
): void {
  assertKnownKeys(value, keys, label, code);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) {
      throw new GridError(code, `${label} is missing "${key}".`);
    }
  }
}

/** Reads an own data property. Inherited properties are ignored. */
export function readOwnValue(data: object, field: string): unknown {
  if (!Object.hasOwn(data, field)) {
    return undefined;
  }
  return (data as Record<string, unknown>)[field];
}
