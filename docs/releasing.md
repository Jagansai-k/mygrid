# Releasing MyGrid

Package authentication, archive rules, and the npm account settings are in [publishing.md](publishing.md). Nothing in this process publishes a package until a maintainer runs the publish command after the checklist below.

## Recommended first version

The libraries are `0.0.0` today. Leave that number in place until the first intentional version pull request.

The recommended first registry version is `0.1.0` for all three packages together. The v1 grid, React view, themes, and documentation are implemented and tested in this repository, and they have not been consumed as published packages. `0.1.0` is a minor bump from `0.0.0`. It is large enough to mark a usable release and small enough to leave room for a breaking change before an external stability promise.

`1.0.0` is a later decision. Use it when the company is ready to treat the public API as stable for consumers outside this repository. The license is already MIT. Do not start the first release at `1.0.0` only because the product milestone is called v1.

## Changesets

Changesets is already configured in `.changeset/config.json`.

The three libraries are one linked set. A version change moves them together. That is the right shape: the React package calls the core API it was built with, and a host should not have to mix three unrelated versions. Apps and examples are ignored. Their versions stay at `0.0.0`.

`access` is `public`. `updateInternalDependencies` is `patch`, so a package that depends on another released package moves when that dependency changes. The React dependency is `workspace:*` in the repository. The packed archive replaces that protocol with the core version. `commit` is `false`, so `pnpm version-packages` does not create a git commit. The release pull request workflow commits the result.

Add a changeset from the repository root:

```bash
pnpm changeset
```

Use the bump that matches the change:

| Bump  | When to use it                                                            | Result from `0.0.0` |
| ----- | ------------------------------------------------------------------------- | ------------------- |
| patch | A fix that does not change the public API.                                | `0.0.1`             |
| minor | New backwards-compatible behavior. This is the recommended first release. | `0.1.0`             |
| major | A breaking public API change, or the decision to declare `1.0.0`.         | `1.0.0`             |

Because the packages are linked, a bump on one library applies the same bump to the other two. Name all three in the changeset summary when the change is the initial release, so the pull request shows the intent.

Apply the changesets locally with:

```bash
pnpm version-packages
```

That command runs `changeset version` and then `scripts/sync-versions.mjs`. The script copies each new `package.json` version into `MYGRID_CORE_VERSION`, `MYGRID_REACT_VERSION`, and `MYGRID_THEMES_VERSION`. The foundation check fails if those constants drift. The command also writes a `CHANGELOG.md` in each released package. It does not publish and it does not commit.

### Prerelease

Changesets pre mode is available without extra packages:

```bash
pnpm changeset pre enter beta
pnpm changeset
pnpm version-packages
```

A minor changeset from `0.0.0` in the `beta` pre mode produces a `0.1.0-beta.N` version. Read the version diff before treating that number as final. Leave pre mode before the stable release:

```bash
pnpm changeset pre exit
```

The publish guard rejects `0.0.0` and any version that starts with `0.0.0-`. A prerelease has to be cut from a real minor, patch, or major bump.

## Workflows

Pull requests and pushes to `main` run `.github/workflows/ci.yml`. The job installs from the lockfile, runs `pnpm check` (format, build, lint, typecheck, unit tests, Storybook, and foundation checks), runs `pnpm pack:check`, installs Chromium, and runs the browser tests. It does not publish.

`.github/workflows/release-pr.yml` runs on a push to `main`. When `.changeset` contains a package bump, `changesets/action` opens or updates a pull request titled `chore: version packages`. Merging that pull request updates versions and changelogs. The workflow has no publish step.

`.github/workflows/publish.yml` runs only from the Actions tab, and only when the selected ref is `main` and the input is the word `publish`. The job uses the GitHub Environment `npm`. Create that environment and add required reviewers before using the workflow. The job builds, then runs `pnpm release:publish`.

## First release checklist

1. Read [publishing.md](publishing.md) and complete the npm organization, package-name, `repository.url`, and GitHub Environment steps. The license is MIT.
2. Keep `"license": "MIT"` on the three libraries and keep each package `LICENSE` identical to the repository `LICENSE`. `scripts/assert-release-ready.mjs` still refuses `0.0.0`.
3. From a branch, add a minor changeset for the initial release:

```bash
pnpm changeset
```

4. Open a pull request and wait for `CI` to pass, including `pnpm pack:check`.
5. Merge to `main`. Wait for `Release pull request` to open `chore: version packages`. Review that the three versions are `0.1.0`, that the version constants match, and that the changelogs describe only the shipped release.
6. Merge the version pull request. That merge does not publish.
7. Publish the first versions from a machine that has run `npm login`. Trusted publishing cannot be configured until the packages exist.

```bash
pnpm install
pnpm build
pnpm pack:check
pnpm release:publish
```

`pnpm release:publish` checks the license and version, packs again, and runs `npm publish` on the tarballs. It publishes `@inno-grid/mygrid-core`, then `@inno-grid/mygrid-themes`, then `@inno-grid/mygrid-react`. It does not push a tag or create a GitHub release. 8. On each new npm package, add the trusted publisher described in [publishing.md](publishing.md). Complete one successful run of the `Publish` workflow within two days. That run asks for the `npm` environment approval and the input `publish`. 9. After that run succeeds, disallow token publishing if the account should accept only OIDC, and revoke any bootstrap token.

Later releases repeat steps 3 through 6, then run the `Publish` workflow instead of the local command.

## Commands that must not be used for the first release

Do not run `npm publish` or `pnpm publish` directly except through `pnpm release:publish`. Do not publish `0.0.0`. Do not add an npm token to a file in this repository. Do not push a release tag or create a GitHub release as part of preparing this automation.
