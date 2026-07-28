import { useState } from 'react'

const RISKS = [
  { key: 'low', label: 'Faible', desc: 'Préserver le capital, volatilité limitée' },
  { key: 'medium', label: 'Modéré', desc: 'Croissance équilibrée, volatilité modérée' },
  { key: 'high', label: 'Élevé', desc: 'Croissance agressive, forte volatilité acceptée' },
]

const HORIZONS = [
  { key: 'court', label: 'Court terme (< 2 ans)' },
  { key: 'moyen', label: 'Moyen terme (2 à 5 ans)' },
  { key: 'long', label: 'Long terme (5 à 10 ans)' },
  { key: 'tres_long', label: 'Très long terme (10 ans et plus)' },
]

const SECTORS = [
  'Technologie',
  'Consommation discrétionnaire',
  'Communication',
  'Finance',
  'Santé',
  'Consommation de base',
  'Énergie',
  'ETF actions larges',
]

export default function ProfileScreen({ profile, onSave }) {
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)

  function toggleSector(sector) {
    setSaved(false)
    setDraft((p) => ({
      ...p,
      sectors: p.sectors.includes(sector) ? p.sectors.filter((s) => s !== sector) : [...p.sectors, sector],
    }))
  }

  function set(field, value) {
    setSaved(false)
    setDraft((p) => ({ ...p, [field]: value }))
  }

  function save() {
    onSave(draft)
    setSaved(true)
  }

  return (
    <div className="card wide-card profile-card">
      <p className="eyebrow">Votre profil</p>
      <h1>Calibrez votre profil investisseur</h1>
      <p className="subtitle">
        Ces réglages pilotent les correspondances de l'onglet Découvrir et donnent du contexte à
        l'analyse IA de chaque actif.
      </p>

      <section className="profile-section">
        <div className="profile-section-title">Tolérance au risque</div>
        <div className="options-row">
          {RISKS.map((r) => (
            <button
              type="button"
              key={r.key}
              className={`option-pill ${draft.risk_tolerance === r.key ? 'option-pill-selected' : ''}`}
              onClick={() => set('risk_tolerance', r.key)}
            >
              {r.label}
              <span className="option-pill-desc">{r.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-title">Horizon d'investissement</div>
        <div className="options-row">
          {HORIZONS.map((h) => (
            <button
              type="button"
              key={h.key}
              className={`option-pill ${draft.horizon === h.key ? 'option-pill-selected' : ''}`}
              onClick={() => set('horizon', h.key)}
            >
              {h.label}
            </button>
          ))}
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-title">Secteurs qui vous intéressent</div>
        <div className="options-row">
          {SECTORS.map((s) => (
            <button
              type="button"
              key={s}
              className={`option-pill ${draft.sectors.includes(s) ? 'option-pill-selected' : ''}`}
              onClick={() => toggleSector(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <div className="button-row profile-save-row">
        <button type="button" className="btn btn-primary profile-save-btn" onClick={save}>
          Enregistrer le profil
        </button>
        {saved && <span className="profile-saved-note">Profil enregistré.</span>}
      </div>
    </div>
  )
}
