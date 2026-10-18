import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import CitySearch from './CitySearch.jsx';

// Top of Explore. Cities with a written guide get its photo and intro;
// anywhere else we use the city's own Wikipedia intro and lead photo.
export default function CityHero({ guide, city, region, lat, lon, total, radius, onPickCity }) {
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    setOverview(null);
    if (guide || !city || !lat || !lon) return;
    const ctrl = new AbortController();
    api
      .getCityOverview({ name: city, lat, lon }, ctrl.signal)
      .then(setOverview)
      .catch(() => {
        /* the hero still works as text only */
      });
    return () => ctrl.abort();
  }, [guide, city, lat, lon]);

  const photo = guide
    ? guide.hero
    : overview?.image && { src: overview.image, alt: `Lead photo from the Wikipedia article on ${city}`, caption: null, credit: 'Wikipedia', href: overview.wikiUrl };

  return (
    <section className={`hero ${photo ? '' : 'hero--text'}`} aria-labelledby="hero-title">
      {photo && (
        <figure className="hero__figure">
          <img className="hero__img" src={photo.src} alt={photo.alt} />
          <figcaption className="credit">
            {photo.caption && <>{photo.caption} </>}
            Photo:{' '}
            <a href={photo.href} target="_blank" rel="noreferrer">
              {photo.credit}
            </a>
          </figcaption>
        </figure>
      )}

      <div className="hero__body">
        <div className="hero__lead">
          <p className="eyebrow">{guide?.eyebrow || [city, region].filter(Boolean).join(' · ')}</p>
          <h1 id="hero-title" className={`hero__title ${guide ? '' : 'hero__title--city'}`}>
            {guide?.headline || city || '…'}
          </h1>
        </div>

        <div className="hero__aside">
          {guide
            ? guide.intro.map((p, i) => (
                <p key={i} className="hero__intro">
                  {p}
                </p>
              ))
            : overview?.intro && (
                <p className="hero__intro">
                  {overview.intro}{' '}
                  <a className="source" href={overview.wikiUrl} target="_blank" rel="noreferrer">
                    Wikipedia
                  </a>
                </p>
              )}

          <div className="hero__meta">
            {total !== null && (
              <p className="hero__count">
                {total} places mapped within {radius} km of the centre
              </p>
            )}
            <CitySearch onSelect={onPickCity} />
          </div>
        </div>
      </div>
    </section>
  );
}
