import { GridError } from './errors';
import { isRecord, isUnknownArray } from './guards';

/**
 * Rejects values JSON would drop or rewrite.
 * Shared acyclic references are allowed. Cycles, functions, and class instances are not.
 */
export function assertJsonValue(value: unknown, path: string, seen: WeakSet<object>): void {
  if (value === null) {
    return;
  }

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'boolean') {
    return;
  }
  if (valueType === 'number') {
    if (!Number.isFinite(value)) {
      throw new GridError('invalid-serialization', `${path} must be a finite number.`);
    }
    return;
  }
  if (
    valueType === 'undefined' ||
    valueType === 'function' ||
    valueType === 'symbol' ||
    valueType === 'bigint'
  ) {
    throw new GridError('invalid-serialization', `${path} cannot be serialized.`);
  }
  if (isUnknownArray(value)) {
    const entries = value;
    walkCollection(entries, path, seen, () => {
      for (let index = 0; index < entries.length; index += 1) {
        if (!Object.hasOwn(entries, index)) {
          throw new GridError('invalid-serialization', `${path}[${index}] cannot be serialized.`);
        }
        assertJsonValue(entries[index], `${path}[${index}]`, seen);
      }
    });
    return;
  }
  if (!isRecord(value)) {
    throw new GridError('invalid-serialization', `${path} cannot be serialized.`);
  }

  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new GridError('invalid-serialization', `${path} must be a plain object.`);
  }

  walkCollection(value, path, seen, () => {
    for (const key of Object.keys(value)) {
      assertJsonValue(value[key], `${path}.${key}`, seen);
    }
  });
}

function walkCollection(
  value: object,
  path: string,
  seen: WeakSet<object>,
  visit: () => void,
): void {
  if (seen.has(value)) {
    throw new GridError('invalid-serialization', `${path} contains a circular reference.`);
  }
  seen.add(value);
  try {
    visit();
  } finally {
    seen.delete(value);
  }
}
