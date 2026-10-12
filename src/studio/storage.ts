/** Per-viewer conveniences in localStorage; failures fall back silently. */
export function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked or full: the setting lasts for this visit only.
  }
}
