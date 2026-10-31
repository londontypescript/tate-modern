import { describe, expect, it } from 'vitest';
import { bandRect, edgeChoices, plainEdges, slotRecipes } from '.';

const meetup = slotRecipes.find((r) => r.id === 'meetupPhoto');
const canvas = { width: 1200, height: 675 };

describe('the slot edges', () => {
  it('offer every band side and both corners, plain by default', () => {
    expect(edgeChoices).toHaveLength(10);
    expect(new Set(edgeChoices.map((e) => `${e.band}/${e.corners}`)).size).toBe(10);
    expect(plainEdges).toEqual({ band: 'off', corners: 'off' });
  });

  it('are offered on the Meetup photo only', () => {
    expect(slotRecipes.filter((r) => r.edges).map((r) => r.id)).toEqual(['meetupPhoto']);
  });

  it.each([
    ['left', { x: 0, y: 0, width: 28, height: 675, runs: 'down' }],
    ['right', { x: 1172, y: 0, width: 28, height: 675, runs: 'down' }],
    ['top', { x: 0, y: 0, width: 1200, height: 28, runs: 'across' }],
    ['bottom', { x: 0, y: 647, width: 1200, height: 28, runs: 'across' }],
  ] as const)('put the %s band along that edge, the full length of the canvas', (side, expected) => {
    expect(bandRect(canvas, side, 28)).toEqual(expected);
  });

  it('keep every band clear of the Meetup photo’s safe rectangle', () => {
    const safe = meetup?.safe;
    const width = meetup?.edges?.bandWidth;
    if (!safe || width === undefined) throw new Error('The Meetup photo has a safe rectangle and a band');
    for (const side of ['left', 'right', 'top', 'bottom'] as const) {
      const b = bandRect(canvas, side, width);
      const apart = b.x + b.width <= safe.minX || b.x >= safe.maxX || b.y + b.height <= safe.minY || b.y >= safe.maxY;
      expect(apart, side).toBe(true);
    }
  });
});
