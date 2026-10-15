import { createElement, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useConceptState, type ConceptState } from './useConceptState';

/**
 * Runs the hook through three renders: the first edits the configuration,
 * the second resets it. Returns what the hook held at each point.
 */
function openEditReset<T>(defaults: T, initial: T | undefined, edited: T) {
  const seen: { opened?: ConceptState<T>; edited?: ConceptState<T>; reset?: ConceptState<T> } = {};
  function Probe() {
    const state = useConceptState(defaults, ...(initial === undefined ? [] : [initial]));
    const [step, setStep] = useState(0);
    if (step === 0) {
      seen.opened = state;
      state.setConfig(edited);
      setStep(1);
    } else if (step === 1) {
      seen.edited = state;
      state.reset();
      setStep(2);
    } else seen.reset = state;
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  return seen;
}

describe('useConceptState', () => {
  const engine = { size: 175 };
  const chosen = { size: 150 };
  const edited = { size: 90 };

  it('opens on the initial configuration and resets to it, keeping the defaults for saved ones', () => {
    const seen = openEditReset(engine, chosen, edited);
    expect(seen.opened).toMatchObject({ config: chosen, baseline: chosen, defaults: engine });
    expect(seen.edited?.config).toBe(edited);
    expect(seen.reset).toMatchObject({ config: chosen, baseline: chosen, defaults: engine });
  });

  it('opens and resets on the defaults when no initial configuration is given', () => {
    const seen = openEditReset(engine, undefined, edited);
    expect(seen.opened?.config).toBe(engine);
    expect(seen.reset).toMatchObject({ config: engine, baseline: engine, defaults: engine });
  });
});
