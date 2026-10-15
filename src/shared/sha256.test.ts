import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256Hex } from './sha256';

describe('sha256Hex', () => {
  it('matches the published test vectors', () => {
    // FIPS 180-2, appendix B, and the empty message.
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
    expect(sha256Hex('a'.repeat(1_000_000))).toBe('cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0');
  });

  it('hashes the UTF-8 bytes of non-ASCII text', () => {
    // UTF-8 of "é" is c3 a9; hashing those two bytes is the reference.
    expect(sha256Hex('é')).toBe(
      createHash('sha256')
        .update(Buffer.from([0xc3, 0xa9]))
        .digest('hex'),
    );
    for (const text of ['Café · “TypeScript” — London', '漢字', '🙂 astral', 'mixed é\u0000nul']) {
      expect(sha256Hex(text), text).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
    }
  });

  it('pads correctly either side of a block boundary', () => {
    // 55 bytes is the most that fits one block with its length; 56 needs two.
    for (const length of [55, 56, 63, 64, 65, 119, 120]) {
      const text = 'x'.repeat(length);
      expect(sha256Hex(text), `${length} bytes`).toBe(createHash('sha256').update(text).digest('hex'));
    }
  });

  it('gives the same answer every time', () => {
    const text = '<svg id="lts-emblem"/>'.repeat(500);
    expect(sha256Hex(text)).toBe(sha256Hex(text));
  });
});
