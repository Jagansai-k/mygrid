# Decisions

## D1 — Monorepo with pnpm and Turborepo

The core, the React adapter, and the themes are separate packages that applications consume. pnpm workspaces and a catalog keep one version of TypeScript, Vite, React, and the rest of the toolchain. Turborepo runs builds before dependent typechecks and tests.

## D2 — Core stays framework-free

`@inno-grid/mygrid-core` does not depend on React and does not include the DOM type library. Grid behavior, when it exists, belongs there. `@inno-grid/mygrid-react` is an adapter. That split leaves room for another framework package later without a rewrite of the model.

## D3 — No browser globals during module initialization

Packages are imported by Next.js on the server and by Vite in the browser. A module that reads `window` at import time breaks the server. The TypeScript `lib` setting, a source scan, and a Node import of the built packages enforce the rule. Application code may read the DOM after mount.

## D4 — ESM only

Published packages set `"type": "module"`. `main` and `module` point at the ESM file, `types` points at the declarations, and `exports` offers `types`, `import`, and `default`. Vite 8 builds one ES2023 file per package through Rolldown. Library externals and the React `'use client'` directive are preserved by the build; the React package checks the directive with `build.rolldownOptions` only for externals. A CommonJS build is not part of the foundation. Next.js and Vite both consume the ESM output.

## D5 — React entry is a client module

The React package source and its built entry begin with `'use client'`. The Next.js example imports `MyGrid` from a Server Component so the client boundary is the package, not a wrapper the example has to remember. A build script fails if the directive is missing from `dist/index.js`.

## D6 — Themes are opt-in

The React package does not import CSS. Hosts import `@inno-grid/mygrid-themes/theme.css` when they want the default theme: light colors, default density, and the mount rules. `light.css`, `dark.css`, and `density.css` are separate exports for a host that wants one piece. `MyGrid` can set `data-mygrid-theme` and `data-mygrid-density`. Those attributes select foundations that already exist. They do not add grid chrome. The themes package lists its CSS files in `sideEffects` so a bundler keeps the import. The JavaScript entry stays free of CSS, so a server render does not pull a stylesheet just because the module was imported.

## D7 — React 19 only for now

Peer dependencies are `react` and `react-dom` `^19.0.0`. The workspace installs React 19.3.1, and the Next.js example uses Next.js 16, which runs on React 19. React 18 is not advertised.

## D8 — TypeScript 6.0, ESLint 9

TypeScript 7 is current, and `typescript-eslint` 8.74 accepts TypeScript below 6.1. This repo uses TypeScript 6.0.3 so type-aware lint can run. Move to TypeScript 7 when the linter's peer range allows it.

ESLint 10 is current, and `eslint-plugin-react` 7.37.5 accepts ESLint 9. This repo uses ESLint 9.39.5 so the React plugin loads. Revisit ESLint 10 when that plugin's peer range includes it.

## D9 — Public npm packages, private repository

The free npm plan cannot host private packages, so the three libraries set `publishConfig.access` to `public` and are not marked `"private": true`. The root package, apps, and examples are private. The GitHub repository is intended to be private. Access on the registry is not a license. The license field stays `UNLICENSED` until a maintainer chooses one. This foundation does not publish.

## D10 — Linked changesets

`@inno-grid/mygrid-core`, `@inno-grid/mygrid-react`, and `@inno-grid/mygrid-themes` are one linked set. An application should not have to reconcile three unrelated versions of the foundation. Apps and examples are ignored by Changesets. `changeset version` does not create a git commit (`commit: false`).

## D11 — No copied product

MyGrid does not vendor, transliterate, or restyle another grid's source, icons, or theme names. The base palette and the mount markup are original. Documentation may say that the library is independent. It must not claim compatibility or parity.

## D12 — Do not stub future grid APIs

The public surface is limited to what works: identity, adapter validation, the React mount, and theme tokens. Column definitions, row data, and events are not exported as empty placeholders. A later phase adds a symbol when the behavior is real and tested.
