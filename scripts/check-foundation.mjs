import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const root = join(import.meta.dirname, '..');
const browserGlobals = new Set([
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'navigator',
]);
const sourceRoots = [
  'packages/mygrid-core/src',
  'packages/mygrid-react/src',
  'packages/mygrid-themes/src',
];
const publishable = [
  {
    directory: 'packages/mygrid-core',
    name: '@inno-grid/mygrid-core',
    versionConst: 'MYGRID_CORE_VERSION',
    versionFile: 'packages/mygrid-core/src/version.ts',
  },
  {
    directory: 'packages/mygrid-react',
    name: '@inno-grid/mygrid-react',
    versionConst: 'MYGRID_REACT_VERSION',
    versionFile: 'packages/mygrid-react/src/version.ts',
  },
  {
    directory: 'packages/mygrid-themes',
    name: '@inno-grid/mygrid-themes',
    versionConst: 'MYGRID_THEMES_VERSION',
    versionFile: 'packages/mygrid-themes/src/version.ts',
  },
];

const failures = [];

function fail(message) {
  failures.push(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry) || /\.(test|stories)\.(ts|tsx)$/.test(entry)) {
      continue;
    }
    out.push(full);
  }
  return out;
}

function insideFunction(node) {
  let current = node.parent;
  while (current) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isConstructorDeclaration(current) ||
      ts.isGetAccessor(current) ||
      ts.isSetAccessor(current)
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function readConst(file, name) {
  const source = readFileSync(join(root, file), 'utf8');
  const match = new RegExp(`export const ${name} = '([^']*)'`).exec(source);
  return match?.[1] ?? '';
}

function resolvedLib(relativeConfig) {
  const configPath = join(root, relativeConfig);
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error) {
    fail(`Could not read ${relativeConfig}`);
    return [];
  }
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    join(root, relativeConfig, '..'),
  );
  return (parsed.options.lib ?? []).map((entry) => entry.toLowerCase());
}

const rootPackage = readJson(join(root, 'package.json'));
if (rootPackage.private !== true) {
  fail('The root package must stay private.');
}
if (rootPackage.name !== 'mygrid') {
  fail(`Unexpected root package name: ${String(rootPackage.name)}`);
}

const workspace = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
for (const glob of ['packages/*', 'apps/*', 'examples/*']) {
  if (!workspace.includes(glob)) {
    fail(`pnpm-workspace.yaml is missing ${glob}`);
  }
}

for (const pkg of publishable) {
  const manifest = readJson(join(root, pkg.directory, 'package.json'));
  if (manifest.name !== pkg.name) {
    fail(`${pkg.directory} is named ${String(manifest.name)}, expected ${pkg.name}`);
  }
  if (manifest.private === true) {
    fail(`${pkg.name} must not set "private": true`);
  }
  if (manifest.publishConfig?.access !== 'public') {
    fail(`${pkg.name} must set publishConfig.access to "public"`);
  }
  if (manifest.type !== 'module') {
    fail(`${pkg.name} must be an ES module`);
  }
  const entry = manifest.exports?.['.'];
  if (
    entry?.types !== './dist/index.d.ts' ||
    entry?.import !== './dist/index.js' ||
    entry?.default !== './dist/index.js'
  ) {
    fail(`${pkg.name} "." export must point types, import, and default at dist`);
  }
  if (manifest.main !== './dist/index.js' || manifest.module !== './dist/index.js') {
    fail(`${pkg.name} main and module must be ./dist/index.js`);
  }
  if (manifest.types !== './dist/index.d.ts') {
    fail(`${pkg.name} types must be ./dist/index.d.ts`);
  }
  if (
    !Array.isArray(manifest.files) ||
    manifest.files.length === 0 ||
    !manifest.files.every((file) => file === 'dist')
  ) {
    fail(`${pkg.name} must publish only dist`);
  }
  for (const script of ['build', 'test', 'typecheck', 'clean']) {
    if (typeof manifest.scripts?.[script] !== 'string' || manifest.scripts[script].length === 0) {
      fail(`${pkg.name} is missing the ${script} script`);
    }
  }
  if (/file:|\/agent\/|\/Users\/|[A-Za-z]:\\/.test(JSON.stringify(manifest))) {
    fail(`${pkg.name} contains a local absolute path`);
  }
  const exported = readConst(pkg.versionFile, pkg.versionConst);
  if (exported !== manifest.version) {
    fail(
      `${pkg.versionConst} is "${exported}" but package.json version is "${String(manifest.version)}"`,
    );
  }
}

