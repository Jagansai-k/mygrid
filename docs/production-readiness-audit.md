# MyGrid v1 production-readiness audit

Audit date: 26 November 2026. This is an engineering review of the current monorepo. It is not a security certification and it is not a performance guarantee. Nothing was published, tagged, or released. Package versions and the license were not changed during the audit.

> Historical update: after this audit, the owner approved the MIT License, copyright (c) 2026 inno-grid. Sentences below that say the license is `UNLICENSED`, that no license is granted, or that an SPDX license is still required describe the repository on the audit date. That licensing blocker is resolved. The `0.0.0` version and the external npm and GitHub blockers are not.

## 1. Executive summary

The v1 libraries build, typecheck, lint, and pass their unit and browser tests. A separate Next.js 16 consumer already installed the local archives, exercised the v1 grid, and produced a production build. The implementation is usable inside this repository and from those local archives.

It is not ready for a public npm release. `scripts/assert-release-ready.mjs` still exits 1 because every library is `0.0.0` and `UNLICENSED`. `repository.url` is unset. The npm organization, package ownership, GitHub Environment, and trusted publisher are outside this repository and were not configured here.

Verdict: **NOT READY** for an external release. The code checks passed. The release blockers below are what keep that verdict conservative.

## 2. Build and test results

Environment: pnpm 10.33.4, Node.js 22.16.0, TypeScript 6.0.3, React 19.3.1 in the catalog, Next.js 16.4.6 in the Next.js example.

The working tree was already dirty with the uncommitted v1 implementation before this audit. This audit did not revert that work.

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Pass. Lockfile already up to date. |
| `pnpm build` | Pass. 7 packages, including the Next.js example. |
| `pnpm typecheck` | Pass. 10 packages. |
| `pnpm lint` | Pass. ESLint reported no problems. |
| `pnpm test` | Pass. Core 100, React 54, themes 4. Playground package verification passed. |
| `pnpm pack:check` | Pass. Archives contain the entry points, declarations, CSS, README, and LICENSE. No `workspace:` or `catalog:` protocol remains. |
| `pnpm test:e2e` | Pass on the rerun. 6 Chromium tests in 41.9s. The first attempt failed because Playwright's Chromium binary was not installed in this environment. `pnpm exec playwright install chromium` fixed that. The tests themselves were not changed. |
| `node scripts/assert-release-ready.mjs` | Expected failure. Blocks `0.0.0` and `UNLICENSED` on all three packages. |
| `pnpm audit` | 2 moderate findings, both in the Storybook development dependency chain. See security. |

## 3. Package distribution audit

All three libraries are ESM. `main`, `module`, `types`, and the `.` export point at `dist/index.js` and `dist/index.d.ts`. Themes also export `./theme.css`, `./light.css`, `./dark.css`, and `./density.css`. `files` is `dist` only. npm still packs `package.json`, `README.md`, and `LICENSE`. The packed archives from this audit contained those files and the built `dist` output. They did not contain `src/`, tests, Storybook files, or Vitest config.

Core and themes declare no runtime or peer dependencies. React peers on `react` and `react-dom` `^19.0.0`, which matches the catalog React 19.3.1 and the consumer's React 19.3.0. React's runtime dependency is `workspace:*` in the repository. `pnpm pack` rewrites that to the exact core version. At `0.0.0`, the archive depends on `@inno-grid/mygrid-core@0.0.0`.

That is a registry version. Installing the unpublished React tarball by itself asks npm for core `0.0.0` and fails with `ERR_PNPM_FETCH_404`. The consumer test hit this and used a `pnpm.overrides` entry pointing at the core tarball. Themes are not a runtime dependency of React, so a host also installs `@inno-grid/mygrid-themes` when it wants the stylesheet.

No packaging change is required for a normal install after release. Linked Changesets move all three packages to the same version. `pnpm release:publish` publishes core, then themes, then React. After that version exists on the registry, `pnpm add` of the released React package resolves core from the registry and does not need an override. `docs/publishing.md` now says this explicitly.

