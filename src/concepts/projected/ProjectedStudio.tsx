import { Suspense, lazy, use, useMemo, useState } from 'react';
import { defaultWordmarkConfig, palette, tileLettering } from '../../shared';
import { loadLogoFonts, usePrefersReducedMotion } from '../../shared/react';
import { PresetsPanel } from '../../studio/PresetsPanel';
import { StudioLayout } from '../../studio/StudioLayout';
import { Button, ColourInput, Panel, Select, Slider, Toggle, type SliderControl } from '../../studio/ui';
import { useConceptState } from '../../studio/useConceptState';
import { threeControls } from '../three/controls';
import {
  ProjectedLogo,
  ProjectedMark,
  buildProjectedLockup,
  projectedFileName,
  renderProjectedSvg,
  type ProjectedVariant,
} from './components';
import { buildProjectedEmblem, defaultProjectedConfig, type ProjectedConfig } from './engine';
import { projectedStarters } from './starters';
import { useSpins } from './useSpins';

const LiveRender = lazy(() => import('../three/LiveRender'));

const PRESETS_KEY = 'lts-studio:projected:presets:v1';

const backgrounds = { white: '#ffffff', cream: palette.cream, black: '#000000' } as const;
type BackgroundName = keyof typeof backgrounds;
const backgroundNames = Object.keys(backgrounds) as BackgroundName[];
const backgroundName = (colour: string) => backgroundNames.find((name) => backgrounds[name] === colour) ?? 'white';

/** The 3D sliders minus environment reflections, which the projection doesn't model. */
const sharedGroups = threeControls<ProjectedConfig>().map((group) => ({
  ...group,
  controls: group.controls.filter((c) => c.label !== 'Environment strength'),
}));

const projection = <K extends keyof ProjectedConfig['projection']>(key: K) => ({
  get: (c: ProjectedConfig) => c.projection[key] as number,
  set: (c: ProjectedConfig, v: number) => ({ ...c, projection: { ...c.projection, [key]: v } }),
});

const drawingControls: SliderControl<ProjectedConfig>[] = [
  { label: 'Exposure', min: 0.2, max: 3, step: 0.01, unit: '×', ...projection('exposure') },
  { label: 'Gradient threshold', min: 0, max: 0.2, step: 0.005, ...projection('gradientThreshold') },
  { label: 'Wordmark height', min: 0.2, max: 0.8, step: 0.01, ...projection('wordmarkHeight') },
  { label: 'Wordmark gap', min: 0, max: 0.4, step: 0.005, ...projection('wordmarkGap') },
];

