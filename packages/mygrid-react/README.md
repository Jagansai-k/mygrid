# @inno-grid/mygrid-react

React adapter for MyGrid. The package depends on `@inno-grid/mygrid-core` and on React 19 as a peer dependency.

The entry module is a client component (`'use client'`) so a Next.js App Router server module can import `MyGrid` and keep it on the client boundary. The built file keeps that directive. This package does not import theme CSS.

## Public API

- `MyGrid`
- `MyGridProps`, `MyGridTheme`, `MyGridDensity`, `MyGridFilterKind`
- `reactGridAdapter`
- `MYGRID_REACT_VERSION`

Pass `columnDefs` to render a table from the core grid. Omit `columnDefs` and the root renders `children` only. The core engine sorts, filters, pages, and selects. React does not reimplement those steps.

```tsx
import type { GridApi } from '@inno-grid/mygrid-core';
import { MyGrid } from '@inno-grid/mygrid-react';
import '@inno-grid/mygrid-themes/theme.css';

interface Person {
  id: string;
  name: string;
  department: string;
}

const columns = [
  { field: 'name' as const, headerName: 'Name', sortable: true, filterable: true },
  { field: 'department' as const, headerName: 'Department', sortable: true, filterable: true },
];

const rows: Person[] = [
  { id: '1', name: 'Ada Lovelace', department: 'Engineering' },
  { id: '2', name: 'Grace Hopper', department: 'Research' },
];

export function People() {
  return (
    <MyGrid<Person>
      columnDefs={columns}
      rowData={rows}
      theme="light"
      density="default"
      pagination={{ enabled: true, pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }}
      height="24rem"
      onGridReady={(event) => {
        const api: GridApi<Person> = event.api;
        api.getFilteredRowCount();
      }}
    />
  );
}
```

`onGridReady` runs after the grid is created. `event.api` is the live `GridApi` from `@inno-grid/mygrid-core`. `onRowDataChanged`, `onSortChanged`, `onFilterChanged`, `onPaginationChanged`, and `onSelectionChanged` use the same API. Hold that object if the host needs to call it later. It throws after the component unmounts.

`rowData` and `columnDefs` update the live grid. Sorting, filtering, pagination, selection, `getRowId`, `context`, and `initialState` are read when the grid is created. Keep `columnDefs` and `rowData` referentially stable when their contents have not changed.

`numberFilterColumns` lists columns whose filter editor is numeric (`equals`, `greaterThan`, `lessThan`). Other filterable columns use a text `contains` editor. Date and set filters stay available on the API and have no editor here. The header checkbox selects every filtered row on every page. Unchecking it drops those ids and keeps a selection that the filter hid. Selection uses source row ids.

`theme` and `density` set `data-mygrid-theme` and `data-mygrid-density`. Import `@inno-grid/mygrid-themes/theme.css` in the host. `rowHeight` and `headerHeight` override the density heights. The table does not set `role="grid"` and does not implement spreadsheet keyboard navigation.

## Virtualization

`MyGrid` paints a window over the current page. Pagination still decides which rows exist. Virtualization decides which of those rows, and which unpinned columns, are mounted.

- `virtualizeRows` defaults to true. Set it to false to mount every row on the page.
- `virtualizeColumns` defaults to true. Set it to false to mount every visible column.
- `rowOverscan` defaults to 6. Those extra rows sit above and below the viewport.
- `columnOverscan` defaults to 2. Those extra center columns sit on each side of the viewport. Pinned columns are not windowed.
- `rowHeight` and `headerHeight` are the pixel sizes used to turn `scrollTop` into a row range. When a prop is omitted, the view measures a rendered row or the header. Until that measurement exists it uses 40px rows and a 44px header. Every row is the same height.
- Column ranges use each column's resolved width: the column width, or 160 when width is omitted, then clamped to `minWidth` and `maxWidth`. Hidden columns are omitted. A selection checkbox column is 44px and stays pinned to the left.
- Spacer rows and spacer cells keep the scroll height and the scroll width equal to the full page and the full column set. The scroll container reports `data-rendered-rows`, `data-total-rows`, `data-rendered-columns`, `data-total-columns`, `data-scroll-top`, and `data-scroll-left`. `onVirtualMetrics` receives the same counts after each committed window.
- Scroll and resize notifications are folded into one animation frame. A page change sets `scrollTop` back to 0. Sorting, filtering, and selection do not.

Limits: row heights do not vary per row. The scrollport is the grid's own height, so the host has to give `MyGrid` a definite height. A parent that grows with the table makes the viewport as tall as the data, and the window mounts every row that fits. There is no cell editor, grouping, or drag reorder. The table stays a native table, so this is not spreadsheet keyboard navigation. A focused or selected row keeps its row id when it leaves the window and is marked again when it is mounted. The benchmark in `src/virtual.bench.ts` records mounted DOM size for this view. It does not claim parity with any other grid.

```bash
pnpm --filter @inno-grid/mygrid-react bench:virtual
```

## Build

`pnpm --filter @inno-grid/mygrid-react build` writes `dist/index.js` and `dist/index.d.ts`. The JavaScript file starts with `'use client'`. npm also packs this README and `LICENSE`. `clean` removes `dist`.

## Storybook

```bash
pnpm dev:storybook
```

Storybook listens on port 6008.
