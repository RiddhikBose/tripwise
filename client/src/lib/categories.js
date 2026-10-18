// keep in sync with server/src/lib/categorize.js
export const CATEGORY_LABELS = {
  heritage: 'Heritage',
  museum: 'Museums & culture',
  worship: 'Places of worship',
  nature: 'Parks & nature',
  landmark: 'Landmarks',
  neighbourhood: 'Neighbourhoods',
  other: 'Other',
};

export const categoryLabel = (key) => CATEGORY_LABELS[key] || 'Other';

export const formatKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

// "Armenian Church, Chennai" reads oddly when you're already looking at Chennai
export const shortName = (name, city) =>
  city && name.endsWith(`, ${city}`) ? name.slice(0, -(city.length + 2)) : name;
