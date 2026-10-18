import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTrip } from '../lib/TripContext.jsx';
import { categoryLabel } from '../lib/categories.js';
import PlaceImage from '../components/PlaceImage.jsx';
import Notice from '../components/Notice.jsx';

function TripItem({ item, dayOptions }) {
  const { update, remove } = useTrip();
  const [note, setNote] = useState(item.note || '');

  const saveNote = () => {
    if (note.trim() !== (item.note || '')) update(item.id, { note: note.trim() });
  };

  return (
    <li className={`trip-item ${item.visited ? 'is-visited' : ''}`}>
      <Link to={`/place/${item.placeId}`} state={{ city: item.city }} className="trip-item__img">
        <PlaceImage src={item.image} name={item.name} category={item.category} />
      </Link>

      <div className="trip-item__body">
        <div className="trip-item__top">
          <div>
            <p className="kicker">
              {categoryLabel(item.category)}
              {item.city && <> · {item.city}</>}
            </p>
            <Link to={`/place/${item.placeId}`} state={{ city: item.city }} className="trip-item__name">
              {item.name}
            </Link>
          </div>
          <button className="icon-btn" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`} title="Remove">
            ×
          </button>
        </div>

        <textarea
          className="trip-item__note"
          rows={1}
          maxLength={500}
          placeholder="Add a note — timings, tickets, who wanted to go…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
        />

        <div className="trip-item__controls">
          <label className="check check--sm">
            <input type="checkbox" checked={item.visited} onChange={(e) => update(item.id, { visited: e.target.checked })} />
            Visited
          </label>
          <label className="day-select">
            <span className="visually-hidden">Day for {item.name}</span>
            <select
              value={item.day ?? ''}
              onChange={(e) => update(item.id, { day: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Unplanned</option>
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  Day {d}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </li>
  );
}

export default function MyTrip() {
  const { items, status, error, reload, clear } = useTrip();
  const [confirming, setConfirming] = useState(false);

  if (status === 'loading') {
    return (
      <div className="trip">
        <h1 className="page-title">My trip</h1>
        <p className="muted">Loading your saved places…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="trip">
        <h1 className="page-title">My trip</h1>
        <Notice tone="error" title="Couldn't load your trip" action={<button className="btn" onClick={reload}>Try again</button>}>
          {error}
        </Notice>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="trip">
        <h1 className="page-title">My trip</h1>
        <Notice title="Your trip is empty" action={<Link className="btn" to="/">Find places</Link>}>
          Places you add from Explore will show up here. You can then sort them into days and jot down notes.
        </Notice>
      </div>
    );
  }

  const maxDay = Math.max(0, ...items.map((i) => i.day || 0));
  const dayOptions = Array.from({ length: Math.min(maxDay + 1, 30) }, (_, i) => i + 1);

  const groups = new Map();
  for (const item of items) {
    const key = item.day || 0;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  // planned days first, unplanned at the bottom
  const order = [...groups.keys()].sort((a, b) => (a === 0 ? 1 : b === 0 ? -1 : a - b));

  const visited = items.filter((i) => i.visited).length;
  const cities = [...new Set(items.map((i) => i.city).filter(Boolean))];

  return (
    <div className="trip">
      <header className="trip__head">
        <div>
          <h1 className="page-title">My trip</h1>
          <p className="trip__stats">
            <span>{items.length} {items.length === 1 ? 'place' : 'places'}</span>
            <span>{maxDay} {maxDay === 1 ? 'day' : 'days'} planned</span>
            <span>{visited} visited</span>
            {cities.length > 0 && <span>{cities.join(', ')}</span>}
          </p>
        </div>
        <div className="trip__head-actions">
          {confirming ? (
            <>
              <span className="small">Remove all {items.length} places?</span>
              <button
                className="btn btn--danger btn--sm"
                onClick={() => {
                  clear();
                  setConfirming(false);
                }}
              >
                Yes, clear
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button className="link-btn link-btn--danger" onClick={() => setConfirming(true)}>
              Clear trip
            </button>
          )}
        </div>
      </header>

      {maxDay === 0 && (
        <p className="tip">Tip: pick a day for each place to turn this list into a day-by-day plan.</p>
      )}

      {order.map((day) => (
        <section key={day} className="day">
          <h2 className="day__title">
            {day === 0 ? 'Unplanned' : `Day ${day}`}
            <span className="day__count">{groups.get(day).length}</span>
          </h2>
          <ol className="trip-list">
            {groups.get(day).map((item) => (
              <TripItem key={item.id} item={item} dayOptions={dayOptions} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
