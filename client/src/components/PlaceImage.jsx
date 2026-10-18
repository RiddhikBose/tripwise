import { useState } from 'react';

// Falls back to a lettered block when there's no photo (or it fails to load),
// which happens for maybe a third of Wikipedia places.
export default function PlaceImage({ src, name, category, className = '' }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div className={`place-img place-img--empty cat-${category} ${className}`} aria-hidden="true">
        <span>{name.replace(/^(the|st\.?)\s+/i, '').charAt(0)}</span>
      </div>
    );
  }

  return (
    <img
      className={`place-img ${className}`}
      src={src}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}
