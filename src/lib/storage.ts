// Safe localStorage wrappers.
//
// `localStorage` access *throws* (it does not return null) in several real-world
// production conditions that never occur on localhost: Safari Private mode,
// embedded/in-app webviews, and any browser where the user has blocked cookies or
// site data. An unguarded read inside a render or `useState` initializer therefore
// crashes the whole React tree on mount — which surfaces as a blank screen in a
// production build (in dev, Vite's error overlay hides it). Always go through these.

export function getStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function removeStored(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable — non-fatal */
  }
}

