import { Canvas } from '@react-three/fiber';
import { use, useCallback, useMemo, useRef, useState } from 'react';
import { buildWordmark, defaultWordmarkConfig, palette } from '../../shared';
import { Wordmark, loadLogoFonts, usePrefersReducedMotion } from '../../shared/react';
import { PresetsPanel } from '../../studio/PresetsPanel';
import { StudioLayout } from '../../studio/StudioLayout';
import { Button, ColourInput, Panel, Select, Slider, Toggle } from '../../studio/ui';
import { useConceptState } from '../../studio/useConceptState';
import { defaultThreeConfig, environmentPresets, type ThreeConfig } from './config';
import { threeControlGroups } from './controls';
import { StackScene } from './Scene';
import { threeStarters } from './starters';

const PRESETS_KEY = 'lts-studio:three:presets:v1';

const backgrounds = { white: '#ffffff', cream: palette.cream, black: '#000000', transparent: 'transparent' } as const;
type BackgroundName = keyof typeof backgrounds;
const backgroundNames = Object.keys(backgrounds) as BackgroundName[];
const backgroundName = (colour: string) =>
  backgroundNames.find((name) => backgrounds[name] === colour) ?? 'white';

/** Saves a PNG data URL, optionally painted over a solid background first. */
async function downloadPng(dataUrl: string, background: string, name: string) {
  let url = dataUrl;
  if (background !== 'transparent') {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = Object.assign(document.createElement('canvas'), { width: image.width, height: image.height });
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      url = canvas.toDataURL('image/png');
    }
  }
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
}

/** Previews and controls for the 3D concept (the original React Three Fiber sculpture). */
export default function ThreeStudio() {
  const fonts = use(loadLogoFonts());
  const state = useConceptState(defaultThreeConfig);
  const { config, setConfig } = state;
  const [animating, setAnimating] = useState(false);
  const [orbit, setOrbit] = useState(false);
  const [viewKey, setViewKey] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const capture = useRef<((scale: number) => string) | null>(null);
  const onCaptureReady = useCallback((fn: (scale: number) => string) => {
    capture.current = fn;
  }, []);

  const set = <S extends keyof ThreeConfig>(section: S, patch: Partial<ThreeConfig[S]>) =>
    setConfig((c) => ({ ...c, [section]: { ...c[section], ...patch } }));

  const wordmark = useMemo(() => buildWordmark(defaultWordmarkConfig, fonts.serif, 100), [fonts]);
  const background = config.layout.background;
  const checkerboard =
    'repeating-conic-gradient(#e7e5e4 0% 25%, #fafaf9 0% 50%) 50% / 20px 20px';

  const exportStill = async (scale: number) => {
    const url = capture.current?.(scale);
    if (url) await downloadPng(url, background, `london-typescript-3d@${scale}x.png`);
  };

  const previews = (
    <Panel title="3D render">
      <div
        className="flex flex-col items-center gap-6 rounded-lg p-4 sm:flex-row sm:p-8"
        style={{ background: background === 'transparent' ? checkerboard : background }}
      >
        <div className="aspect-square w-full max-w-[36rem] min-w-0 sm:flex-[3]">
          <Canvas
            key={viewKey}
            gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
            camera={{ fov: config.camera.fov, position: [0, 0, config.camera.distance] }}
            dpr={[1, 2]}
          >
            <StackScene
              config={config}
              font={fonts.sans}
              animate={animating && !reducedMotion}
              orbit={orbit}
              onCaptureReady={onCaptureReady}
            />
          </Canvas>
        </div>
        {config.layout.wordmark && (
          <div className="w-2/3 sm:w-auto sm:min-w-0 sm:flex-[2]">
            <Wordmark wordmark={wordmark} className="block w-full" />
          </div>
        )}
      </div>
      {reducedMotion && animating && (
        <p className="mt-2 text-xs text-amber-700">Your system asks for reduced motion, so the slabs stay still.</p>
      )}
      <p className="mt-2 text-xs text-stone-500">
        {orbit ? 'Drag to orbit, scroll to zoom, right-drag to pan. ' : ''}
        Exports capture the render only (not the wordmark).
      </p>
    </Panel>
  );

  const controls = (
    <>
      <Panel title="View & export">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAnimating((a) => !a)} primary={!animating}>
            {animating ? 'Stop spinning' : 'Spin slabs'}
          </Button>
          <Button onClick={() => setViewKey((k) => k + 1)}>Reset view</Button>
        </div>
        {animating && config.motion.speed === 0 && (
          <p className="mt-2 text-xs text-amber-700">Set a spin speed under “Camera & motion”.</p>
        )}
        <Toggle label="Orbit with the mouse" checked={orbit} onChange={setOrbit} />
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
        <Select
          label="Background"
          value={backgroundName(background)}
          options={backgroundNames}
          onChange={(name) => set('layout', { background: backgrounds[name] })}
        />
        <div className="mt-4 border-t border-stone-200 pt-4">
          <p className="mb-2 text-xs font-medium tracking-wide text-stone-500 uppercase">Download PNG</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 4].map((scale) => (
              <Button key={scale} onClick={() => void exportStill(scale)}>
                {scale}×
              </Button>
            ))}
          </div>
        </div>
      </Panel>

      <PresetsPanel storageKey={PRESETS_KEY} state={state} starters={threeStarters} />

      <Panel title="Look">
        <ColourInput label="Slab colour" value={config.material.colour} onChange={(colour) => set('material', { colour })} />
        <Select
          label="Environment reflections"
          value={config.lighting.environment}
          options={environmentPresets}
          onChange={(environment) => set('lighting', { environment })}
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
        {config.lighting.environment !== 'none' && (
          <p className="mt-2 text-xs text-stone-500">
            Environment maps are drei’s presets (Poly Haven HDRIs), fetched from a CDN on first use.
          </p>
        )}
      </Panel>

      {threeControlGroups.map((group) => (
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
