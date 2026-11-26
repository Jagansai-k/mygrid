# Changesets

Package versions are managed with [Changesets](https://github.com/changesets/changesets).

The three publishable packages are linked, so a version change moves them together. Their npm access is `public`. Apps and examples are ignored.

`pnpm changeset` records a bump. `pnpm version-packages` applies it and updates the version constants. It does not publish. `pnpm release:publish` is blocked while the packages are `0.0.0`. The license is MIT.

The version pull request workflow and the manual publish workflow are described in `docs/releasing.md`. Authentication is described in `docs/publishing.md`.