The packed manifest still lists `devDependencies` with concrete versions. npm does not install those for an application. Source maps (`dist/index.js.map`) are inside the archives because they are emitted into `dist`. `pack:check` scanned them for credential and local-user-path patterns and did not fail. Shipping maps is a size and source-disclosure choice, not a failed check.

`publishConfig.access` is `public` so the free npm plan can host the packages. The LICENSE file says public registry access is not a grant of rights. License metadata remains `UNLICENSED`.

## 4. API and compatibility findings

`tsc --noEmit` passed for the libraries, the playground, the docs site, and both examples. The packed declaration entry points mention the symbols `pack:check` requires. No incorrect or missing declaration was found in this pass, and no new unit test was added because no untested defect was isolated.

Public exports match the implementation that hosts use:

- Core exports `createGrid`, serialization, errors, the version constant, and the documented types from `src/index.ts`.
- React exports `MyGrid`, its prop types, the React version constant, and the adapter. The built entry starts with the client directive.
- Themes export the token module and the four CSS paths.

Row identity reads an own `id` string or finite number, or a host `getRowId`. Duplicate and empty ids throw. Sorting does not mutate the source array. Filtering, paging, and selection go through the core API and reject invalid models. Persistence requires version 1, exact keys, plain JSON values, no cycles, and agreement between rows, ids, selection, focus, and the page window. `JSON.parse` is followed by that validation. `destroy()` clears event listeners and state subscribers. The React hook destroys the core grid on unmount. The scroll hook removes its scroll listener, cancels its animation frame, and disconnects `ResizeObserver`.

The Next.js example is an App Router server page that passes plain column and row data into `MyGrid`. Its production build passed. The earlier consumer integration on Next.js 16.4.6 and React 19.3.0 also passed. Creation-time options remain sorting, filtering, pagination, selection, `getRowId`, context, and `initialState`. Live updates remain row data, column definitions, theme, density, and loading.

No v2 feature was added.

## 5. Security findings by severity

No Critical or High finding was identified in the library runtime.

| Severity | Finding |
| --- | --- |
| Medium | None in the published runtime. |
| Low | `pnpm audit` reports two moderate advisories in development dependencies only: `glob` `GHSA-3g3m-2fjr-6pw4` (patched in `>=14.0.2`) and `minimatch` `GHSA-g3hv-75wg-m249` (patched in `>=11.0.1`). The path is `@storybook/react-vite` and its docgen plugin. Those packages are not part of the published `dist`. They do not run in a consumer grid. An automatic upgrade was not applied. |
| Low | `.github/workflows/ci.yml` does not set a `permissions` block, so the job uses the repository's default `GITHUB_TOKEN` permissions. The job installs, tests, and packs. It does not publish. |
| Informational | Cell values are rendered as React text children through `cellText`. The view does not use `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function`. |
| Informational | Serialization rejects non-plain objects, non-finite numbers, functions, cycles, and unknown snapshot keys before the snapshot is restored. This limits prototype pollution through the persistence API. A hostile snapshot can still be large. The engine keeps the full row list in memory. That is a host-controlled allocation, not a remote parser exposed by this repository. |
| Informational | `destroy()` and the React unmount path drop listeners. Scroll and resize listeners are removed. |
| Informational | `pack:check` looks for private-key, npm-token, GitHub-token, and AWS-key patterns, and for local user paths. This audit's archives passed. No token was added to the repository or the report. |
| Informational | Publish is `workflow_dispatch` only, requires the input `publish`, requires ref `main`, uses the `npm` environment, sets `contents: read` and `id-token: write`, and does not set `NODE_AUTH_TOKEN` or `registry-url`. `pnpm release:publish` runs the version and license guard before `npm publish`, then publishes core, themes, and React in that order. It skips a version already on the registry. |

## 6. Performance results

These numbers are one session on this Windows machine. They are not a service level and they are not comparable to a tuned benchmark lab. Engine samples use the existing bench files: 5 runs below 50,000 rows and 3 runs at 50,000 and 100,000, then the median. Virtualization samples at 1,000 and 10,000 rows use 3 runs except the non-virtual mode, which is one run. Samples at 50,000 and 100,000 virtual rows are one run.

