/**
 * Descriptor a framework package publishes for itself.
 * Creating one does not create a grid.
 */
export interface GridAdapter {
  readonly framework: string;
  readonly version: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`GridAdapter.${field} must be a non-empty string.`);
  }
  return value.trim();
}

/**
 * Validates and freezes an adapter descriptor.
 * Framework packages call this from their own module. The core package does
 * not import a framework, and this function does not touch the DOM.
 *
 * The argument is checked at runtime so plain JavaScript callers cannot pass
 * a missing or empty field.
 */
export function defineGridAdapter(adapter: GridAdapter): GridAdapter {
  if (!isRecord(adapter)) {
    throw new Error('GridAdapter must be an object.');
  }

  return Object.freeze({
    framework: requiredText(adapter.framework, 'framework'),
    version: requiredText(adapter.version, 'version'),
  });
}
