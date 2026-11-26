import type { DocPage } from './types';

export const guidePages: readonly DocPage[] = [
  {
    path: '/guides/sorting',
    title: 'Sorting',
    description: 'Single-column and multi-column sorting in the core, and the React header cycle.',
    section: 'Guides',
    blocks: [
      {
        kind: 'p',
        text: 'A column sorts only when sortable is true. The header button cycles ascending, descending, and clear. That cycle is DEFAULT_SORTING_ORDER unless the column sets sortingOrder. The caller array is not reordered.',
      },
      { kind: 'h2', id: 'single', text: 'Single-column sorting' },
      {
        kind: 'code',
        language: 'ts',
        code: `api.toggleSort('name', false);\napi.setSortModel([{ colId: 'salary', sort: 'desc' }]);\napi.sortColumn('name', 'asc');\napi.clearSort();`,
      },
      {
        kind: 'p',
        text: 'toggleSort(columnId, multi) advances one column. multi false replaces the model with that column. sortColumn sets a direction, or null to remove the column. clearSort removes every sort and restores source order among the rows that still pass the filters. An equal model does not emit sortChanged.',
      },
      { kind: 'h2', id: 'multi', text: 'Multi-column sorting' },
      {
        kind: 'p',
        text: 'Array order in setSortModel is the priority. sortIndex 0 is the primary key. In the React grid, multiSortKey defaults to ctrl, which also treats the meta key as the modifier. Set multiSortKey to shift to use the shift key instead. A click without the modifier replaces the model.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: `api.setSortModel([\n  { colId: 'department', sort: 'asc' },\n  { colId: 'salary', sort: 'desc' },\n]);\napi.toggleSort('name', true);`,
      },
      {
        kind: 'p',
        text: 'Equal values keep their previous order. null, undefined, NaN, and invalid dates sort after defined values in both directions. Strings are case-sensitive unless sorting.caseSensitive is false or the column sets caseSensitive. A column comparator replaces the default comparison and is not serialized.',
      },
      {
        kind: 'note',
        text: 'The React header shows the column name and a sort marker. It does not implement spreadsheet keyboard sorting.',
      },
    ],
  },
  {
    path: '/guides/filtering',
    title: 'Filtering',
    description: 'Core text, number, date, and set filters, and the React text and number editors.',
    section: 'Guides',
    blocks: [
      {
        kind: 'p',
        text: 'A column accepts a filter only when filterable is true. Filters run before sorting. getFilteredRowCount equals getDisplayedRowCount. Pagination does not change that count. The source array is not mutated.',
      },
      { kind: 'h2', id: 'model', text: 'Filter model' },
      {
        kind: 'code',
        language: 'ts',
        code: `api.setFilterModel({\n  join: 'and',\n  filters: [\n    {\n      colId: 'department',\n      filter: {\n        filterType: 'text',\n        conditions: [{ type: 'contains', filter: 'Eng' }],\n      },\n    },\n  ],\n});\napi.clearColumnFilter('department');\napi.clearAllFilters();`,
      },
      {
        kind: 'p',
        text: 'Column filters combine with and unless join is or. Conditions inside one column do the same. An invalid model leaves the previous model in place. clearAllFilters shows every source row and keeps the sort model.',
      },
      { kind: 'h2', id: 'text', text: 'Text filtering' },
      {
        kind: 'p',
        text: 'Text operators are contains, notContains, equals, notEqual, startsWith, and endsWith. Matching is case-sensitive unless the grid filtering.caseSensitive option is false or that filter sets caseSensitive. The React editor sends contains. Blank values that are null, undefined, or not a string, finite number, boolean, or valid date fail contains, equals, startsWith, and endsWith. They pass notContains and notEqual. An empty string is a real value.',
      },
      { kind: 'h2', id: 'number', text: 'Number filtering' },
      {
        kind: 'p',
        text: 'Number operators are equals, notEqual, greaterThan, greaterThanOrEqual, lessThan, lessThanOrEqual, and inRange. Only finite numbers can pass. The React editor is used for columns listed in numberFilterColumns. Its operators are equals, greaterThan, and lessThan. Choosing an operator before typing a value keeps that operator.',
      },
      { kind: 'h2', id: 'other', text: 'Date, set, and custom filters' },
      {
        kind: 'p',
        text: 'Date filters compare UTC calendar days with equals, before, after, and inRange. Dates are YYYY-MM-DD. Set filters match values, and null also matches undefined. An empty values list matches no rows. A custom filter calls the column filter function. Date, set, and custom filters are core APIs. The React grid has no editor for them.',
      },
      {
        kind: 'note',
        text: 'A focused row that is filtered out loses focus. Selected ids stay, because the row is still in the source.',
      },
    ],
  },
  {
    path: '/guides/pagination',
    title: 'Pagination',
    description: 'The page window over the filtered and sorted rows, and the React footer.',
    section: 'Guides',
    blocks: [
      {
        kind: 'p',
        text: 'Pagination is disabled unless pagination.enabled is true. The default page size is 100. The default size options are 10, 25, 50, and 100. pageSize must be one of pageSizeOptions. Page indexes on the API are zero-based. The React footer labels are 1-based.',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: `<MyGrid\n  columnDefs={columns}\n  rowData={rows}\n  pagination={{ enabled: true, pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }}\n  height="24rem"\n/>`,
      },
      {
        kind: 'p',
        text: 'setPage throws on an out-of-range index and leaves the page unchanged. nextPage, previousPage, firstPage, and lastPage do not emit when the page does not change. setPageSize moves to the last valid page when the current page would fall off the new list. An empty filtered set has a page count of 0. With pagination disabled and any row left, the page count is 1.',
      },
      {
        kind: 'p',
        text: 'Virtualization renders only the current page. Changing the page sets the vertical scroll position back to 0. The pagination option is read when the grid is created. Remount MyGrid to change page size options. The playground does that when the dataset changes.',
      },
    ],
  },
  {
    path: '/guides/selection',
    title: 'Row selection',
    description: 'Selection by source row id, including select-all for the filtered set.',
    section: 'Guides',
    blocks: [
      {
        kind: 'p',
        text: 'The default mode is multiple. none hides the checkbox column. single replaces the previous id. Selection stores source ids, not displayed indexes. Scrolling does not change the selection.',
      },
      { kind: 'h2', id: 'rows', text: 'Select and clear rows' },
      {
        kind: 'code',
        language: 'ts',
        code: `api.selectRow('2');\napi.toggleRowSelection('2');\napi.isRowSelected('2');\napi.setSelectedRowIds(['1', '3']);\napi.clearSelection();`,
      },
      {
        kind: 'p',
        text: 'Unknown ids throw. Duplicates in setSelectedRowIds are rejected. none accepts only an empty list. single accepts at most one id. An id that is already in the requested state does not emit selectionChanged.',
      },
      { kind: 'h2', id: 'all', text: 'Select all filtered rows' },
      {
        kind: 'p',
        text: 'selectAllFilteredRows replaces the selection with every row that passes the filters, on every page, in displayed order. Rows hidden by the filter are not selected. The React header checkbox calls that method. Unchecking it removes the filtered ids and keeps a selection the filter had hidden. In single mode the header checkbox is disabled unless the filtered set has exactly one row.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: `api.selectAllFilteredRows();\napi.selectAllSourceRows();`,
      },
      {
        kind: 'p',
        text: 'selectAllSourceRows replaces the selection with every source row, including rows the filter hides. Both commands throw when selection is disabled, and both throw in single mode when the target set has more than one row. There is no range selection.',
      },
    ],
  },
  {
    path: '/guides/columns',
    title: 'Columns',
    description: 'Visibility, width limits, and pinned columns in v1.',
    section: 'Guides',
    blocks: [
      {
        kind: 'p',
        text: 'v1 can show or hide a column, set its width within min and max, and pin it left or right. It cannot drag a column to a new index, and it has no pointer resize handle. Those are v2 plans.',
      },
      { kind: 'h2', id: 'visibility', text: 'Column visibility' },
      {
        kind: 'p',
        text: 'hide on the definition starts the column hidden. The React column list calls setColumnState with the column id, the next hide flag, and the current width and pin. Hidden columns are omitted from the table and from the virtualized column window.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: `api.setColumnState([{ colId: 'salary', hide: true, width: 120, pinned: null }]);`,
      },
      { kind: 'h2', id: 'pin', text: 'Column pinning' },
      {
        kind: 'p',
        text: 'pinned: "left" or "right" sticks the column while the center columns scroll. The selection checkbox column, when shown, is also pinned left at 44 pixels. Left pins stack from the left. Right pins stack from the right. Center columns are the ones column virtualization windows. Pinned columns stay mounted.',
      },
      {
        kind: 'note',
        text: 'setColumnState requires colId, hide, width, and pinned on each item. Width must fall inside the column minimum and maximum. Unknown properties are rejected and the previous columns stay in place.',
      },
    ],
  },
  {
    path: '/guides/virtualization',
    title: 'Virtualization',
    description: 'How the React view mounts visible rows and unpinned columns.',
    section: 'Guides',
    blocks: [
      {
        kind: 'p',
        text: 'Virtualization is a React view over the current page. It does not change sorting, filtering, pagination, or selection in the core. With pagination enabled, only that page is a candidate. With pagination disabled, the page is the full filtered list.',
      },
      { kind: 'h2', id: 'rows', text: 'Row virtualization' },
      {
        kind: 'p',
        text: 'virtualizeRows defaults to true. The view mounts rows that overlap the scrollport plus rowOverscan rows above and below. The default overscan is 6. Top and bottom spacer rows keep the scroll height equal to page row count times row height. Set virtualizeRows to false to mount every row on the page.',
      },
      { kind: 'h2', id: 'columns', text: 'Column virtualization' },
      {
        kind: 'p',
        text: 'virtualizeColumns defaults to true. Unpinned columns that overlap the horizontal viewport are mounted, plus columnOverscan on each side. The default overscan is 2. Pinned columns stay mounted. Spacer cells keep the scroll width equal to the full column set. A column width is the definition width, or 160 when width is omitted, then clamped to minWidth and maxWidth.',
      },
      { kind: 'h2', id: 'height', text: 'Row height and the scrollport' },
      {
        kind: 'p',
        text: 'Every row uses one height. Pass rowHeight and headerHeight in pixels, or let the view measure a rendered row and the header. Until a measurement exists it uses 40 and 44. The host must give MyGrid a definite height. A parent that grows with the table makes the scrollport as tall as the data, and the window mounts every row that fits.',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: `<MyGrid\n  columnDefs={columns}\n  rowData={rows}\n  height="28rem"\n  rowHeight={40}\n  headerHeight={44}\n  rowOverscan={6}\n  columnOverscan={2}\n  onVirtualMetrics={(metrics) => {\n    metrics.renderedRows;\n    metrics.totalRows;\n    metrics.renderedColumns;\n    metrics.totalColumns;\n  }}\n/>`,
      },
      {
        kind: 'p',
        text: 'The scroll container also exposes data-rendered-rows, data-total-rows, data-rendered-columns, data-total-columns, data-scroll-top, and data-scroll-left. Scroll and resize updates share one animation frame. A page change resets scrollTop. Sorting and filtering recompute the window from the new row list.',
      },
      {
        kind: 'note',
        text: 'Focused and selected rows keep their ids when they leave the mounted window. The table remains a native table. This is not spreadsheet keyboard navigation, and it is not a claim of parity with any other grid.',
      },
    ],
  },
  {
    path: '/guides/themes',
    title: 'Themes and density',
    description: 'Light and dark color themes, and compact, default, and comfortable density.',
    section: 'Guides',
    blocks: [
      {
        kind: 'p',
        text: 'Import @inno-grid/mygrid-themes/theme.css in the host. theme="light" or theme="dark" sets data-mygrid-theme. density sets data-mygrid-density to compact, default, or comfortable. Light is the default color theme. Default density is on :root, so a mount with no density attribute still has spacing.',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: `import '@inno-grid/mygrid-themes/theme.css';\nimport { MyGrid } from '@inno-grid/mygrid-react';\n\nexport function DarkCompact() {\n  return <MyGrid columnDefs={columns} rowData={rows} theme="dark" density="compact" height="24rem" />;\n}`,
      },
      {
        kind: 'p',
        text: 'theme.css is light.css, dark.css, density.css, and structure.css in that order. structure.css only uses the custom properties. It does not define them. Row and header heights come from the density tokens unless rowHeight or headerHeight overrides them. The accent color in the light theme is #0c6b58. The dark accent is #3dbea0. Compact cell padding uses --mygrid-space-cell-y of 0.25rem.',
      },
      {
        kind: 'p',
        text: 'themeNames, densityNames, themeStylesheet, themeStylesheets, and themeTokens are exported from the themes package for hosts that need the public names. The React package does not import the CSS module.',
      },
    ],
  },
];
