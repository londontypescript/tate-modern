import { useState } from 'react';
import { defaultLogoConfig, type LogoConfig } from '../logo';

/** A named logo configuration saved in the browser. */
export interface Preset {
  id: string;
  name: string;
  config: LogoConfig;
  /** ISO timestamp of the last save. */
  savedAt: string;
}

const STORAGE_KEY = 'lts-logo:presets:v1';

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

/** Reads presets from their stored JSON, dropping anything malformed. */
export function parsePresets(json: string | null): Preset[] {
  if (!json) return [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.flatMap((item): Preset[] =>
    isPlainObject(item) && typeof item.id === 'string' && typeof item.name === 'string'
      ? [
          {
            id: item.id,
            name: item.name,
            config: mergeWithDefaults(defaultLogoConfig, item.config),
            savedAt: typeof item.savedAt === 'string' ? item.savedAt : '',
          },
        ]
      : [],
  );
}

function readStorage(): Preset[] {
  try {
    return parsePresets(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function writeStorage(presets: Preset[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return true;
  } catch {
    return false;
  }
}

const newId = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** Named configurations persisted in localStorage. */
export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>(readStorage);
  const [storageFailed, setStorageFailed] = useState(false);

  const commit = (next: Preset[]) => {
    setPresets(next);
    setStorageFailed(!writeStorage(next));
  };
  const now = () => new Date().toISOString();

  return {
    presets,
    storageFailed,
    /** Saves a new preset and returns its id. */
    create(name: string, config: LogoConfig): string {
      const id = newId();
      commit([...presets, { id, name, config, savedAt: now() }]);
      return id;
    },
    /** Overwrites a preset's configuration. */
    update(id: string, config: LogoConfig) {
      commit(presets.map((p) => (p.id === id ? { ...p, config, savedAt: now() } : p)));
    },
    rename(id: string, name: string) {
      commit(presets.map((p) => (p.id === id ? { ...p, name } : p)));
    },
    remove(id: string) {
      commit(presets.filter((p) => p.id !== id));
    },
  };
}
