# Implementation status

This file is the status of MyGrid. It is not a compatibility matrix against another grid.

## Phase 0 — Foundation

Status: implemented in this repository.

- pnpm workspaces, Turborepo, and a version catalog
- Strict TypeScript, ESLint, and Prettier
- Vite library builds with ESM and declaration output
- Vitest unit tests for the three packages
- Storybook for the React mount
- Playwright for the playground
- Changesets, with the three libraries linked and `access: public`
- `@inno-grid/mygrid-core`, with `defineGridAdapter` and no DOM library
- `@inno-grid/mygrid-react`, a client mount component and a React adapter descriptor
- `@inno-grid/mygrid-themes`, base tokens and `[data-mygrid]` styles
- Playground, docs site, React example, and Next.js App Router example
- Architecture checks for package metadata, DOM lib boundaries, and module-scope browser globals

`MyGrid` mounts a root element. It is not a data grid.

## Later phases

These phases are not started. They are the intended order, not a commitment that every item ships, and not a copy of another product's feature list.

| Phase | Intent                                                                                      | Status      |
| ----- | ------------------------------------------------------------------------------------------- | ----------- |
| 1     | Column and row model in core, as plain data                                                 | Not started |
| 2     | A framework-neutral description of cells, still without touching the DOM during module init | Not started |
| 3     | React rendering of that description                                                         | Not started |
| 4     | Theme rules for the rendered cells                                                          | Not started |
| 5     | Sorting, filtering, and selection as core behavior, then React wiring                       | Not started |
| 6     | Editing                                                                                     | Not started |
| 7     | Virtualization                                                                              | Not started |
| 8     | Keyboard behavior and accessibility of the real grid                                        | Not started |
| 9     | Another framework adapter that depends on core and not on the React package                 | Not started |

Each later phase should land with tests in the package that owns the behavior. Do not stub a phase in the public API before it works.

## Verification

From a clean install, `pnpm check` is the local gate: format, lint, typecheck, unit tests, package and app builds, Storybook build, metadata checks, and a Node import of the built packages. `pnpm test:e2e` builds the playground and runs Playwright. The commands and their results belong in the change that runs them; this file does not record a stale pass.
