import { Link } from 'react-router-dom';
import PlaceImage from './PlaceImage.jsx';
import TripButton from './TripButton.jsx';
import { categoryLabel, formatKm, shortName } from '../lib/categories.js';

export default function PlaceCard({ place, city }) {
  const text = place.summary || place.description;

  return (
    <article className="card">
      <Link to={`/place/${place.id}`} state={{ city }} className="card__link">
        <PlaceImage src={place.image} name={place.name} category={place.category} className="card__img" />
        <p className="kicker">
          {categoryLabel(place.category)}
          {place.distanceKm !== undefined && <span> · {formatKm(place.distanceKm)}</span>}
        </p>
        <h3 className="card__title">{shortName(place.name, city)}</h3>
        {text && <p className="card__text">{text}</p>}
      </Link>
      <TripButton place={place} city={city} className="card__action" />
    </article>
  );
}

export function CardSkeleton() {
  return (
    <div className="card card--skeleton" aria-hidden="true">
      <div className="card__img shimmer" />
      <div className="line shimmer" style={{ width: '35%', marginTop: 14 }} />
      <div className="line line--lg shimmer" style={{ width: '75%' }} />
      <div className="line shimmer" style={{ width: '95%' }} />
      <div className="line shimmer" style={{ width: '80%' }} />
    </div>
  );
}