const coreManifest = readJson(join(root, 'packages/mygrid-core/package.json'));
if (coreManifest.dependencies || coreManifest.peerDependencies) {
  fail('Core must not declare runtime or peer dependencies.');
}

const reactManifest = readJson(join(root, 'packages/mygrid-react/package.json'));
if (
  reactManifest.peerDependencies?.react !== '^19.0.0' ||
  reactManifest.peerDependencies?.['react-dom'] !== '^19.0.0'
) {
  fail('React package must peer-depend on react and react-dom.');
}
if (reactManifest.dependencies?.['@inno-grid/mygrid-core'] !== 'workspace:*') {
  fail('React package must depend on core through the workspace protocol.');
}
if (reactManifest.dependencies?.['@inno-grid/mygrid-themes']) {
  fail('React package must not take a runtime dependency on themes.');
}

const themesManifest = readJson(join(root, 'packages/mygrid-themes/package.json'));
for (const file of ['theme.css', 'light.css', 'dark.css', 'density.css']) {
  if (themesManifest.exports?.[`./${file}`] !== `./dist/${file}`) {
    fail(`@inno-grid/mygrid-themes is missing the ./${file} export`);
  }
}
if (
  !Array.isArray(themesManifest.sideEffects) ||
  !themesManifest.sideEffects.includes('./dist/theme.css')
) {
  fail('Theme CSS must be listed in sideEffects so bundlers keep the stylesheets.');
}

for (const script of ['build', 'test', 'typecheck', 'clean']) {
  if (typeof rootPackage.scripts?.[script] !== 'string') {
    fail(`Root package is missing the ${script} script`);
  }
}
if (!String(rootPackage.scripts?.test).includes('playground verify')) {
  fail('Root test script must run the package consumer verification.');
}

const coreName = readConst('packages/mygrid-core/src/version.ts', 'MYGRID_LIBRARY_NAME');
if (coreName !== 'mygrid') {
  fail(`MYGRID_LIBRARY_NAME must be "mygrid", found "${coreName}"`);
}

for (const [label, config] of [
  ['mygrid-core', 'packages/mygrid-core/tsconfig.json'],
  ['mygrid-themes', 'packages/mygrid-themes/tsconfig.json'],
]) {
  const libs = resolvedLib(config);
  if (libs.length === 0) {
    fail(`${label} must set compilerOptions.lib explicitly`);
  }
  if (libs.some((entry) => entry.includes('dom'))) {
    fail(`${label} must not include the DOM type library`);
  }
}

const reactLibs = resolvedLib('packages/mygrid-react/tsconfig.json');
if (!reactLibs.some((entry) => entry.includes('dom'))) {
  fail('mygrid-react must include the DOM type library');
}

for (const relativeRoot of sourceRoots) {
  const files = walk(join(root, relativeRoot), []);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (/ag-grid|aggrid/i.test(text)) {
      fail(`${relative(root, file)} references AG Grid`);
    }
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node) => {
      if (ts.isIdentifier(node) && browserGlobals.has(node.text) && !insideFunction(node)) {
        const position = source.getLineAndCharacterOfPosition(node.getStart(source));
        fail(
          `${relative(root, file)}:${position.line + 1} uses browser global "${node.text}" at module scope`,
        );
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}

if (failures.length > 0) {
  console.error('Foundation checks failed:');
  for (const message of failures) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log('Foundation checks passed.');
