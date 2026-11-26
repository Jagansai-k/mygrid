# Feature matrix

This matrix tracks MyGrid's own scope. It is not a comparison with AG Grid, and it does not claim parity with any other grid.

| Area       | Capability                                | Status      | Notes                                                                                                                                         |
| ---------- | ----------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository | pnpm workspace, Turborepo, Changesets     | Ready       | Root package is private. Three libraries are publishable and public.                                                                          |
| Repository | npm release automation                    | Prepared    | Archive check, version pull request, and a manual publish workflow. Nothing has been published.                                                |
| Repository | Strict TypeScript, ESLint, Prettier       | Ready       | TypeScript 6.0, which is the newest release `typescript-eslint` accepts.                                                                      |
| Packages   | ESM build and `.d.ts` output              | Ready       | Vite library mode. No CommonJS build.                                                                                                         |
| Packages   | Framework-independent core                | Ready       | No React dependency and no DOM type library.                                                                                                  |
| Packages   | React data grid                           | Implemented | Renders headers, rows, and cells from the core API. Does not import CSS.                                                                     |
| Packages   | Next.js App Router host                   | Ready       | Example reads core on the server and passes plain row data to the client grid.                                                                |
| Packages   | Base theme tokens                         | Ready       | Opt-in CSS. Light, dark, and density, plus table structure.                                                                                    |
| Packages   | Storybook                                 | Ready       | Stories for the mount and for a grid with rows.                                                                                                |
| Packages   | Unit tests                                | Ready       | Foundation behavior, the core engine, and the React grid.                                                                                      |
| Packages   | Browser test                              | Ready       | Playwright loads the playground and the documentation site.                                                                                    |
| Packages   | Documentation website                     | Implemented | Vite site in `apps/docs` with guides, API reference, examples, and search. It does not claim parity with any other grid. |
| Grid       | Column model                              | Implemented | Definitions, ids, fields, headers, visibility, width, min and max, and pin. `sortable` opts a column into sorting. `filterable` opts a column into filtering. |
| Grid       | Row model                                 | Implemented | Stable ids, index, lookup, insert, remove, replace, and transactions.                                                                         |
| Grid       | Grid state                                | Implemented | get, set, update, and subscribe. Equal snapshots do not notify.                                                                               |
| Grid       | Events                                    | Implemented | `gridReady`, `rowDataChanged`, `columnChanged`, `sortChanged`, `filterChanged`, `paginationChanged`, `selectionChanged`, `cellFocused`, `stateChanged`. |
| Grid       | State persistence                         | Implemented | Version 1 JSON. Functions and circular references are rejected.                                                                               |
| Grid       | Cell rendering                            | Implemented | Field values are painted as text. No custom cell renderer. `refreshCells` still only reads values.                                            |
| Grid       | Cell editing                              | Not started |                                                                                                                                               |
| Grid       | Sorting                                   | Implemented | Core sort, plus a header click that cycles ascending, descending, and clear. Ctrl or meta adds a column.                                      |
| Grid       | Filtering                                 | Implemented | Core text, number, date, and set filters. The React editor is text `contains` or a small number operator set.                                 |
| Grid       | Row or cell selection                     | Implemented | Checkboxes use source row ids. Header select-all covers every filtered row. No range selection.                                               |
| Grid       | Pagination                                | Implemented | Footer calls the core page API. Labels are 1-based. The API stays 0-based.                                                                    |
| Grid       | Column resize, reorder, or pin            | Partial     | Visibility, width, min, max, and sticky pin. No pointer resize or drag reorder.                                                               |
| Grid       | Virtualization                            | Implemented | The React view mounts the visible page rows and unpinned columns, plus overscan. Pinned columns stay mounted.                                  |
| Grid       | Keyboard navigation                       | Not started |                                                                                                                                               |
| Grid       | Accessibility of grid cells               | Partial     | Native table, header labels, checkbox names, and visible focus. No spreadsheet keyboard navigation.                                           |
| Grid       | Data source, updates, or infinite loading | Partial     | In-memory set, insert, remove, replace, and transactions. No remote source or infinite loading.                                               |
| Theming    | Light, dark, and density foundations      | Ready       | CSS custom properties. Default theme is light.                                                                                                 |
| Theming    | Themes for a rendered grid                | Implemented | Header, cell, pin, hover, selected row, and filtered indicator use the tokens.                                                                |
| Adapters   | Vue, Angular, or other frameworks         | Not started | `GridAdapter` is the extension point. No extra package exists.                                                                                |

"Ready" means the foundation item exists and is covered by a check in this repo. "Implemented" means the behavior exists and has tests. The React grid calls the core for sorting, filtering, pagination, and selection.
