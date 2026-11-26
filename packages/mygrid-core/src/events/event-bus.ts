import type { GridEvent, GridEventListener, GridEventType, RowData } from '../types';
import { GRID_EVENT_TYPES } from '../types';

type AnyListener<TData extends RowData, TContext> = (event: GridEvent<TData, TContext>) => void;

/**
 * Typed event registry.
 * A listener that throws does not prevent later listeners from running.
 * Removing a listener during dispatch skips it if it has not run yet.
 */
export class GridEventBus<TData extends RowData, TContext = unknown> {
  private readonly listeners = new Map<GridEventType, Set<AnyListener<TData, TContext>>>();

  add<TType extends GridEventType>(
    type: TType,
    listener: GridEventListener<TData, TType, TContext>,
  ): boolean {
    const bucket = this.bucket(type);
    const wrapped = listener as AnyListener<TData, TContext>;
    if (bucket.has(wrapped)) {
      return false;
    }
    bucket.add(wrapped);
    return true;
  }

  remove<TType extends GridEventType>(
    type: TType,
    listener: GridEventListener<TData, TType, TContext>,
  ): void {
    this.listeners.get(type)?.delete(listener as AnyListener<TData, TContext>);
  }

  emit(event: GridEvent<TData, TContext>): unknown[] {
    const bucket = this.listeners.get(event.type);
    if (bucket === undefined) {
      return [];
    }
    const frozen = Object.freeze(event);
    const errors: unknown[] = [];
    for (const listener of [...bucket]) {
      if (!bucket.has(listener)) {
        continue;
      }
      try {
        listener(frozen);
      } catch (error: unknown) {
        errors.push(error);
      }
    }
    return errors;
  }

  clear(): void {
    this.listeners.clear();
  }

  private bucket(type: GridEventType): Set<AnyListener<TData, TContext>> {
    const existing = this.listeners.get(type);
    if (existing !== undefined) {
      return existing;
    }
    const created = new Set<AnyListener<TData, TContext>>();
    this.listeners.set(type, created);
    return created;
  }
}

export function isGridEventType(value: unknown): value is GridEventType {
  return typeof value === 'string' && (GRID_EVENT_TYPES as readonly string[]).includes(value);
}
