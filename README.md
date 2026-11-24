# MyGrid

MyGrid is a company-owned data grid library. This repository is the monorepo foundation: package boundaries, build and test tooling, a React adapter mount, a base theme, and sample hosts. It does not implement a data grid, and it does not claim feature parity with AG Grid or any other product.

The npm organization is `inno-grid`. Publishable packages use the scope `@inno-grid`. The root package is private. The three library packages are public on purpose, because the free npm plan is in use, and each sets `"publishConfig": { "access": "public" }`. Nothing in this repository publishes to npm. The GitHub repository is intended to stay private.

## Packages

| Package                    | Role                                                         |
| -------------------------- | ------------------------------------------------------------ |
| `@inno-grid/mygrid-core`   | Framework-independent TypeScript. No React and no DOM types. |
| `@inno-grid/mygrid-react`  | React 19 client adapter. Grid logic does not belong here.    |
| `@inno-grid/mygrid-themes` | Opt-in base stylesheet and token names.                      |

Applications import the theme themselves:

```ts
import '@inno-grid/mygrid-themes/theme.css';
import { MyGrid } from '@inno-grid/mygrid-react';
```

`MyGrid` renders a root element and its children. It does not render columns, rows, or cells.

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
pnpm test:e2e
pnpm build
```

`pnpm check` runs Prettier, ESLint, TypeScript, Vitest, the package builds, the Storybook build, and entry-point verification. `pnpm dev` builds workspace dependencies, then starts the playground and the docs site. Dev commands that start an app also build the packages they depend on.

Playwright covers the playground in Chromium:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## Versioning

[Changesets](https://github.com/changesets/changesets) links the three publishable packages. Add a changeset with `pnpm changeset`. `pnpm version-packages` applies changesets locally and does not publish. There is no publish script.

The license is `UNLICENSED`. Choose an SPDX license before the first npm release. Public npm access is not a grant of rights. See `LICENSE`.

## Further reading

- [ARCHITECTURE.md](ARCHITECTURE.md) — package boundaries and rules
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) — what exists and what is planned
- [FEATURE_MATRIX.md](FEATURE_MATRIX.md) — capability status, without a parity claim
- [DECISIONS.md](DECISIONS.md) — decisions already made
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to work in the repo
- [docs/getting-started.md](docs/getting-started.md) — install and run
- [docs/development.md](docs/development.md) — toolchain details
- [docs/packages.md](docs/packages.md) — public entry points
