import { useState } from 'react';

/** A named concept configuration saved in the browser. */
export interface Preset<T> {
  id: string;
  name: string;
  config: T;
  /** ISO timestamp of the last save. */
  savedAt: string;
}

/** A read-only configuration a concept ships with, to start from. */
export interface StarterConfig<T> {
  name: string;
  description?: string;
  config: T;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Overlays a saved value on the defaults, field by field. Fields added to
 * the config after a preset was saved get their default; fields whose type
 * no longer matches are ignored.
 */
export function mergeWithDefaults<T>(defaults: T, saved: unknown): T {
  if (isPlainObject(defaults)) {
    if (!isPlainObject(saved)) return defaults;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(defaults)) out[key] = mergeWithDefaults(value, saved[key]);
    return out as T;
  }
  if (Array.isArray(defaults)) {
    return (Array.isArray(saved) && saved.length === defaults.length ? saved : defaults) as T;
  }
  return (typeof saved === typeof defaults ? saved : defaults) as T;
}

/**
 * Reads presets from their stored JSON, dropping anything malformed and
 * filling fields added since they were saved from `defaults`.
 */
export function parsePresets<T>(json: string | null, defaults: T): Preset<T>[] {
  if (!json) return [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.flatMap((item): Preset<T>[] =>
    isPlainObject(item) && typeof item.id === 'string' && typeof item.name === 'string'
      ? [
          {
            id: item.id,
            name: item.name,
            config: mergeWithDefaults(defaults, item.config),
            savedAt: typeof item.savedAt === 'string' ? item.savedAt : '',
          },
        ]
      : [],
  );
}

function readStorage<T>(key: string, defaults: T): Preset<T>[] {
  try {
    return parsePresets(window.localStorage.getItem(key), defaults);
  } catch {
    return [];
  }
}

function writeStorage<T>(key: string, presets: Preset<T>[]): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(presets));
    return true;
  } catch {
    return false;
  }
}

const newId = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * Named configurations persisted in localStorage under `storageKey`, one
 * list per concept.
 */
export function usePresets<T>(storageKey: string, defaults: T) {
  const [presets, setPresets] = useState<Preset<T>[]>(() => readStorage(storageKey, defaults));
  const [storageFailed, setStorageFailed] = useState(false);

  const commit = (next: Preset<T>[]) => {
    setPresets(next);
    setStorageFailed(!writeStorage(storageKey, next));
  };
  const now = () => new Date().toISOString();

  return {
    presets,
    storageFailed,
    /** Saves a new preset and returns its id. */
    create: (name: string, config: T): string => {
      const id = newId();
      commit([...presets, { id, name, config, savedAt: now() }]);
      return id;
    },
    /** Overwrites a preset's configuration. */
    update: (id: string, config: T) => {
      commit(presets.map((p) => (p.id === id ? { ...p, config, savedAt: now() } : p)));
    },
    rename: (id: string, name: string) => {
      commit(presets.map((p) => (p.id === id ? { ...p, name } : p)));
    },
    remove: (id: string) => {
      commit(presets.filter((p) => p.id !== id));
    },
  };
}
