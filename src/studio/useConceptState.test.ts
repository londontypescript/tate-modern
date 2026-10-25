import { createElement, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useConceptState, type ConceptState } from './useConceptState';

type Size = { size: number };

/**
 * Renders the hook once per step: each step acts on the state it is given,
 * and what the hook holds after the last one is returned with the first.
 */
function run(defaults: Size, steps: ((state: ConceptState<Size>) => void)[]) {
  const seen: ConceptState<Size>[] = [];
  function Probe() {
    const state = useConceptState(defaults);
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
  const other = { size: 120 };
  const edited = { size: 90 };

  it('opens and resets on the defaults', () => {
    const { opened, last } = run(engine, [(s) => s.setConfig(edited), (s) => s.reset()]);
    expect(opened.config).toBe(engine);
    expect(opened).toMatchObject({ baseline: engine, startingPoint: engine, defaults: engine });
    expect(last).toMatchObject({ config: engine, baseline: engine, startingPoint: engine });
  });

  it('resets to the starter picked since opening, which loading a saved configuration does not move', () => {
    const { last } = run(engine, [(s) => s.startFrom(other), (s) => s.load(edited, 'saved'), (s) => s.reset()]);
    // The same object, not a copy: the pressed starter is found by identity.
    expect(last.startingPoint).toBe(other);
    expect(last.config).toBe(other);
    expect(last).toMatchObject({ baseline: other, activeId: null });
  });
});
