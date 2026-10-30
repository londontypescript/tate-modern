import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let outDir: string;
beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), 'tate-modern-pages-'));
  await build({ configFile: 'vite.config.ts', logLevel: 'silent', build: { outDir, emptyOutDir: true } });
}, 120_000);
afterAll(() => rmSync(outDir, { recursive: true, force: true }));

/** The page's own module script, which must have been bundled beside it. */
function entryScript(page: string) {
  const html = readFileSync(join(outDir, page), 'utf8');
  const src = /<script type="module" crossorigin src="\/([^"]+\.js)"><\/script>/.exec(html)?.[1];
  if (!src) throw new Error(`${page} has no bundled module script`);
  expect(existsSync(join(outDir, src)), src).toBe(true);
  return { html, script: readFileSync(join(outDir, src), 'utf8') };
}

describe('the build', () => {
  it('writes the bubble’s studio as the main page, linking to the frozen one', () => {
    const { html, script } = entryScript('index.html');
    expect(html).toContain("<title>London TypeScript's logo</title>");
    expect(script).toContain('./legacy.html');
  });

  it('writes the frozen 0.4.0 studio beside it, linking back', () => {
    const { html, script } = entryScript('legacy.html');
    expect(html).toContain('0.4.0 studio</title>');
    expect(script).toContain('The current logo’s studio');
  });

  it('brings Exo 2 into the bubble’s page only', () => {
    const fonts = readdirSync(join(outDir, 'assets')).filter((f) => f.startsWith('exo-2-latin-700-normal'));
    expect(fonts).toHaveLength(1);
    const loads = (page: string) => chunksLoadedBy(entryScript(page).script).join('\n');
    expect(loads('index.html')).toContain(fonts[0]);
    expect(loads('legacy.html')).not.toContain('exo-2');
  });
});

/** The entry script and every chunk it imports, statically or lazily, in the built assets. */
function chunksLoadedBy(entry: string) {
  const seen = new Map<string, string>();
  const visit = (code: string) => {
    for (const [, name = ''] of code.matchAll(/["'.]\/([\w.-]+\.js)["']/g)) {
      if (seen.has(name) || !existsSync(join(outDir, 'assets', name))) continue;
      seen.set(name, readFileSync(join(outDir, 'assets', name), 'utf8'));
      visit(seen.get(name) ?? '');
    }
  };
  visit(entry);
  return [entry, ...seen.values()];
}