Engine medians, in milliseconds, from Vitest in Node:

| Rows | Sort, 1 column | Sort, 2 columns | Filter, one column | Filter, two columns | Filter plus sort | Change page | Select all source rows |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 2.59 | 3.46 | 6.09 | 3.02 | 3.17 | 1.38 | 0.74 |
| 10,000 | 26.96 | 46.86 | 13.93 | 12.44 | 29.85 | 7.20 | 8.51 |
| 50,000 | 167.73 | 407.97 | 93.40 | 72.19 | 151.25 | 51.39 | 48.07 |
| 100,000 | 368.58 | 841.24 | 155.39 | 126.41 | 448.33 | 142.25 | 98.28 |

Sorting is a comparison sort over an index array, so the cost grows faster than the row count. Filtering walks the rows. Page changes do not copy the full row list into the DOM. Select-all records every source id. The combined filter, sort, and page sample at 100,000 rows had a median of 564.02 ms. Row lookup by id uses a `Map`.

jsdom virtualization benchmark, not a browser:

| Rows | Mode | DOM rows | DOM cells | Initial ms | Scroll ms |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1,000 | virtual rows only | 23 | 276 | 712.90 | 618.86 |
| 1,000 | rows and columns | 23 | 184 | 526.78 | 290.72 |
| 10,000 | virtual rows only | 23 | 276 | 272.47 | 129.16 |
| 10,000 | rows and columns | 23 | 184 | 265.18 | 136.52 |
| 50,000 | virtual rows only | 23 | 276 | 557.08 | 190.34 |
| 50,000 | rows and columns | 23 | 184 | 296.32 | 108.13 |
| 100,000 | virtual rows only | 23 | 276 | 526.42 | 212.40 |
| 100,000 | rows and columns | 23 | 184 | 444.97 | 301.91 |

With virtualization left on, the mounted row count stayed at 23 while the source grew to 100,000. Turning virtualization off mounted every row: 1,000 rows produced 12,000 cells in 8,974 ms, and 10,000 rows produced 120,000 cells in 69,280 ms, both single jsdom runs. The bench does not mount 50,000 or 100,000 rows without virtualization. A host that sets `virtualizeRows` to false on a large page pays for every row in the DOM.

The earlier consumer Chromium run, one Next.js dev session at a 22rem height, is a different measurement. It reported about 330 ms, 286 ms, 535 ms, and 676 ms before the total-row attribute matched for 1,000, 10,000, 50,000, and 100,000 rows. The mounted window was 11 checkboxes at the first sample and 19 rows after scroll measurement. Those times include generating the rows in the page. They are not the engine medians above.

The data model retains every row. Virtualization bounds the DOM, not the JavaScript heap.

## 7. Accessibility findings

The v1 view uses a `table` with an accessible name, column headers, `aria-sort` on sortable headers, `aria-busy` while loading, `aria-rowcount`, and `aria-rowindex` on mounted rows. Sort controls, filter fields, column visibility checkboxes, row selection, and page buttons have accessible names. Spacer rows are hidden from the accessibility tree. Loading and empty copy are in a `role="status"` paragraph. Focus-visible outlines use the theme focus ring. The browser tests cover the dark theme, compact density, and a narrow viewport for both the playground and the docs site.

Limitations, recorded without adding v2 behavior:

- Keyboard use is the native tab order of buttons, inputs, selects, and checkboxes. There is no arrow-key cell navigation. That remains a deferred v2 feature.
- The status paragraph updates with the filtered and selected counts, so a screen reader can hear frequent updates.
- Contrast was inspected from the token pairs (`#1b1914` on `#fffdf8`, `#f4f1ea` on `#1c1915`) and the focus rings. No contrast measurement tool was run, so this audit does not claim a WCAG level.
- The theme CSS does not include a `prefers-reduced-motion` rule. The current view has little animation.
- Virtualization removes off-screen rows from the DOM. `aria-rowcount` and `aria-rowindex` describe the page, but a screen reader does not walk rows that are not mounted.

