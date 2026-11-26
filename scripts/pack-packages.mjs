import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { releasePackages, root } from './release-packages.mjs';

const failures = [];
const secretPattern =
  /BEGIN [A-Z ]*PRIVATE KEY|npm_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+|AKIA[0-9A-Z]{16}/;

function fail(message) {
  failures.push(message);
}

function run(command, args) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: command === 'pnpm',
  });
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
      continue;
    }
    out.push(full);
  }
  return out;
}

function packedManifest(extractDir) {
  return JSON.parse(readFileSync(join(extractDir, 'package', 'package.json'), 'utf8'));
}

const destination = mkdtempSync(join(tmpdir(), 'mygrid-pack-'));

try {
  for (const pkg of releasePackages) {
    const built = join(root, pkg.directory, 'dist', 'index.js');
    try {
      statSync(built);
    } catch {
      fail(`${pkg.name} has no dist build. Run pnpm build before pnpm pack:check.`);
      continue;
    }

    const before = new Set(readdirSync(destination));
    run('pnpm', ['--filter', pkg.name, 'pack', '--pack-destination', destination]);
    const archiveName = readdirSync(destination).find(
      (name) => name.endsWith('.tgz') && !before.has(name),
    );
    if (archiveName === undefined) {
      fail(`${pkg.name} did not produce a tarball in ${destination}.`);
      continue;
    }
    const archive = join(destination, archiveName);
    run('tar', ['-xf', archive, '-C', destination]);
    const movedRoot = join(destination, 'package');
    const files = walk(movedRoot).map((file) => relative(movedRoot, file).replaceAll('\\', '/'));
    const manifest = packedManifest(destination);

    console.log(`\n${pkg.name} (${archiveName})`);
    for (const file of files) {
      console.log(`  ${file}`);
    }

    if (manifest.name !== pkg.name) {
      fail(`${archiveName} is named ${String(manifest.name)}.`);
    }
    if (manifest.private === true) {
      fail(`${pkg.name} archive is marked private.`);
    }
    if (manifest.type !== 'module') {
      fail(`${pkg.name} archive is not an ES module.`);
    }
    if (manifest.publishConfig?.access !== 'public') {
      fail(`${pkg.name} archive lost public access.`);
    }
    if (manifest.engines?.node !== '>=22') {
      fail(`${pkg.name} archive must require Node.js >=22.`);
    }
    const entry = manifest.exports?.['.'];
    if (entry?.types !== './dist/index.d.ts' || entry?.import !== './dist/index.js') {
      fail(`${pkg.name} archive export does not point at dist.`);
    }
    for (const required of [
      'package.json',
      'README.md',
      'LICENSE',
      'dist/index.js',
      'dist/index.d.ts',
    ]) {
      if (!files.includes(required)) {
        fail(`${pkg.name} archive is missing ${required}.`);
      }
    }
    if (files.includes('dist/index.d.ts')) {
      const declaration = readFileSync(join(movedRoot, 'dist', 'index.d.ts'), 'utf8');
      for (const symbol of pkg.declarations) {
        if (!declaration.includes(symbol)) {
          fail(`${pkg.name} declarations do not mention ${symbol}.`);
        }
      }
    }
    for (const stylesheet of pkg.stylesheets ?? []) {
      const packedPath = `dist/${stylesheet}`;
      if (!files.includes(packedPath)) {
        fail(`${pkg.name} archive is missing ${packedPath}.`);
      } else if (manifest.exports?.[`./${stylesheet}`] !== `./dist/${stylesheet}`) {
        fail(`${pkg.name} archive is missing the ./${stylesheet} export.`);
      } else {
        const css = readFileSync(join(movedRoot, 'dist', stylesheet), 'utf8');
        if (!css.includes('--mygrid-')) {
          fail(`${pkg.name} ${stylesheet} does not define a MyGrid custom property.`);
        }
      }
    }
    if (
      pkg.name === '@inno-grid/mygrid-core' &&
      (manifest.dependencies || manifest.peerDependencies)
    ) {
      fail('Core archive must not declare runtime or peer dependencies.');
    }
    if (
      pkg.name === '@inno-grid/mygrid-themes' &&
      (manifest.dependencies || manifest.peerDependencies)
    ) {
      fail('Themes archive must not declare runtime or peer dependencies.');
    }
    if (pkg.name === '@inno-grid/mygrid-react') {
      const peers = manifest.peerDependencies ?? {};
      if (peers.react !== '^19.0.0' || peers['react-dom'] !== '^19.0.0') {
        fail('React archive must peer-depend on react and react-dom ^19.0.0.');
      }
      const coreDependency = manifest.dependencies?.['@inno-grid/mygrid-core'];
      const coreVersion = String(manifest.version);
      if (
        coreDependency !== coreVersion &&
        coreDependency !== `^${coreVersion}` &&
        coreDependency !== `~${coreVersion}`
      ) {
        fail(
          `React archive depends on core "${String(coreDependency)}" instead of its own version ${coreVersion}.`,
        );
      }
    }
    const serialized = JSON.stringify(manifest);
    if (serialized.includes('workspace:') || serialized.includes('catalog:')) {
      fail(`${pkg.name} archive still contains a workspace or catalog protocol.`);
    }
    if (/[A-Za-z]:\\|\/Users\/|\/home\//.test(serialized)) {
      fail(`${pkg.name} archive manifest contains a local path.`);
    }
    for (const file of files) {
      if (
        file.startsWith('src/') ||
        file.includes('node_modules/') ||
        file.includes('.env') ||
        file.includes('.test.') ||
        file.includes('.stories.') ||
        file.startsWith('tsconfig') ||
        file.includes('vite.config') ||
        file.includes('vitest')
      ) {
        fail(`${pkg.name} archive contains ${file}.`);
      }
      const full = join(movedRoot, file);
      if (statSync(full).size > 2_000_000) {
        continue;
      }
      const text = readFileSync(full, 'utf8');
      if (secretPattern.test(text) || /[A-Za-z]:\\Users\\|\/Users\/[^/\n]+\//.test(text)) {
        fail(`${pkg.name} archive file ${file} contains a local path or a credential pattern.`);
      }
    }
    if (files.includes('LICENSE')) {
      const license = readFileSync(join(movedRoot, 'LICENSE'), 'utf8');
      if (license !== readFileSync(join(root, 'LICENSE'), 'utf8')) {
        fail(`${pkg.name} archive LICENSE does not match the repository LICENSE.`);
      }
    }

    rmSync(movedRoot, { recursive: true, force: true });
    rmSync(archive, { force: true });
  }
} finally {
  rmSync(destination, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error('\nPackage archive checks failed:');
  for (const message of failures) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log('\nPackage archives contain the published entry points and no workspace protocol.');
