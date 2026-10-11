import { use, useMemo, useState } from 'react';
import {
  LondonTypeScriptLogo,
  TypeScriptMark,
  loadLogoFonts,
  renderLogoSvg,
  svgFileName,
  usePrefersReducedMotion,
  useLayerRotations,
  type SvgVariant,
} from '../components';
import { buildLogo, defaultLogoConfig, type BlendMode, type LogoConfig } from '../logo';
import { controlGroups } from './controls';
import { PresetsPanel } from './PresetsPanel';
import { Button, Panel, Slider, Toggle } from './ui';

function download(variant: SvgVariant, svg: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: svgFileName(variant) });
  link.click();
  URL.revokeObjectURL(url);
}

export function App() {
  const fonts = use(loadLogoFonts());
  const [config, setConfig] = useState<LogoConfig>(defaultLogoConfig);
  const [animating, setAnimating] = useState(false);
  const [exportBackground, setExportBackground] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const reset = () => {
    setConfig(defaultLogoConfig);
    setAnimating(false);
    setActivePresetId(null);
  };
  const reducedMotion = usePrefersReducedMotion();

  const logo = useMemo(() => buildLogo(config, fonts), [config, fonts]);
  const rotations = useLayerRotations(logo.emblem.layers, config.animation, animating);
  const cream = { backgroundColor: config.layout.background };

  const exportSvg = (variant: SvgVariant) =>
    download(
      variant,
      renderLogoSvg(variant, logo, { background: exportBackground ? config.layout.background : undefined }),
    );

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 lg:flex lg:h-screen lg:flex-col">
      <header className="flex shrink-0 flex-wrap items-baseline justify-between gap-2 border-b border-stone-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">London TypeScript logo playground</h1>
        <p className="text-sm text-stone-500">
          Development tool. Edit <code>src/logo/config.ts</code> to change the approved defaults.
        </p>
      </header>

      {/* On wide screens each column scrolls on its own below the header, so the
          previews stay in view while the controls are scrolled. */}
      <div className="grid gap-6 p-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_22rem] lg:py-0">
        <main className="space-y-6 lg:overflow-y-auto lg:overscroll-contain lg:py-6">
          <Panel title="Complete logo">
            <div className="rounded-lg p-8 sm:p-12" style={cream}>
              <LondonTypeScriptLogo
                logo={logo}
                rotations={rotations}
                framing="rotation-safe"
                className="mx-auto block max-h-[60vh] w-full"
              />
            </div>
          </Panel>

          <div className="grid gap-6 sm:grid-cols-2">
            <Panel title="Standalone emblem (static)">
              <div className="rounded-lg p-8" style={cream}>
                <TypeScriptMark emblem={logo.emblem} className="mx-auto block aspect-square w-full max-w-80" />
              </div>
            </Panel>
            <Panel title="Animation preview">
              <div className="rounded-lg p-8" style={cream}>
                <TypeScriptMark
                  emblem={logo.emblem}
                  rotations={rotations}
                  framing="rotation-safe"
                  className="mx-auto block aspect-square w-full max-w-80"
                />
              </div>
              {reducedMotion && (
                <p className="mt-2 text-xs text-amber-700">
                  Your system asks for reduced motion, so the squares stay still.
                </p>
              )}
            </Panel>
          </div>
        </main>

        <aside className="space-y-4 lg:overflow-y-auto lg:overscroll-contain lg:py-6 lg:pr-1">
          <Panel title="Animation & export">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setAnimating((a) => !a)} primary={!animating}>
                {animating ? 'Stop animation' : 'Animate squares'}
              </Button>
              <Button onClick={reset}>Reset</Button>
            </div>
            <Toggle
              label="Alternate rotation directions"
              checked={config.animation.alternateDirection}
              onChange={(alternateDirection) =>
                setConfig((c) => ({ ...c, animation: { ...c.animation, alternateDirection } }))
              }
            />
            <Toggle
              label="Multiply overlaps (tinted glass)"
              checked={config.emblem.blendMode === 'multiply'}
              onChange={(on) =>
                setConfig((c) => ({
                  ...c,
                  emblem: { ...c.emblem, blendMode: (on ? 'multiply' : 'normal') satisfies BlendMode },
                }))
              }
            />
            <div className="mt-4 border-t border-stone-200 pt-4">
              <p className="mb-2 text-xs font-medium tracking-wide text-stone-500 uppercase">
                Download SVG
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => exportSvg('mark')}>Mark</Button>
                <Button onClick={() => exportSvg('wordmark')}>Wordmark</Button>
                <Button onClick={() => exportSvg('logo')}>Complete logo</Button>
              </div>
              <Toggle
                label="Include cream background"
                checked={exportBackground}
                onChange={setExportBackground}
              />
            </div>
          </Panel>

          <PresetsPanel
            config={config}
            baseline={defaultLogoConfig}
            activeId={activePresetId}
            onActiveChange={setActivePresetId}
            onNew={reset}
            onLoad={(preset) => {
              setConfig(preset.config);
              setActivePresetId(preset.id);
            }}
          />

          {controlGroups.map((group) => (
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
        </aside>
      </div>
    </div>
  );
}
