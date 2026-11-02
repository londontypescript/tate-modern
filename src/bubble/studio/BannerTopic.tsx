import { useId, useMemo, useState } from 'react';
import {
  bannerAlignments,
  bannerBands,
  bannerFileName,
  bannerFramings,
  bannerText,
  layoutBanner,
  renderBannerSvg,
  type BannerOptions,
} from '../banner';
import { BannerSvg } from '../banner/BannerSvg';
import type { BannerLayout } from '../banner/framing';
import { stripCanvas } from '../banner/layout';
import { themes } from '../engine';
import type { BubbleFonts } from '../wordmark/fonts';
import { Choices } from './Choices';
import { Downloads } from './Downloads';
import { captionClass, homeGround } from './grounds';
import { themeLabels } from './TopicLayout';

type BannerFonts = Pick<BubbleFonts, 'wordmark' | 'bannerText'>;

const bandLabels = { off: 'Off', left: 'Left', bottom: 'Bottom' } as const;
const alignLabels = { left: 'Left', centre: 'Centre', right: 'Right' } as const;
const framingLabels = { strip: 'Strip, 1200 × 208', meetup: 'Meetup, 1200 × 675' } as const;

/** What the topic opens on: the command's own defaults, the light lockup alone as a strip. */
const opening: BannerOptions = { text: '', theme: 'light', band: 'off', align: 'left', framing: 'strip' };

/** A banner laid out, or why it can't be: a character the font lacks, or text with nothing to draw. */
type Attempt = { layout: BannerLayout; error?: undefined } | { layout?: undefined; error: string };

function attempt(fonts: BannerFonts, options: BannerOptions): Attempt {
  try {
    return { layout: layoutBanner(fonts, options) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * A drawn banner's downloads: the file the banner command writes for the
 * same options, named as the command names it. The name comes from the
 * layout's own options, so it always describes the drawing it belongs to.
 */
export function bannerFiles(layout: BannerLayout, lettering: string) {
  return {
    svg: () => renderBannerSvg(layout, lettering),
    size: layout.canvas,
    fileName: (format: 'svg' | 'png', svg: string) => bannerFileName(layout.options, svg, format),
  };
}

/** The downloads while nothing can be drawn: the buttons are off, so none of this is called. */
const noFiles = { svg: () => '', size: { width: 0, height: 0 }, fileName: () => '' };

interface Props {
  fonts: BannerFonts;
  lettering: string;
  /** Where the controls start; the studio opens on the command's defaults. */
  initial?: Partial<BannerOptions>;
}

/**
 * The banner, set up with its options and previewed live by the same
 * renderer the command uses, with SVG and PNG downloads of exactly what is
 * shown. The text reaches the page only through React, which escapes it,
 * and the file name only as a slug.
 */
export function BannerTopic({ fonts, lettering, initial }: Props) {
  const [options, setOptions] = useState<BannerOptions>({ ...opening, ...initial });
  const drawn = useMemo(() => attempt(fonts, options), [fonts, options]);
  const set = (change: Partial<BannerOptions>) => setOptions((current) => ({ ...current, ...change }));
  const textId = useId();
  const hasText = bannerText(options.text) !== '';
  const { layout } = drawn;
  return (
    <div className="space-y-3" data-banner-controls>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-1.5">
          <label htmlFor={textId} className="mr-1 text-sm text-stone-600">
            Text
          </label>
          <input
            id={textId}
            type="text"
            value={options.text}
            onChange={(event) => set({ text: event.target.value })}
            placeholder="None: the lockup alone"
            autoComplete="off"
            spellCheck={false}
            className="w-56 rounded-md border border-stone-300 bg-white px-2.5 py-1 text-sm"
          />
        </div>
        <Choices
          name="Theme"
          choices={themes}
          labels={themeLabels}
          value={options.theme}
          onChoose={(theme) => set({ theme })}
        />
        <Choices
          name="Band"
          choices={bannerBands}
          labels={bandLabels}
          value={options.band}
          onChoose={(band) => set({ band })}
        />
        {/* With text the lockup always sits on the left, so the alignment is shown but can't be changed. */}
        <Choices
          name="Alignment"
          choices={bannerAlignments}
          labels={alignLabels}
          value={options.align}
          onChoose={(align) => set({ align })}
          disabled={hasText}
        />
        <Choices
          name="Framing"
          choices={bannerFramings}
          labels={framingLabels}
          value={options.framing}
          onChoose={(framing) => set({ framing })}
        />
        <Downloads disabled={!layout} {...(layout ? bannerFiles(layout, lettering) : noFiles)} />
      </div>
      {hasText && (
        <p className="text-xs text-stone-500">With text, the lockup sits on the left; alignment applies without it.</p>
      )}
      <BannerPreview drawn={drawn} theme={options.theme} lettering={lettering} />
    </div>
  );
}

/**
 * The banner on its theme's own page, the page hugging the banner at its
 * own size, or the room there is, never wider, with its caption beneath;
 * or, when it can't be drawn, why: an error, never a blank panel.
 */
function BannerPreview({
  drawn,
  theme,
  lettering,
}: {
  drawn: Attempt;
  theme: BannerOptions['theme'];
  lettering: string;
}) {
  const ground = homeGround[theme];
  const { layout } = drawn;
  // The canvas plus the panel's padding (p-4) and border, as Tailwind sizes boxes border-box.
  const width = (layout?.canvas.width ?? stripCanvas.width) + 2 * 16 + 2;
  return (
    <div className="w-full space-y-2" style={{ maxWidth: width }}>
      <div
        data-theme={theme}
        data-banner-preview
        className="w-full rounded-lg border border-stone-200 p-4"
        style={{ backgroundColor: ground, maxWidth: width }}
      >
        {layout ? (
          <BannerSvg layout={layout} lettering={lettering} className="block h-auto w-full" />
        ) : (
          <p role="alert" className={`text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>
            The banner can’t be drawn: {drawn.error}.
          </p>
        )}
      </div>
      {/* Under the panel, on the studio's page, so nothing sits on the banner's own ground. */}
      {layout && (
        <div className={captionClass(homeGround.light)}>
          {themeLabels[theme]}, on the {theme} page · {layout.canvas.width} × {layout.canvas.height},{' '}
          {layout.ground ? 'opaque' : 'transparent'}
        </div>
      )}
    </div>
  );
}
