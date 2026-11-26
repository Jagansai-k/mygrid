import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const root = join(import.meta.dirname, '..');

export const releasePackages = [
  {
    name: '@inno-grid/mygrid-core',
    directory: 'packages/mygrid-core',
    versionConst: 'MYGRID_CORE_VERSION',
    versionFile: 'packages/mygrid-core/src/version.ts',
    declarations: ['createGrid', 'GridApi'],
  },
  {
    name: '@inno-grid/mygrid-themes',
    directory: 'packages/mygrid-themes',
    versionConst: 'MYGRID_THEMES_VERSION',
    versionFile: 'packages/mygrid-themes/src/version.ts',
    declarations: ['themeStylesheet', 'themeNames'],
    stylesheets: ['theme.css', 'light.css', 'dark.css', 'density.css'],
  },
  {
    name: '@inno-grid/mygrid-react',
    directory: 'packages/mygrid-react',
    versionConst: 'MYGRID_REACT_VERSION',
    versionFile: 'packages/mygrid-react/src/version.ts',
    declarations: ['MyGrid', 'MyGridProps'],
  },
];

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function packageManifest(pkg) {
  return readJson(join(root, pkg.directory, 'package.json'));
}

export function versionConstant(pkg) {
  const source = readFileSync(join(root, pkg.versionFile), 'utf8');
  const match = new RegExp(`export const ${pkg.versionConst} = '([^']*)'`).exec(source);
  return match?.[1] ?? '';
}
