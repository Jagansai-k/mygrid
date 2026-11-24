# Contributing

## Setup

Use Node.js 22 or newer and pnpm 10.33.4.

```bash
pnpm install
pnpm check
```

`pnpm check` is the gate before a change is finished: Prettier, ESLint, TypeScript, Vitest, Vite builds, the Next.js build, the Storybook build, and the foundation scripts. Browser coverage is separate:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## Day-to-day commands

| Command                   | What it does                                                                |
| ------------------------- | --------------------------------------------------------------------------- |
| `pnpm dev`                | Playground on port 4183 and docs on port 4184                               |
| `pnpm dev:playground`     | Playground only                                                             |
| `pnpm dev:docs`           | Docs site only                                                              |
| `pnpm dev:storybook`      | Storybook on port 6008                                                      |
| `pnpm dev:example-react`  | Vite example on port 4185                                                   |
| `pnpm dev:example-nextjs` | Next.js example on port 4186                                                |
| `pnpm test`               | Build the three libraries, run unit tests, and verify package entry points. |
| `pnpm lint`               | ESLint from the repository root                                             |
| `pnpm typecheck`          | `tsc --noEmit` in every workspace package                                   |
| `pnpm build`              | Library, app, and example builds                                            |
| `pnpm clean`              | Delete `dist` in the three libraries                                        |
| `pnpm format`             | Write Prettier formatting                                                   |

Dev tasks build workspace dependencies before the server starts, so the apps resolve `dist` entry points.

## Rules that keep the architecture intact

- Put grid behavior in `@inno-grid/mygrid-core`. Do not reimplement it in the React package.
- Do not read `window`, `document`, `localStorage`, `sessionStorage`, or `navigator` at module scope in a publishable package. A function that runs later may, once a host calls it.
- Do not add the DOM type library to core or themes.
- Keep `'use client'` as the first statement of the React package entry. The build checks `dist/index.js`.
- Do not import theme CSS from the React runtime. Hosts opt in.
- Do not add a public function that pretends a missing grid feature works.
- Do not copy source, icons, CSS, or names from another grid product.
- Avoid `any`. The linter rejects it.

`scripts/check-foundation.mjs` enforces the package names, `publishConfig.access`, the version constants, the DOM library boundary, and the module-scope global rule.

## Versions

The exported version constant in each package must match `package.json`. A unit test and `scripts/check-foundation.mjs` both compare them. When Changesets bumps a version, update the matching `src/version.ts` constant in the same change.

```bash
pnpm changeset
pnpm version-packages
```

`version-packages` rewrites versions and changelogs. It does not publish, and it does not commit. Do not add an npm publish script until a license is chosen and a maintainer intends to release.

The three libraries are linked. Apps and examples are private and ignored.

## Tests

- Core and themes tests run in Node.
- The React mount test runs in jsdom. The adapter descriptor test runs in Node, which also shows that importing the React entry does not need a browser.
- Playwright should keep asserting that the playground mount is not exposed as `role="grid"` until a real grid exists.

## Generated output

Do not commit `dist`, `.next`, `storybook-static`, `node_modules`, or Playwright reports. CI installs from the lockfile and runs `pnpm check` plus `pnpm test:e2e`.
