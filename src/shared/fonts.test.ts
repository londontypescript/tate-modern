import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../scripts/node-fonts';
import { bubbleFontFiles, fontFiles } from './fonts';

const root = resolve(import.meta.dirname, '../..');

/**
 * Every file the frozen studio's page loads, by following its relative
 * imports (static and dynamic) from its entry. Package imports are returned
 * as they are written, not followed.
 */
function importGraph(entry: string) {
  const files = new Set<string>();
  const packages = new Set<string>();
  const specifiers = /(?:from\s*|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
  const visit = (file: string) => {
    if (files.has(file)) return;
    files.add(file);
    for (const [, specifier = ''] of readFileSync(file, 'utf8').matchAll(specifiers)) {
      if (!specifier.startsWith('.')) {
        packages.add(specifier);
        continue;
      }
      const base = resolve(dirname(file), specifier);
      const found = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']
        .map((ext) => base + ext)
        .find((f) => existsSync(f) && statSync(f).isFile());
      if (found && /\.tsx?$/.test(found)) visit(found);
    }
  };
  visit(join(root, entry));
  return { files: [...files].map((f) => relative(root, f)), packages: [...packages] };
}

describe('the frozen concepts’ fonts', () => {
  it('are still Playfair Display Black and Open Sans ExtraBold, from the same files', async () => {
    // The scorer's provenance lists `fontFiles`, so it must not grow.
    expect(fontFiles).toEqual({
      serif: '@fontsource/playfair-display/files/playfair-display-latin-900-normal.woff',
      sans: '@fontsource/open-sans/files/open-sans-latin-800-normal.woff',
    });
    const fonts = await loadLogoFontsFromDisk();
    const fullName = (f: typeof fonts.serif) =>
      (f.names as unknown as { windows: { fullName: { en: string } } }).windows.fullName.en;
    expect(fullName(fonts.serif)).toBe('Playfair Display Black');
    expect(fullName(fonts.sans)).toBe('Open Sans ExtraBold');
  });

  it('never bring Exo 2 into the frozen studio’s page', () => {
    const graph = importGraph('src/studio/main.tsx');
    expect(graph.files).toContain('src/shared/react/fonts.browser.ts');
    expect(graph.files.filter((f) => f.startsWith('src/bubble/'))).toEqual([]);
    expect(graph.packages.filter((p) => p.includes('exo-2'))).toEqual([]);
    expect(Object.values(bubbleFontFiles).every((file) => file.includes('exo-2'))).toBe(true);
  });
});
