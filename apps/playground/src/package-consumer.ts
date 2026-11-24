import {
  defineGridAdapter,
  MYGRID_CORE_VERSION,
  MYGRID_LIBRARY_NAME,
} from '@inno-grid/mygrid-core';
import type { GridAdapter } from '@inno-grid/mygrid-core';
import { MYGRID_REACT_VERSION, reactGridAdapter } from '@inno-grid/mygrid-react';
import type { MyGridDensity, MyGridProps, MyGridTheme } from '@inno-grid/mygrid-react';
import {
  defaultTheme,
  densityNames,
  MYGRID_THEMES_VERSION,
  themeNames,
  themeStylesheet,
  themeStylesheets,
  themeTokens,
} from '@inno-grid/mygrid-themes';
import type { DensityName, ThemeName, ThemeToken } from '@inno-grid/mygrid-themes';
import '@inno-grid/mygrid-themes/theme.css';
import '@inno-grid/mygrid-themes/light.css';
import '@inno-grid/mygrid-themes/dark.css';
import '@inno-grid/mygrid-themes/density.css';

const themes: readonly MyGridTheme[] = themeNames;
const densities: readonly MyGridDensity[] = densityNames;

/**
 * Uses the published entry points together so typecheck fails when a declaration
 * or a CSS export disappears. The playground renders the returned string.
 */
export function describeConsumer(): string {
  const adapter: GridAdapter = defineGridAdapter({
    framework: 'consumer',
    version: MYGRID_CORE_VERSION,
  });
  const theme: ThemeName | undefined = themes[0];
  const density: DensityName | undefined = densities[1];
  if (theme === undefined || density === undefined) {
    throw new Error('Theme and density names must not be empty.');
  }
  const selectedTheme: MyGridTheme = theme;
  const selectedDensity: MyGridDensity = density;
  const token: ThemeToken = themeTokens.colorAccent;
  const props: MyGridProps = {
    theme: selectedTheme,
    density: selectedDensity,
  };

  return [
    MYGRID_LIBRARY_NAME,
    adapter.framework,
    reactGridAdapter.framework,
    MYGRID_REACT_VERSION,
    MYGRID_THEMES_VERSION,
    defaultTheme,
    themeStylesheet,
    themeStylesheets.dark,
    token,
    props.theme ?? '',
    props.density ?? '',
  ].join(' ');
}
