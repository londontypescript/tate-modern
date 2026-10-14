import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { acceptanceCandidates } from './fixtures';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function cli(...args: string[]) {
  const run = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/score/cli.ts', ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

function file(contents: unknown) {
  const path = join(mkdtempSync(join(tmpdir(), 'score-cli-')), 'configs.json');
  writeFileSync(path, JSON.stringify(contents));
  return path;
}

describe('pnpm score', () => {
  it('exits 1 with the reason on invalid input', () => {
    const run = cli(file([{ label: 'a', config: { emblem: {} } }]));
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/candidate 1 \(a\): config\.emblem\.layerCount: missing/);
  });

  it('exits 2 when no candidate is eligible', () => {
    const { config } = acceptanceCandidates.find((c) => c.label === 'frozen') ?? {};
    // No sheets at all: outside the colour scope, so ineligible.
    const tileOnly = { ...config, emblem: { ...config?.emblem, layerCount: 0 } };
    const run = cli(file([{ label: 'tile only', config: tileOnly }]));
    expect(run.stdout).toMatch(/^NOT VALIDATED/);
    expect(run.stdout).toMatch(/no candidate is eligible/);
    expect(run.status).toBe(2);
  }, 30_000);

  it('prints provenance with --json', () => {
    const frozen = acceptanceCandidates.find((c) => c.label === 'frozen');
    const run = cli(file([frozen]), '--json');
    expect(run.status).toBe(0);
    const out = JSON.parse(run.stdout) as { provenance: Record<string, unknown> };
    expect(out.provenance.validation).toMatch(/^NOT VALIDATED/);
    expect(Object.keys(out.provenance)).toEqual([
      'validation',
      'renderer',
      'decoder',
      'node',
      'platform',
      'source',
      'reference',
      'fonts',
      'parameters',
    ]);
  }, 30_000);
});
