/**
 * Cascade order for the default stylesheet.
 * Light sets the default colors, dark overrides them, density sets spacing,
 * and structure only consumes the custom properties.
 */
export const themeSourceFiles = ['light.css', 'dark.css', 'density.css', 'structure.css'] as const;

/** Stylesheets published as their own export. `structure.css` is part of `theme.css` only. */
export const themeEntryFiles = ['light.css', 'dark.css', 'density.css'] as const;
