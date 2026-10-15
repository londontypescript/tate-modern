import { useState } from 'react';

/**
 * The configuration a concept is editing, what it started from (to tell
 * whether there are unsaved changes) and which saved configuration, if
 * any, it belongs to.
 */
export interface ConceptState<T> {
  defaults: T;
  config: T;
  setConfig: (update: T | ((current: T) => T)) => void;
  /** What `config` started from: the defaults, a starter or a saved one. */
  baseline: T;
  /** The saved configuration being edited, if any. */
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  /**
   * Where Reset goes: what the concept opened on, or the starter picked
   * since. Loading a saved configuration doesn't move it.
   */
  startingPoint: T;
  /** Back to the starting point, unloading any saved configuration. */
  reset: () => void;
  /** Starts afresh from a given configuration (a starter), which becomes the starting point. */
  startFrom: (config: T) => void;
  /** Loads a saved configuration for editing. */
  load: (config: T, id: string) => void;
}

/**
 * `defaults` is what saved configurations are filled in from. `initial` is
 * what the concept opens on, and Reset's first starting point; it differs
 * only when a concept opens on a chosen look rather than the engine's defaults.
 */
export function useConceptState<T>(defaults: T, initial: T = defaults): ConceptState<T> {
  const [config, setConfig] = useState<T>(initial);
  const [baseline, setBaseline] = useState<T>(initial);
  const [startingPoint, setStartingPoint] = useState<T>(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const startFrom = (next: T) => {
    setConfig(next);
    setBaseline(next);
    setStartingPoint(next);
    setActiveId(null);
  };
  return {
    defaults,
    config,
    setConfig,
    baseline,
    activeId,
    setActiveId,
    startingPoint,
    reset: () => startFrom(startingPoint),
    startFrom,
    load: (next, id) => {
      setConfig(next);
      setBaseline(next);
      setActiveId(id);
    },
  };
}
