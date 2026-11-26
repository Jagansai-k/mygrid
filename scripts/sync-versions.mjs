import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { packageManifest, releasePackages, root } from './release-packages.mjs';

for (const pkg of releasePackages) {
  const version = String(packageManifest(pkg).version);
  const path = join(root, pkg.versionFile);
  const source = readFileSync(path, 'utf8');
  const pattern = new RegExp(`export const ${pkg.versionConst} = '[^']*'`);
  if (!pattern.test(source)) {
    console.error(`${pkg.versionFile} is missing ${pkg.versionConst}.`);
    process.exit(1);
  }
  const next = source.replace(pattern, `export const ${pkg.versionConst} = '${version}'`);
  if (next !== source) {
    writeFileSync(path, next);
    console.log(`${pkg.versionConst} set to ${version}.`);
  }
}
