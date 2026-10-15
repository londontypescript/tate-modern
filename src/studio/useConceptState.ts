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
  /** Back to the initial configuration, unloading any saved configuration. */
  reset: () => void;
  /** Starts afresh from a given configuration (a starter). */
  startFrom: (config: T) => void;
  /** Loads a saved configuration for editing. */
  load: (config: T, id: string) => void;
}

/**
 * `defaults` is what saved configurations are filled in from. `initial` is
 * what the concept opens on and Reset returns to; it differs only when a
 * concept opens on a chosen look rather than the engine's defaults.
 */
export function useConceptState<T>(defaults: T, initial: T = defaults): ConceptState<T> {
  const [config, setConfig] = useState<T>(initial);
  const [baseline, setBaseline] = useState<T>(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const startFrom = (next: T) => {
    setConfig(next);
    setBaseline(next);
    setActiveId(null);
  };
  return {
    defaults,
    config,
    setConfig,
    baseline,
    activeId,
    setActiveId,
    reset: () => startFrom(initial),
    startFrom,
    load: (next, id) => {
      setConfig(next);
      setBaseline(next);
      setActiveId(id);
    },
  };
}
