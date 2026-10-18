import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useTrip } from '../lib/TripContext.jsx';
import { categoryLabel, formatKm } from '../lib/categories.js';
import PlaceImage from '../components/PlaceImage.jsx';
import Notice from '../components/Notice.jsx';

const dayName = (iso, i) =>
  i === 0 ? 'Today' : new Date(`${iso}T00:00`).toLocaleDateString('en', { weekday: 'short' });

export default function Place() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const city = location.state?.city;

  const [place, setPlace] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const { findByPlace, isAdding, add, remove } = useTrip();
  const saved = place && findByPlace(place.id);

  useEffect(() => {
    const ctrl = new AbortController();
    setStatus('loading');
    window.scrollTo(0, 0);

    api
      .getDestination(id, ctrl.signal)
      .then((data) => {
        setPlace(data);
        setStatus('ready');
        document.title = `${data.name} · TripWise`;
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err);
        setStatus('error');
      });

    return () => {
      ctrl.abort();
      document.title = 'TripWise';
    };
  }, [id, retryKey]);

  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/'));

  if (status === 'loading') {
    return (
      <div className="place" aria-busy="true">
        <button className="link-btn back" onClick={goBack}>← Back</button>
        <div className="place__hero shimmer" />
        <div className="line line--xl shimmer" style={{ width: '50%', marginTop: 24 }} />
        <div className="line shimmer" style={{ width: '30%' }} />
        <div className="line shimmer" style={{ width: '90%', marginTop: 24 }} />
        <div className="line shimmer" style={{ width: '85%' }} />
        <div className="line shimmer" style={{ width: '70%' }} />
      </div>
    );
  }

  if (status === 'error') {
    const missing = error.status === 404 || error.status === 400;
    return (
      <div className="place">
        <button className="link-btn back" onClick={goBack}>← Back</button>
        <Notice
          tone="error"
          title={missing ? "We couldn't find that place" : 'Something went wrong loading this place'}
          action={
            missing ? (
              <Link className="btn" to="/">Back to exploring</Link>
            ) : (
              <button className="btn" onClick={() => setRetryKey((k) => k + 1)}>Try again</button>
            )
          }
        >
          {error.message}
        </Notice>
      </div>
    );
  }

  const paragraphs = (place.summary || '').split('\n').filter(Boolean);
  const hasCoords = place.lat !== null;
  const d = 0.006;

  return (
    <div className="place">
      <button className="link-btn back" onClick={goBack}>← Back</button>

      <PlaceImage src={place.image} name={place.name} category={place.category} className="place__hero" />

      <div className="place__layout">
        <div className="place__main">
          <p className="kicker">
            {categoryLabel(place.category)}
          </p>
          <h1 className="place__title">{place.name}</h1>
          {place.description && <p className="place__desc">{place.description}</p>}

          <div className="place__actions">
            {saved ? (
              <>
                <Link to="/trip" className="btn btn--ghost">✓ In your trip</Link>
                <button className="link-btn link-btn--danger" onClick={() => remove(saved.id)}>
                  Remove
                </button>
              </>
            ) : (
              <button
                className="btn"
                onClick={() => add(place, city)}
                disabled={isAdding(place.id) || !hasCoords}
                title={hasCoords ? undefined : "This article has no location, so it can't go on a trip"}
              >
                {isAdding(place.id) ? 'Adding…' : '+ Add to my trip'}
              </button>
            )}
            <a className="link-btn" href={place.wikiUrl} target="_blank" rel="noreferrer">
              Read on Wikipedia ↗
            </a>
          </div>

          {paragraphs.length ? (
            <div className="place__summary">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : (
            <p className="muted">Wikipedia doesn't have a summary for this one.</p>
          )}
        </div>

        <aside className="place__side">
          {hasCoords && (
            <section className="panel">
              <h2 className="panel__title">Location</h2>
              <iframe
                className="map"
                title={`Map of ${place.name}`}
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${place.lon - d},${place.lat - d},${place.lon + d},${place.lat + d}&layer=mapnik&marker=${place.lat},${place.lon}`}
              />
              <p className="mono small">
                {place.lat.toFixed(5)}, {place.lon.toFixed(5)}
              </p>
              <a
                className="link-btn"
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`}
              >
                Get directions ↗
              </a>
            </section>
          )}

          <section className="panel">
            <h2 className="panel__title">Weather</h2>
            {place.weather ? (
              <>
                <p className="weather-now">
                  <span className="weather-now__temp">{place.weather.current.temp}°</span>
                  {place.weather.current.summary}
                </p>
                <ul className="forecast">
                  {place.weather.days.map((day, i) => (
                    <li key={day.date}>
                      <span>{dayName(day.date, i)}</span>
                      <span className="forecast__sum">{day.summary}</span>
                      <span className="mono">
                        {day.max}° / {day.min}°
                      </span>
                      {day.rainChance !== null && <span className="mono muted">{day.rainChance}% rain</span>}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="muted small">Weather isn't available right now.</p>
            )}
          </section>

          {place.nearby.length > 0 && (
            <section className="panel">
              <h2 className="panel__title">Close by</h2>
              <ul className="nearby">
                {place.nearby.map((n) => (
                  <li key={n.id}>
                    <Link to={`/place/${n.id}`} state={{ city }}>
                      {n.name}
                    </Link>
                    <span className="mono muted">{formatKm(n.distanceKm)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
