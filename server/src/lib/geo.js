const R = 6371; // km

const rad = (deg) => (deg * Math.PI) / 180;

export function distanceKm(lat1, lon1, lat2, lon2) {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// point `km` away from (lat, lon) in the direction `bearing` (degrees)
export function offsetPoint(lat, lon, km, bearing) {
  const d = km / R;
  const b = rad(bearing);
  const lat1 = rad(lat);
  const lon1 = rad(lon);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lon2 = lon1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lon: (lon2 * 180) / Math.PI };
}

export function parseCoord(value, kind) {
  const n = Number(value);
  const limit = kind === 'lat' ? 90 : 180;
  if (value === undefined || value === '' || Number.isNaN(n) || Math.abs(n) > limit) return null;
  return n;
}
