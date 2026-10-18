import mongoose from 'mongoose';
import { CATEGORIES } from '../lib/categorize.js';

const itineraryItemSchema = new mongoose.Schema(
  {
    // There are no accounts. Each browser gets a random trip id and every
    // itinerary item belongs to one trip.
    tripId: { type: String, required: true, index: true },
    placeId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 300 },
    category: { type: String, enum: Object.keys(CATEGORIES), default: 'other' },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lon: { type: Number, required: true, min: -180, max: 180 },
    image: { type: String },
    city: { type: String, maxlength: 120 },
    day: { type: Number, min: 1, max: 30, default: null },
    note: { type: String, maxlength: 500, default: '' },
    visited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// same place can't be added to the same trip twice
itineraryItemSchema.index({ tripId: 1, placeId: 1 }, { unique: true });

itineraryItemSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

export const ItineraryItem = mongoose.model('ItineraryItem', itineraryItemSchema);
