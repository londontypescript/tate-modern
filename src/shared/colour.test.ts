import { describe, expect, it } from 'vitest';
import { isHexColour } from './colour';
import { palette } from './palette';

describe('isHexColour', () => {
  it('accepts # and six hex digits, in either case', () => {
    for (const colour of [
      '#000000',
      '#ffffff',
      '#FFFFFF',
      '#1275ec',
      '#1275EC',
      '#aBcDeF',
      ...Object.values(palette),
    ]) {
      expect(isHexColour(colour), colour).toBe(true);
    }
  });

  it('rejects every other form, and anything around a colour', () => {
    const rejected: unknown[] = [
      'url(#x)',
      'red',
      '#fff',
      '#12345g',
      '#1234567',
      '#12345',
      ' #112233',
      '#112233 ',
      '#112233\n',
      '\n#112233',
      '#112233" onload="alert(1)',
      '112233',
      '##112233',
      'rgb(1, 2, 3)',
      '',
      0x112233,
      null,
      undefined,
      ['#112233'],
      { colour: '#112233' },
      new String('#112233'),
    ];
    for (const value of rejected) expect(isHexColour(value), JSON.stringify(value)).toBe(false);
  });
});
