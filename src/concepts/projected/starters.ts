import type { StarterConfig } from '../../studio/presets';
import { threeStarters } from '../three/starters';
import { defaultProjectedConfig, type ProjectedConfig } from './engine';

/**
 * The 3D concept's starting points that don't depend on environment
 * reflections (which the projection doesn't model), with this concept's
 * own drawing settings.
 */
export const projectedStarters: readonly StarterConfig<ProjectedConfig>[] = threeStarters
  .filter((starter) => starter.config.lighting.environment === 'none')
  .map((starter) => ({
    ...starter,
    config: {
      ...starter.config,
      layout: { ...starter.config.layout, wordmark: true },
      projection: defaultProjectedConfig.projection,
    },
  }));
