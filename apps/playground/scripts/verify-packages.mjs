import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  defineGridAdapter,
  MYGRID_CORE_VERSION,
  MYGRID_LIBRARY_NAME,
} from '@inno-grid/mygrid-core';
import { MYGRID_REACT_VERSION, reactGridAdapter } from '@inno-grid/mygrid-react';
import {
  densityNames,
  MYGRID_THEMES_VERSION,
  themeNames,
  themeStylesheets,
  themeTokens,
} from '@inno-grid/mygrid-themes';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function declarationFor(jsPath) {
  return jsPath.replace(/\.js$/, '.d.ts');
}

function assertDeclarations(jsPath, needles) {
  const declaration = declarationFor(jsPath);
  if (!existsSync(declaration)) {
    fail(`Missing TypeScript declarations: ${declaration}`);
  }
  const text = readFileSync(declaration, 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) {
      fail(`${declaration} does not export ${needle}`);
    }
  }
}

if (typeof globalThis.window !== 'undefined') {
  fail('Package entry points were evaluated with a window global.');
}

if (MYGRID_LIBRARY_NAME !== 'mygrid') {
  fail(`Unexpected library name: ${MYGRID_LIBRARY_NAME}`);
}

for (const version of [MYGRID_CORE_VERSION, MYGRID_REACT_VERSION, MYGRID_THEMES_VERSION]) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    fail(`Version is not semver: ${version}`);
  }
}

if (reactGridAdapter.framework !== 'react' || reactGridAdapter.version !== MYGRID_REACT_VERSION) {
  fail('React adapter descriptor does not match the React package.');
}

const frozen = defineGridAdapter({ framework: 'verify', version: '0.0.0' });
if (!Object.isFrozen(frozen)) {
  fail('defineGridAdapter must return a frozen adapter.');
}

const tokenValues = Object.values(themeTokens);
if (tokenValues.length === 0 || tokenValues.some((token) => !token.startsWith('--mygrid-'))) {
  fail('Theme tokens must be --mygrid-* custom properties.');
}

if (themeNames.join(',') !== 'light,dark') {
  fail(`Unexpected theme names: ${themeNames.join(',')}`);
}
if (densityNames.join(',') !== 'compact,default,comfortable') {
  fail(`Unexpected density names: ${densityNames.join(',')}`);
}

const coreEntry = fileURLToPath(await import.meta.resolve('@inno-grid/mygrid-core'));
const coreSource = readFileSync(coreEntry, 'utf8');
if (/\b(window|document|localStorage|sessionStorage|navigator)\b/.test(coreSource)) {
  fail('Core build output references a browser global.');
}
if (/\bfrom\s+['"]react['"]/.test(coreSource) || coreSource.includes('react-dom')) {
  fail('Core build output depends on React.');
}
assertDeclarations(coreEntry, ['defineGridAdapter', 'MYGRID_CORE_VERSION']);

const reactEntry = fileURLToPath(await import.meta.resolve('@inno-grid/mygrid-react'));
const reactSource = readFileSync(reactEntry, 'utf8');
if (!reactSource.slice(0, 200).includes('use client')) {
  fail(`React build output is missing the client directive: ${reactEntry}`);
}
if (!reactSource.includes('@inno-grid/mygrid-core')) {
  fail('React build output does not resolve @inno-grid/mygrid-core.');
}
assertDeclarations(reactEntry, ['MyGrid', 'MyGridTheme', 'MyGridDensity']);

const themesEntry = fileURLToPath(await import.meta.resolve('@inno-grid/mygrid-themes'));
assertDeclarations(themesEntry, ['themeStylesheet', 'themeNames', 'densityNames']);

const themeSelectors = [
  "[data-mygrid-theme='light']",
  "[data-mygrid-theme='dark']",
  "[data-mygrid-density='compact']",
  "[data-mygrid-density='default']",
  "[data-mygrid-density='comfortable']",
  '[data-mygrid]',
];

for (const [name, specifier] of Object.entries(themeStylesheets)) {
  const file = fileURLToPath(await import.meta.resolve(specifier));
  const css = readFileSync(file, 'utf8');
  if (!css.includes('--mygrid-')) {
    fail(`${name} stylesheet ${file} does not define a MyGrid custom property.`);
  }
  if (name === 'theme') {
    for (const token of tokenValues) {
      if (!css.includes(token)) {
        fail(`Published theme.css is missing ${token}`);
      }
    }
    for (const selector of themeSelectors) {
      if (!css.includes(selector)) {
        fail(`Published theme.css is missing ${selector}`);
      }
    }
  }
}

console.log('Verified package entry points, declarations, and theme stylesheets.');
console.log(
  `core ${MYGRID_CORE_VERSION}, react ${MYGRID_REACT_VERSION}, themes ${MYGRID_THEMES_VERSION}`,
);
