import { Link } from 'react-router-dom';
import { useTrip } from '../lib/TripContext.jsx';

// "Add to trip" / "In your trip", shared by the cards on Explore.
export default function TripButton({ place, city, className = '' }) {
  const { findByPlace, isAdding, add } = useTrip();
  const saved = findByPlace(place.id);
  const adding = isAdding(place.id);

  if (saved) {
    return (
      <Link to="/trip" className={`trip-btn is-saved ${className}`}>
        In your trip
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`trip-btn ${className}`}
      onClick={() => add(place, city)}
      disabled={adding}
      aria-label={`Add ${place.name} to trip`}
    >
      {adding ? 'Adding…' : 'Add to trip'}
    </button>
  );
}
