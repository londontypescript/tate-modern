/**
 * The optional band and rounded corners a slot's image can carry: the
 * sunset fan laid flat along one edge, and corners cut away to transparent.
 * The studio offers them where a recipe has `edges`; the committed assets
 * are always drawn plain.
 */

export type BandSide = 'left' | 'right' | 'top' | 'bottom';

export interface SlotEdges {
  band: 'off' | BandSide;
  corners: 'off' | 'on';
}

export const bandChoices = ['off', 'left', 'right', 'top', 'bottom'] as const satisfies readonly SlotEdges['band'][];
export const cornerChoices = ['off', 'on'] as const satisfies readonly SlotEdges['corners'][];

/** No band and square corners: what the committed files show. */
export const plainEdges: SlotEdges = { band: 'off', corners: 'off' };

/** Every combination the studio can export. */
export const edgeChoices: readonly SlotEdges[] = bandChoices.flatMap((band) =>
  cornerChoices.map((corners) => ({ band, corners })),
);

export const isPlain = (edges: SlotEdges) => edges.band === 'off' && edges.corners === 'off';

/**
 * The band's rectangle on a canvas, the full length of its edge, and which
 * way the fan's colours run along it: down a side, across the top or bottom.
 */
export function bandRect(canvas: { width: number; height: number }, side: BandSide, width: number) {
  switch (side) {
    case 'left':
      return { x: 0, y: 0, width, height: canvas.height, runs: 'down' } as const;
    case 'right':
      return { x: canvas.width - width, y: 0, width, height: canvas.height, runs: 'down' } as const;
    case 'top':
      return { x: 0, y: 0, width: canvas.width, height: width, runs: 'across' } as const;
    case 'bottom':
      return { x: 0, y: canvas.height - width, width: canvas.width, height: width, runs: 'across' } as const;
  }
}
