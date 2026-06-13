const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 12 12 4l9 8M5 10v10h14V10' },
  { id: 'exercises', label: 'Esercizi', icon: 'M4 5h16M4 12h16M4 19h10' },
  { id: 'session', label: 'Sessione', icon: 'M5 4h11l3 3v13H5z M14 4v4h4' },
  { id: 'mentor', label: 'Mentor', icon: 'M4 5h16v11H8l-4 4z' },
  { id: 'progress', label: 'Progress', icon: 'M4 19V5m0 14h16M8 15V9m4 6V5m4 10v-4' }
];

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function Sidebar({ active, onNavigate, focusMode, secondsToClock }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">A</div>
        <div>
          <div className="brand-name">Atelier</div>
          <div className="brand-tag">Concept art mentor</div>
        </div>
      </div>

      <nav className="nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? 'is-active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <Icon d={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className={`focus-pill ${focusMode.running ? 'is-running' : ''}`}>
        <div className="focus-pill-row">
          <span className="focus-dot" />
          <span className="focus-label">Focus</span>
          <span className="focus-clock">{secondsToClock(focusMode.secondsLeft)}</span>
        </div>
      </div>
    </aside>
  );
}
