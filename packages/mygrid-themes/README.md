# @inno-grid/mygrid-themes

Base theme for MyGrid. The stylesheet is opt-in and is not imported by the React package.

```ts
import '@inno-grid/mygrid-themes/theme.css';
import { themeTokens } from '@inno-grid/mygrid-themes';
```

`themeTokens` lists the custom properties defined in `theme.css`. The selectors style `[data-mygrid]`, the mount point rendered by `@inno-grid/mygrid-react`. There is no grid chrome yet: no header row, no cell layout, and no copied theme from another product.

`MYGRID_THEMES_VERSION` matches this package version.
