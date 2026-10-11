import { use, useMemo, useState, type ReactNode } from 'react';
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
import { controlGroups, type SliderControl } from './controls';

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
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">London TypeScript logo playground</h1>
        <p className="text-sm text-stone-500">
          Development tool. Edit <code>src/logo/config.ts</code> to change the approved defaults.
        </p>
      </header>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_22rem]">
        <main className="space-y-6">
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

        <aside className="space-y-4">
          <Panel title="Animation & export">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setAnimating((a) => !a)} primary={!animating}>
                {animating ? 'Stop animation' : 'Animate squares'}
              </Button>
              <Button
                onClick={() => {
                  setConfig(defaultLogoConfig);
                  setAnimating(false);
                }}
              >
                Reset to approved
              </Button>
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-stone-700">{title}</h2>
      {children}
    </section>
  );
}

function Slider({
  control,
  value,
  onChange,
}: {
  control: SliderControl;
  value: number;
  onChange: (value: number) => void;
}) {
  const decimals = Math.max(0, -Math.floor(Math.log10(control.step)));
  return (
    <label className="block">
      <span className="flex justify-between text-xs text-stone-600">
        <span>{control.label}</span>
        <span className="font-mono tabular-nums">
          {value.toFixed(decimals)}
          {control.unit}
        </span>
      </span>
      <input
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-blue-600"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="mt-3 flex items-center gap-2 text-sm text-stone-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-blue-600"
      />
      {label}
    </label>
  );
}

function Button({
  onClick,
  primary = false,
  children,
}: {
  onClick: () => void;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        primary
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50'
      }`}
    >
      {children}
    </button>
  );
}
