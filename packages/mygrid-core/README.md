# @inno-grid/mygrid-core

Framework-independent TypeScript foundation for MyGrid.

This package has no React dependency and its TypeScript project does not include the DOM library. Importing it must not read browser globals.

## Public API

Identity and adapters:

- `MYGRID_LIBRARY_NAME`
- `MYGRID_CORE_VERSION`
- `defineGridAdapter`
- `GridAdapter`

`defineGridAdapter` validates a framework descriptor. It does not create a grid.

Grid engine:

- `createGrid` returns a `GridApi` for a caller-supplied row type.
- Column definitions, column state, and `GridColumn`.
- Row nodes, `getRowId`, and row transactions.
- `getSortModel`, `setSortModel`, `sortColumn`, `toggleSort`, `clearSort`, and `applySorting`.
- `getFilterModel`, `setFilterModel`, `setColumnFilter`, `clearColumnFilter`, `clearAllFilters`, `applyFilters`, and `getFilteredRowCount`.
- `setPage`, `nextPage`, `previousPage`, `firstPage`, `lastPage`, `setPageSize`, `getCurrentPage`, `getPageSize`, `getPageCount`, `getPaginatedRowCount`, and `getRowNodeAtPageIndex`.
- `selectRow`, `deselectRow`, `toggleRowSelection`, `isRowSelected`, `setSelectedRowIds`, `clearSelection`, `selectAllFilteredRows`, and `selectAllSourceRows`.
- `getGridState`, `setGridState`, `updateGridState`, `subscribe`, and `unsubscribe`.
- `serializeGridState`, `restoreGridState`, and `GRID_STATE_FORMAT_VERSION`.
- Events listed on `GridEvent`, plus `addEventListener` and `removeEventListener`.
- `GridError` and `isGridError`.

`getDisplayedRowCount` is the filtered and sorted row count. Pagination is a zero-based window over that list and does not change `getDisplayedRowCount` or `getRowNodeAtIndex`. It is disabled unless `pagination.enabled` is true. The default page size is 100. Sorting reorders the rows that pass the filters and leaves the caller's array in source order. `filterable` opts a column into filtering. Text, number, date, set, and custom filters are supported. Selection stores source row ids. The default mode is `multiple`. `refreshCells` reads current values and does not paint. Version 1 JSON includes the sort model, the filter model, the page, the page size, and the selected ids. It omits comparators, filter predicates, `getRowId`, and host context. A snapshot that omits pagination restores with pagination disabled. Functions and circular references are rejected.

Grouping, pivoting, editing, virtualization, and DOM rendering are not part of this package.

## Build

The package is ESM-only and has no runtime dependencies. `main`, `module`, `types`, and `exports` point at `dist`. npm also packs this README and `LICENSE`. `pnpm --filter @inno-grid/mygrid-core build` writes `dist/index.js` and `dist/index.d.ts` with Vite. `clean` removes `dist`. An application can install this package without installing the React package.
