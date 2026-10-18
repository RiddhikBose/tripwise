import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import CityHero from '../components/CityHero.jsx';
import StarterPicks from '../components/StarterPicks.jsx';
import { findGuide } from '../data/guides.js';
import PlaceCard, { CardSkeleton } from '../components/PlaceCard.jsx';
import Notice from '../components/Notice.jsx';
import { useToast } from '../components/Toast.jsx';

const DEFAULT_CITY = { name: 'Chennai', region: 'Tamil Nadu, India', lat: 13.0878, lon: 80.2785 };
const LAST_CITY_KEY = 'tripwise.lastCity';
const PAGE_SIZE = 20;

function lastCity() {
  try {
    return JSON.parse(localStorage.getItem(LAST_CITY_KEY)) || DEFAULT_CITY;
  } catch {
    return DEFAULT_CITY;
  }
}

export default function Explore() {
  const [params, setParams] = useSearchParams();

  // the URL is the source of truth for filters, so back/forward and
  // sharing a link both work
  const city = params.get('city');
  const region = params.get('region') || '';
  const lat = params.get('lat');
  const lon = params.get('lon');
  const q = params.get('q') || '';
  const cats = params.get('cat') ? params.get('cat').split(',') : [];
  const sort = params.get('sort') || 'top';
  const radius = params.get('r') || '10';
  const photos = params.get('photos') === '1';
  const guide = findGuide(city, lat, lon);

  const [searchText, setSearchText] = useState(q);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const toast = useToast();

  const setParam = useCallback(
    (changes, { replace = false } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(changes)) {
            if (v === null || v === '' || v === undefined) next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace }
      );
    },
    [setParams]
  );

  // no city in the URL yet: use the last one or fall back to Chennai
  useEffect(() => {
    if (!lat || !lon) {
      const c = lastCity();
      setParam({ city: c.name, region: c.region, lat: c.lat, lon: c.lon }, { replace: true });
    }
  }, [lat, lon, setParam]);

  // debounce the filter box into the URL
  useEffect(() => {
    if (searchText === q) return;
    const t = setTimeout(() => setParam({ q: searchText.trim() }, { replace: true }), 350);
    return () => clearTimeout(t);
  }, [searchText, q, setParam]);

  const catKey = cats.join(',');

  useEffect(() => {
    if (!lat || !lon) return;
    const ctrl = new AbortController();
    setStatus('loading');
    setError(null);

    api
      .getDestinations({ lat, lon, q, category: catKey, sort, radius, photos: photos ? 1 : '', limit: PAGE_SIZE }, ctrl.signal)
      .then((res) => {
        setData(res);
        setStatus('ready');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err);
        setStatus('error');
      });

    return () => ctrl.abort();
  }, [lat, lon, q, catKey, sort, radius, photos, retryKey]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await api.getDestinations({
        lat, lon, q, category: catKey, sort, radius, photos: photos ? 1 : '', limit: PAGE_SIZE, page: data.page + 1,
      });
      setData((prev) => ({ ...res, results: [...prev.results, ...res.results] }));
    } catch (err) {
      toast(`Couldn't load more: ${err.message}`, 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const pickCity = (c) => {
    const regionText = [c.region, c.country].filter(Boolean).join(', ');
    try {
      localStorage.setItem(LAST_CITY_KEY, JSON.stringify({ name: c.name, region: regionText, lat: c.lat, lon: c.lon }));
    } catch {
      /* not important */
    }
    setSearchText('');
    setParams({ city: c.name, region: regionText, lat: c.lat, lon: c.lon });
  };

  const toggleCat = (key) => {
    const next = cats.includes(key) ? cats.filter((c) => c !== key) : [...cats, key];
    setParam({ cat: next.join(',') });
  };

  const resetFilters = () => {
    setSearchText('');
    setParams({ city: city || '', region, lat, lon });
  };

  const hasFilters = q || cats.length || photos || sort !== 'top' || radius !== '10';

  return (
    <div className="explore">
      <CityHero
        guide={guide}
        city={city}
        region={region}
        lat={lat}
        lon={lon}
        total={status === 'ready' ? data.total : null}
        radius={radius}
        onPickCity={pickCity}
      />

      <StarterPicks guide={guide} city={city} lat={lat} lon={lon} />

      <section className="browse" aria-labelledby="browse-title">
        <header className="section-head section-head--row">
          <h2 id="browse-title" className="section-title">
            Everything within {radius} km
          </h2>
          {status === 'ready' && data && (
            <p className="section-dek" aria-live="polite">
              {data.count === data.total ? `${data.count} places` : `${data.count} of ${data.total} places match`}
              {hasFilters && (
                <>
                  {' · '}
                  <button className="text-link" onClick={resetFilters}>
                    Clear filters
                  </button>
                </>
              )}
            </p>
          )}
        </header>

        <div className="filters" role="search">
          <div className="filters__row">
            <label className="search-field">
              <span className="visually-hidden">Search places in {city}</span>
              <input
                type="search"
                placeholder={data?.total ? `Search ${data.total} places, e.g. “temple” or “museum”` : 'Search places'}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </label>

            <div className="filters__controls">
              <fieldset className="radius">
                <legend className="visually-hidden">Distance from the centre</legend>
                <span className="control-label" aria-hidden="true">Within</span>
                {['2', '5', '10'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={radius === r ? 'is-on' : ''}
                    aria-pressed={radius === r}
                    aria-label={`Within ${r} kilometres`}
                    onClick={() => setParam({ r: r === '10' ? null : r })}
                  >
                    {r} km
                  </button>
                ))}
              </fieldset>

              <label className="sort">
                <span className="control-label">Sort</span>
                <select value={sort} onChange={(e) => setParam({ sort: e.target.value === 'top' ? null : e.target.value })}>
                  <option value="top">Top picks</option>
                  <option value="distance">Nearest first</option>
                  <option value="name">Name, A–Z</option>
                  <option value="-name">Name, Z–A</option>
                </select>
              </label>
            </div>
          </div>

          <div className="filters__row filters__row--cats">
            <div className="cats" role="group" aria-label="Filter by category">
              <button
                type="button"
                className={`cat ${cats.length ? '' : 'is-on'}`}
                aria-pressed={!cats.length}
                onClick={() => setParam({ cat: null })}
              >
                All
              </button>
              {(data?.categories || []).map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`cat ${cats.includes(c.key) ? 'is-on' : ''}`}
                  aria-pressed={cats.includes(c.key)}
                  onClick={() => toggleCat(c.key)}
                  disabled={!c.count && !cats.includes(c.key)}
                >
                  {c.label} <span className="cat__count">{c.count}</span>
                </button>
              ))}
            </div>

            <label className="toggle">
              <input type="checkbox" checked={photos} onChange={(e) => setParam({ photos: e.target.checked ? '1' : null })} />
              Photos only
            </label>
          </div>
        </div>

        {status === 'loading' && (
          <div className="grid" aria-busy="true" aria-label="Loading places">
            {Array.from({ length: 8 }, (_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {status === 'error' && (
          <Notice
            tone="error"
            title={error?.status === 400 ? "Those filters don't look right" : "Couldn't load places"}
            action={
              error?.status === 400 ? (
                <button className="btn" onClick={resetFilters}>Reset filters</button>
              ) : (
                <button className="btn" onClick={() => setRetryKey((k) => k + 1)}>Try again</button>
              )
            }
          >
            {error?.message}
          </Notice>
        )}

        {status === 'ready' && data.total === 0 && (
          <Notice title={`Nothing on the map around ${city} yet`}>
            Wikipedia doesn't have any geotagged places within {radius} km of this spot. Try a bigger radius or a
            larger city nearby.
          </Notice>
        )}

        {status === 'ready' && data.total > 0 && data.count === 0 && (
          <Notice title="No places match those filters" action={<button className="btn" onClick={resetFilters}>Clear filters</button>}>
            {q ? <>Nothing matched “{q}”. </> : null}
            Try removing a category or widening the radius.
          </Notice>
        )}

        {status === 'ready' && data.count > 0 && (
          <>
            <div className="grid">
              {data.results.map((p) => (
                <PlaceCard key={p.id} place={p} city={city} />
              ))}
            </div>
            {data.hasMore && (
              <div className="load-more">
                <button className="btn btn--quiet" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : `Show more places (${data.count - data.results.length} left)`}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
