import type { DocPage } from './types';

const employeeColumns = `import type { ColumnDefinition } from '@inno-grid/mygrid-core';
import { MyGrid } from '@inno-grid/mygrid-react';
import '@inno-grid/mygrid-themes/theme.css';

interface Employee {
  id: string;
  name: string;
  department: string;
  salary: number;
}

const columns: ColumnDefinition<Employee>[] = [
  { field: 'name', headerName: 'Name', sortable: true, filterable: true, pinned: 'left', width: 180 },
  { field: 'department', headerName: 'Department', sortable: true, filterable: true },
  { field: 'salary', headerName: 'Salary', sortable: true, filterable: true, width: 120 },
];

const rows: Employee[] = [
  { id: '1', name: 'Ada Lovelace', department: 'Engineering', salary: 90000 },
  { id: '2', name: 'Grace Hopper', department: 'Research', salary: 120000 },
];`;

export const startPages: readonly DocPage[] = [
  {
    path: '/',
    title: 'Introduction',
    description:
      'MyGrid is a company-owned data grid. Version 1 ships an in-memory core, a React table, and opt-in themes.',
    section: 'Start',
    blocks: [
      {
        kind: 'p',
        text: 'MyGrid is a company-owned data grid library. Version 1 is an in-memory engine, a React table, and an opt-in theme. This site documents that version. It does not claim feature parity with any other grid.',
      },
      { kind: 'h2', id: 'what', text: 'What is MyGrid?' },
      {
        kind: 'p',
        text: 'The core package owns columns, rows, sorting, filtering, pagination, selection, events, and versioned state. The React package paints a native table from that API and virtualizes the current page. Themes are a separate stylesheet the host imports.',
      },
      { kind: 'h2', id: 'why', text: 'Why MyGrid?' },
      {
        kind: 'list',
        items: [
          'The engine does not depend on React or on DOM types.',
          'Row identity stays on stable source ids. Displayed indexes are not identity.',
          'Sorting, filtering, and pagination are one pipeline: source rows, then filters, then sort, then a page window.',
          'The React package does not reimplement that pipeline and does not import CSS.',
        ],
      },
      { kind: 'h2', id: 'capabilities', text: 'Main capabilities in v1' },
      {
        kind: 'list',
        items: [
          'Column definitions with width, visibility, and left or right pin.',
          'Stable row ids, transactions, and an immutable source order.',
          'Single and multi-column sorting.',
          'Text, number, date, and set filters in the core. The React editors cover text contains and a small number operator set.',
          'Pagination, row selection, and select-all for filtered rows.',
          'Row and column virtualization in the React view.',
          'Light and dark color themes, plus compact, default, and comfortable density.',
          'Version 1 JSON state that can be serialized and restored.',
        ],
      },
      { kind: 'h2', id: 'architecture', text: 'Architecture overview' },
      {
        kind: 'p',
        text: '@inno-grid/mygrid-core creates the grid. @inno-grid/mygrid-react calls createGrid and renders the result. @inno-grid/mygrid-themes supplies CSS custom properties and table structure. A Next.js Server Component can read the core and pass plain column and row values into MyGrid, because the React entry is the client boundary.',
      },
      { kind: 'h2', id: 'v1', text: 'MyGrid v1 feature overview' },
      {
        kind: 'p',
        text: 'v1 is the behavior in this repository: the core engine, the React grid, themes, the playground, the React example, and the Next.js example. Editing, drag reorder, spreadsheet keyboard navigation, grouping, pivoting, a server-side row model, infinite scrolling, and Excel export are planned for v2. They are not in v1.',
      },
      {
        kind: 'note',
        text: 'Packages in this repository are version 0.0.0 and have not been published to npm.',
      },
    ],
  },
  {
    path: '/installation',
    title: 'Installation',
    description:
      'Install MyGrid in this repository with pnpm. The packages are not on the npm registry yet.',
    section: 'Start',
    blocks: [
      { kind: 'h2', id: 'prerequisites', text: 'Prerequisites' },
      {
        kind: 'list',
        items: [
          'Node.js 22 or newer. That is the version this repository tests.',
          'pnpm 10.33.4, pinned by the root packageManager field.',
          'React 19 and react-dom 19 for the React package. React 18 is not a supported peer.',
        ],
      },
      { kind: 'h2', id: 'pnpm', text: 'pnpm' },
      {
        kind: 'p',
        text: 'This monorepo is installed and built with pnpm. From a checkout:',
      },
      { kind: 'code', language: 'bash', code: 'pnpm install\npnpm build' },
      {
        kind: 'p',
        text: 'The three libraries are not published. They are version 0.0.0 and licensed under MIT, copyright (c) 2026 inno-grid. Commercial use, modification, and redistribution are permitted when the copyright and license notices are kept. The publish command still refuses version 0.0.0. An application inside this workspace depends on them with workspace:*. After a future release, a consumer install would look like this. That command is not verified against a registry, because no release exists yet.',
      },
      {
        kind: 'code',
        language: 'bash',
        code: 'pnpm add @inno-grid/mygrid-react @inno-grid/mygrid-themes\n# @inno-grid/mygrid-core is a dependency of the React package',
      },
      { kind: 'h2', id: 'npm', text: 'npm' },
      {
        kind: 'p',
        text: 'npm is not the package manager for this repository. The packages are standard ESM, so a published tarball could be installed with npm. This repository has not run that install.',
      },
      {
        kind: 'code',
        language: 'bash',
        code: 'npm install @inno-grid/mygrid-react @inno-grid/mygrid-themes',
      },
      { kind: 'h2', id: 'yarn', text: 'Yarn' },
      {
        kind: 'p',
        text: 'Yarn is not used to develop MyGrid, and this repository does not test a Yarn install. A published ESM package can be added with Yarn. Treat the command below as the intended shape, not as a verified command.',
      },
      {
        kind: 'code',
        language: 'bash',
        code: 'yarn add @inno-grid/mygrid-react @inno-grid/mygrid-themes',
      },
      { kind: 'h2', id: 'packages', text: 'Packages' },
      {
        kind: 'table',
        headers: ['Package', 'Role'],
        rows: [
          ['@inno-grid/mygrid-core', 'Framework-independent engine. No React and no DOM types.'],
          [
            '@inno-grid/mygrid-react',
            'React 19 client component. Peer-depends on react and react-dom ^19.',
          ],
          ['@inno-grid/mygrid-themes', 'Opt-in CSS. The React package does not import it.'],
        ],
      },
      { kind: 'h2', id: 'versions', text: 'Version compatibility' },
      {
        kind: 'p',
        text: 'Each library in this tree is 0.0.0. Install them from the same checkout or, later, the same release. The React peer range is ^19.0.0. TypeScript 6 is what this repository typechecks with. Older TypeScript versions are not claimed. React 18 is not claimed.',
      },
      { kind: 'h2', id: 'css', text: 'Theme CSS' },
      {
        kind: 'p',
        text: 'Import the theme stylesheet once in the host. Without it, the table has no MyGrid colors, density, or structure.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: "import '@inno-grid/mygrid-themes/theme.css';",
      },
      {
        kind: 'p',
        text: 'theme.css includes light colors, dark overrides, density, and structure. light.css, dark.css, and density.css are also package exports if a host wants one file.',
      },
    ],
  },
  {
    path: '/getting-started',
    title: 'Getting started',
    description:
      'Render the first React grid with column definitions, row data, a height, and the theme stylesheet.',
    section: 'Start',
    blocks: [
      { kind: 'h2', id: 'first-grid', text: 'First React grid' },
      {
        kind: 'p',
        text: 'Pass columnDefs and rowData to MyGrid. Omit columnDefs and the component renders children only, with no table.',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: `${employeeColumns}\n\nexport function Employees() {\n  return (\n    <MyGrid<Employee>\n      columnDefs={columns}\n      rowData={rows}\n      height="24rem"\n      label="Employees"\n    />\n  );\n}`,
      },
      { kind: 'h2', id: 'columns', text: 'Column definitions' },
      {
        kind: 'p',
        text: 'field names a property on the row. colId defaults to field. headerName defaults to the field, then the id. sortable and filterable default to false, so a column does not sort or filter until you opt in. pinned accepts left, right, none, or null.',
      },
      { kind: 'h2', id: 'rows', text: 'Row data' },
      {
        kind: 'p',
        text: 'rowData is the source list. The core does not reorder that array. A row id comes from getRowId when you pass one, otherwise from an own id string or finite number, otherwise from a generated row:N id stored for that object.',
      },
      { kind: 'h2', id: 'size', text: 'Grid sizing' },
      {
        kind: 'p',
        text: 'Set height to a definite CSS length. The body scrolls inside that box, and virtualization uses that scrollport. If a parent flex item grows with the table, the scrollport grows with the rows and the view mounts every row that fits. width defaults to the available width.',
      },
      { kind: 'h2', id: 'theme', text: 'Theme configuration' },
      {
        kind: 'p',
        text: 'theme is light or dark. density is compact, default, or comfortable. Both set data attributes. They do nothing visible until the theme stylesheet is loaded. rowHeight and headerHeight override the density heights in pixels.',
      },
      { kind: 'h2', id: 'basic', text: 'Basic configuration' },
      {
        kind: 'p',
        text: 'sorting, filtering, pagination, selection, getRowId, context, and initialState are read when the grid is created. Later changes to those option objects do not reconfigure the live grid. rowData and columnDefs do update the live grid when their reference changes.',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: `<MyGrid<Employee>
  columnDefs={columns}
  rowData={rows}
  theme="light"
  density="default"
  pagination={{ enabled: true, pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }}
  selection={{ mode: 'multiple' }}
  numberFilterColumns={['salary']}
  height="24rem"
/>`,
      },
    ],
  },
  {
    path: '/nextjs',
    title: 'Next.js integration',
    description: 'Use MyGrid from the App Router. The React entry is the client boundary.',
    section: 'Start',
    blocks: [
      { kind: 'h2', id: 'app-router', text: 'App Router setup' },
      {
        kind: 'p',
        text: 'The example in examples/nextjs is a Next.js App Router app. The page is a Server Component. It imports @inno-grid/mygrid-core for plain values and renders MyGrid from @inno-grid/mygrid-react.',
      },
      { kind: 'h2', id: 'client', text: 'Client component requirements' },
      {
        kind: 'p',
        text: "The React package entry starts with 'use client'. Importing MyGrid from a Server Component keeps the grid on the client side of that boundary. Do not import the React package into code that must stay free of client components if you only needed a core value. Import the core package for that.",
      },
      { kind: 'h2', id: 'css', text: 'Global theme CSS' },
      {
        kind: 'p',
        text: 'Import the theme stylesheet from the root layout, not from the React package. The example layout does this:',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: `import '@inno-grid/mygrid-themes/theme.css';`,
      },
      { kind: 'h2', id: 'page', text: 'Example page' },
      {
        kind: 'p',
        text: 'Column definitions and rows passed from a Server Component must be serializable. Functions such as comparators and filter predicates cannot cross that boundary. Pass plain field, header, width, and row values. The example page passes a small person list and a pagination option, then a second MyGrid that only renders children with theme and density.',
      },
      { kind: 'h2', id: 'boundary', text: 'Server and client boundaries' },
      {
        kind: 'list',
        items: [
          'Core version constants and plain data can be read on the server.',
          'MyGrid, event callbacks, and GridApi run on the client.',
          'onGridReady receives the live API after createGrid. It throws after unmount.',
        ],
      },
      { kind: 'h2', id: 'hydration', text: 'SSR and hydration' },
      {
        kind: 'p',
        text: 'The grid reads layout after mount to measure the scrollport and, when rowHeight is omitted, a rendered row. Give the root a height so the server markup and the client scrollport describe the same box. Do not read window while rendering the server page. Sorting and filtering options that contain functions must be created in a client component.',
      },
      { kind: 'h2', id: 'production', text: 'Production build' },
      {
        kind: 'p',
        text: 'From this repository, pnpm --filter example-nextjs build runs the Next.js production build. The workspace build includes that example. A failed build here means the client boundary or a non-serializable prop, not a missing registry package.',
      },
    ],
  },
  {
    path: '/concepts',
    title: 'Core concepts',
    description: 'The grid instance, columns, rows, ids, state, events, and version 1 persistence.',
    section: 'Start',
    blocks: [
      { kind: 'h2', id: 'instance', text: 'Grid instance' },
      {
        kind: 'p',
        text: 'createGrid(options) returns a GridApi. MyGrid calls it when columnDefs is set and calls destroy() on unmount. Methods throw after destroy. The API does not touch the DOM.',
      },
      { kind: 'h2', id: 'columns', text: 'Column definitions' },
      {
        kind: 'p',
        text: 'Definitions describe the column. Runtime column state holds width, hide, and pinned. setColumnState updates those fields for the listed ids and leaves the other columns alone. Column order follows the definitions. State does not reorder columns.',
      },
      { kind: 'h2', id: 'rows', text: 'Row data' },
      {
        kind: 'p',
        text: 'The display pipeline filters the source rows, then sorts the rows that pass. Pagination is a window over that result. getDisplayedRowCount and getRowNodeAtIndex stay on the full filtered list. getPaginatedRowCount and getRowNodeAtPageIndex stay on the current page.',
      },
      { kind: 'h2', id: 'ids', text: 'Stable row ids' },
      {
        kind: 'p',
        text: 'Selection, focus, and React keys use the row id. A numeric id is stored as a decimal string. Generated ids are not reused after a row is removed. Replacing a row keeps the id when the replacement data resolves to the same id.',
      },
      { kind: 'h2', id: 'state', text: 'Grid state' },
      {
        kind: 'p',
        text: 'getGridState returns a snapshot: source rows, source ids, displayed ids, column definitions, column state, the sort model, the filter model, pagination, selected ids, the focused cell, and configuration. subscribe runs only when values change. setGridState and updateGridState replace that snapshot under the same validation as a live edit.',
      },
      { kind: 'h2', id: 'events', text: 'Events' },
      {
        kind: 'p',
        text: 'Event names are gridReady, rowDataChanged, columnChanged, sortChanged, filterChanged, paginationChanged, selectionChanged, cellFocused, and stateChanged. An equal sort, filter, page, or selection does not emit. A listener that throws does not skip the others. State cannot be changed while a listener is running.',
      },
      { kind: 'h2', id: 'persistence', text: 'State persistence' },
      {
        kind: 'p',
        text: 'serializeGridState writes version 1 JSON. restoreGridState reads it. Functions, class instances, non-finite numbers, and circular references are rejected. getRowId, context, comparators, and filter predicates are not written. A snapshot that omits selectionMode restores as multiple. A snapshot that omits pagination restores with pagination disabled.',
      },
    ],
  },
  {
    path: '/troubleshooting',
    title: 'Troubleshooting and FAQ',
    description:
      'Install, CSS, client components, TypeScript, hydration, row ids, and performance.',
    section: 'Help',
    blocks: [
      { kind: 'h2', id: 'install', text: 'Package installation failures' },
      {
        kind: 'p',
        text: 'npm install of these names fails until a release exists. Inside this repository, use pnpm install from the root. The package manager is pnpm 10.33.4 and Node.js must be 22 or newer. A workspace dependency must use workspace:*, not a registry version.',
      },
      { kind: 'h2', id: 'css', text: 'Missing CSS' },
      {
        kind: 'p',
        text: 'If the table is unstyled, the host did not import @inno-grid/mygrid-themes/theme.css. The React package never imports that file. In Next.js, import it from the root layout.',
      },
      { kind: 'h2', id: 'client', text: 'Client component errors' },
      {
        kind: 'p',
        text: 'A build error that asks for the use client directive means a Server Component imported a client-only API the wrong way, or a client module was expected to stay on the server. Import MyGrid from @inno-grid/mygrid-react and keep callbacks in client code. The package entry already contains the directive.',
      },
      { kind: 'h2', id: 'types', text: 'TypeScript errors' },
      {
        kind: 'p',
        text: 'MyGrid props default the row type, so <MyGrid theme="dark" /> typechecks. A column field must be a key of the row type. Page size must be one of pageSizeOptions or createGrid throws. Optional props should be omitted rather than passed as undefined when exactOptionalPropertyTypes is on. Rebuild the React package before a consumer typechecks against dist if you changed public types.',
      },
      { kind: 'h2', id: 'ssr', text: 'SSR and hydration' },
      {
        kind: 'p',
        text: 'Do not pass comparators, filter functions, or getRowId closures from a Server Component. Pass plain data. Set a height so the client scrollport is stable. Virtualization measures the scroll container after mount, so the first client paint can mount a short fallback window and then adjust.',
      },
      { kind: 'h2', id: 'ids', text: 'Incorrect row ids' },
      {
        kind: 'p',
        text: 'Rows without an id and without getRowId receive generated ids. Those ids follow the object, not the displayed index. Selection that uses an index will not match. Duplicate resolved ids are rejected. A numeric id of 1 and the string id "1" are the same id.',
      },
      { kind: 'h2', id: 'performance', text: 'Performance' },
      {
        kind: 'p',
        text: 'Keep rowData and columnDefs referentially stable when the contents have not changed. Virtualization mounts the visible page, not the source list. It still walks the filtered id list when computing select-all state if any row is selected. A grid with no definite height mounts every row that fits the grown box. Pagination limits the virtualized list to the current page.',
      },
      { kind: 'h2', id: 'mistakes', text: 'Common configuration mistakes' },
      {
        kind: 'list',
        items: [
          'Expecting a header click to sort when sortable is omitted. The default is false.',
          'Expecting a text box on a column that is not filterable, or a number editor without numberFilterColumns.',
          'Changing the pagination prop after mount. It is read only at creation. Remount the grid to change it.',
          'Calling selectAllFilteredRows in single mode when more than one row matches. That throws.',
          'Looking up a page row with getRowNodeAtIndex. That index is on the full displayed list.',
        ],
      },
    ],
  },
  {
    path: '/roadmap',
    title: 'v1 and v2 roadmap',
    description:
      'Shipped v1 behavior and the capabilities planned for v2. Planned items are not available.',
    section: 'Help',
    blocks: [
      { kind: 'h2', id: 'v1', text: 'Shipped in v1' },
      {
        kind: 'p',
        text: 'v1 includes the core engine, the React table, themes, sorting, filtering, pagination, row selection, column visibility and pinning, row and column virtualization, state persistence, the playground, and the React and Next.js examples. The guides and the API reference describe this set.',
      },
      { kind: 'h2', id: 'v2', text: 'Planned for v2' },
      {
        kind: 'p',
        text: 'The following are plans. They are not implemented, and the public API does not expose them.',
      },
      {
        kind: 'list',
        items: [
          'Advanced column resizing and reordering.',
          'Cell editing and validation.',
          'Advanced keyboard navigation.',
          'Server-side row model.',
          'Infinite scrolling.',
          'Row grouping and aggregation.',
          'Pivoting.',
          'Advanced clipboard and Excel export.',
        ],
      },
      {
        kind: 'note',
        text: 'A header cannot be dragged to a new position in v1. Column width can be set in the definition or with setColumnState. There is no pointer resize. Date and set filters have no React editor. There is no spreadsheet keyboard model and the table does not use role="grid".',
      },
    ],
  },
  {
    path: '/examples',
    title: 'Examples',
    description:
      'Working React grids for employees, sorting, filtering, paging, selection, a dark theme, and a large list.',
    section: 'Help',
    blocks: [
      {
        kind: 'p',
        text: 'These grids are rendered by the docs app from @inno-grid/mygrid-react. They are the same component an application imports. The Next.js page lives in examples/nextjs and is covered in the Next.js guide. The playground on port 4183 adds dataset sizes through 100,000 rows.',
      },
      { kind: 'h2', id: 'employee', text: 'Basic employee grid' },
      { kind: 'live', id: 'employee' },
      { kind: 'h2', id: 'sorting', text: 'Sorting' },
      { kind: 'live', id: 'sorting' },
      { kind: 'h2', id: 'filtering', text: 'Filtering' },
      { kind: 'live', id: 'filtering' },
      { kind: 'h2', id: 'pagination', text: 'Pagination' },
      { kind: 'live', id: 'pagination' },
      { kind: 'h2', id: 'selection', text: 'Row selection' },
      { kind: 'live', id: 'selection' },
      { kind: 'h2', id: 'dark', text: 'Dark theme' },
      { kind: 'live', id: 'dark' },
      { kind: 'h2', id: 'large', text: 'Large dataset' },
      {
        kind: 'p',
        text: 'One thousand generated rows and extra columns, with pagination off and a fixed height, so the scrollport virtualizes the list. Name stays pinned. The status line is the virtualization metrics callback.',
      },
      { kind: 'live', id: 'large' },
    ],
  },
];
