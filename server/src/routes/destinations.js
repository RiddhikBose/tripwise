import { Router } from 'express';
import { getCityOverview, getNearby, getPlace, getPlacesByIds, getSummaries } from '../services/wikipedia.js';
import { getForecast } from '../services/weather.js';
import { searchCities } from '../services/geocode.js';
import { CATEGORIES } from '../lib/categorize.js';
import { distanceKm, parseCoord } from '../lib/geo.js';
import { badRequest, notFound, wrap } from '../lib/errors.js';

const router = Router();

const RADII = [2, 5, 10];
// "Top picks": nearest-first put bus depots and random offices at the top in
// most cities, so this nudges up places that look like actual sights.
const CATEGORY_WEIGHT = { heritage: 3, museum: 3, worship: 2, nature: 2, landmark: 1, neighbourhood: 0, other: -1 };
// hotels match "palace" etc. but aren't really where you'd start a visit
const isLodging = (p) => /\b(hotel|resort|guest ?house|hostel)\b/i.test(`${p.name} ${p.description || ''}`);
const score = (p) =>
  (p.image ? 2 : 0) +
  (p.description ? 1 : 0) +
  CATEGORY_WEIGHT[p.category] -
  (isLodging(p) ? 3 : 0) -
  Math.min(p.distanceKm / 5, 2);

const SORTS = {
  top: (a, b) => score(b) - score(a) || a.distanceKm - b.distanceKm,
  distance: (a, b) => a.distanceKm - b.distanceKm,
  name: (a, b) => a.name.localeCompare(b.name),
  '-name': (a, b) => b.name.localeCompare(a.name),
};

router.get('/cities', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) throw badRequest('Type at least 2 characters to search for a city.');
  if (q.length > 80) throw badRequest('That city name is too long.');
  res.json({ results: await searchCities(q) });
}));

router.get('/cities/overview', wrap(async (req, res) => {
  const name = String(req.query.name || '').trim();
  const lat = parseCoord(req.query.lat, 'lat');
  const lon = parseCoord(req.query.lon, 'lon');
  if (!name || name.length > 80) throw badRequest('name is required (max 80 characters).');
  if (lat === null || lon === null) throw badRequest('lat and lon are required and must be valid coordinates.');

  const overview = await getCityOverview(name, lat, lon);
  if (!overview) throw notFound(`No Wikipedia overview found for ${name}.`);
  res.json(overview);
}));

// Look up specific places, e.g. a hand-picked list. ?ids=1,2,3 (max 20)
router.get('/places', wrap(async (req, res) => {
  const ids = String(req.query.ids || '').split(',').filter(Boolean);
  if (!ids.length || ids.length > 20 || ids.some((id) => !/^\d{1,12}$/.test(id))) {
    throw badRequest('ids must be 1 to 20 comma-separated Wikipedia page ids.');
  }

  const lat = parseCoord(req.query.lat, 'lat');
  const lon = parseCoord(req.query.lon, 'lon');

  const [places, summaries] = await Promise.all([getPlacesByIds(ids), getSummaries(ids)]);
  res.json({
    results: places.map((p) => ({
      ...p,
      summary: summaries[p.id] ?? null,
      ...(lat !== null && lon !== null ? { distanceKm: Math.round(distanceKm(lat, lon, p.lat, p.lon) * 10) / 10 } : {}),
    })),
  });
}));

router.get('/destinations', wrap(async (req, res) => {
  const lat = parseCoord(req.query.lat, 'lat');
  const lon = parseCoord(req.query.lon, 'lon');
  if (lat === null || lon === null) {
    throw badRequest('lat and lon are required and must be valid coordinates.');
  }

  const radius = req.query.radius ? Number(req.query.radius) : 10;
  if (!RADII.includes(radius)) throw badRequest(`radius must be one of ${RADII.join(', ')} (km).`);

  const sort = req.query.sort || 'top';
  if (!SORTS[sort]) throw badRequest(`sort must be one of: ${Object.keys(SORTS).join(', ')}.`);

  const wanted = req.query.category ? String(req.query.category).split(',') : [];
  const unknown = wanted.filter((c) => !CATEGORIES[c]);
  if (unknown.length) throw badRequest(`Unknown category: ${unknown.join(', ')}.`);

  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 24;
  if (!Number.isInteger(page) || page < 1) throw badRequest('page must be a positive whole number.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw badRequest('limit must be between 1 and 100.');

  const q = String(req.query.q || '').trim().toLowerCase();
  const photosOnly = req.query.photos === '1' || req.query.photos === 'true';

  const places = (await getNearby(lat, lon, radius)).map((p) => ({
    ...p,
    distanceKm: Math.round(distanceKm(lat, lon, p.lat, p.lon) * 10) / 10,
  }));

  // search + photo filter first, so the category counts reflect them
  const matching = places.filter((p) => {
    if (photosOnly && !p.image) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  });

  const counts = {};
  for (const p of matching) counts[p.category] = (counts[p.category] || 0) + 1;

  const filtered = matching
    .filter((p) => !wanted.length || wanted.includes(p.category))
    .sort(SORTS[sort]);

  const start = (page - 1) * limit;
  const pageResults = filtered.slice(start, start + limit);

  // summaries are nice to have; if Wikipedia hiccups the cards fall back to
  // the short description
  const summaries = await getSummaries(pageResults.map((p) => p.id)).catch(() => ({}));

  res.json({
    center: { lat, lon },
    radius,
    total: places.length,
    count: filtered.length,
    page,
    hasMore: start + limit < filtered.length,
    categories: Object.entries(CATEGORIES).map(([key, label]) => ({ key, label, count: counts[key] || 0 })),
    results: pageResults.map((p) => ({ ...p, summary: summaries[p.id] ?? null })),
  });
}));

router.get('/destinations/:id', wrap(async (req, res) => {
  const { id } = req.params;
  if (!/^\d{1,12}$/.test(id)) throw badRequest('Destination id should be a numeric Wikipedia page id.');

  const place = await getPlace(id);
  if (!place) throw notFound(`No destination found with id ${id}.`);

  let weather = null;
  let nearby = [];

  if (place.lat !== null) {
    // the page is still useful without these, so don't fail the whole request
    const [w, n] = await Promise.allSettled([
      getForecast(place.lat, place.lon),
      getNearby(place.lat, place.lon, 2),
    ]);
    if (w.status === 'fulfilled') weather = w.value;
    if (n.status === 'fulfilled') {
      nearby = n.value
        .filter((p) => p.id !== place.id)
        .map((p) => ({ ...p, distanceKm: Math.round(distanceKm(place.lat, place.lon, p.lat, p.lon) * 10) / 10 }))
        .sort(SORTS.distance)
        .slice(0, 6);
    }
  }

  res.json({ ...place, weather, nearby });
}));

export default router;
