import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { defineGridAdapter, MYGRID_CORE_VERSION, MYGRID_LIBRARY_NAME } from './index';
import type { GridAdapter } from './index';

describe('core foundation', () => {
  it('exposes the library name and the package version', () => {
    const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };

    expect(MYGRID_LIBRARY_NAME).toBe('mygrid');
    expect(MYGRID_CORE_VERSION).toBe(packageJson.version);
  });

  it('returns a frozen copy of a valid adapter', () => {
    const input: { framework: string; version: string } = {
      framework: 'react',
      version: '0.0.0',
    };
    const adapter = defineGridAdapter(input);

    expect(adapter).toEqual({ framework: 'react', version: '0.0.0' });
    expect(adapter).not.toBe(input);
    expect(Object.isFrozen(adapter)).toBe(true);

    input.framework = 'changed';
    expect(adapter.framework).toBe('react');
  });

  it('trims fields and rejects empty or non-object input', () => {
    expect(defineGridAdapter({ framework: '  vue  ', version: ' 1.2.3 ' })).toEqual({
      framework: 'vue',
      version: '1.2.3',
    });

    expect(() => defineGridAdapter(null as unknown as GridAdapter)).toThrow(/object/);
    expect(() => defineGridAdapter({ framework: '   ', version: '0.0.0' })).toThrow(/framework/);
    expect(() => defineGridAdapter({ framework: 'react', version: '' })).toThrow(/version/);
    expect(() =>
      defineGridAdapter({ framework: 1, version: '0.0.0' } as unknown as GridAdapter),
    ).toThrow(/framework/);
  });
});
