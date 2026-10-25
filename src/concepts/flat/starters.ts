import type { StarterConfig } from '../../studio/presets';
import { defaultLogoConfig, type LogoConfig } from './engine';

/**
 * The flat studio's one starter: the defaults themselves, the same object,
 * so it is shown pressed when the studio opens on them.
 */
export const flatStarters: readonly StarterConfig<LogoConfig>[] = [
  { name: 'Default', description: 'The flat logo’s default', config: defaultLogoConfig },
];
