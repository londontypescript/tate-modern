import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { tileLettering } from '../engine';
import type { BubbleFonts } from '../wordmark/fonts';
import { BannerTopic } from './BannerTopic';
import { downloadSvg } from './download';
import { downloadBlob, svgToPng } from './slotDownload';

/**
 * The Banner topic's buttons, pressed. The tests run without a DOM, so the
 * buttons' own click handlers are taken from what the topic's Downloads
 * renders and called, and the browser's half (saving a file, drawing a PNG)
 * is mocked at its seam, as slotDownload.test.ts fakes the browser.
 */

const pressed = vi.hoisted(() => ({ buttons: new Map<string, () => void>() }));

vi.mock('./download', () => ({ downloadSvg: vi.fn() }));
vi.mock('./slotDownload', () => ({
  svgToPng: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))),
  downloadBlob: vi.fn(),
}));
vi.mock('./Downloads', async (importOriginal) => {
  const real = await importOriginal<typeof import('./Downloads')>();
  /** Every button in a rendered tree, by its label. */
  const collect = (node: ReactNode) => {
    if (Array.isArray(node)) {
      node.forEach(collect);
      return;
    }
    if (!isValidElement(node)) return;
    const { children, onClick } = (node as ReactElement<{ children?: ReactNode; onClick?: () => void }>).props;
    if (node.type === 'button' && typeof children === 'string' && onClick) pressed.buttons.set(children, onClick);
    collect(children);
  };
  return {
    ...real,
    // Renders the real buttons, keeping hold of their click handlers.
    Downloads: (props: Parameters<typeof real.Downloads>[0]) => {
      const tree = real.Downloads(props);
      collect(tree);
      return tree;
    },
  };
});

let fonts: BubbleFonts;
let lettering: string;
beforeAll(async () => {
  fonts = await loadBubbleFontsFromDisk();
  lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
});

/** A drawing with its ids, written size and class taken out: what it draws, and nothing about where. */
const drawn = (svg: string) => {
  const prefix = / id="(lts-[0-9a-f]{32}|lts[A-Za-z0-9_]*)-/.exec(svg)?.[1];
  if (!prefix) throw new Error('No id prefix found');
  return svg
    .replace(/^<\?xml[^>]*>\n/, '')
    .trim()
    .replaceAll(prefix, 'ID')
    .replace(/ width="[\d.]+" height="[\d.]+"(?= viewBox="0 0 1200)/, '')
    .replace(' class="block h-auto w-full"', '');
};

describe('the Banner topic’s download buttons', () => {
  it('save the previewed drawing under its name, and draw the PNG from that SVG at the framing’s size', async () => {
    const options = { text: 'Grand Union', theme: 'dark', band: 'left', framing: 'meetup' } as const;
    const html = renderToStaticMarkup(<BannerTopic fonts={fonts} lettering={lettering} initial={options} />);
    const preview = /<svg xmlns.*<\/svg>/.exec(html)?.[0] ?? '';

    pressed.buttons.get('SVG')?.();
    expect(downloadSvg).toHaveBeenCalledTimes(1);
    const [name, svg] = vi.mocked(downloadSvg).mock.calls[0] ?? [];
    expect(name).toMatch(/^grand-union-meetup-dark-band-left-[0-9a-f]{8}\.svg$/);
    expect(svg, 'the SVG button saved no SVG document').toMatch(/^<\?xml[^>]*>\n<svg /);
    expect(drawn(svg ?? '')).toBe(drawn(preview));

    pressed.buttons.get('PNG')?.();
    expect(svgToPng).toHaveBeenCalledWith(svg, { width: 1200, height: 675 });
    await vi.waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1));
    const [pngName, png] = vi.mocked(downloadBlob).mock.calls[0] ?? [];
    expect(pngName).toBe(name?.replace(/\.svg$/, '.png'));
    expect(png?.type).toBe('image/png');
  });
});
