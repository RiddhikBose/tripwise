import { getJson } from './http.js';
import { createCache } from '../lib/cache.js';
import { categorize } from '../lib/categorize.js';
import { distanceKm, offsetPoint } from '../lib/geo.js';

const API = 'https://en.wikipedia.org/w/api.php';
const nearbyCache = createCache({ ttlMs: 60 * 60 * 1000 });
const placeCache = createCache({ ttlMs: 6 * 60 * 60 * 1000 });
const summaryCache = createCache({ ttlMs: 6 * 60 * 60 * 1000, max: 3000 });
const cityCache = createCache({ ttlMs: 24 * 60 * 60 * 1000 });

function apiUrl(params) {
  const url = new URL(API);
  url.search = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...params });
  return url;
}

// The "page image" isn't always a photo of the place. Locator maps, logos,
// seals and SVG diagrams look wrong on a card, so treat those as no photo.
const NOT_A_PHOTO = /\.svg$|\.gif$|map|locator|logo|seal|emblem|flag|coat_of_arms|diagram|plan\b|signature/i;

function photoOf(page) {
  if (!page.thumbnail?.source) return null;
  if (page.pageimage && NOT_A_PHOTO.test(page.pageimage)) return null;
  return page.thumbnail.source;
}

// "Kalikambal Temple (Tamil: ...) is a ..." -> drop the bracketed bits and
// keep it to a sentence or two so it fits on a card.
function tidyExtract(text, maxLength = 240) {
  if (!text) return null;
  let clean = text
    .split('\n')[0]
    .replace(/\s*\([^()]*\)/g, '')
    .replace(/\s+,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (clean.length > maxLength) {
    const cut = clean.slice(0, maxLength);
    const lastStop = cut.lastIndexOf('. ');
    clean = lastStop > 60 ? cut.slice(0, lastStop + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`;
  }
  return clean || null;
}

function toPlace(page, { keepAll = false } = {}) {
  const coords = page.coordinates?.[0];
  if (!coords) return null;
  const category = categorize(page.description, page.title) || (keepAll ? 'other' : null);
  if (!category) return null;

  return {
    id: String(page.pageid),
    name: page.title,
    description: page.description || null,
    category,
    lat: coords.lat,
    lon: coords.lon,
    image: photoOf(page),
  };
}

async function geosearch(lat, lon, radiusKm) {
  const url = apiUrl({
    generator: 'geosearch',
    ggscoord: `${lat.toFixed(5)}|${lon.toFixed(5)}`,
    ggsradius: String(Math.min(radiusKm, 10) * 1000),
    ggslimit: '100',
    prop: 'coordinates|description|pageimages',
    piprop: 'thumbnail|name',
    pithumbsize: '640',
    pilimit: '100',
    colimit: '100',
  });
  const data = await getJson(url, { label: 'Wikipedia' });
  return data.query?.pages || [];
}

// Geosearch only ever returns the 100 articles *closest* to the point, so in
// a dense city a single call covers maybe 2 km. For bigger radii we also
// search from a ring of points around the centre and merge the results.
export async function getNearby(lat, lon, radiusKm) {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${radiusKm}`;
  const cached = nearbyCache.get(key);
  if (cached) return cached;

  const points = [{ lat, lon }];
  if (radiusKm > 2) {
    for (let bearing = 0; bearing < 360; bearing += 60) {
      points.push(offsetPoint(lat, lon, radiusKm * 0.55, bearing));
    }
  }

  const settled = await Promise.allSettled(points.map((p) => geosearch(p.lat, p.lon, radiusKm / 2 + 1)));
  const ok = settled.filter((s) => s.status === 'fulfilled');
  if (!ok.length) throw settled[0].reason;

  const byId = new Map();
  for (const { value: pages } of ok) {
    for (const page of pages) {
      const place = toPlace(page);
      if (place && distanceKm(lat, lon, place.lat, place.lon) <= radiusKm) byId.set(place.id, place);
    }
  }

  const places = [...byId.values()];
  nearbyCache.set(key, places);
  return places;
}

// First sentence or two of each article, for the cards. The extracts API
// only hands out 20 per request, so ask in chunks and cache per page.
export async function getSummaries(ids) {
  const result = {};
  const missing = [];
  for (const id of ids) {
    const hit = summaryCache.get(id);
    if (hit !== undefined) result[id] = hit;
    else missing.push(id);
  }

  const chunks = [];
  for (let i = 0; i < missing.length; i += 20) chunks.push(missing.slice(i, i + 20));

  await Promise.all(
    chunks.map(async (chunk) => {
      const url = apiUrl({
        pageids: chunk.join('|'),
        prop: 'extracts',
        exintro: '1',
        explaintext: '1',
        exsentences: '2',
        exlimit: '20',
      });
      const data = await getJson(url, { label: 'Wikipedia' });
      for (const page of data.query?.pages || []) {
        const summary = tidyExtract(page.extract);
        summaryCache.set(String(page.pageid), summary);
        result[page.pageid] = summary;
      }
    })
  );

  return result;
}

// A handful of specific places by page id (used for curated picks).
export async function getPlacesByIds(ids) {
  const url = apiUrl({
    pageids: ids.join('|'),
    prop: 'coordinates|description|pageimages',
    piprop: 'thumbnail|name',
    pithumbsize: '1200',
  });
  const data = await getJson(url, { label: 'Wikipedia' });
  const pages = (data.query?.pages || []).filter((p) => !p.missing && !p.invalid);
  const byId = new Map(pages.map((p) => [String(p.pageid), toPlace(p, { keepAll: true })]));
  // keep the order the caller asked for
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

// Intro + photo for a city. We check the article's coordinates against the
// city we geocoded, so "Paris" in Texas doesn't get the French article.
export async function getCityOverview(name, lat, lon) {
  const key = `${name.toLowerCase()}|${lat.toFixed(1)},${lon.toFixed(1)}`;
  const cached = cityCache.get(key);
  if (cached !== undefined) return cached;

  const url = apiUrl({
    titles: name,
    redirects: '1',
    prop: 'coordinates|description|pageimages|extracts|info|pageprops',
    piprop: 'thumbnail|name',
    pithumbsize: '1600',
    exintro: '1',
    explaintext: '1',
    exsentences: '3',
    inprop: 'url',
    ppprop: 'disambiguation',
  });

  const data = await getJson(url, { label: 'Wikipedia' });
  const page = data.query?.pages?.[0];
  const coords = page?.coordinates?.[0];

  let overview = null;
  if (page && !page.missing && !page.pageprops?.disambiguation && coords && distanceKm(lat, lon, coords.lat, coords.lon) < 40) {
    overview = {
      title: page.title,
      description: page.description || null,
      intro: tidyExtract(page.extract, 420),
      image: photoOf(page),
      wikiUrl: page.fullurl,
    };
  }

  cityCache.set(key, overview);
  return overview;
}

export async function getPlace(pageId) {
  const cached = placeCache.get(pageId);
  if (cached) return cached;

  const url = apiUrl({
    pageids: pageId,
    prop: 'coordinates|description|pageimages|extracts|info',
    piprop: 'thumbnail|name',
    pithumbsize: '1600',
    exintro: '1',
    explaintext: '1',
    inprop: 'url',
  });

  const data = await getJson(url, { label: 'Wikipedia' });
  const page = data.query?.pages?.[0];
  if (!page || page.missing || page.invalid) return null;

  const coords = page.coordinates?.[0];
  const place = {
    id: String(page.pageid),
    name: page.title,
    description: page.description || null,
    category: categorize(page.description, page.title) || 'other',
    lat: coords?.lat ?? null,
    lon: coords?.lon ?? null,
    image: photoOf(page),
    summary: page.extract?.trim() || null,
    wikiUrl: page.fullurl,
    updatedAt: page.touched,
  };

  placeCache.set(pageId, place);
  return place;
}
