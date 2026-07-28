const ACTION_LABELS = {
  STRONG_BUY: 'Achat fort',
  STRONG_SELL: 'Vente forte',
}

function isAlertWorthy(rec) {
  if (!rec) return false
  return rec.crisis_flag || rec.urgency === 'URGENT' || rec.action === 'STRONG_BUY' || rec.action === 'STRONG_SELL'
}

export default function AlertsPanel({ assetStates, onOpenDetail }) {
  const alerts = assetStates.filter((s) => s.aiStatus === 'ok' && isAlertWorthy(s.aiRecommendation))

  if (alerts.length === 0) {
    return (
      <div className="card alerts-panel alerts-panel-calm">
        <div className="alerts-panel-title">Alertes urgentes</div>
        <p>Aucun signal urgent ou de crise pour le moment.</p>
      </div>
    )
  }

  return (
    <div className="card alerts-panel alerts-panel-active">
      <div className="alerts-panel-title">⚠️ Alertes urgentes ({alerts.length})</div>
      <ul className="alerts-list">
        {alerts.map((s) => (
          <li key={s.symbol}>
            <button type="button" className="alert-item" onClick={() => onOpenDetail(s.symbol)}>
              <span className="alert-symbol">{s.symbol}</span>
              <span className="alert-action">
                {s.aiRecommendation.crisis_flag
                  ? 'Signal de crise'
                  : ACTION_LABELS[s.aiRecommendation.action] || s.aiRecommendation.urgency}
              </span>
              <span className="alert-reason">
                {s.aiRecommendation.crisis_reason || s.aiRecommendation.rationale}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
