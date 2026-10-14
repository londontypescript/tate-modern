import { describe, expect, it } from 'vitest';
import { sheetHtml } from './sheet';

describe('sheetHtml', () => {
  const html = sheetHtml([
    { file: '1.png', caption: 'frozen' },
    { file: '2.png', caption: '<b>&"x"</b>' },
  ]);

  it('puts the original first, then each candidate in order', () => {
    const sources = [...html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]);
    expect(sources).toEqual(['original.png', '1.png', '2.png']);
  });

  it('shows every image at the same width, so all are at the registered scale', () => {
    expect(html).toMatch(/img\{display:block;width:100%;height:auto/);
    expect(html).not.toMatch(/<img[^>]*(width|height)=/);
  });

  it('escapes labels', () => {
    expect(html).toContain('&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;');
    expect(html).not.toContain('<b>&"x"</b>');
  });
});
