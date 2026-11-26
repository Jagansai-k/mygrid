import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { packageManifest, releasePackages, root, versionConstant } from './release-packages.mjs';

const blockers = [];

function block(message) {
  blockers.push(message);
}

const rootLicense = readFileSync(join(root, 'LICENSE'), 'utf8');
if (
  !rootLicense.startsWith('MIT License') ||
  !rootLicense.includes('Copyright (c) 2026 inno-grid') ||
  !rootLicense.includes('Permission is hereby granted, free of charge') ||
  !rootLicense.includes('THE SOFTWARE IS PROVIDED "AS IS"')
) {
  block(
    'The repository LICENSE must be the complete MIT license for Copyright (c) 2026 inno-grid.',
  );
}
const versions = [];

for (const pkg of releasePackages) {
  const manifest = packageManifest(pkg);
  const version = String(manifest.version);
  versions.push(version);
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    block(`${pkg.name} version "${version}" is not a semver version.`);
  }
  if (version === '0.0.0' || version.startsWith('0.0.0-')) {
    block(`${pkg.name} is still ${version}. Version it with Changesets before publishing.`);
  }
  if (versionConstant(pkg) !== version) {
    block(`${pkg.versionConst} does not match ${pkg.name}@${version}.`);
  }
  if (manifest.private === true) {
    block(`${pkg.name} is private and cannot be published.`);
  }
  if (manifest.publishConfig?.access !== 'public') {
    block(`${pkg.name} must keep publishConfig.access set to public.`);
  }
  const license = String(manifest.license ?? '');
  if (license !== 'MIT') {
    block(`${pkg.name} license is "${license || 'missing'}". The approved SPDX identifier is MIT.`);
  }
  const licenseText = readFileSync(join(root, pkg.directory, 'LICENSE'), 'utf8');
  if (licenseText !== rootLicense) {
    block(`${pkg.name} LICENSE does not match the repository LICENSE.`);
  }
}

if (new Set(versions).size > 1) {
  block(`Linked packages must share one version. Found ${versions.join(', ')}.`);
}

const licenses = releasePackages.map((pkg) => String(packageManifest(pkg).license ?? ''));
if (new Set(licenses).size > 1) {
  block('The three packages must use the same license identifier.');
}

if (blockers.length > 0) {
  console.error('npm publish is blocked:');
  for (const message of blockers) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log(`Release checks passed for ${versions[0] ?? 'the linked packages'}.`);
