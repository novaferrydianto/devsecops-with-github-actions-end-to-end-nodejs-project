import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  auditLicenseInventory,
  formatLicenseSummary,
  isAllowedLicense,
  normalizeLicense,
  reportLicenseInventory,
  runLicenseCheck,
} from '../scripts/check-licenses.js';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(repositoryRoot, 'scripts', 'check-licenses.js');

describe('Dependency license policy', function () {
  it('normalizes aliases and accepts reviewed license forms', function () {
    expect(normalizeLicense('MIT License')).to.equal('MIT');
    expect(isAllowedLicense('node_modules/example', 'Apache-2.0')).to.equal(true);
    expect(isAllowedLicense('node_modules/example', 'MIT License')).to.equal(true);
    expect(isAllowedLicense('node_modules/argparse', 'Python-2.0')).to.equal(true);
    expect(isAllowedLicense('node_modules/dual', '(WTFPL OR MIT)')).to.equal(true);
  });

  it('rejects unreviewed, complex, and path-mismatched licenses', function () {
    expect(isAllowedLicense('node_modules/example', 'GPL-3.0-only')).to.equal(false);
    expect(isAllowedLicense('node_modules/example', 'Python-2.0')).to.equal(false);
    expect(isAllowedLicense('node_modules/example', '(MIT AND BSD-3-Clause)')).to.equal(false);
    expect(isAllowedLicense('node_modules/example', '(MIT)')).to.equal(false);
  });

  it('audits the complete lockfile inventory and skips the root package', function () {
    const result = auditLicenseInventory({
      '': { license: 'GPL-3.0-only' },
      'node_modules/allowed': { license: 'MIT' },
      'node_modules/alias': { license: 'MIT License' },
      'node_modules/argparse': { license: 'Python-2.0' },
      'node_modules/dual': { license: '(WTFPL OR MIT)' },
      'node_modules/missing': {},
      'node_modules/blank': { license: ' ' },
      'node_modules/rejected': { license: 'GPL-3.0-only' },
    });

    expect([...result.counts.entries()]).to.deep.equal([
      ['MIT', 1],
      ['MIT License', 1],
      ['Python-2.0', 1],
      ['(WTFPL OR MIT)', 1],
      ['GPL-3.0-only', 1],
    ]);
    expect(result.violations).to.deep.equal([
      'node_modules/missing: missing license metadata',
      'node_modules/blank: missing license metadata',
      'node_modules/rejected: GPL-3.0-only',
    ]);
  });

  it('fails closed when the lockfile inventory is missing or malformed', function () {
    expect(() => auditLicenseInventory()).to.throw(
      'package-lock.json does not contain a packages inventory',
    );
    expect(() => auditLicenseInventory([])).to.throw(
      'package-lock.json does not contain a packages inventory',
    );
  });

  it('formats a deterministic sorted summary', function () {
    expect(formatLicenseSummary(new Map([
      ['MIT', 2],
      ['Apache-2.0', 1],
    ]))).to.equal('Apache-2.0=1, MIT=2');
  });

  it('reports pass and fail results without mutating process state', function () {
    const successLogger = { log: sinon.spy(), error: sinon.spy() };
    const failureLogger = { log: sinon.spy(), error: sinon.spy() };

    expect(reportLicenseInventory({
      counts: new Map([['MIT', 2]]),
      violations: [],
    }, successLogger)).to.equal(true);
    expect(successLogger.log.calledOnceWithExactly(
      'Dependency license inventory passed (MIT=2).',
    )).to.equal(true);
    expect(successLogger.error.notCalled).to.equal(true);

    expect(reportLicenseInventory({
      counts: new Map(),
      violations: ['node_modules/example: GPL-3.0-only'],
    }, failureLogger)).to.equal(false);
    expect(failureLogger.error.firstCall.args[0]).to.equal(
      'Disallowed or unreviewed dependency licenses:',
    );
    expect(failureLogger.error.secondCall.args[0]).to.equal(
      '- node_modules/example: GPL-3.0-only',
    );
    expect(failureLogger.log.notCalled).to.equal(true);
  });

  it('reads a lockfile and returns the policy result', function () {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'license-policy-'));
    const lockfilePath = path.join(temporaryDirectory, 'package-lock.json');
    const logger = { log: sinon.spy(), error: sinon.spy() };

    try {
      fs.writeFileSync(lockfilePath, JSON.stringify({
        packages: {
          '': { license: 'MIT' },
          'node_modules/example': { license: 'ISC' },
        },
      }));

      expect(runLicenseCheck(lockfilePath, logger)).to.equal(true);
      expect(logger.log.calledOnce).to.equal(true);
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('exits non-zero when the CLI finds an unreviewed license', function () {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'license-cli-'));
    const lockfilePath = path.join(temporaryDirectory, 'package-lock.json');

    try {
      fs.writeFileSync(lockfilePath, JSON.stringify({
        packages: {
          '': { license: 'MIT' },
          'node_modules/example': { license: 'GPL-3.0-only' },
        },
      }));

      const result = spawnSync(process.execPath, [scriptPath, lockfilePath], {
        cwd: temporaryDirectory,
        encoding: 'utf8',
      });

      expect(result.status).to.equal(1);
      expect(result.stderr).to.include('node_modules/example: GPL-3.0-only');
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
