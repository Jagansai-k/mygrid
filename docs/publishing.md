# Publishing MyGrid

This file is the npm release preparation for `@inno-grid/mygrid-core`, `@inno-grid/mygrid-react`, and `@inno-grid/mygrid-themes`. It does not publish those packages. The versioning steps are in [releasing.md](releasing.md).

## Package layout

The root package `mygrid` is private. Apps and examples are private and ignored by Changesets. The three libraries are not `"private": true`. Each sets `"publishConfig": { "access": "public" }` because the free npm plan does not host private packages. Public registry access is not a license. The software license is the MIT License, copyright (c) 2026 inno-grid. Commercial use, modification, and redistribution are permitted. Copyright and license notices must be preserved, and the MIT warranty disclaimer applies.

Each library is ESM. `main`, `module`, `types`, and the `.` export point at `dist/index.js` and `dist/index.d.ts`. The `files` allowlist is `dist` only, so source, tests, Storybook, and Vitest config stay out of the archive. npm also packs `package.json`, `README.md`, and `LICENSE`. Each package directory has a `LICENSE` copy that must match the repository `LICENSE`. `engines.node` is `>=22`, which is the Node version this repository tests.

`@inno-grid/mygrid-themes` also exports `./theme.css`, `./light.css`, `./dark.css`, and `./density.css`. Those files are CSS assets. They are listed in `sideEffects` so a bundler keeps them.

`@inno-grid/mygrid-react` depends on `@inno-grid/mygrid-core` with `workspace:*` in this repository. It peer-depends on `react` and `react-dom` `^19.0.0`. It does not depend on the themes package at runtime, so a host that wants the stylesheet installs `@inno-grid/mygrid-themes` itself. `pnpm pack` rewrites `workspace:*` in the runtime dependency to the exact core version. In the `0.0.0` archives that version is `0.0.0`. Consumers do not need the workspace catalog or any other monorepo alias.

That exact version is a registry version. Installing the unpublished React `0.0.0` archive by itself asks the registry for `@inno-grid/mygrid-core@0.0.0` and fails with `ERR_PNPM_FETCH_404`, because `0.0.0` is not published. A local tarball test has to install the core archive as well and point the React dependency at that same file, for example with `pnpm.overrides`. This is only a pre-release install constraint. After Changesets moves all three packages to the same released version, `pnpm release:publish` publishes core, then themes, then React. A later `pnpm add` of the released React package resolves core from the registry and does not need an override.

The packed `package.json` still lists `devDependencies`. pnpm replaces `catalog:` and `workspace:*` there with concrete versions. npm does not install devDependencies for an application. The tarball files are only `package.json`, `README.md`, `LICENSE`, and `dist`. Storybook, Vitest, and source files are not in the archive.

`prepublishOnly` runs `scripts/assert-release-ready.mjs`. While the packages are `0.0.0`, or the license is not MIT, that script exits before a registry write. `pnpm pack` does not run `prepublishOnly`.

## Archive check

After `pnpm build`:

```bash
pnpm pack:check
```

The command packs each library into a temporary directory, reads the tarball, and deletes it. It fails when an export, declaration, stylesheet, README, or LICENSE is missing, when a runtime dependency still uses `workspace:` or `catalog:`, when the React peers are not `^19.0.0`, or when the archive contains source, tests, local paths, or a credential pattern.

## Authentication

Prefer npm trusted publishing. It uses GitHub Actions OIDC, so the workflow does not store a long-lived npm token. The npm documentation requires npm CLI `11.5.1` or later and Node.js `22.14.0` or later. `.github/workflows/publish.yml` installs npm `11.5.1` and runs on `ubuntu-latest`, which is a GitHub-hosted runner. Trusted publishing does not support self-hosted runners.

The workflow asks for `id-token: write` and does not set `registry-url` or `NODE_AUTH_TOKEN`. `actions/setup-node` writes an auth token line when `registry-url` is set. An empty token can stop npm from using OIDC, so that input is omitted. Do not add `NPM_TOKEN` to the workflow while OIDC is the intended authentication. npm prefers a configured token over OIDC.

Trusted publishing can be attached only after the package exists on npm. The first publish of each name is a local publish by a maintainer who has run `npm login`. Later publishes use the workflow. Provenance attestations are generated only for a public package built from a public GitHub repository. This repository is intended to stay private, so a successful OIDC publish from it does not produce provenance.

A granular automation token is the fallback for a machine that cannot use OIDC. Create it in npm with permission to publish only these packages, store it as a GitHub Actions secret, and do not commit it. Pass it only to the publish step as `NODE_AUTH_TOKEN`. Revoke it after the trusted publisher has completed its first successful publish. This repository does not contain a token and the workflow does not read one.

## Settings a maintainer must configure

These settings are outside the repository. The workflows do not create them.

1. An npm account that can create or administer the `inno-grid` organization. This repository does not verify that the organization exists.
2. The three package names. A public registry lookup on 25 November 2026 returned `404 Not Found` for `@inno-grid/mygrid-core`, `@inno-grid/mygrid-react`, and `@inno-grid/mygrid-themes`. That shows they are not in the public registry. It does not prove the scope exists or that the names can be claimed.
3. The SPDX identifier is MIT, copyright (c) 2026 inno-grid. Commercial use, modification, and redistribution are permitted. Copyright and license notices must be preserved, and the MIT warranty disclaimer applies. `pnpm release:publish` still refuses to run while the version is `0.0.0`.
4. `repository.url` in each library `package.json`. It is unset on purpose. The git remote in this checkout is `https://origin.cursor.com/dinesh-selvakumar/mygrid.git`, which is not a GitHub repository URL. npm trusted publishing requires `repository.url` to match the GitHub repository that runs `publish.yml`. Set that field, and `repository.directory`, only when the GitHub owner and repository name are known. Do not invent them.
5. The GitHub default branch must be `main`. Changesets and both release workflows use that name.
6. GitHub Actions workflow permissions must allow the `GITHUB_TOKEN` to create pull requests. The version workflow needs that permission. It does not need an npm token.
7. A GitHub Environment named `npm` with required reviewers, created before the first run of Publish. The workflow names that environment. If the environment has no required reviewers, dispatching the workflow is weaker than the approval this repository expects.
8. After each package exists, a trusted publisher on its npm settings:
   - Provider: GitHub Actions
   - Organization or user, and repository: the real GitHub names
   - Workflow filename: `publish.yml`
   - Environment name: `npm`
   - Allowed action: direct `npm publish`. Publisher configurations created after 3 September 2026 allow `npm stage publish` unless direct publish is selected.
   - The first successful OIDC publish must happen within two days or the publisher configuration expires.
9. Optional, after OIDC works: in the package's Publishing access, require two-factor authentication and disallow tokens. Then revoke the bootstrap token.

## What this repository will not do by itself

`pnpm release:publish` is the only publish command. It packs the archives and then runs `npm publish` on those tarballs, core first, then themes, then React. It skips a version that is already on the registry. It does not create a GitHub release and it does not push tags. The Publish workflow has `contents: read`, so it cannot push tags either.

Do not run `pnpm release:publish` until the checklist in [releasing.md](releasing.md) is complete.
