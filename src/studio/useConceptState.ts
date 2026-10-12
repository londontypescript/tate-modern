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
  /** Back to the defaults, unloading any saved configuration. */
  reset: () => void;
  /** Starts afresh from a given configuration (a starter). */
  startFrom: (config: T) => void;
  /** Loads a saved configuration for editing. */
  load: (config: T, id: string) => void;
}

export function useConceptState<T>(defaults: T): ConceptState<T> {
  const [config, setConfig] = useState<T>(defaults);
  const [baseline, setBaseline] = useState<T>(defaults);
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
    reset: () => startFrom(defaults),
    startFrom,
    load: (next, id) => {
      setConfig(next);
      setBaseline(next);
      setActiveId(id);
    },
  };
}
