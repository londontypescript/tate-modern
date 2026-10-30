import type { Detail } from './detail';
import { emblemGradients, emblemLayer } from './emblem';
import { glassBehind, glassBlurs, glassClips, glassGradients, glassInFront } from './glass';
import { rimGlassBehind, rimGlassGradients, rimGlassInFront } from './rimGlass';
import type { BubbleDrawing, Theme } from './types';

// The bubble's framework-free engine: drawing data for a theme and a detail.
export * from './types';
export * from './detail';
export * from './bounds';
export { tileLettering } from './emblem';

export interface BubbleOptions {
  theme: Theme;
  detail: Detail;
  /** The tile's "TS" outline, from `tileLettering`. */
  lettering: string;
}

const titles: Record<Theme, string> = {
  light: 'London TypeScript bubble logo, emblem only, light theme',
  dark: 'London TypeScript bubble logo, emblem only, dark theme',
};

/** The bubble emblem as drawing data, layers in paint order. */
export function buildBubble({ theme, detail, lettering }: BubbleOptions): BubbleDrawing {
  const title = titles[theme];
  const emblem = emblemLayer(lettering, detail);
  switch (detail) {
    case 'full':
      return {
        theme,
        title,
        defs: {
          gradients: [...glassGradients(theme), ...emblemGradients()],
          // Copies, so no drawing shares its definitions with another.
          blurs: glassBlurs.map((b) => ({ ...b, region: { ...b.region } })),
          clips: glassClips.map((c) => ({ ...c })),
        },
        layers: [...glassBehind(theme), emblem, ...glassInFront(theme)],
      };
    case 'small':
      return {
        theme,
        title,
        defs: { gradients: [...rimGlassGradients(theme), ...emblemGradients()], blurs: [], clips: [] },
        layers: [rimGlassBehind(theme), emblem, ...rimGlassInFront(theme)],
      };
    case 'tiny':
    case 'none':
      return { theme, title, defs: { gradients: emblemGradients(), blurs: [], clips: [] }, layers: [emblem] };
  }
}