## 8. Documentation accuracy

The docs site states that the packages are not published, that `0.0.0` and `UNLICENSED` block publish, and that an `npm install` of the public names fails until a release exists. The Next.js page matches the example: a Server Component may render `MyGrid` because the package entry is a client module, and it should pass plain data rather than functions.

`docs/publishing.md` previously said consumers do not need a workspace alias. That remains true. It did not say that the packed React dependency is the exact registry version, so an unpublished `0.0.0` tarball cannot be installed alone. That paragraph was added. The post-release sequence is unchanged: publish core, then themes, then React, at one shared version.

Version constants are still `0.0.0` and match the manifests. `repository.url` is intentionally unset because the current git remote is not the GitHub repository npm trusted publishing must match. The LICENSE text matches the `UNLICENSED` metadata and says no license is granted yet.

## 9. Release workflow assessment

`CI` installs from the lockfile, runs `pnpm check`, `pnpm pack:check`, and the browser tests. It has no publish step.

`Release pull request` runs on a push to `main`, with `contents: write` and `pull-requests: write`, and only opens or updates the Changesets version pull request. Merging that pull request does not publish.

`Publish` cannot run from a pull request. It requires a manual dispatch, the word `publish`, the `main` branch, and the GitHub Environment named `npm`. The workflow does not store an npm token. Trusted publishing still cannot be attached until each package exists, and the first publish has to be a local `npm login` followed by `pnpm release:publish`.

The publish guard was executed during this audit and refused to continue. `pnpm release:publish` was not run.

## 10. Issues fixed

- `docs/publishing.md` now explains the `0.0.0` tarball 404, the local override used to test archives together, and why a released version does not need that override.

No public API, package version, license, test, TypeScript setting, or workflow file was changed.

## 11. Issues requiring approval

- Give `.github/workflows/ci.yml` an explicit least-privilege `permissions` block, with `contents: read`, if the repository default token is broader than that.
- Decide whether published archives should omit `dist/*.js.map`. Removing them changes the published file set. The current maps passed the secret scan.
- Do not upgrade `glob` or `minimatch` until a Storybook-compatible version is chosen. A `pnpm` override to the patched versions may work, and it may also break the Storybook docgen plugin. That needs a separate compatibility check.
- Do not set `repository.url` until the GitHub owner and repository name are known.

## 12. Outstanding release blockers

These are external or policy decisions. This audit did not resolve them.

1. An npm account that can create or administer the `inno-grid` organization. This repository has not proved that the organization exists.
2. Ownership of `@inno-grid/mygrid-core`, `@inno-grid/mygrid-react`, and `@inno-grid/mygrid-themes`. A lookup on 25 November 2026 returned 404. That shows the names were not in the public registry. It does not prove they can be claimed.
3. An SPDX license chosen by the company, then written into the three manifests and the LICENSE files. Until then publish stays blocked. This item described the audit date. The owner later chose MIT, copyright (c) 2026 inno-grid, and that choice is now in the repository.
4. A real GitHub repository URL, written to `repository.url` and `repository.directory` only when those names are known. The current remote is not that URL.
5. A GitHub Environment named `npm` with required reviewers, created before the first Publish run.
6. After the first local publish, a trusted publisher on each package: workflow `publish.yml`, environment `npm`, and direct `npm publish` allowed. The first OIDC publish has to succeed within two days of that configuration.
7. A version pull request that moves the linked packages off `0.0.0`. The recommended first registry version remains `0.1.0`, not `1.0.0`. This audit did not create that changeset.

## 13. Final readiness verdict

**NOT READY** for a public release.

The v1 implementation, local archives, Next.js example, and consumer integration are in good shape for continued internal use. On the audit date, publishing was blocked by the license, the `0.0.0` version, missing repository metadata, and npm and GitHub settings that belong to the maintainers. The license blocker was later resolved by MIT, as noted at the top of this report. The version and external blockers remain. No release action was taken.
