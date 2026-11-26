# Getting started

## Install

```bash
pnpm install
pnpm build
```

Node.js 22 or newer is required. The root `package.json` pins pnpm 10.33.4.

## Run a host

| Host            | Command                   | Port |
| --------------- | ------------------------- | ---- |
| Playground      | `pnpm dev:playground`     | 4183 |
| Docs site       | `pnpm dev:docs`           | 4184 |
| Storybook       | `pnpm dev:storybook`      | 6008 |
| React example   | `pnpm dev:example-react`  | 4185 |
| Next.js example | `pnpm dev:example-nextjs` | 4186 |

`pnpm dev` starts the playground and the docs site together.

## Documentation site

`pnpm dev:docs` serves the v1 documentation website on port 4184. The pages are:

| Section         | What it covers                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Introduction    | What v1 is, and what it is not.                                                                                   |
| Installation    | pnpm in this repository. npm and Yarn are shown as the shape of a future install. The packages are not published. |
| Getting started | The first React grid, columns, rows, height, and theme.                                                           |
| Next.js         | App Router, the client boundary, and the theme import.                                                            |
| Core concepts   | The grid instance, ids, state, events, and version 1 persistence.                                                 |
| Guides          | Sorting, filtering, pagination, selection, columns, virtualization, and themes.                                   |
| API             | `createGrid`, `GridApi`, options, models, React props, events, and theme exports.                                 |
| Examples        | Live grids rendered with `@inno-grid/mygrid-react`.                                                               |
| Troubleshooting | Install, CSS, TypeScript, hydration, ids, and performance.                                                        |
| v1 and v2       | Shipped behavior, and plans that are not implemented.                                                             |

The site does not claim feature parity with any other grid. Editing, drag reorder, a server-side row model, infinite scrolling, grouping, pivoting, and Excel export are listed only as v2 plans.

The playground's dataset control keeps a 12-row staff sample, with paging, as the default. The other choices mount 1,000, 10,000, 50,000, or 100,000 rows and 22 columns (one pinned left, one pinned right) with pagination off, so the scrollport is what limits the mounted cells. A status line reports the mounted row count, the mounted column count, and the scroll position.

## Use the packages in an application

Install the three packages from the workspace, or later from npm once they are published. Import the stylesheet yourself, then render the grid:

```tsx
import type { GridApi } from '@inno-grid/mygrid-core';
import { MyGrid } from '@inno-grid/mygrid-react';
import '@inno-grid/mygrid-themes/theme.css';

interface Person {
  id: string;
  name: string;
}

const columns = [{ field: 'name' as const, headerName: 'Name', sortable: true, filterable: true }];
const rows: Person[] = [{ id: '1', name: 'Ada Lovelace' }];

export function Example() {
  return (
    <MyGrid<Person>
      columnDefs={columns}
      rowData={rows}
      theme="dark"
      density="compact"
      onGridReady={(event) => {
        const api: GridApi<Person> = event.api;
        api.getRowCount();
      }}
    />
  );
}
```

`theme.css` is the stylesheet to import. It contains the light default, the dark overrides, the density scales, and the table rules. Omit `theme` and `density` to keep the light default and the default density. `light.css`, `dark.css`, and `density.css` are available when a host wants one file instead of the bundle.

In the Next.js App Router, a Server Component may import `MyGrid` directly. The package entry is a client module. Pass plain `columnDefs` and `rowData`. Do not pass comparators or filter functions from a Server Component. Import `@inno-grid/mygrid-core` from server code when you only need the framework-free API. `examples/react` and `examples/nextjs` show both shapes.

`onGridReady` is how a host reads the core `GridApi`. Sorting, filtering, pagination, and selection run on that object.
