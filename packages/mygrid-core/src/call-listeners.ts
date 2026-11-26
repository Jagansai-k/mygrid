/** Invokes every listener. One failure does not skip the rest. */
export function callListeners(listeners: readonly (() => void)[]): unknown[] {
  const errors: unknown[] = [];
  for (const listener of listeners) {
    try {
      listener();
    } catch (error: unknown) {
      errors.push(error);
    }
  }
  return errors;
}

/** Re-throws a single listener error, or an AggregateError when several threw. */
export function throwCollected(errors: readonly unknown[]): void {
  if (errors.length === 0) {
    return;
  }
  if (errors.length === 1) {
    const error = errors[0];
    throw error;
  }
  throw new AggregateError([...errors], 'A grid listener threw.');
}
