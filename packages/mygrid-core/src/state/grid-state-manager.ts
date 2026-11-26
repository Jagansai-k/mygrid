import { throwCollected } from '../call-listeners';
import type { GridState, GridStateListener, RowData } from '../types';
import { diffState } from './grid-state';

/**
 * Holds one {@link GridState} and notifies subscribers only when it changes.
 * The grid keeps the row and column models aligned with this snapshot.
 */
export interface GridStateManager<TData extends RowData> {
  getState(): GridState<TData>;
  setState(state: GridState<TData>): void;
  updateState(updater: (state: GridState<TData>) => GridState<TData>): void;
  subscribe(listener: GridStateListener<TData>): () => void;
  unsubscribe(listener: GridStateListener<TData>): void;
}

export interface GridStateController<TData extends RowData> extends GridStateManager<TData> {
  /** Stores the next snapshot without notifying. The caller notifies after its own events. */
  replace(state: GridState<TData>): void;
  notify(previous: GridState<TData>): unknown[];
  clear(): void;
}

export function createGridStateManager<TData extends RowData>(
  initial: GridState<TData>,
  validate: (state: GridState<TData>) => void,
): GridStateController<TData> {
  let current = initial;
  const listeners = new Set<GridStateListener<TData>>();
  validate(current);

  const replace = (state: GridState<TData>): void => {
    current = state;
  };

  const notify = (previous: GridState<TData>): unknown[] => {
    const snapshot = current;
    return notifyListeners([...listeners], (listener) => {
      if (!listeners.has(listener)) {
        return;
      }
      listener(snapshot, previous);
    });
  };

  return {
    getState: () => current,
    setState: (state) => {
      validate(state);
      if (diffState(current, state).length === 0) {
        return;
      }
      const previous = current;
      current = state;
      throwCollected(notify(previous));
    },
    updateState: (updater) => {
      const next = updater(current);
      validate(next);
      if (diffState(current, next).length === 0) {
        return;
      }
      const previous = current;
      current = next;
      throwCollected(notify(previous));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    unsubscribe: (listener) => {
      listeners.delete(listener);
    },
    replace,
    notify,
    clear: () => {
      listeners.clear();
    },
  };
}

function notifyListeners<T>(listeners: readonly T[], call: (listener: T) => void): unknown[] {
  const errors: unknown[] = [];
  for (const listener of listeners) {
    try {
      call(listener);
    } catch (error: unknown) {
      errors.push(error);
    }
  }
  return errors;
}
