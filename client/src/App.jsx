import { Link, NavLink, Route, Routes } from 'react-router-dom';
import Explore from './pages/Explore.jsx';
import Place from './pages/Place.jsx';
import MyTrip from './pages/MyTrip.jsx';
import Notice from './components/Notice.jsx';
import { useTrip } from './lib/TripContext.jsx';

function Header() {
  const { items } = useTrip();
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link to="/" className="wordmark">
          trip<em>wise</em>
        </Link>
        <nav className="nav">
          <NavLink to="/" end>
            Explore
          </NavLink>
          <NavLink to="/trip">
            My trip
            {items.length > 0 && <span className="nav__badge">{items.length}</span>}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function NotFound() {
  return (
    <Notice title="This page doesn't exist" action={<Link className="btn" to="/">Go to Explore</Link>}>
      The link might be old or mistyped.
    </Notice>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Explore />} />
          <Route path="/place/:id" element={<Place />} />
          <Route path="/trip" element={<MyTrip />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer container">
        Places &amp; descriptions from{' '}
        <a href="https://www.wikipedia.org" target="_blank" rel="noreferrer">Wikipedia</a> (CC BY-SA) · weather &amp; city
        search by <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a> · maps ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors
      </footer>
    </>
  );
}
