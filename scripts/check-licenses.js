import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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

export function normalizeLicense(license) {
  return aliases.get(license) ?? license;
}

export function isAllowedLicense(packagePath, license) {
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

export function auditLicenseInventory(packages) {
  if (!packages || typeof packages !== 'object' || Array.isArray(packages)) {
    throw new Error('package-lock.json does not contain a packages inventory');
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

  return { counts, violations };
}

export function formatLicenseSummary(counts) {
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([license, count]) => `${license}=${count}`)
    .join(', ');
}

export function reportLicenseInventory({ counts, violations }, logger = console) {
  if (violations.length > 0) {
    logger.error('Disallowed or unreviewed dependency licenses:');
    for (const violation of violations) {
      logger.error(`- ${violation}`);
    }
    return false;
  }

  logger.log(`Dependency license inventory passed (${formatLicenseSummary(counts)}).`);
  return true;
}

export function runLicenseCheck(lockfilePath = 'package-lock.json', logger = console) {
  const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));
  return reportLicenseInventory(auditLicenseInventory(lockfile.packages), logger);
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(path.resolve(invokedPath)).href) {
  if (!runLicenseCheck()) {
    process.exitCode = 1;
  }
}
