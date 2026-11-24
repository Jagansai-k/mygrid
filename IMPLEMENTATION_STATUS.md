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
- `@inno-grid/mygrid-themes`, with a default stylesheet plus light, dark, and density foundations
- Playground, docs site, React example, and Next.js App Router example
- Architecture checks for package metadata, DOM lib boundaries, and module-scope browser globals

`MyGrid` mounts a root element. It is not a data grid.

## Package configuration

Status: implemented for the three libraries. Nothing has been published to npm.

What works:

- Package names are `@inno-grid/mygrid-core`, `@inno-grid/mygrid-react`, and `@inno-grid/mygrid-themes`.
- The root package is private. The three libraries are not `"private": true`, and each sets `"publishConfig": { "access": "public" }`.
- Each library is ESM. `main`, `module`, `types`, and `exports` point at `dist`. `files` publishes `dist` only. There is no CommonJS build and no absolute path in a manifest.
- `build`, `test`, `typecheck`, and `clean` exist on each library. The root scripts run them across the workspace.
- Core has no React dependency, no DOM type library, and does not read `window`, `document`, or `navigator` while the module initializes. Its public module is `defineGridAdapter` plus the library name and version. A unit test covers that module.
- React peer-depends on `react` and `react-dom` `^19.0.0` and depends on core with `workspace:*`. `MyGrid` is a client component. Its entry starts with `'use client'`. A rendering test checks the mount, and another checks the theme and density attributes. The component does not reimplement grid logic.
- Themes ship `theme.css` (the easy import), plus `light.css`, `dark.css`, and `density.css`. Colors and density are CSS custom properties. Light is the default. Density names are `compact`, `default`, and `comfortable`.
- A Next.js App Router example still imports core from a Server Component and `MyGrid` from the client entry. The React example and the docs site import the same CSS entry.
- Consumer verification imports core on its own, checks that the React bundle imports core, resolves every theme CSS export, and reads the generated `.d.ts` files. The playground typecheck imports those same entry points.

What remains:

- No package has been published, and there is no publish script. The license is still `UNLICENSED`.
- Grid behavior is not started: no columns, rows, cells, sorting, filtering, selection, editing, virtualization, or keyboard grid navigation.
- Theme rules for rendered cells are not started. Light, dark, and density style the mount shell only.
- React 18 is not claimed. Another framework adapter does not exist yet.

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

From a clean install, `pnpm check` is the local gate: format, lint, typecheck, unit tests, package and app builds, Storybook build, metadata checks, and a Node import of the built packages. `pnpm test` builds the three libraries, runs Vitest, and then runs that Node import. `pnpm typecheck` covers the consumer TypeScript file in the playground. `pnpm test:e2e` builds the playground and runs Playwright. The commands and their results belong in the change that runs them; this file does not record a stale pass.
