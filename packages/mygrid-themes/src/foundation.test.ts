import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { themeEntryFiles, themeSourceFiles } from './theme-files';
import {
  defaultTheme,
  densityNames,
  MYGRID_THEMES_VERSION,
  themeNames,
  themeStylesheet,
  themeStylesheets,
  themeTokens,
} from './index';

const cssDirectory = new URL('./css/', import.meta.url);

function readThemeSources(): string {
  return themeSourceFiles
    .map((file) => readFileSync(new URL(file, cssDirectory), 'utf8'))
    .join('\n');
}

describe('themes foundation', () => {
  it('matches package.json and points at the stylesheet exports', () => {
    const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };

    expect(MYGRID_THEMES_VERSION).toBe(packageJson.version);
    expect(defaultTheme).toBe('light');
    expect(themeNames).toEqual(['light', 'dark']);
    expect(densityNames).toEqual(['compact', 'default', 'comfortable']);
    expect(themeStylesheet).toBe('@inno-grid/mygrid-themes/theme.css');
    expect(themeStylesheets).toEqual({
      theme: '@inno-grid/mygrid-themes/theme.css',
      light: '@inno-grid/mygrid-themes/light.css',
      dark: '@inno-grid/mygrid-themes/dark.css',
      density: '@inno-grid/mygrid-themes/density.css',
    });
    expect(themeEntryFiles).toEqual(['light.css', 'dark.css', 'density.css']);
  });

  it('keeps the source files and the cascade list in sync', () => {
    expect(readdirSync(cssDirectory).sort()).toEqual([...themeSourceFiles].sort());
  });

  it('keeps every token defined in the theme sources', () => {
    const defined = new Set(
      [...readThemeSources().matchAll(/(--mygrid-[a-z0-9-]+)\s*:/g)].flatMap((match) => {
        const token = match[1];
        return token === undefined ? [] : [token];
      }),
    );
    const declared = new Set(Object.values(themeTokens));

    expect(defined).toEqual(declared);
    expect([...declared].every((token) => token.startsWith('--mygrid-'))).toBe(true);
  });

  it('defines light, dark, and density selectors without painting colors in the structure sheet', () => {
    const light = readFileSync(new URL('light.css', cssDirectory), 'utf8');
    const dark = readFileSync(new URL('dark.css', cssDirectory), 'utf8');
    const density = readFileSync(new URL('density.css', cssDirectory), 'utf8');
    const structure = readFileSync(new URL('structure.css', cssDirectory), 'utf8');

    expect(light).toContain(':root');
    expect(light).toContain("[data-mygrid-theme='light']");
    expect(dark).toContain("[data-mygrid-theme='dark']");
    expect(density).toContain("[data-mygrid-density='compact']");
    expect(density).toContain("[data-mygrid-density='default']");
    expect(density).toContain("[data-mygrid-density='comfortable']");
    expect(structure).toContain('[data-mygrid]');
    expect(structure).not.toMatch(/--mygrid-[a-z0-9-]+\s*:/);
  });
});
