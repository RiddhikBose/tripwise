import { getJson } from './http.js';
import { createCache } from '../lib/cache.js';

const cache = createCache({ ttlMs: 24 * 60 * 60 * 1000 });

// Open-Meteo's geocoder is free, keyless and fast enough for autocomplete.
export async function searchCities(name) {
  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', name);
  url.searchParams.set('count', '8');
  url.searchParams.set('language', 'en');

  const data = await getJson(url, { label: 'City search' });
  const cities = (data.results || []).map((r) => ({
    id: r.id,
    name: r.name,
    region: r.admin1 || null,
    country: r.country || r.country_code || null,
    lat: r.latitude,
    lon: r.longitude,
    population: r.population || null,
  }));

  cache.set(key, cities);
  return cities;
}
