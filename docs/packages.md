# Packages

## @inno-grid/mygrid-core

```ts
import {
  createGrid,
  defineGridAdapter,
  GRID_STATE_FORMAT_VERSION,
  MYGRID_CORE_VERSION,
  MYGRID_LIBRARY_NAME,
  restoreGridState,
  serializeGridState,
} from '@inno-grid/mygrid-core';
import type { GridAdapter, GridApi, GridOptions, GridState } from '@inno-grid/mygrid-core';
```

| Export                      | Meaning                                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `MYGRID_LIBRARY_NAME`       | The string `mygrid`.                                                                                                               |
| `MYGRID_CORE_VERSION`       | This package's version.                                                                                                            |
| `GridAdapter`               | `{ framework, version }` descriptor.                                                                                               |
| `defineGridAdapter`         | Validates and freezes a descriptor. Does not create a grid.                                                                        |
| `createGrid`                | Creates an in-memory grid for a caller-supplied row type. Does not touch the DOM.                                                  |
| `GridOptions` / `GridApi`   | Engine input and the public method surface.                                                                                        |
| `GridState`                 | Frozen snapshot of source rows, displayed ids, columns, sort model, filter model, pagination, selection, focus, and configuration. |
| `serializeGridState`        | Version 1 JSON. Rejects functions and circular references.                                                                         |
| `restoreGridState`          | Validates a version 1 snapshot. Pass `getRowId` when the saved ids came from that function.                                        |
| `GRID_STATE_FORMAT_VERSION` | `1`.                                                                                                                               |
| `GridError`                 | Error for rejected input. `code` is stable.                                                                                        |

`getDisplayedRowCount` is the filtered and sorted row count. Pagination is a zero-based window over that list and does not change that count. It is disabled unless `pagination.enabled` is true. Sorting changes displayed order inside that subset. `filterable` opts a column into filtering. Selection stores source row ids and defaults to multiple selection. `refreshCells` reads current field values and does not paint. The React package calls `createGrid` and renders the page returned by `getRowNodeAtPageIndex`.

Build output: `dist/index.js`, `dist/index.d.ts`.

## @inno-grid/mygrid-react

```tsx
import { MyGrid, MYGRID_REACT_VERSION, reactGridAdapter } from '@inno-grid/mygrid-react';
import type {
  MyGridDensity,
  MyGridFilterKind,
  MyGridProps,
  MyGridTheme,
} from '@inno-grid/mygrid-react';
```

| Export                 | Meaning                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `MyGrid`               | Client component. Renders a table from the core API when `columnDefs` is set.        |
| `MyGridProps`          | Row data, column definitions, creation options, callbacks, theme, density, and size. |
| `MyGridTheme`          | `'light'` or `'dark'`.                                                               |
| `MyGridDensity`        | `'compact'`, `'default'`, or `'comfortable'`.                                        |
| `MyGridFilterKind`     | `'text'` or `'number'`. The editor kind is chosen with `numberFilterColumns`.        |
| `reactGridAdapter`     | Frozen adapter whose framework is `react`.                                           |
| `MYGRID_REACT_VERSION` | This package's version.                                                              |

The root element sets `data-mygrid="mygrid"` and `data-mygrid-adapter="react"`. It sets `data-mygrid-theme` and `data-mygrid-density` when those props are passed. It does not set `role="grid"`. The table inside is a native table. `onGridReady` provides the core `GridApi`. See `packages/mygrid-react/README.md` for a usage example.

Peers: `react@^19` and `react-dom@^19`.

Build output: `dist/index.js`, `dist/index.d.ts`. The JavaScript file starts with `'use client'`.

## @inno-grid/mygrid-themes

```ts
import '@inno-grid/mygrid-themes/theme.css';
import {
  defaultTheme,
  densityNames,
  MYGRID_THEMES_VERSION,
  themeNames,
  themeStylesheet,
  themeStylesheets,
  themeTokens,
} from '@inno-grid/mygrid-themes';
import type { DensityName, ThemeName, ThemeToken, ThemeTokenName } from '@inno-grid/mygrid-themes';
```

| Export                               | Meaning                                                        |
| ------------------------------------ | -------------------------------------------------------------- |
| `@inno-grid/mygrid-themes/theme.css` | Default stylesheet: light, dark, density, and mount rules.     |
| `./light.css`, `./dark.css`          | Color foundations. Light is also the default on `:root`.       |
| `./density.css`                      | `compact`, `default`, and `comfortable` spacing and type size. |
| `themeStylesheet`                    | The `theme.css` import path, as a string.                      |
| `themeStylesheets`                   | The four CSS import paths.                                     |
| `defaultTheme`                       | `'light'`.                                                     |
| `themeNames` / `densityNames`        | The public theme and density names.                            |
| `themeTokens`                        | Map of token name to `--mygrid-*` custom property.             |
| `ThemeToken` / `ThemeTokenName`      | Types for that map.                                            |
| `MYGRID_THEMES_VERSION`              | This package's version.                                        |

The Vite build writes those CSS files into `dist`. The JavaScript entry does not import them. `structure.css` is a source file included in `theme.css`; it is not its own export.

## What is intentionally absent

No package implements grouping, pivoting, or editing. Sorting, filtering, pagination, and row selection run in the core engine. The React package creates the grid and virtualizes the rows and columns it paints. See `IMPLEMENTATION_STATUS.md`.
