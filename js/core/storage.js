export function readNumber(key, fallback = 0) {
  try {
    const raw = window.localStorage.getItem(key);
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeNumber(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be unavailable in private/sandboxed contexts. The game still runs.
  }
}

export function readBoolean(key, fallback = false) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return fallback;
  } catch {
    return fallback;
  }
}

export function writeBoolean(key, value) {
  try {
    window.localStorage.setItem(key, String(Boolean(value)));
  } catch {
    // Storage can be unavailable in private/sandboxed contexts. The game still runs.
  }
}
