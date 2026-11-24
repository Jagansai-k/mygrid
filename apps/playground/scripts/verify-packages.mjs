import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  defineGridAdapter,
  MYGRID_CORE_VERSION,
  MYGRID_LIBRARY_NAME,
} from '@inno-grid/mygrid-core';
import { MYGRID_REACT_VERSION, reactGridAdapter } from '@inno-grid/mygrid-react';
import { MYGRID_THEMES_VERSION, themeTokens } from '@inno-grid/mygrid-themes';

function fail(message) {
  console.error(message);
  process.exit(1);
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

const reactEntry = fileURLToPath(await import.meta.resolve('@inno-grid/mygrid-react'));
const reactSource = readFileSync(reactEntry, 'utf8');
if (!reactSource.slice(0, 200).includes('use client')) {
  fail(`React build output is missing the client directive: ${reactEntry}`);
}

const themeEntry = fileURLToPath(await import.meta.resolve('@inno-grid/mygrid-themes/theme.css'));
const themeSource = readFileSync(themeEntry, 'utf8');
for (const token of tokenValues) {
  if (!themeSource.includes(token)) {
    fail(`Published theme.css is missing ${token}`);
  }
}

const coreEntry = fileURLToPath(await import.meta.resolve('@inno-grid/mygrid-core'));
const coreSource = readFileSync(coreEntry, 'utf8');
if (/\b(window|document|localStorage|sessionStorage|navigator)\b/.test(coreSource)) {
  fail('Core build output references a browser global.');
}

console.log('Verified published package entry points.');
console.log(
  `core ${MYGRID_CORE_VERSION}, react ${MYGRID_REACT_VERSION}, themes ${MYGRID_THEMES_VERSION}`,
);
