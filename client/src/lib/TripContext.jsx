import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { useToast } from '../components/Toast.jsx';

const TripContext = createContext(null);

// No login, so the browser just remembers a random trip id. The items
// themselves live in MongoDB under that id.
function getTripId() {
  const KEY = 'tripwise.tripId';
  let id = null;
  try {
    id = localStorage.getItem(KEY);
  } catch {
    /* storage blocked, fall through */
  }
  if (!id) {
    id = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* the trip just won't survive a refresh */
    }
  }
  return id;
}

export function TripProvider({ children }) {
  const [tripId] = useState(getTripId);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [pending, setPending] = useState({}); // placeId -> true while adding
  const toast = useToast();

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await api.getTrip(tripId);
      setItems(data.items);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(
    async (place, city) => {
      setPending((p) => ({ ...p, [place.id]: true }));
      try {
        const item = await api.addToTrip(tripId, {
          placeId: place.id,
          name: place.name,
          description: place.description?.slice(0, 300) || undefined,
          category: place.category,
          lat: place.lat,
          lon: place.lon,
          image: place.image || undefined,
          city: city || undefined,
        });
        setItems((prev) => [...prev, item]);
        toast(`Added ${place.name} to your trip`);
      } catch (err) {
        // 409 means it's already saved (maybe from another tab), so just resync
        if (err.status === 409) load();
        toast(err.message, 'error');
      } finally {
        setPending((p) => {
          const next = { ...p };
          delete next[place.id];
          return next;
        });
      }
    },
    [tripId, toast, load]
  );

  const remove = useCallback(
    async (itemId) => {
      const before = items;
      const removed = items.find((i) => i.id === itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      try {
        await api.removeFromTrip(tripId, itemId);
        if (removed) toast(`Removed ${removed.name}`);
      } catch (err) {
        setItems(before);
        toast(`Couldn't remove it: ${err.message}`, 'error');
      }
    },
    [items, tripId, toast]
  );

  const update = useCallback(
    async (itemId, patch) => {
      const before = items;
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
      try {
        const saved = await api.updateTripItem(tripId, itemId, patch);
        setItems((prev) => prev.map((i) => (i.id === itemId ? saved : i)));
      } catch (err) {
        setItems(before);
        toast(`Couldn't save that change: ${err.message}`, 'error');
      }
    },
    [items, tripId, toast]
  );

  const clear = useCallback(async () => {
    const before = items;
    setItems([]);
    try {
      await api.clearTrip(tripId);
      toast('Trip cleared');
    } catch (err) {
      setItems(before);
      toast(err.message, 'error');
    }
  }, [items, tripId, toast]);

  const value = useMemo(() => {
    const byPlace = new Map(items.map((i) => [i.placeId, i]));
    return {
      items,
      status,
      error,
      reload: load,
      add,
      remove,
      update,
      clear,
      findByPlace: (placeId) => byPlace.get(placeId),
      isAdding: (placeId) => Boolean(pending[placeId]),
    };
  }, [items, status, error, load, add, remove, update, clear, pending]);

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used inside <TripProvider>');
  return ctx;
}