function download(name: string, svg: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

/** Previews and controls for the projected concept: the 3D slabs drawn as flat SVG. */
export default function ProjectedStudio() {
  const fonts = use(loadLogoFonts());
  const state = useConceptState(defaultProjectedConfig);
  const { config, setConfig } = state;
  const [animating, setAnimating] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const spins = useSpins(config.stack.count, config.motion.speed, animating && !reducedMotion);

  const set = <S extends keyof ProjectedConfig>(section: S, patch: Partial<ProjectedConfig[S]>) =>
    setConfig((c) => ({ ...c, [section]: { ...c[section], ...patch } }));

  const lettering = useMemo(
    () => tileLettering(fonts.sans).map((g, i) => ({ id: `tile-letter-${i}-${g.char}`, d: g.d, fill: '' })),
    [fonts],
  );
  const emblem = useMemo(() => buildProjectedEmblem(config, lettering, spins), [config, lettering, spins]);
  const lockup = useMemo(
    () => buildProjectedLockup(emblem, defaultWordmarkConfig, fonts.serif, config.projection),
    [emblem, fonts, config.projection],
  );
  const background = config.layout.background;
  const faces = emblem.items.length;

  const exportSvg = (variant: ProjectedVariant, withBackground: boolean) =>
    download(
      projectedFileName(variant),
      renderProjectedSvg(variant, lockup, { background: withBackground ? background : undefined }),
    );

  const previews = (
    <>
      <Panel title="Projected SVG">
        <div className="rounded-lg p-6 sm:p-10" style={{ backgroundColor: background }}>
          {config.layout.wordmark ? (
            <ProjectedLogo lockup={lockup} className="mx-auto block max-h-[60vh] w-full" />
          ) : (
            <ProjectedMark emblem={emblem} className="mx-auto block aspect-square max-h-[60vh] w-full" />
          )}
        </div>
        <p className="mt-2 text-xs text-stone-500">
          {faces} shapes, pure SVG: every face is a polygon shaded like the 3D render’s material under the same lights.
        </p>
      </Panel>

      {showLive && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Panel title="Projected (emblem)">
            <div className="rounded-lg p-4" style={{ backgroundColor: background }}>
              <ProjectedMark
                emblem={emblem}
                bounds={{ minX: -100, minY: -100, maxX: 100, maxY: 100 }}
                className="mx-auto block aspect-square w-full"
              />
            </div>
          </Panel>
          <Panel title="Live 3D (same settings)">
            <div className="aspect-square rounded-lg p-4" style={{ backgroundColor: background }}>
              <Suspense fallback={<p className="text-sm text-stone-500">Loading the 3D renderer…</p>}>
                <LiveRender config={config} font={fonts.sans} animate={animating && !reducedMotion} />
              </Suspense>
            </div>
          </Panel>
        </div>
      )}
    </>
  );

  const controls = (
    <>
      <Panel title="View & export">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAnimating((a) => !a)} primary={!animating}>
            {animating ? 'Stop spinning' : 'Spin slabs'}
          </Button>
        </div>
        {animating && config.motion.speed === 0 && (
          <p className="mt-2 text-xs text-amber-700">Set a spin speed under “Camera & motion”.</p>
        )}
        {reducedMotion && animating && (
          <p className="mt-2 text-xs text-amber-700">Your system asks for reduced motion, so the slabs stay still.</p>
        )}
        <Toggle label="Compare with the live 3D render" checked={showLive} onChange={setShowLive} />
        <Toggle
          label="“TS” on the front slab"
          checked={config.lettering.show}
          onChange={(show) => set('lettering', { show })}
        />
        <Toggle
          label="Show the wordmark beside it"
          checked={config.layout.wordmark}
          onChange={(wordmark) => set('layout', { wordmark })}
        />
        <Toggle
          label="Shade faces with gradients"
          checked={config.projection.gradients}
          onChange={(gradients) => set('projection', { gradients })}
        />
        <Toggle
          label="Draw back faces (see-through)"
          checked={config.projection.backFaces}
          onChange={(backFaces) => set('projection', { backFaces })}
        />
        <Select
          label="Background"
          value={backgroundName(background)}
          options={backgroundNames}
          onChange={(name) => set('layout', { background: backgrounds[name] })}
        />
        <div className="mt-4 border-t border-stone-200 pt-4">
          <p className="mb-2 text-xs font-medium tracking-wide text-stone-500 uppercase">Download SVG</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => exportSvg('mark', false)}>Mark</Button>
            <Button onClick={() => exportSvg('logo', false)}>Complete logo</Button>
            <Button onClick={() => exportSvg('logo', true)}>Logo on background</Button>
          </div>
        </div>
      </Panel>

      <PresetsPanel storageKey={PRESETS_KEY} state={state} starters={projectedStarters} />

      <Panel title="Look">
        <ColourInput
          label="Slab colour"
          value={config.material.colour}
          onChange={(colour) => set('material', { colour })}
        />
        <Toggle
          label="Scrambled angles (prototype’s final state)"
          checked={config.stack.scramble}
          onChange={(scramble) => set('stack', { scramble })}
        />
        <Toggle
          label="Thicker slabs further back"
          checked={config.slab.depthFollowsScale}
          onChange={(depthFollowsScale) => set('slab', { depthFollowsScale })}
        />
      </Panel>

      <Panel title="Drawing">
        <div className="space-y-3">
          {drawingControls.map((control) => (
            <Slider
              key={control.label}
              control={control}
              value={control.get(config)}
              onChange={(v) => setConfig((c) => control.set(c, v))}
            />
          ))}
        </div>
      </Panel>

      {sharedGroups.map((group) => (
        <Panel key={group.title} title={group.title}>
          <div className="space-y-3">
            {group.controls.map((control) => (
              <Slider
                key={control.label}
                control={control}
                value={control.get(config)}
                onChange={(v) => setConfig((c) => control.set(c, v))}
              />
            ))}
          </div>
        </Panel>
      ))}
    </>
  );

  return <StudioLayout previews={previews} controls={controls} />;
}
