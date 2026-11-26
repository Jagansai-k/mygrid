/** Color foundation used when a host does not set a theme attribute. */
export const defaultTheme = 'light' as const;

export const themeNames = ['light', 'dark'] as const;

export type ThemeName = (typeof themeNames)[number];

export const densityNames = ['compact', 'default', 'comfortable'] as const;

export type DensityName = (typeof densityNames)[number];

/** Public stylesheet entry points. Hosts import these paths; the JS module does not. */
export const themeStylesheets = {
  theme: '@inno-grid/mygrid-themes/theme.css',
  light: '@inno-grid/mygrid-themes/light.css',
  dark: '@inno-grid/mygrid-themes/dark.css',
  density: '@inno-grid/mygrid-themes/density.css',
} as const;

/** Import path for the default stylesheet: light colors, default density, and structure. */
export const themeStylesheet = themeStylesheets.theme;

/** CSS custom properties owned by the themes. */
export const themeTokens = {
  fontFamily: '--mygrid-font-family',
  fontSize: '--mygrid-font-size',
  lineHeight: '--mygrid-line-height',
  colorSurface: '--mygrid-color-surface',
  colorText: '--mygrid-color-text',
  colorBorder: '--mygrid-color-border',
  colorHeader: '--mygrid-color-header',
  colorAccent: '--mygrid-color-accent',
  spaceCellX: '--mygrid-space-cell-x',
  spaceCellY: '--mygrid-space-cell-y',
  radius: '--mygrid-radius',
  focusRing: '--mygrid-focus-ring',
  rowHeight: '--mygrid-row-height',
  headerHeight: '--mygrid-header-height',
} as const;

export type ThemeTokenName = keyof typeof themeTokens;
export type ThemeToken = (typeof themeTokens)[ThemeTokenName];
