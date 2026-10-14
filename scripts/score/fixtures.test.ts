import { describe, expect, it } from 'vitest';
import { frozen, irregular } from './fixtures';

describe('the frozen geometry', () => {
  it('is the Irregular starter with only the sheet size changed, to 150', () => {
    expect(frozen.emblem.squareSize).toBe(150);
    expect({ ...frozen, emblem: { ...frozen.emblem, squareSize: 175 } }).toEqual(irregular);
  });
});
