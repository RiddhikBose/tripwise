import { getJson } from './http.js';
import { createCache } from '../lib/cache.js';

const cache = createCache({ ttlMs: 30 * 60 * 1000 });

// WMO weather codes -> something a person would say
const CODES = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Showers', 81: 'Showers', 82: 'Heavy showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

const describe = (code) => CODES[code] || 'Mixed';

export async function getForecast(lat, lon) {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('current', 'temperature_2m,weather_code');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
  url.searchParams.set('forecast_days', '4');
  url.searchParams.set('timezone', 'auto');

  const data = await getJson(url, { label: 'Weather service', timeoutMs: 6000 });
  const d = data.daily;

  const forecast = {
    current: {
      temp: Math.round(data.current.temperature_2m),
      summary: describe(data.current.weather_code),
    },
    days: d.time.map((date, i) => ({
      date,
      summary: describe(d.weather_code[i]),
      max: Math.round(d.temperature_2m_max[i]),
      min: Math.round(d.temperature_2m_min[i]),
      rainChance: d.precipitation_probability_max?.[i] ?? null,
    })),
  };

  cache.set(key, forecast);
  return forecast;
}
