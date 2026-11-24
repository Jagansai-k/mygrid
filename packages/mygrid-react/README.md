# @inno-grid/mygrid-react

React adapter for MyGrid. The package depends on `@inno-grid/mygrid-core` and on React 19 as a peer dependency.

The entry module is a client component (`'use client'`) so a Next.js App Router server module can import `MyGrid` and keep it on the client boundary. The built file keeps that directive.

## Public API

- `MyGrid`
- `MyGridProps`, `MyGridTheme`, `MyGridDensity`
- `reactGridAdapter`
- `MYGRID_REACT_VERSION`

`MyGrid` renders a root element and its children. It does not render columns, rows, or cells. Optional `theme` and `density` props set `data-mygrid-theme` and `data-mygrid-density`. They do not implement theme logic. Keep grid behavior in `@inno-grid/mygrid-core`; this package should only adapt it to React once that behavior exists.

Theme CSS is not imported automatically. Applications opt in with `@inno-grid/mygrid-themes/theme.css`. Storybook depends on the themes package for its preview and that dependency is not part of the published runtime.

## Build

`pnpm --filter @inno-grid/mygrid-react build` writes `dist/index.js` and `dist/index.d.ts`. The JavaScript file starts with `'use client'`. `clean` removes `dist`.

## Storybook

```bash
pnpm dev:storybook
```

Storybook listens on port 6008.
