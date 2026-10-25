import { createElement, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PresetsPanel } from '../../studio/PresetsPanel';
import { parsePresets } from '../../studio/presets';
import { useConceptState, type ConceptState } from '../../studio/useConceptState';
import { defaultLogoConfig, neutralHalo, neutralVariation, type LogoConfig } from './engine';
import { fillMissing } from './FlatStudio';
import { flatStarters } from './starters';

/**
 * The flat studio's state and presets panel as `FlatStudio` sets them up,
 * rendered once per step: each step acts on the state it is given. Returns
 * the state and the panel's markup after the last step.
 */
function studio(steps: ((state: ConceptState<LogoConfig>) => void)[] = []) {
  let last: ConceptState<LogoConfig> | undefined;
  function Probe() {
    const state = useConceptState(defaultLogoConfig);
    const [step, setStep] = useState(0);
    last = state;
    const act = steps[step];
    if (act) {
      act(state);
      setStep(step + 1);
    }
    return createElement(PresetsPanel<LogoConfig>, { storageKey: 'test', state, starters: flatStarters, fillMissing });
  }
  const html = renderToStaticMarkup(createElement(Probe));
  return { state: last!, html };
}

const pressed = (html: string) => [...html.matchAll(/aria-pressed="true"[^>]*>([^<]*)</g)].map((m) => m[1]);

describe('the flat studio’s starters', () => {
  it('are one, named Default, whose configuration is the defaults themselves', () => {
    expect(flatStarters.map((s) => s.name)).toEqual(['Default']);
    expect(flatStarters[0]?.config).toBe(defaultLogoConfig);
  });
});

describe('the flat studio’s opening look', () => {
  it('is the defaults, with Default shown pressed, and only that one', () => {
    const { state, html } = studio();
    expect(state.config).toBe(defaultLogoConfig);
    expect(state.startingPoint).toBe(defaultLogoConfig);
    expect(pressed(html)).toEqual(['Default']);
  });

  it('is where Reset and New go back to, after edits or a saved configuration', () => {
    const edited: LogoConfig = { ...defaultLogoConfig, emblem: { ...defaultLogoConfig.emblem, seed: 3 } };
    // New goes back through the same reset as the Reset button.
    for (const steps of [
      [(s: ConceptState<LogoConfig>) => s.setConfig(edited), (s: ConceptState<LogoConfig>) => s.reset()],
      [(s: ConceptState<LogoConfig>) => s.load(edited, 'saved'), (s: ConceptState<LogoConfig>) => s.reset()],
    ]) {
      const { state, html } = studio(steps);
      expect(state.config).toBe(defaultLogoConfig);
      expect(state.startingPoint).toBe(defaultLogoConfig);
      expect(state.activeId).toBeNull();
      expect(pressed(html)).toEqual(['Default']);
    }
  });
});

describe('a saved flat configuration missing fields', () => {
  it('is filled from the defaults, with the variation and the halo switched off', () => {
    const [saved] = parsePresets(
      JSON.stringify([{ id: 'a', name: 'A', config: { emblem: { layerCount: 3 } } }]),
      defaultLogoConfig,
      fillMissing,
    );
    expect(saved?.config).toEqual({
      ...defaultLogoConfig,
      emblem: { ...defaultLogoConfig.emblem, ...neutralVariation, layerCount: 3 },
      tile: { ...defaultLogoConfig.tile, halo: neutralHalo },
    });
  });
});
