import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { packageManifest, releasePackages, root } from './release-packages.mjs';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: options.capture === true ? 'pipe' : 'inherit',
    shell: command === 'pnpm' || command === 'npm',
    encoding: 'utf8',
  });
  if (result.status !== 0 && options.allowFailure !== true) {
    process.exit(result.status ?? 1);
  }
  return result;
}

function alreadyPublished(name, version) {
  const result = run('npm', ['view', `${name}@${version}`, 'version', '--json'], {
    capture: true,
    allowFailure: true,
  });
  if (result.status === 0) {
    return true;
  }
  const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (text.includes('E404') || text.includes('404')) {
    return false;
  }
  console.error(text);
  process.exit(result.status ?? 1);
}

run(process.execPath, ['scripts/assert-release-ready.mjs']);
run(process.execPath, ['scripts/pack-packages.mjs']);

const destination = mkdtempSync(join(tmpdir(), 'mygrid-publish-'));

try {
  for (const pkg of releasePackages) {
    const version = String(packageManifest(pkg).version);
    if (alreadyPublished(pkg.name, version)) {
      console.log(`${pkg.name}@${version} is already on the registry. Skipping.`);
      continue;
    }
    run('pnpm', ['--filter', pkg.name, 'pack', '--pack-destination', destination]);
    const archiveName = readdirSync(destination).find((name) => name.endsWith('.tgz'));
    if (archiveName === undefined) {
      console.error(`No tarball was written for ${pkg.name}.`);
      process.exit(1);
    }
    const archive = join(destination, archiveName);
    console.log(`Publishing ${pkg.name}@${version} from ${archiveName}.`);
    run('npm', ['publish', archive, '--access', 'public']);
    rmSync(archive, { force: true });
  }
} finally {
  rmSync(destination, { recursive: true, force: true });
}
