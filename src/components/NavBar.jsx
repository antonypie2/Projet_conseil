const TABS = [
  { type: 'dashboard', label: 'Portefeuille' },
  { type: 'discover', label: 'Découvrir' },
  { type: 'profile', label: 'Profil' },
]

export default function NavBar({ firstName, current, onNavigate, onRestart }) {
  return (
    <div className="nav-bar">
      <div className="nav-bar-greeting">
        <p className="eyebrow">Bonjour {firstName}</p>
      </div>
      <div className="nav-bar-tabs">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab.type}
            className={`nav-tab ${current === tab.type ? 'nav-tab-active' : ''}`}
            onClick={() => onNavigate(tab.type)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-secondary" onClick={onRestart}>
        Recommencer
      </button>
    </div>
  )
}
