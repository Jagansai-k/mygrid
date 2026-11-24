/** Import path for the base stylesheet. */
export const themeStylesheet = '@inno-grid/mygrid-themes/theme.css';

/** CSS custom properties owned by the base theme. */
export const themeTokens = {
  fontFamily: '--mygrid-font-family',
  colorSurface: '--mygrid-color-surface',
  colorText: '--mygrid-color-text',
  colorBorder: '--mygrid-color-border',
  colorHeader: '--mygrid-color-header',
  colorAccent: '--mygrid-color-accent',
  spaceCellX: '--mygrid-space-cell-x',
  spaceCellY: '--mygrid-space-cell-y',
  radius: '--mygrid-radius',
  focusRing: '--mygrid-focus-ring',
} as const;

export type ThemeTokenName = keyof typeof themeTokens;
export type ThemeToken = (typeof themeTokens)[ThemeTokenName];
