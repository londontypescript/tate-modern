import { useMemo } from 'react';
import { Panel, Slider } from '../../studio/ui';
import { controlGroups } from './controls';
import { sanitizeLogoConfig, type LogoConfig } from './engine';

/**
 * The flat concept's sliders. They show the configuration as the engine
 * draws it, so a hand-edited saved value shows what is drawn (7 layers for a
 * saved 6.9, the default for a saved 1e400), while moving a slider changes
 * only its own field of the configuration being edited.
 */
export function SliderPanels({
  config,
  setConfig,
}: {
  config: LogoConfig;
  setConfig: (update: (current: LogoConfig) => LogoConfig) => void;
}) {
  const used = useMemo(() => sanitizeLogoConfig(config), [config]);
  return controlGroups.map((group) => (
    <Panel key={group.title} title={group.title}>
      <div className="space-y-3">
        {group.controls.map((control) => (
          <Slider
            key={control.label}
            control={control}
            value={control.get(used)}
            onChange={(v) => setConfig((c) => control.set(c, v))}
          />
        ))}
      </div>
    </Panel>
  ));
}
