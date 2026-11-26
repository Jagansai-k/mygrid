# Implementation status

This file is the status of MyGrid. It is not a compatibility matrix against another grid.

## Phase 0 — Foundation

Status: implemented in this repository.

- pnpm workspaces, Turborepo, and a version catalog
- Strict TypeScript, ESLint, and Prettier
- Vite library builds with ESM and declaration output
- Vitest unit tests for the three packages
- Storybook for the React mount
- Playwright for the playground and the documentation site
- Changesets, with the three libraries linked and `access: public`
- `@inno-grid/mygrid-core`, with `defineGridAdapter` and no DOM library
- `@inno-grid/mygrid-react`, a client mount component and a React adapter descriptor
- `@inno-grid/mygrid-themes`, with a default stylesheet plus light, dark, and density foundations
- Playground, docs site, React example, and Next.js App Router example
- Architecture checks for package metadata, DOM lib boundaries, and module-scope browser globals

`MyGrid` renders a table from the core engine when `columnDefs` is set. Without `columnDefs` it still renders children only.

## Package configuration

Status: implemented for the three libraries. Nothing has been published to npm.

What works:

- Package names are `@inno-grid/mygrid-core`, `@inno-grid/mygrid-react`, and `@inno-grid/mygrid-themes`.
- The root package is private. The three libraries are not `"private": true`, and each sets `"publishConfig": { "access": "public" }`.
- Each library is ESM. `main`, `module`, `types`, and `exports` point at `dist`. `files` publishes `dist` only. There is no CommonJS build and no absolute path in a manifest.
- `build`, `test`, `typecheck`, and `clean` exist on each library. The root scripts run them across the workspace.
- Core has no React dependency, no DOM type library, and does not read `window`, `document`, or `navigator` while the module initializes. It exports `defineGridAdapter`, the library name and version, and the in-memory grid engine described below.
- React peer-depends on `react` and `react-dom` `^19.0.0` and depends on core with `workspace:*`. `MyGrid` is a client component. Its entry starts with `'use client'`. Rendering tests cover the table, sorting, filtering, paging, selection, themes, callbacks, prop updates, Strict Mode, and row and column virtualization. The component does not reimplement grid logic.
- Themes ship `theme.css` (the easy import), plus `light.css`, `dark.css`, and `density.css`. Colors, density, row height, and header height are CSS custom properties. Light is the default. Density names are `compact`, `default`, and `comfortable`. `structure.css` paints the table from those tokens.
- A Next.js App Router example still imports core from a Server Component and `MyGrid` from the client entry. The React example and the docs site import the same CSS entry.
- Consumer verification imports core on its own, checks that the React bundle imports core, resolves every theme CSS export, and reads the generated `.d.ts` files. The playground typecheck imports those same entry points.

What remains:

- No package has been published. The license is MIT, copyright (c) 2026 inno-grid. The versions are still `0.0.0`, so `pnpm release:publish` still refuses to run.
- React 18 is not claimed. Another framework adapter does not exist yet.
- The React grid does not edit cells or drag columns. It virtualizes the current page of rows and the unpinned columns. The host gives the grid a definite height, and every row uses one height. Date and set filters have no editor. The text editor uses `contains`. The number editor uses `equals`, `greaterThan`, and `lessThan`.
- The documentation site in `apps/docs` describes v1 only. Column resizing and reordering, editing, advanced keyboard navigation, a server-side row model, infinite scrolling, grouping, pivoting, and Excel export are v2 plans. They are not available.

## Release preparation

Status: prepared. Nothing has been published.

`pnpm pack:check` inspects the three npm archives. Changesets links the libraries and `pnpm version-packages` keeps their version constants aligned. `.github/workflows/release-pr.yml` opens a version pull request and does not publish. `.github/workflows/publish.yml` publishes only from `main`, after the word `publish` is entered and the GitHub Environment `npm` approves the job. The recommended first registry version is `0.1.0`. The license is MIT. `docs/publishing.md` and `docs/releasing.md` list the account and trusted-publisher steps that are still outside this repository.

## Documentation website

Status: implemented in `apps/docs`.

The site is the existing Vite React app. It has sidebar navigation, client-side search, breadcrumbs, light and dark chrome, copyable samples, and live `MyGrid` examples. Guides cover the shipped sorting, filtering, pagination, selection, column, virtualization, and theme behavior. The API pages follow the exported TypeScript. `pnpm dev:docs` serves it on port 4184. The sitemap and robots file use that local origin because the site has no public host.

## Core engine

Status: implemented in `@inno-grid/mygrid-core`. The React package calls this API and renders the current page.

What works:

