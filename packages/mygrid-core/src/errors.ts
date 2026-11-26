/**
 * Stable codes for engine failures.
 * Listeners and host code can branch on `code` without parsing message text.
 */
export type GridErrorCode =
  | 'invalid-column'
  | 'invalid-row'
  | 'invalid-state'
  | 'invalid-selection'
  | 'invalid-focus'
  | 'invalid-event'
  | 'invalid-serialization'
  | 'destroyed';

/**
 * Error thrown when grid input or a state transition is rejected.
 * The grid is left unchanged when a mutating call throws.
 */
export class GridError extends Error {
  readonly code: GridErrorCode;

  constructor(code: GridErrorCode, message: string) {
    super(message);
    this.name = 'GridError';
    this.code = code;
  }
}

/** Type guard for {@link GridError}. */
export function isGridError(error: unknown): error is GridError {
  return error instanceof GridError;
}
