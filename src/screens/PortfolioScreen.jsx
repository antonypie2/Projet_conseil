import { useMemo, useState } from 'react'
import { ASSET_UNIVERSE } from '../data/assets'

export default function PortfolioScreen({ firstName, initialSelection, onNext, onBack }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(() => new Set(initialSelection))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ASSET_UNIVERSE
    return ASSET_UNIVERSE.filter(
      (a) =>
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.sector.toLowerCase().includes(q),
    )
  }, [query])

  function toggle(symbol) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }

  return (
    <div className="screen">
      <div className="card wide-card">
        <p className="eyebrow">Étape 2 sur 3</p>
        <h1>{firstName}, quels actifs détenez-vous ?</h1>
        <p className="subtitle">
          Sélectionnez les actions et ETF de votre portefeuille. Vous pourrez toujours en ajouter plus tard.
        </p>

        <input
          type="search"
          className="search-input"
          placeholder="Rechercher un titre, un secteur… (ex : Apple, Technologie, ETF)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="asset-grid">
          {filtered.map((asset) => {
            const isSelected = selected.has(asset.symbol)
            return (
              <button
                type="button"
                key={asset.symbol}
                className={`asset-tile ${isSelected ? 'asset-tile-selected' : ''}`}
                onClick={() => toggle(asset.symbol)}
                aria-pressed={isSelected}
              >
                <div className="asset-tile-top">
                  <span className="asset-symbol">{asset.symbol}</span>
                  <span className="asset-type-badge">{asset.type}</span>
                </div>
                <div className="asset-name">{asset.name}</div>
                <div className="asset-meta">
                  {asset.sector} · {asset.region}
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && <p className="empty-state">Aucun résultat pour « {query} ».</p>}
        </div>

        <div className="selection-summary">
          {selected.size === 0
            ? 'Aucun actif sélectionné pour le moment.'
            : `${selected.size} actif(s) sélectionné(s).`}
        </div>

        <div className="button-row">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Retour
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={selected.size === 0}
            onClick={() => onNext(Array.from(selected))}
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  )
}