- Generic row data. Callers pass their own row type to `createGrid`. An `Employee` fixture in the tests checks that field names and value types follow that parameter, and that a column `field` outside the row type is rejected by TypeScript.
- Column definitions with ids, field mapping, header names, visibility, width, minimum width, maximum width, and pin (`left`, `right`, or none). `sortable` opts a column into sorting. `filterable` opts a column into filtering.
- Column definition and column state validation. Unknown properties, duplicate ids, and widths outside the minimum and maximum are rejected. A rejected update leaves the previous columns in place. Column order follows the definitions. Column state does not reorder columns.
- Rows with stable ids. Identity comes from `getRowId` when it is set, otherwise from an own `id` string or finite number, otherwise from a generated `row:N` id remembered for that object. Generated ids are not reused after deletion. Rows can be replaced, inserted, removed, or updated in one transaction. An invalid transaction changes nothing. Untouched rows keep the same node object when their index does not change.
- Central state with `getGridState`, `setGridState`, `updateGridState`, `subscribe`, and `unsubscribe`. The snapshot holds source row data, source row ids, displayed row ids, column definitions, column state, the sort model, selected row ids, the focused cell, and configuration. Listeners run only when the snapshot's values change.
- Sorting through `sortColumn`, `setSortModel`, `getSortModel`, `toggleSort`, `clearSort`, and `applySorting`. Sorts can be single or multi-column, ascending or descending, and stable when values are equal. A column comparator can replace the default comparison. Numbers, strings, booleans, and dates are compared directly. `null`, `undefined`, `NaN`, and invalid dates stay after defined values in both directions. String comparison is case-sensitive unless configured otherwise. The caller's array is not reordered. `clearSort` restores source order among the rows that currently pass the filters.
- Filtering through `setFilterModel`, `getFilterModel`, `setColumnFilter`, `clearColumnFilter`, `clearAllFilters`, `applyFilters`, and `getFilteredRowCount`. The display pipeline filters the source rows, then sorts the rows that pass. Column filters combine with `and` unless the model `join` is `or`. Conditions inside one column do the same. Text, number, date, and set filters are included, plus a column filter function. Text matching is case-sensitive unless the grid or that text filter says otherwise. The caller's array is not changed. `clearAllFilters` shows every source row again and keeps the sort model.
- Pagination through `setPage`, `nextPage`, `previousPage`, `firstPage`, `lastPage`, `setPageSize`, `getCurrentPage`, `getPageSize`, `getPageCount`, `getPaginatedRowCount`, and `getRowNodeAtPageIndex`. Page indexes are zero-based. Pagination is disabled unless `pagination.enabled` is true. The default page size is 100, and the default size options are 10, 25, 50, and 100. The page is a window over the filtered and sorted rows. `getDisplayedRowCount`, `getFilteredRowCount`, and `getRowNodeAtIndex` stay on that full list.
- Row selection through `selectRow`, `deselectRow`, `toggleRowSelection`, `isRowSelected`, `getSelectedRows`, `getSelectedRowIds`, `setSelectedRowIds`, `clearSelection`, `selectAllFilteredRows`, and `selectAllSourceRows`. Identifiers are source row ids. The default mode is `multiple`. `selectAllFilteredRows` replaces the selection with every row that passes the filters, on every page. `selectAllSourceRows` includes rows the filter hides.
- Grid API methods that match the current engine: row counts, row lookup, column lookup, column state, sorting, filtering, pagination, row selection, row edits, focus, state, and `refreshCells`. `getDisplayedRowCount` and `getFilteredRowCount` are the rows left after filtering and sorting. `getRowNodeAtIndex` uses that displayed order. `getRowNodeAtPageIndex` uses the current page. `getRowNode` returns a displayed row. `refreshCells` returns current field values. It does not emit an event and there is no view to repaint.
- Events: `gridReady`, `rowDataChanged`, `columnChanged`, `sortChanged`, `filterChanged`, `paginationChanged`, `selectionChanged`, `cellFocused`, and `stateChanged`. A listener that throws does not skip the others. Removing a listener during dispatch skips it if it has not run. A `gridReady` listener added after `createGrid` runs immediately. State cannot be changed while a listener or subscriber is running. An unchanged sort model, filter model, page, or selection does not emit.
- Version 1 JSON persistence through `serializeGridState` and `restoreGridState`. Functions, class instances, non-finite numbers, and circular references are rejected. `getRowId`, host context, comparators, and filter predicates are not written. A snapshot that omits `filterModel` restores as an empty `and` model. A snapshot that omits `pagination` restores with pagination disabled. A snapshot that omits `selectionMode` restores as `multiple`. Restoring ids that came from `getRowId` requires that same function. Generated ids survive a restore into `setGridState`.

What is tested:

