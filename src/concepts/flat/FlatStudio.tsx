import { use, useMemo, useState } from 'react';
import type { LogoFonts } from '../../shared';
import { loadLogoFonts, usePrefersReducedMotion } from '../../shared/react';
import { PresetsPanel } from '../../studio/PresetsPanel';
import { StudioLayout } from '../../studio/StudioLayout';
import { Button, Panel, Toggle } from '../../studio/ui';
import { useConceptState } from '../../studio/useConceptState';
import {
  LondonTypeScriptLogo,
  TypeScriptMark,
  renderLogoSvg,
  svgFileName,
  useLayerRotations,
  type SvgVariant,
} from './components';
import {
  buildLogo,
  defaultLogoConfig,
  neutralHalo,
  neutralVariation,
  sanitizeLogoConfig,
  type BlendMode,
  type LogoConfig,
  type LogoModel,
} from './engine';
import { SliderPanels } from './SliderPanels';
import { flatStarters, irregularSmallerSheets } from './starters';

/** Kept from the original playground, so configurations saved there still load. */
const PRESETS_KEY = 'lts-logo:presets:v1';

/**
 * Configurations saved before the sheet variation or the halo existed get
 * them switched off, not the current defaults, so they keep looking as
 * they did whatever the defaults become.
 */
export const fillMissing = { emblem: neutralVariation, tile: { halo: neutralHalo } };

/**
 * The configuration as the engine reads it (`used`), and the logo drawn from
 * it. The studio previews, shows and downloads this one checked
 * configuration; `config` itself, and so what is saved, stays as it was.
 */
export function studioView(config: LogoConfig, fonts: LogoFonts) {
  const used = sanitizeLogoConfig(config);
  return { used, logo: buildLogo(used, fonts) };
}

/** What the Download buttons write: the logo as previewed, on the checked background when asked for. */
export function studioSvg(
  { used, logo }: { used: LogoConfig; logo: LogoModel },
  variant: SvgVariant,
  withBackground: boolean,
) {
  return renderLogoSvg(variant, logo, { background: withBackground ? used.layout.background : undefined });
}

function download(variant: SvgVariant, svg: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: svgFileName(variant) });
  link.click();
  URL.revokeObjectURL(url);
}

/** Previews and controls for the flat concept. */
export default function FlatStudio() {
  const fonts = use(loadLogoFonts());
  // Saved configurations are still filled in from the engine defaults; only
  // the opening point, and so Reset's first target, is the chosen look.
  const state = useConceptState(defaultLogoConfig, irregularSmallerSheets);
  const { config, setConfig } = state;
  const [animating, setAnimating] = useState(false);
  const [exportBackground, setExportBackground] = useState(false);

  const reset = () => {
    state.reset();
    setAnimating(false);
  };
  const reducedMotion = usePrefersReducedMotion();

  // What is drawn, shown and downloaded, and what the toggles and sliders read, is the checked configuration.
  const view = useMemo(() => studioView(config, fonts), [config, fonts]);
  const { used, logo } = view;
  const rotations = useLayerRotations(logo.emblem.layers, used.animation, animating);
  const cream = { backgroundColor: used.layout.background };

  const exportSvg = (variant: SvgVariant) => download(variant, studioSvg(view, variant, exportBackground));

  const previews = (
    <>
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
    </>
  );

  const controls = (
    <>
      <Panel title="Animation & export">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAnimating((a) => !a)} primary={!animating}>
            {animating ? 'Stop animation' : 'Animate squares'}
          </Button>
          <Button onClick={reset}>Reset</Button>
        </div>
        <Toggle
          label="Alternate rotation directions"
          checked={used.animation.alternateDirection}
          onChange={(alternateDirection) =>
            setConfig((c) => ({ ...c, animation: { ...c.animation, alternateDirection } }))
          }
        />
        <Toggle
          label="Multiply overlaps (tinted glass)"
          checked={used.emblem.blendMode === 'multiply'}
          onChange={(on) =>
            setConfig((c) => ({
              ...c,
              emblem: { ...c.emblem, blendMode: (on ? 'multiply' : 'normal') satisfies BlendMode },
            }))
          }
        />
        <div className="mt-4 border-t border-stone-200 pt-4">
          <p className="mb-2 text-xs font-medium tracking-wide text-stone-500 uppercase">Download SVG</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => exportSvg('mark')}>Mark</Button>
            <Button onClick={() => exportSvg('wordmark')}>Wordmark</Button>
            <Button onClick={() => exportSvg('logo')}>Complete logo</Button>
          </div>
          <Toggle label="Include cream background" checked={exportBackground} onChange={setExportBackground} />
        </div>
      </Panel>

      <PresetsPanel storageKey={PRESETS_KEY} state={state} starters={flatStarters} fillMissing={fillMissing} />

      <SliderPanels config={config} setConfig={setConfig} />
    </>
  );

  return <StudioLayout previews={previews} controls={controls} />;
}
