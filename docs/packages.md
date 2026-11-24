# Packages

## @inno-grid/mygrid-core

```ts
import {
  defineGridAdapter,
  MYGRID_CORE_VERSION,
  MYGRID_LIBRARY_NAME,
} from '@inno-grid/mygrid-core';
import type { GridAdapter } from '@inno-grid/mygrid-core';
```

| Export                | Meaning                                                     |
| --------------------- | ----------------------------------------------------------- |
| `MYGRID_LIBRARY_NAME` | The string `mygrid`.                                        |
| `MYGRID_CORE_VERSION` | This package's version.                                     |
| `GridAdapter`         | `{ framework, version }` descriptor.                        |
| `defineGridAdapter`   | Validates and freezes a descriptor. Does not create a grid. |

Build output: `dist/index.js`, `dist/index.d.ts`.

## @inno-grid/mygrid-react

```tsx
import { MyGrid, MYGRID_REACT_VERSION, reactGridAdapter } from '@inno-grid/mygrid-react';
import type { MyGridProps } from '@inno-grid/mygrid-react';
```

| Export                 | Meaning                                                  |
| ---------------------- | -------------------------------------------------------- |
| `MyGrid`               | Client component. Renders a root element and `children`. |
| `MyGridProps`          | `className` and `children`.                              |
| `reactGridAdapter`     | Frozen adapter whose framework is `react`.               |
| `MYGRID_REACT_VERSION` | This package's version.                                  |

The root element sets `data-mygrid="mygrid"` and `data-mygrid-adapter="react"`. It does not set `role="grid"`.

Peers: `react@^19` and `react-dom@^19`.

Build output: `dist/index.js`, `dist/index.d.ts`. The JavaScript file starts with `'use client'`.

## @inno-grid/mygrid-themes

```ts
import '@inno-grid/mygrid-themes/theme.css';
import { MYGRID_THEMES_VERSION, themeStylesheet, themeTokens } from '@inno-grid/mygrid-themes';
import type { ThemeToken, ThemeTokenName } from '@inno-grid/mygrid-themes';
```

| Export                               | Meaning                                            |
| ------------------------------------ | -------------------------------------------------- |
| `@inno-grid/mygrid-themes/theme.css` | Base stylesheet.                                   |
| `themeStylesheet`                    | The same import path, as a string.                 |
| `themeTokens`                        | Map of token name to `--mygrid-*` custom property. |
| `ThemeToken` / `ThemeTokenName`      | Types for that map.                                |
| `MYGRID_THEMES_VERSION`              | This package's version.                            |

The stylesheet is copied to `dist/theme.css` during the Vite build. The JavaScript entry does not import it.

## What is intentionally absent

No package exports column definitions, row data, cell renderers, events, or a grid instance. Those names will be added with the phase that implements them. See `IMPLEMENTATION_STATUS.md`.