- Column model validation, defaults, pin, width limits, and runtime state that stays separate from the definition.
- Row identity, lookup, node reuse, insert, remove, replace, transactions, and rejected updates.
- State get, set, update, subscribe, unsubscribe, equal-state suppression, and subscriber errors.
- The event bus, including removal during dispatch and a listener that throws.
- The grid API, including selection, focus, refresh, context, `gridReady`, re-entrant updates, and destroyed grids.
- Sorting: direction, multiple columns, stable ties, nulls, value types, case sensitivity, custom comparators, empty data, missing fields, state restoration, events, source immutability, and rejected configuration.
- Filtering: every text, number, and date operator, set filters, column and condition joins, custom predicates, blanks, empty data, missing fields, sorting together with filtering, row edits, focus, selection, state restoration, events, source immutability, and rejected configuration.
- Pagination: page movement, page size, an empty set, a single page, filtering or sorting on a later page, invalid indexes and sizes, state restoration, and duplicate-event prevention.
- Selection: single and multiple modes, toggle, both select-all commands, pages, sorting, filtering, removal, stable-id replacement, unknown ids, state restoration, and duplicate-event prevention.
- Filtering, sorting, pagination, and selection used together.
- Sort timing for 1,000, 10,000, 50,000, and 100,000 rows, single-column and multi-column, via `pnpm --filter @inno-grid/mygrid-core bench:sort`. Filter timing for the same sizes, including a filter combined with a sort, via `pnpm --filter @inno-grid/mygrid-core bench:filter`. Page changes, source selection, and a filter combined with a sort and a page change use `pnpm --filter @inno-grid/mygrid-core bench:page`. Those scripts are not part of `pnpm test`.
- Serialization, restoration, generated ids, `getRowId`, and invalid snapshots.
- Generic row fields, including a column field that is not on the row type.
- Invalid options, columns, rows, selection, focus, refresh targets, and event names.

What remains incomplete:

- Grouping, pivoting, and editing are not implemented. Row and column virtualization live in the React package, over this engine's page window. There is no value getter. A sort reads the column field or its comparator. A filter reads the column field or its custom predicate. Comparators and filter predicates are not serialized. `setGridState` keeps a function already present on that column and rejects a displayed order the current functions cannot reproduce. A restored page must already fit the restored rows. Live filter, sort, and row changes clamp a page that has fallen off the end.
- Text blanks (`null`, `undefined`, and values that are not strings, finite numbers, booleans, or valid dates) fail `contains`, `equals`, `startsWith`, and `endsWith`. They pass `notContains` and `notEqual`. An empty string is a real value. Number and date filters accept only finite numbers or real UTC days, and every other value fails every operator, including `notEqual`. Set `values: []` matches no rows. `null` in a set also matches `undefined`.
- A focused row that is filtered out loses focus. Selected ids stay, because the row is still in the source. `getFilteredRowCount` equals `getDisplayedRowCount`. The page window is separate. Pagination is disabled until `pagination.enabled` is set. `selectAllFilteredRows` replaces the current selection. `selectAllSourceRows` does too, and it includes hidden rows. Single selection rejects a select-all that matches more than one row.
- Sorting, filtering, and pagination do not claim a timing comparison with any other grid. The benchmark scripts report this engine's own times.
- There is no custom cell renderer, header renderer, or overlay. `refreshCells` only reads values. The React table paints field text for the rows and columns in the current window.
- Row selection stores source ids in `none`, `single`, or `multiple` mode. The React checkbox column uses those ids. There is no range selection. Focus is a stored position. There is no spreadsheet keyboard navigation.
- Column width, visibility, and pin can be set in state and are shown by the React grid. There is no pointer resize, drag reorder, or flex layout.
- Sorting, filtering, pagination, and selection options are read when the React grid is created. Later changes to those option objects do not reconfigure the live grid. `rowData` and `columnDefs` do.

## Later phases

These phases are the intended order, not a commitment that every item ships, and not a copy of another product's feature list.

| Phase | Intent                                                                                      | Status      |
| ----- | ------------------------------------------------------------------------------------------- | ----------- |
| 1     | Core engine: columns, rows, state, API, events, and versioned persistence                   | Implemented |
| 2     | A framework-neutral description of cells, still without touching the DOM during module init | Not started |
| 3     | React rendering of the current page                                                         | Implemented |
| 4     | Theme rules for the rendered table                                                          | Implemented |
| 5     | Sorting and filtering as core behavior, then React wiring                                   | Implemented |
| 6     | Editing                                                                                     | Not started |
| 7     | Virtualization                                                                              | Implemented |
| 8     | Keyboard behavior and accessibility of the real grid                                        | Partial     |
| 9     | Another framework adapter that depends on core and not on the React package                 | Not started |

Each later phase should land with tests in the package that owns the behavior. Do not stub a phase in the public API before it works.

## Verification

From a clean install, `pnpm check` is the local gate: format, lint, typecheck, unit tests, package and app builds, Storybook build, metadata checks, and a Node import of the built packages. `pnpm test` builds the three libraries, runs Vitest, and then runs that Node import. `pnpm typecheck` covers the consumer TypeScript file in the playground. `pnpm test:e2e` builds the playground and runs Playwright. The commands and their results belong in the change that runs them; this file does not record a stale pass.
