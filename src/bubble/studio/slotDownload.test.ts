import { afterEach, describe, expect, it, vi } from 'vitest';
import { svgToPng } from './slotDownload';

/**
 * The browser's half of the PNG export, with the browser faked: the node
 * tests can't decode or paint, so this pins what the function must ask of
 * it. The pixels themselves were checked through the built studio.
 */

const size = { width: 1200, height: 675 };

function fakeBrowser({ decodes = true, makesPng = true } = {}) {
  const calls: string[] = [];
  const revoked: string[] = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: (kind: string) => ({
      drawImage: (_image: unknown, ...box: number[]) => calls.push(`${kind} draw ${box.join(' ')}`),
    }),
    toBlob: (done: (blob: Blob | null) => void, type: string) => {
      calls.push(`toBlob ${type} ${canvas.width}x${canvas.height}`);
      done(makesPng ? new Blob(['png'], { type }) : null);
    },
  };
  vi.stubGlobal(
    'Image',
    class {
      src = '';
      decode = () => {
        calls.push(`decode ${this.src}`);
        return decodes ? Promise.resolve() : Promise.reject(new Error('not an image'));
      };
    },
  );
  vi.stubGlobal('document', { createElement: (tag: string) => (tag === 'canvas' ? canvas : undefined) });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:svg');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url) => revoked.push(url));
  return { calls, revoked };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the PNG made from the SVG in the browser', () => {
  it('decodes the SVG, draws it over the whole canvas at the image’s size, and writes a PNG', async () => {
    const { calls, revoked } = fakeBrowser();
    const png = await svgToPng('<svg/>', size);
    expect(png.type).toBe('image/png');
    expect(calls).toEqual(['decode blob:svg', '2d draw 0 0 1200 675', 'toBlob image/png 1200x675']);
    expect(revoked).toEqual(['blob:svg']);
  });

  it('fails, and still lets go of the SVG, when the browser can’t read it', async () => {
    const { revoked } = fakeBrowser({ decodes: false });
    await expect(svgToPng('<svg/>', size)).rejects.toThrow('not an image');
    expect(revoked).toEqual(['blob:svg']);
  });

  it('fails when the browser makes no PNG', async () => {
    fakeBrowser({ makesPng: false });
    await expect(svgToPng('<svg/>', size)).rejects.toThrow('The browser made no PNG');
  });
});
