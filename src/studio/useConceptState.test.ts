import { createElement, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useConceptState, type ConceptState } from './useConceptState';

type Size = { size: number };

/**
 * Renders the hook once per step: each step acts on the state it is given,
 * and what the hook holds after the last one is returned with the first.
 */
function run(defaults: Size, initial: Size | undefined, steps: ((state: ConceptState<Size>) => void)[]) {
  const seen: ConceptState<Size>[] = [];
  function Probe() {
    const state = useConceptState(defaults, ...(initial === undefined ? [] : [initial]));
    const [step, setStep] = useState(0);
    seen.push(state);
    const act = steps[step];
    if (act) {
      act(state);
      setStep(step + 1);
    }
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  return { opened: seen[0]!, last: seen.at(-1)! };
}

describe('useConceptState', () => {
  const engine = { size: 175 };
  const chosen = { size: 150 };
  const other = { size: 120 };
  const edited = { size: 90 };

  it('opens on the initial configuration and resets to it, keeping the defaults for saved ones', () => {
    const { opened, last } = run(engine, chosen, [(s) => s.setConfig(edited), (s) => s.reset()]);
    expect(opened).toMatchObject({ config: chosen, baseline: chosen, startingPoint: chosen, defaults: engine });
    expect(last).toMatchObject({ config: chosen, baseline: chosen, startingPoint: chosen, defaults: engine });
  });

  it('opens and resets on the defaults when no initial configuration is given', () => {
    const { opened, last } = run(engine, undefined, [(s) => s.setConfig(edited), (s) => s.reset()]);
    expect(opened.config).toBe(engine);
    expect(last).toMatchObject({ config: engine, baseline: engine, startingPoint: engine });
  });

  it('resets to the starter picked since opening, which loading a saved configuration does not move', () => {
    const { last } = run(engine, chosen, [(s) => s.startFrom(other), (s) => s.load(edited, 'saved'), (s) => s.reset()]);
    expect(last).toMatchObject({ config: other, baseline: other, startingPoint: other, activeId: null });
  });
});
