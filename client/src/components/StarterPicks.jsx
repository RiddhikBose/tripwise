import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { categoryLabel, formatKm, shortName } from '../lib/categories.js';
import PlaceImage from './PlaceImage.jsx';
import TripButton from './TripButton.jsx';

// The first card is the lead story, the second sits beside it, the rest
// are smaller. Same information in each, just at different weights.
const SIZES = ['feature', 'second', 'compact', 'compact', 'compact', 'compact'];

function Pick({ pick, size, city }) {
  const { place, note, area, image } = pick;
  const meta = [categoryLabel(place.category), area, place.distanceKm !== undefined && formatKm(place.distanceKm)];

  return (
    <article className={`pick pick--${size}`}>
      <figure className="pick__figure">
        <Link to={`/place/${place.id}`} state={{ city }} tabIndex={-1} aria-hidden="true">
          {image ? (
            <img
              className="pick__img"
              src={image.src}
              alt={image.alt}
              loading="lazy"
              style={image.position ? { objectPosition: image.position } : undefined}
            />
          ) : (
            <PlaceImage src={place.image} name={place.name} category={place.category} className="pick__img" />
          )}
        </Link>
        {image?.credit && (
          <figcaption className="credit">
            Photo:{' '}
            <a href={image.href} target="_blank" rel="noreferrer">
              {image.credit}
            </a>
          </figcaption>
        )}
      </figure>

      <div className="pick__body">
        <p className="kicker">{meta.filter(Boolean).join(' · ')}</p>
        <h3 className="pick__title">
          <Link to={`/place/${place.id}`} state={{ city }}>
            {shortName(place.name, city)}
          </Link>
        </h3>
        {note && <p className="pick__note">{note}</p>}
        <div className="pick__actions">
          <TripButton place={place} city={city} />
          <Link to={`/place/${place.id}`} state={{ city }} className="text-link">
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function StarterPicks({ guide, city, lat, lon }) {
  const [picks, setPicks] = useState(null);
  const [status, setStatus] = useState('loading');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!lat || !lon) return;
    const ctrl = new AbortController();
    setStatus('loading');

    const load = guide
      ? api.getPlaces(guide.picks.map((p) => p.id), { lat, lon }, ctrl.signal).then((res) => {
          const byId = new Map(res.results.map((p) => [p.id, p]));
          return guide.picks.filter((p) => byId.has(p.id)).map((p) => ({ ...p, place: byId.get(p.id) }));
        })
      : api
          .getDestinations({ lat, lon, sort: 'top', photos: 1, limit: 6 }, ctrl.signal)
          .then((res) => res.results.map((place) => ({ place, note: place.summary || place.description })));

    load
      .then((list) => {
        setPicks(list);
        setStatus('ready');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setStatus('error');
      });

    return () => ctrl.abort();
  }, [guide, lat, lon, retryKey]);

  if (status === 'ready' && !picks.length) return null;

  return (
    <section className="picks" aria-labelledby="picks-title">
      <header className="section-head">
        <h2 id="picks-title" className="section-title">Places to start with</h2>
        <p className="section-dek">
          {guide?.picksIntro ||
            `The best-documented sights near the centre of ${city}, with their Wikipedia summaries.`}
        </p>
      </header>

      {status === 'loading' && (
        <div className="picks__grid" aria-busy="true" aria-label="Loading suggestions">
          {SIZES.map((size, i) => (
            <div key={i} className={`pick pick--${size}`} aria-hidden="true">
              <div className="pick__img shimmer" />
              <div className="line shimmer" style={{ width: '30%', marginTop: 14 }} />
              <div className="line line--lg shimmer" style={{ width: '70%' }} />
              <div className="line shimmer" style={{ width: '90%' }} />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <p className="inline-error" role="alert">
          Couldn’t load these suggestions.{' '}
          <button className="text-link" onClick={() => setRetryKey((k) => k + 1)}>
            Try again
          </button>
        </p>
      )}

      {status === 'ready' && (
        <div className="picks__grid">
          {picks.map((pick, i) => (
            <Pick key={pick.place.id} pick={pick} size={SIZES[i] || 'compact'} city={city} />
          ))}
        </div>
      )}
    </section>
  );
}
