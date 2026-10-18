// Tiny in-memory TTL cache. Filtering/sorting hits the same Wikipedia
// result over and over, so there's no point re-fetching it every time.
export function createCache({ ttlMs, max = 200 }) {
  const store = new Map();

  return {
    get(key) {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (Date.now() > hit.expires) {
        store.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key, value) {
      if (store.size >= max) store.delete(store.keys().next().value);
      store.set(key, { value, expires: Date.now() + ttlMs });
    },
  };
}
