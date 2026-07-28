import { useMemo } from 'react'

// Ordre fixe : l'identité d'un secteur/d'une région pointe toujours vers le
// même slot de couleur, indépendamment des actifs sélectionnés par l'utilisateur.
const SECTOR_ORDER = [
  'Technologie',
  'Consommation discrétionnaire',
  'Communication',
  'Finance',
  'Santé',
  'Consommation de base',
  'Énergie',
  'ETF actions larges',
]

const REGION_ORDER = ['États-Unis', 'Europe', 'Asie', 'Monde']

function colorVarFor(key, order) {
  const idx = order.indexOf(key)
  const slot = idx === -1 ? order.length : idx
  return `var(--series-${(slot % 8) + 1})`
}

function buildBreakdown(assets, field, order) {
  const counts = new Map()
  assets.forEach((a) => {
    counts.set(a[field], (counts.get(a[field]) || 0) + 1)
  })
  const total = assets.length
  return Array.from(counts.entries())
    .map(([key, count]) => ({
      key,
      count,
      pct: (count / total) * 100,
      color: colorVarFor(key, order),
    }))
    .sort((a, b) => b.count - a.count)
}

function BreakdownList({ title, rows }) {
  return (
    <div className="breakdown-block">
      <h3>{title}</h3>
      <div className="breakdown-list">
        {rows.map((row) => (
          <div className="breakdown-row" key={row.key}>
            <span className="breakdown-label">{row.key}</span>
            <span className="breakdown-track">
              <span
                className="breakdown-fill"
                style={{ width: `${row.pct}%`, background: row.color }}
              />
            </span>
            <span className="breakdown-value">{Math.round(row.pct)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PortfolioOverview({ assets }) {
  const sectorRows = useMemo(() => buildBreakdown(assets, 'sector', SECTOR_ORDER), [assets])
  const regionRows = useMemo(() => buildBreakdown(assets, 'region', REGION_ORDER), [assets])

  return (
    <div className="card overview-card">
      <h2>Vue d'ensemble du portefeuille</h2>
      <p className="subtitle">
        Répartition des {assets.length} actif(s) sélectionné(s), par secteur et par zone géographique.
      </p>
      <div className="breakdown-grid">
        <BreakdownList title="Répartition sectorielle" rows={sectorRows} />
        <BreakdownList title="Répartition géographique" rows={regionRows} />
      </div>
    </div>
  )
}
