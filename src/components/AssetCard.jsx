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

export default function AssetCard({ assetState, onRetryQuote, onRetryNews }) {
  const { asset, quote, quoteStatus, quoteError, news, newsStatus, newsError } = assetState

  const settled = quoteStatus !== 'loading' && newsStatus !== 'loading' && newsStatus !== 'queued'

  const analysis = useMemo(() => {
    if (!settled) return null
    return analyzeAsset({
      asset,
      quote: quoteStatus === 'ok' ? quote : null,
      articlesResult: newsStatus === 'ok' ? news : null,
      quoteError: quoteStatus === 'error' ? quoteError : null,
      newsError: newsStatus === 'error' || newsStatus === 'skipped' ? newsError : null,
    })
  }, [settled, asset, quote, quoteStatus, quoteError, news, newsStatus, newsError])

  return (
    <div className="card asset-card">
      <div className="asset-card-header">
        <div>
          <span className="asset-card-symbol">{asset.symbol}</span>
          <span className="asset-card-name">{asset.name}</span>
        </div>
        <span className="asset-type-badge">{asset.type}</span>
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

      {!settled && <p className="loading-text">Analyse des actualités en cours…</p>}

      {settled && analysis && (
        <>
          <p className="asset-summary">{analysis.summaryParagraph}</p>

          <div className="analysis-footer">
            <span className={`badge rec-badge rec-${slug(analysis.recommendation)}`}>
              {analysis.recommendation}
            </span>
            <span className={`badge conf-badge conf-${slug(analysis.confidence)}`}>
              Confiance : {analysis.confidence}
            </span>
          </div>

          <details className="confidence-details">
            <summary>Pourquoi ce niveau de confiance ?</summary>
            <ul>
              {analysis.confidenceReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <p className="recommendation-reason">
              <strong>Logique de la recommandation :</strong> {analysis.recommendationReason}
            </p>
          </details>

          {(newsStatus === 'error' || newsStatus === 'skipped') && (
            <div className="error-box">
              <p>⚠️ {newsError}</p>
              <button type="button" className="btn btn-small" onClick={onRetryNews}>
                Réessayer les actualités
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
