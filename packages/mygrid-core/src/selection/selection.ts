import { GridError } from '../errors';
import type { RowData, RowId, RowNode, SelectionMode } from '../types';

/** Rejects a selection the current mode cannot store. An empty selection is allowed in every mode. */
export function assertSelectionFits(ids: readonly RowId[], mode: SelectionMode): void {
  if (mode === 'none' && ids.length > 0) {
    throw new GridError('invalid-selection', 'Selection is disabled.');
  }
  if (mode === 'single' && ids.length > 1) {
    throw new GridError('invalid-selection', 'Single selection accepts one row.');
  }
}

/** Reads a row id that must already exist in the source rows. */
export function requireSourceRowId<TData extends RowData>(
  value: unknown,
  nodes: readonly RowNode<TData>[],
): RowId {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new GridError('invalid-selection', 'Row id must be a non-empty string.');
  }
  if (!nodes.some((node) => node.id === value)) {
    throw new GridError('invalid-selection', `Selected row "${value}" does not exist.`);
  }
  return value;
}

export function parseSelectionMode(value: unknown): SelectionMode {
  if (value === 'none' || value === 'single' || value === 'multiple') {
    return value;
  }
  throw new GridError('invalid-state', 'Selection mode must be "none", "single", or "multiple".');
}
