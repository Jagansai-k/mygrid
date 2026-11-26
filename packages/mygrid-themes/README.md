# @inno-grid/mygrid-themes

Theme foundations for MyGrid. The stylesheets are opt-in and are not imported by the React package.

```ts
import '@inno-grid/mygrid-themes/theme.css';
import { defaultTheme, densityNames, themeNames, themeTokens } from '@inno-grid/mygrid-themes';
```

`theme.css` is the default entry. It contains:

- light colors on `:root` and `[data-mygrid-theme="light"]`
- dark colors on `[data-mygrid-theme="dark"]`
- `compact`, `default`, and `comfortable` density on `[data-mygrid-density]`
- structural rules for `[data-mygrid]`

`light.css`, `dark.css`, and `density.css` are separate exports. The default theme is light. The default density is `default`.

`themeTokens` lists the `--mygrid-*` custom properties. `MyGrid` from `@inno-grid/mygrid-react` sets the theme and density attributes. `structure.css` paints the table, header, cells, pinned columns, hover, selection, and the filtered-column indicator with those properties. Colors are not copied from another product.

`MYGRID_THEMES_VERSION` matches this package version.

## Build

`pnpm --filter @inno-grid/mygrid-themes build` writes `dist/index.js`, `dist/index.d.ts`, and the CSS files. npm also packs this README and `LICENSE`. `pnpm --filter @inno-grid/mygrid-themes clean` removes `dist`.
