import { useState, type FormEvent } from 'react';
import type { LogoConfig } from '../logo';
import { usePresets, type Preset } from './presets';
import { Button, Panel } from './ui';

/** Name for a duplicate made while no saved configuration is loaded. */
const UNTITLED_NAME = 'New Config';

const sameConfig = (a: LogoConfig, b: LogoConfig) => JSON.stringify(a) === JSON.stringify(b);

const savedAtLabel = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

/**
 * Save, load, rename and delete named configurations in localStorage.
 * Loading a preset makes it the one being edited; "Save changes" writes
 * the current sliders back to it. "New" starts again from the approved
 * defaults; "Duplicate" saves the current sliders as a new configuration.
 */
export function PresetsPanel({
  config,
  baseline,
  activeId,
  onLoad,
  onActiveChange,
  onNew,
}: {
  config: LogoConfig;
  /** What the current config started from when nothing is loaded. */
  baseline: LogoConfig;
  activeId: string | null;
  onLoad: (preset: Preset) => void;
  onActiveChange: (id: string | null) => void;
  /** Starts afresh from the approved defaults, unloading any configuration. */
  onNew: () => void;
}) {
  const { presets, storageFailed, create, update, rename, remove } = usePresets();
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const active = presets.find((p) => p.id === activeId);
  const dirty = !sameConfig(config, active?.config ?? baseline);

  const saveNew = (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onActiveChange(create(name, config));
    setNewName('');
  };

  const startNew = () => {
    if (dirty && !window.confirm('Discard your unsaved changes and start from the approved defaults?')) return;
    setRenaming(null);
    onNew();
  };

  /**
   * Saves the current settings as "<current name> Copy" (or "New Config"
   * when nothing is loaded) and opens the new name for editing.
   */
  const duplicate = () => {
    const taken = new Set(presets.map((p) => p.name));
    const base = active ? `${active.name} Copy` : UNTITLED_NAME;
    let name = base;
    for (let n = 2; taken.has(name); n++) name = `${base} ${n}`;
    const id = create(name, config);
    onActiveChange(id);
    setRenaming({ id, name });
  };

  const load = (preset: Preset) => {
    if (dirty && !window.confirm(`Discard your unsaved changes and load “${preset.name}”?`)) return;
    onLoad(preset);
  };

  const commitRename = (e: FormEvent) => {
    e.preventDefault();
    if (renaming && renaming.name.trim()) rename(renaming.id, renaming.name.trim());
    setRenaming(null);
  };

  const confirmRemove = (preset: Preset) => {
    if (!window.confirm(`Delete “${preset.name}”? This cannot be undone.`)) return;
    remove(preset.id);
    if (preset.id === activeId) onActiveChange(null);
  };

  return (
    <Panel title="Saved configurations">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm">
        <span className="min-w-0 break-words">
          {active ? (
            <>
              Editing <strong>{active.name}</strong>
            </>
          ) : (
            <span className="text-stone-500">No saved configuration loaded</span>
          )}
          {dirty && <span className="block text-xs text-amber-700">Unsaved changes</span>}
        </span>
        {active && (
          <Button small primary disabled={!dirty} onClick={() => update(active.id, config)}>
            Save changes
          </Button>
        )}
      </div>

      <div className="mb-3 flex gap-2">
        <Button small onClick={startNew}>
          New
        </Button>
        <Button small onClick={duplicate}>
          Duplicate
        </Button>
      </div>

      <form onSubmit={saveNew} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name"
          aria-label="Name for the new configuration"
          maxLength={60}
          className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 text-sm"
        />
        <Button type="submit" small disabled={!newName.trim()}>
          Save as new
        </Button>
      </form>

      {storageFailed && (
        <p className="mt-2 text-xs text-red-700">
          The browser refused to save (storage full or blocked); changes last only for this visit.
        </p>
      )}

      {presets.length === 0 ? (
        <p className="mt-3 text-xs text-stone-500">Nothing saved yet. Configurations stay in this browser.</p>
      ) : (
        <ul className="mt-3 divide-y divide-stone-100">
          {presets.map((preset) => (
            <li key={preset.id} className="py-2">
              {renaming?.id === preset.id ? (
                <form onSubmit={commitRename} className="flex gap-2">
                  <input
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    value={renaming.name}
                    onChange={(e) => setRenaming({ id: preset.id, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Escape' && setRenaming(null)}
                    aria-label={`New name for ${preset.name}`}
                    maxLength={60}
                    className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 text-sm"
                  />
                  <Button type="submit" small primary disabled={!renaming.name.trim()}>
                    Save
                  </Button>
                  <Button small onClick={() => setRenaming(null)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${preset.id === activeId ? 'font-semibold text-blue-700' : ''}`}
                    >
                      {preset.name}
                    </p>
                    <p className="text-[11px] text-stone-400">{savedAtLabel(preset.savedAt)}</p>
                  </div>
                  <Button small onClick={() => load(preset)}>
                    Load
                  </Button>
                  <Button small onClick={() => setRenaming({ id: preset.id, name: preset.name })}>
                    Rename
                  </Button>
                  <Button small danger onClick={() => confirmRemove(preset)}>
                    Delete
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
