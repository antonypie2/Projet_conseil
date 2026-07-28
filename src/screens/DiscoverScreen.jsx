import { useMemo } from 'react'
import { ASSET_UNIVERSE } from '../data/assets'

const RISK_LABELS = { low: 'Risque faible', medium: 'Risque modéré', high: 'Risque élevé' }
const HORIZON_LABELS = { court: 'Court terme', moyen: 'Moyen terme', long: 'Long terme', tres_long: 'Très long terme' }

function scoreAsset(asset, profile) {
  const risk = profile.risk_tolerance
  const sectors = profile.sectors || []
  let score = 0

  if (asset.risk === risk) {
    score += 3
  } else if (
    (risk === 'medium' && (asset.risk === 'low' || asset.risk === 'high')) ||
    (risk === 'low' && asset.risk === 'medium') ||
    (risk === 'high' && asset.risk === 'medium')
  ) {
    score += 1
  }

  if (asset.horizon.includes(profile.horizon)) score += 2

  if (sectors.length > 0 && sectors.includes(asset.sector)) {
    score += 4
  } else if (sectors.length === 0) {
    score += 1
  }

  return score
}

export default function DiscoverScreen({ ownedSymbols, profile, onAdd, onOpenDetail }) {
  const ranked = useMemo(() => {
    return ASSET_UNIVERSE.filter((a) => !ownedSymbols.includes(a.symbol))
      .map((a) => ({ ...a, matchScore: scoreAsset(a, profile) }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 8)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedSymbols, profile])

  return (
    <div className="card wide-card">
      <p className="eyebrow">Sélection profilée</p>
      <h1>Actifs adaptés à votre profil</h1>
      <p className="subtitle">
        Classés selon votre tolérance au risque, votre horizon et vos secteurs préférés (réglables dans l'onglet
        Profil). Aucun appel API n'est nécessaire pour ce classement — il ne consomme aucun quota.
      </p>

      <div className="discover-grid">
        {ranked.map((asset) => (
          <div className="card discover-card" key={asset.symbol}>
            <div className="discover-card-top">
              <div>
                <div className="asset-symbol">{asset.symbol}</div>
                <div className="asset-name">{asset.name}</div>
              </div>
              <span className="match-score-badge">Affinité {asset.matchScore}/9</span>
            </div>
            <div className="discover-tags">
              <span className="asset-type-badge">{asset.sector}</span>
              <span className="asset-type-badge">{RISK_LABELS[asset.risk]}</span>
              <span className="asset-type-badge">{asset.horizon.map((h) => HORIZON_LABELS[h]).join(' · ')}</span>
            </div>
            <div className="discover-actions">
              <button type="button" className="btn btn-secondary btn-small" onClick={() => onOpenDetail(asset.symbol)}>
                Voir
              </button>
              <button type="button" className="btn btn-primary btn-small" onClick={() => onAdd(asset.symbol)}>
                + Suivre
              </button>
            </div>
          </div>
        ))}
        {ranked.length === 0 && <p className="empty-state">Vous suivez déjà tous les actifs disponibles.</p>}
      </div>
    </div>
  )
}
