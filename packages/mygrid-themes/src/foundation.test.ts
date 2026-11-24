import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MYGRID_THEMES_VERSION, themeStylesheet, themeTokens } from './index';

describe('themes foundation', () => {
  it('matches package.json and points at the stylesheet export', () => {
    const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };

    expect(MYGRID_THEMES_VERSION).toBe(packageJson.version);
    expect(themeStylesheet).toBe('@inno-grid/mygrid-themes/theme.css');
  });

  it('keeps every token defined in the base stylesheet', () => {
    const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8');
    const defined = new Set(
      [...css.matchAll(/(--mygrid-[a-z0-9-]+)\s*:/g)].flatMap((match) => {
        const token = match[1];
        return token === undefined ? [] : [token];
      }),
    );
    const declared = new Set(Object.values(themeTokens));

    expect(defined).toEqual(declared);
    expect([...declared].every((token) => token.startsWith('--mygrid-'))).toBe(true);
  });
});
