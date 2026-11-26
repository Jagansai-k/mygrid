# MyGrid

MyGrid is a company-owned data grid library. This repository holds the core engine, a React grid, a base theme, and sample hosts. It does not claim feature parity with any other product.

The npm organization is `inno-grid`. Publishable packages use the scope `@inno-grid`. The root package is private. The three library packages are public on purpose, because the free npm plan is in use, and each sets `"publishConfig": { "access": "public" }`. Nothing in this repository publishes to npm. The GitHub repository is intended to stay private.

## Packages

| Package                    | Role                                                         |
| -------------------------- | ------------------------------------------------------------ |
| `@inno-grid/mygrid-core`   | Framework-independent TypeScript. No React and no DOM types. |
| `@inno-grid/mygrid-react`  | React 19 client grid. Behavior stays in the core package. |
| `@inno-grid/mygrid-themes` | Opt-in default, light, dark, and density stylesheets.        |

Applications import the theme themselves:

```ts
import '@inno-grid/mygrid-themes/theme.css';
import { MyGrid } from '@inno-grid/mygrid-react';
```

`MyGrid` renders column headers, rows, and cells when `columnDefs` is set. Omit it to render children only. Import the theme stylesheet in the host. The React package does not import CSS.

## Repository layout

```text
packages/mygrid-core      Framework-independent library
packages/mygrid-react     React adapter and Storybook
packages/mygrid-themes    Theme tokens and CSS
apps/playground           Development shell (port 4183)
apps/docs                 Documentation site (port 4184)
examples/react            Vite consumer (port 4185)
examples/nextjs           Next.js App Router consumer (port 4186)
docs                      Longer guides
e2e                       Playwright tests
```

Storybook for the React package uses port 6008.

## Requirements

- Node.js 22 or newer
- pnpm 10.33.4 (`packageManager` in the root `package.json`)

## Commands

```bash
pnpm install
pnpm check
pnpm dev
pnpm dev:playground
pnpm dev:docs
pnpm dev:storybook
pnpm dev:example-react
pnpm dev:example-nextjs
pnpm test
pnpm typecheck
pnpm test:e2e
pnpm build
pnpm clean
```

`pnpm test` builds the three libraries, runs their unit tests, and imports the built packages to check exports, declarations, and the theme CSS. `pnpm typecheck` checks those entry points from TypeScript, including the CSS imports.

`pnpm check` runs Prettier, ESLint, TypeScript, Vitest, the package builds, the Storybook build, and entry-point verification. `pnpm dev` builds workspace dependencies, then starts the playground and the docs site. Dev commands that start an app also build the packages they depend on.

Playwright covers the playground in Chromium:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## Versions

The three libraries are a linked Changeset set. `pnpm changeset` records a patch, minor, or major bump. `pnpm version-packages` applies it, rewrites the changelogs, and copies the new version into each `src/version.ts` constant. It does not commit and it does not publish.

`pnpm pack:check` packs the three archives and checks their entry points. `pnpm release:publish` is the publish command. It refuses to run while the version is `0.0.0`. The steps and the GitHub Environment approval are in [docs/releasing.md](docs/releasing.md) and [docs/publishing.md](docs/publishing.md).

MyGrid is licensed under the MIT License, copyright (c) 2026 inno-grid. Commercial use is permitted. You may modify and redistribute the software. Copyright and license notices must stay with copies and substantial portions. The license includes its warranty disclaimer. See `LICENSE`.

## Further reading

- [ARCHITECTURE.md](ARCHITECTURE.md) — package boundaries and rules
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) — what exists and what is planned
- [FEATURE_MATRIX.md](FEATURE_MATRIX.md) — capability status, without a parity claim
- [DECISIONS.md](DECISIONS.md) — decisions already made
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to work in the repo
- [docs/getting-started.md](docs/getting-started.md) — install, run, and the documentation site
- [apps/docs](apps/docs) — v1 documentation website, served by `pnpm dev:docs`
- [docs/publishing.md](docs/publishing.md) — npm archive rules and authentication
- [docs/releasing.md](docs/releasing.md) — Changesets and the first release checklist
- [docs/development.md](docs/development.md) — toolchain details
- [docs/packages.md](docs/packages.md) — public entry points
