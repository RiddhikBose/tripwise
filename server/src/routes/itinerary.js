import { Router } from 'express';
import mongoose from 'mongoose';
import { ItineraryItem } from '../models/ItineraryItem.js';
import { CATEGORIES } from '../lib/categorize.js';
import { parseCoord } from '../lib/geo.js';
import { badRequest, conflict, notFound, wrap } from '../lib/errors.js';

const router = Router({ mergeParams: true });

router.param('tripId', (req, _res, next, tripId) => {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(tripId)) return next(badRequest('Invalid trip id.'));
  next();
});

router.param('itemId', (req, _res, next, itemId) => {
  if (!mongoose.isValidObjectId(itemId)) return next(badRequest('Invalid itinerary item id.'));
  next();
});

const optionalString = (value, field, max) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw badRequest(`${field} must be a string.`);
  if (value.length > max) throw badRequest(`${field} can be at most ${max} characters.`);
  return value.trim();
};

function validateNewItem(body = {}) {
  const placeId = String(body.placeId ?? '');
  if (!/^\d{1,12}$/.test(placeId)) throw badRequest('placeId is required (numeric Wikipedia page id).');

  const name = optionalString(body.name, 'name', 200);
  if (!name) throw badRequest('name is required.');

  const lat = parseCoord(body.lat, 'lat');
  const lon = parseCoord(body.lon, 'lon');
  if (lat === null || lon === null) throw badRequest('lat and lon must be valid coordinates.');

  const category = body.category ?? 'other';
  if (!CATEGORIES[category]) throw badRequest(`Unknown category "${category}".`);

  return {
    placeId,
    name,
    lat,
    lon,
    category,
    description: optionalString(body.description, 'description', 300),
    image: optionalString(body.image, 'image', 1000),
    city: optionalString(body.city, 'city', 120),
  };
}

function validateDay(day) {
  if (day === null) return null;
  if (!Number.isInteger(day) || day < 1 || day > 30) throw badRequest('day must be a whole number from 1 to 30, or null.');
  return day;
}

router.get('/:tripId/items', wrap(async (req, res) => {
  const items = await ItineraryItem.find({ tripId: req.params.tripId }).sort({ day: 1, createdAt: 1 });
  res.json({ count: items.length, items });
}));

router.post('/:tripId/items', wrap(async (req, res) => {
  const data = validateNewItem(req.body);
  if (req.body.day !== undefined) data.day = validateDay(req.body.day);

  try {
    const item = await ItineraryItem.create({ ...data, tripId: req.params.tripId });
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) throw conflict(`${data.name} is already in your trip.`);
    throw err;
  }
}));

router.patch('/:tripId/items/:itemId', wrap(async (req, res) => {
  const body = req.body || {};
  const update = {};

  if ('day' in body) update.day = validateDay(body.day);
  if ('note' in body) update.note = optionalString(body.note, 'note', 500) ?? '';
  if ('visited' in body) {
    if (typeof body.visited !== 'boolean') throw badRequest('visited must be true or false.');
    update.visited = body.visited;
  }
  if (!Object.keys(update).length) throw badRequest('Nothing to update. Send day, note or visited.');

  const item = await ItineraryItem.findOneAndUpdate(
    { _id: req.params.itemId, tripId: req.params.tripId },
    update,
    { new: true, runValidators: true }
  );
  if (!item) throw notFound('That item is not in this trip.');
  res.json(item);
}));

router.delete('/:tripId/items/:itemId', wrap(async (req, res) => {
  const result = await ItineraryItem.deleteOne({ _id: req.params.itemId, tripId: req.params.tripId });
  if (!result.deletedCount) throw notFound('That item is not in this trip.');
  res.status(204).end();
}));

router.delete('/:tripId/items', wrap(async (req, res) => {
  const result = await ItineraryItem.deleteMany({ tripId: req.params.tripId });
  res.json({ deleted: result.deletedCount });
}));

export default router;
