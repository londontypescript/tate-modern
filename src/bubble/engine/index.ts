import type { Detail } from './detail';
import { emblemGradients, emblemLayer } from './emblem';
import { glassBehind, glassBlurs, glassClips, glassGradients, glassInFront } from './glass';
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
  switch (detail) {
    case 'full':
      return {
        theme,
        title: titles[theme],
        defs: {
          gradients: [...glassGradients(theme), ...emblemGradients()],
          blurs: glassBlurs,
          clips: glassClips,
        },
        layers: [...glassBehind(theme), emblemLayer(lettering), ...glassInFront(theme)],
      };
  }
}
