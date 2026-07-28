import { useMemo } from 'react'
import { analyzeAsset } from '../api/analysis'

const ACCENT_MAP = { à: 'a', â: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e', î: 'i', ï: 'i', ô: 'o', û: 'u', ù: 'u', ç: 'c' }

function slug(label) {
  return label
    .toLowerCase()
    .split('')
    .map((ch) => ACCENT_MAP[ch] || ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
}

const ACTION_LABELS = {
  STRONG_BUY: 'Achat fort',
  BUY: 'Achat',
  HOLD: 'Conserver',
  SELL: 'Vente',
  STRONG_SELL: 'Vente forte',
}

const URGENCY_LABELS = {
  NONE: 'Aucune urgence',
  WATCH: 'À surveiller',
  URGENT: 'Urgent',
}

function confidenceBucket(pct) {
  if (pct >= 70) return 'Élevé'
  if (pct >= 40) return 'Moyen'
  return 'Faible'
}

export default function AssetCard({ assetState, onRetryQuote, onRetryNews, onRetryAi, onRemove, onOpenDetail }) {
  const {
    asset,
    quote,
    quoteStatus,
    quoteError,
    news,
    newsStatus,
    newsError,
    aiStatus,
    aiRecommendation,
    aiError,
  } = assetState

  const newsSettled = quoteStatus !== 'loading' && newsStatus !== 'loading' && newsStatus !== 'queued'

  const analysis = useMemo(() => {
    if (!newsSettled) return null
    return analyzeAsset({
      asset,
      quote: quoteStatus === 'ok' ? quote : null,
      articlesResult: newsStatus === 'ok' ? news : null,
      quoteError: quoteStatus === 'error' ? quoteError : null,
      newsError: newsStatus === 'error' || newsStatus === 'skipped' ? newsError : null,
    })
  }, [newsSettled, asset, quote, quoteStatus, quoteError, news, newsStatus, newsError])

  return (
    <div className="card asset-card" id={`asset-${asset.symbol}`}>
      <div className="asset-card-header">
        <div>
          <span className="asset-card-symbol">{asset.symbol}</span>
          <span className="asset-card-name">{asset.name}</span>
        </div>
        <div className="asset-card-actions">
          <span className="asset-type-badge">{asset.type}</span>
          {onOpenDetail && (
            <button type="button" className="btn btn-small" onClick={onOpenDetail}>
              Détail
            </button>
          )}
          {onRemove && (
            <button type="button" className="btn btn-small btn-ghost" onClick={onRemove}>
              Retirer
            </button>
          )}
        </div>
      </div>

      {quoteStatus === 'loading' && <p className="loading-text">Chargement du cours…</p>}

      {quoteStatus === 'error' && (
        <div className="error-box">
          <p>⚠️ {quoteError}</p>
          <button type="button" className="btn btn-small" onClick={onRetryQuote}>
            Réessayer le cours
          </button>
        </div>
      )}

      {quoteStatus === 'ok' && (
        <div className="quote-block">
          <span className="quote-price">{quote.price.toFixed(2)} $</span>
          <span className={`quote-change ${quote.changePercent >= 0 ? 'positive' : 'negative'}`}>
            {quote.changePercent >= 0 ? '▲' : '▼'} {Math.abs(quote.change).toFixed(2)} (
            {Math.abs(quote.changePercent).toFixed(2)}%)
          </span>
        </div>
      )}

      {aiStatus === 'ok' && aiRecommendation?.crisis_flag && (
        <div className="crisis-banner">
          <strong>⚠️ Signal de crise</strong>
          <p>{aiRecommendation.crisis_reason}</p>
        </div>
      )}

      {!newsSettled && <p className="loading-text">Analyse des actualités en cours…</p>}

      {newsSettled && analysis && (
        <>
          <p className="asset-summary">{analysis.summaryParagraph}</p>

          {(newsStatus === 'error' || newsStatus === 'skipped') && (
            <div className="error-box">
              <p>⚠️ {newsError}</p>
              <button type="button" className="btn btn-small" onClick={onRetryNews}>
                Réessayer les actualités
              </button>
            </div>
          )}

          <div className="ai-block">
            <div className="ai-block-header">Recommandation IA (Claude)</div>

            {aiStatus === 'loading' && <p className="loading-text">Génération de la recommandation…</p>}

            {aiStatus === 'error' && (
              <div className="error-box">
                <p>⚠️ {aiError}</p>
                <button type="button" className="btn btn-small" onClick={onRetryAi}>
                  Réessayer la recommandation
                </button>
              </div>
            )}

            {aiStatus === 'ok' && aiRecommendation && (
              <>
                <div className="analysis-footer">
                  <span className={`badge rec-badge action-${slug(ACTION_LABELS[aiRecommendation.action])}`}>
                    {ACTION_LABELS[aiRecommendation.action]}
                  </span>
                  <span
                    className={`badge conf-badge conf-${slug(confidenceBucket(aiRecommendation.confidence))}`}
                  >
                    Confiance : {aiRecommendation.confidence}%
                  </span>
                  {aiRecommendation.urgency !== 'NONE' && (
                    <span className={`badge urgency-badge urgency-${slug(aiRecommendation.urgency)}`}>
                      {URGENCY_LABELS[aiRecommendation.urgency]}
                    </span>
                  )}
                </div>

                <p className="ai-rationale">{aiRecommendation.rationale}</p>

                <div className="drivers-risks-grid">
                  <div>
                    <div className="drivers-risks-title drivers-title">Facteurs clés</div>
                    <ul className="drivers-risks-list">
                      {aiRecommendation.key_drivers.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="drivers-risks-title risks-title">Risques</div>
                    <ul className="drivers-risks-list">
                      {aiRecommendation.risks.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <details className="confidence-details">
                  <summary>Qualité des données utilisées pour cette analyse</summary>
                  <ul>
                    {analysis.confidenceReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </details>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
