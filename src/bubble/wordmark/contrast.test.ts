import { describe, expect, it } from 'vitest';
import { themeBackgrounds, wordmarkColours } from './colours';
import { contrastRatio, contrastTarget } from './contrast';

describe('contrast', () => {
  it('follows WCAG 2', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
    expect(contrastRatio('#1275ec', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#1275ec'));
  });

  it.each(['light', 'dark'] as const)('meets 3:1 for the wordmark ink and blue on the %s page', (theme) => {
    const page = themeBackgrounds[theme];
    for (const colour of Object.values(wordmarkColours[theme]))
      expect(contrastRatio(colour, page), `${colour} on ${page}`).toBeGreaterThanOrEqual(contrastTarget);
  });
});
