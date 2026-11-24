import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MYGRID_REACT_VERSION, reactGridAdapter } from './index';

describe('react foundation', () => {
  it('matches package.json and describes the react adapter', () => {
    const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };

    expect(MYGRID_REACT_VERSION).toBe(packageJson.version);
    expect(reactGridAdapter).toEqual({
      framework: 'react',
      version: packageJson.version,
    });
  });
});
