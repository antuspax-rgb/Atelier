const NAV = [
  { id: 'dashboard', label: 'Home' },
  { id: 'exercises', label: 'Esercizi' },
  { id: 'session', label: 'Sessione' },
  { id: 'mentor', label: 'Mentor' },
  { id: 'progress', label: 'Progress' }
];

export default function MobileNav({ active, onNavigate }) {
  return (
    <nav className="mobile-nav">
      {NAV.map((item) => (
        <button
          key={item.id}
          className={`mobile-nav-item ${active === item.id ? 'is-active' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
