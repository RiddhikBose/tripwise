export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError("Couldn't reach the TripWise server. Check your connection and try again.", 0);
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error?.message || `Request failed (${res.status})`, res.status);
  }
  return data;
}

export const api = {
  searchCities: (q, signal) => request(`/cities?q=${encodeURIComponent(q)}`, { signal }),

  getDestinations: (params, signal) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    }
    return request(`/destinations?${qs}`, { signal });
  },

  getPlaces: (ids, { lat, lon } = {}, signal) =>
    request(`/places?ids=${ids.join(',')}${lat ? `&lat=${lat}&lon=${lon}` : ''}`, { signal }),

  getCityOverview: ({ name, lat, lon }, signal) =>
    request(`/cities/overview?name=${encodeURIComponent(name)}&lat=${lat}&lon=${lon}`, { signal }),

  getDestination: (id, signal) => request(`/destinations/${encodeURIComponent(id)}`, { signal }),

  getTrip: (tripId) => request(`/trips/${tripId}/items`),
  addToTrip: (tripId, item) => request(`/trips/${tripId}/items`, { method: 'POST', body: item }),
  updateTripItem: (tripId, id, patch) => request(`/trips/${tripId}/items/${id}`, { method: 'PATCH', body: patch }),
  removeFromTrip: (tripId, id) => request(`/trips/${tripId}/items/${id}`, { method: 'DELETE' }),
  clearTrip: (tripId) => request(`/trips/${tripId}/items`, { method: 'DELETE' }),
};
