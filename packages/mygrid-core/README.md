# @inno-grid/mygrid-core

Framework-independent TypeScript foundation for MyGrid.

This package has no React dependency and its TypeScript project does not include the DOM library. Importing it must not read browser globals.

## Public API

- `MYGRID_LIBRARY_NAME`
- `MYGRID_CORE_VERSION`
- `defineGridAdapter`
- `GridAdapter`

`defineGridAdapter` validates a framework descriptor. It does not create a grid. Column, row, and cell behavior are not part of this package yet.

## Build

The package is ESM-only. `pnpm --filter @inno-grid/mygrid-core build` writes `dist/index.js` and `dist/index.d.ts` with Vite.
