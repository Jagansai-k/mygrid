# Feature matrix

This matrix tracks MyGrid's own scope. It is not a comparison with AG Grid, and it does not claim parity with any other grid.

| Area       | Capability                                | Status      | Notes                                                                    |
| ---------- | ----------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| Repository | pnpm workspace, Turborepo, Changesets     | Ready       | Root package is private. Three libraries are publishable and public.     |
| Repository | Strict TypeScript, ESLint, Prettier       | Ready       | TypeScript 6.0, which is the newest release `typescript-eslint` accepts. |
| Packages   | ESM build and `.d.ts` output              | Ready       | Vite library mode. No CommonJS build.                                    |
| Packages   | Framework-independent core                | Ready       | No React dependency and no DOM type library.                             |
| Packages   | React adapter mount                       | Ready       | Renders a root and children. Does not render a grid.                     |
| Packages   | Next.js App Router host                   | Ready       | Example reads core on the server and mounts the client adapter.          |
| Packages   | Base theme tokens                         | Ready       | Opt-in CSS. Tokens cover the mount shell only.                           |
| Packages   | Storybook                                 | Ready       | Stories for the mount, including a class name.                           |
| Packages   | Unit tests                                | Ready       | Foundation behavior only.                                                |
| Packages   | Browser test                              | Ready       | Playwright loads the playground.                                         |
| Grid       | Column model                              | Not started |                                                                          |
| Grid       | Row model                                 | Not started |                                                                          |
| Grid       | Cell rendering                            | Not started |                                                                          |
| Grid       | Cell editing                              | Not started |                                                                          |
| Grid       | Sorting                                   | Not started |                                                                          |
| Grid       | Filtering                                 | Not started |                                                                          |
| Grid       | Row or cell selection                     | Not started |                                                                          |
| Grid       | Pagination                                | Not started |                                                                          |
| Grid       | Column resize, reorder, or pin            | Not started |                                                                          |
| Grid       | Virtualization                            | Not started |                                                                          |
| Grid       | Keyboard navigation                       | Not started |                                                                          |
| Grid       | Accessibility of grid cells               | Not started | The mount shell is a plain element, not a grid widget.                   |
| Grid       | Data source, updates, or infinite loading | Not started |                                                                          |
| Theming    | Themes for a rendered grid                | Not started | Only mount-shell tokens exist.                                           |
| Adapters   | Vue, Angular, or other frameworks         | Not started | `GridAdapter` is the extension point. No extra package exists.           |

"Ready" means the foundation item exists and is covered by a check in this repo. It does not mean a grid capability exists.
