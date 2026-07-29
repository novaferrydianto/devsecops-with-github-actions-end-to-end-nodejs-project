import fs from 'node:fs';

const lockfile = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const packages = lockfile.packages;

if (!packages || typeof packages !== 'object') {
  throw new Error('package-lock.json does not contain a packages inventory');
}

const allowedLicenses = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'BlueOak-1.0.0',
]);

const aliases = new Map([
  ['MIT License', 'MIT'],
]);

// argparse is dev-only tooling. Python-2.0 was reviewed explicitly instead of
// widening the global allowlist for future packages.
const pathSpecificExceptions = new Map([
  ['node_modules/argparse', 'Python-2.0'],
]);

function normalizeLicense(license) {
  return aliases.get(license) ?? license;
}

function isAllowedLicense(packagePath, license) {
  const normalized = normalizeLicense(license);

  if (allowedLicenses.has(normalized)) {
    return true;
  }

  if (pathSpecificExceptions.get(packagePath) === normalized) {
    return true;
  }

  // A dual-licensed package is acceptable when at least one explicitly
  // allowed option can be selected. Complex/mixed SPDX expressions fail
  // closed until they are reviewed and added deliberately.
  const orExpression = normalized.match(/^\(([^()]+)\)$/);
  if (orExpression) {
    const alternatives = orExpression[1].split(/\s+OR\s+/);
    return alternatives.length > 1
      && alternatives.some((candidate) => allowedLicenses.has(normalizeLicense(candidate)));
  }

  return false;
}

const counts = new Map();
const violations = [];

for (const [packagePath, metadata] of Object.entries(packages)) {
  if (packagePath === '') {
    continue;
  }

  const license = metadata.license;
  if (typeof license !== 'string' || license.trim() === '') {
    violations.push(`${packagePath}: missing license metadata`);
    continue;
  }

  counts.set(license, (counts.get(license) ?? 0) + 1);

  if (!isAllowedLicense(packagePath, license)) {
    violations.push(`${packagePath}: ${license}`);
  }
}

if (violations.length > 0) {
  console.error('Disallowed or unreviewed dependency licenses:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  const summary = [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([license, count]) => `${license}=${count}`)
    .join(', ');

  console.log(`Dependency license inventory passed (${summary}).`);
}
