/**
 * Seeded randomness for the sheet variation. Every sample is a pure hash of
 * (seed, layer index, channel), not a step of a running generator, so adding
 * a channel or a layer never shifts the samples the others already get.
 */

/** Fixed keys of the random channels. Never renumber one: saved seeds would change. */
export const Channel = {
  rotation: 1,
  size: 2,
  aspect: 3,
  offsetX: 4,
  offsetY: 5,
} as const;

export type ChannelKey = (typeof Channel)[keyof typeof Channel];

/** A 32-bit integer finaliser (MurmurHash3's fmix32): every input bit reaches every output bit. */
function mix(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Uniform in [-1, 1) for one (seed, layer, channel), the same on every run and platform. */
export function sample(seed: number, layer: number, channel: ChannelKey): number {
  let h = mix(seed | 0);
  h = mix(h ^ Math.imul(layer | 0, 0x9e3779b1));
  h = mix(h ^ Math.imul(channel, 0x632be5ab));
  return (h / 2 ** 32) * 2 - 1;
}
