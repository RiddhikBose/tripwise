import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

export default function CitySearch({ onSelect }) {
  const [text, setText] = useState('');
  const [results, setResults] = useState([]);
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      setState('idle');
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setState('loading');
      try {
        const data = await api.searchCities(q, ctrl.signal);
        setResults(data.results);
        setActive(0);
        setState('done');
      } catch (err) {
        if (err.name === 'AbortError') return;
        setMessage(err.message);
        setState('error');
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text]);

  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (city) => {
    onSelect(city);
    setText('');
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && text.trim().length >= 2;

  return (
    <div className="city-search" ref={boxRef}>
      <label htmlFor="city-input" className="visually-hidden">
        Search for a city
      </label>
      <input
        id="city-input"
        type="search"
        placeholder="Change city — try Jaipur, Lisbon, Kyoto…"
        value={text}
        autoComplete="off"
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showList}
        aria-controls="city-options"
      />
      {showList && (
        <ul className="city-search__list" id="city-options" role="listbox">
          {state === 'loading' && <li className="city-search__hint">Searching…</li>}
          {state === 'error' && <li className="city-search__hint city-search__hint--error">{message}</li>}
          {state === 'done' && !results.length && (
            <li className="city-search__hint">No city called “{text.trim()}”. Check the spelling?</li>
          )}
          {state === 'done' &&
            results.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'is-active' : ''}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(c);
                }}
              >
                <strong>{c.name}</strong>
                <span>{[c.region, c.country].filter(Boolean).join(', ')}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
