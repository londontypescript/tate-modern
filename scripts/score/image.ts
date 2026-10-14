/**
 * Opaque 8-bit RGB images, the one pixel format the score compares. Every
 * source (resvg's renders, the committed PNGs, Chrome's screenshots) comes
 * through here, which checks its size and that it is opaque everywhere:
 * a translucent pixel would be composited onto something unknown.
 */
import { PNG } from 'pngjs';

export interface RgbImage {
  width: number;
  height: number;
  /** R, G, B per pixel, row by row. */
  data: Uint8Array;
}

interface Size {
  width: number;
  height: number;
}

/** An RGB image from RGBA bytes, refusing any pixel whose alpha isn't 255. */
export function fromRgba(width: number, height: number, rgba: Uint8Array, source: string): RgbImage {
  if (rgba.length !== width * height * 4) {
    throw new Error(`${source}: expected ${width * height * 4} bytes for ${width} × ${height}, got ${rgba.length}`);
  }
  const data = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    const alpha = rgba[i + 3];
    if (alpha !== 255) {
      const p = i / 4;
      throw new Error(`${source}: pixel (${p % width}, ${Math.floor(p / width)}) has alpha ${alpha}`);
    }
    data[j] = rgba[i] as number;
    data[j + 1] = rgba[i + 1] as number;
    data[j + 2] = rgba[i + 2] as number;
  }
  return { width, height, data };
}

/** Checks an image's size against the one expected. */
function expectSize(image: Size, expected: Size, source: string) {
  if (image.width !== expected.width || image.height !== expected.height) {
    throw new Error(`${source}: expected ${expected.width} × ${expected.height}, got ${image.width} × ${image.height}`);
  }
}

/** Decodes a PNG, 8 bits per channel, opaque everywhere, optionally of a known size. */
export function decodePng(bytes: Uint8Array, expected?: Size, source = 'PNG'): RgbImage {
  const png = PNG.sync.read(Buffer.from(bytes));
  if (expected) expectSize(png, expected, source);
  return fromRgba(png.width, png.height, new Uint8Array(png.data), source);
}

/** Encodes an RGB image as a lossless 8-bit RGB PNG. */
export function encodePng(image: RgbImage): Buffer {
  const png = new PNG({ width: image.width, height: image.height });
  for (let i = 0, j = 0; j < image.data.length; i += 4, j += 3) {
    png.data[i] = image.data[j] as number;
    png.data[i + 1] = image.data[j + 1] as number;
    png.data[i + 2] = image.data[j + 2] as number;
    png.data[i + 3] = 255;
  }
  return PNG.sync.write(png, { colorType: 2 });
}
