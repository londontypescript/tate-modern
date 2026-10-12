/**
 * The projected concept: the 3D concept's slabs, camera and lights, drawn as
 * flat SVG polygons. It shares the 3D concept's configuration (so the same
 * settings can be compared side by side) and adds how the vector drawing is
 * made. Environment reflections are not modelled.
 */
import { defaultThreeConfig, type ThreeConfig } from '../../three/config';

export interface ProjectionConfig {
  /**
   * Shade each face with a gradient between its lightest and darkest
   * corners, instead of one flat colour (perspective makes the specular
   * highlight vary across a face).
   */
  gradients: boolean;
  /** Faces whose corners differ less than this (sRGB luminance) stay flat. */
  gradientThreshold: number;
  /** Draw the slabs' back faces too (seen through the translucent fronts). */
  backFaces: boolean;
  /** Brightness multiplier before tone mapping (three's `toneMappingExposure`). */
  exposure: number;
  /** Height of the wordmark in the lockup, as a fraction of the emblem's height. */
  wordmarkHeight: number;
  /** Gap between emblem and wordmark, as a fraction of the emblem's height. */
  wordmarkGap: number;
}

export interface ProjectedConfig extends ThreeConfig {
  projection: ProjectionConfig;
}

const defaultProjectionConfig: ProjectionConfig = {
  gradients: true,
  gradientThreshold: 0.02,
  backFaces: false,
  exposure: 1,
  wordmarkHeight: 0.42,
  wordmarkGap: 0.08,
};

export const defaultProjectedConfig: ProjectedConfig = {
  ...defaultThreeConfig,
  layout: { ...defaultThreeConfig.layout, wordmark: true },
  projection: defaultProjectionConfig,
};
