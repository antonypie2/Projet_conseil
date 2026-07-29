import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchOverview, fetchDailyHistory } from '../api/backend'
import AssetCard from '../components/AssetCard'

function Kv({ label, value }) {
  return (
    <div className="kv-row">
      <span className="kv-label">{label}</span>
      <span className="kv-value">{value && value !== 'None' ? value : '—'}</span>
    </div>
  )
}

export default function StockDetailScreen({
  assetState,
  onBack,
  onRetryQuote,
  onRetryNews,
  onRetryAi,
  onAddToPortfolio,
  isOwned,
}) {
  const [overview, setOverview] = useState(null)
  const [overviewStatus, setOverviewStatus] = useState('loading')
  const [overviewError, setOverviewError] = useState(null)
  const [history, setHistory] = useState(null)
  const [historyStatus, setHistoryStatus] = useState('loading')
  const [historyError, setHistoryError] = useState(null)

  const symbol = assetState.symbol

  function loadOverview() {
    setOverviewStatus('loading')
    setOverviewError(null)
    fetchOverview(symbol)
      .then((data) => {
        setOverview(data)
        setOverviewStatus('ok')
      })
      .catch((err) => {
        setOverviewStatus('error')
        setOverviewError(err.message)
      })
  }

  function loadHistory() {
    setHistoryStatus('loading')
    setHistoryError(null)
    fetchDailyHistory(symbol)
      .then((points) => {
        setHistory(points)
        setHistoryStatus('ok')
      })
      .catch((err) => {
        setHistoryStatus('error')
        setHistoryError(err.message)
      })
  }

  useEffect(() => {
    loadOverview()
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol])

  const articles = assetState.newsStatus === 'ok' ? assetState.news?.articles || [] : []

  return (
    <div className="stock-detail">
      <button type="button" className="btn btn-secondary back-btn" onClick={onBack}>
        ← Retour
      </button>

      <div className="detail-header">
        <div>
          <p className="eyebrow">
            {assetState.asset.sector} · {assetState.asset.region}
          </p>
          <h1>{overview?.name || assetState.asset.name}</h1>
          <p className="subtitle">{assetState.asset.symbol}</p>
        </div>
        {!isOwned && (
          <button type="button" className="btn btn-primary" onClick={() => onAddToPortfolio(symbol)}>
            + Ajouter au portefeuille
          </button>
        )}
      </div>

      <div className="card chart-card">
        <div className="chart-card-title">Prix sur ~60 séances (Alpha Vantage)</div>
        {historyStatus === 'loading' && <p className="loading-text">Chargement de l'historique…</p>}
        {historyStatus === 'error' && (
          <div className="error-box">
            <p>⚠️ {historyError}</p>
            <button type="button" className="btn btn-small" onClick={loadHistory}>
              Réessayer
            </button>
          </div>
        )}
        {historyStatus === 'ok' && history.length > 0 && (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={history}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={30} />
                <YAxis tick={{ fontSize: 10 }} width={54} />
                <Tooltip />
                <Line type="monotone" dataKey="close" stroke="var(--series-1)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {historyStatus === 'ok' && history.length === 0 && <p className="empty-state">Pas d'historique disponible.</p>}
      </div>

      <div className="card fundamentals-card">
        <div className="chart-card-title">Fondamentaux (Alpha Vantage)</div>
        {overviewStatus === 'loading' && <p className="loading-text">Chargement des fondamentaux…</p>}
        {overviewStatus === 'error' && (
          <div className="error-box">
            <p>⚠️ {overviewError}</p>
            <button type="button" className="btn btn-small" onClick={loadOverview}>
              Réessayer
            </button>
          </div>
        )}
        {overviewStatus === 'ok' && (
          <div className="kv-grid">
            <Kv label="Capitalisation" value={overview.marketCap} />
            <Kv label="P/E" value={overview.peRatio} />
            <Kv label="BPA (EPS)" value={overview.eps} />
            <Kv label="Bêta" value={overview.beta} />
            <Kv label="Rendement dividende" value={overview.dividendYield} />
            <Kv label="Plus haut 52 sem." value={overview.week52High} />
            <Kv label="Plus bas 52 sem." value={overview.week52Low} />
            <Kv label="Objectif analystes" value={overview.analystTarget} />
          </div>
        )}
      </div>

      <AssetCard
        assetState={assetState}
        onRetryQuote={() => onRetryQuote(symbol)}
        onRetryNews={() => onRetryNews(symbol)}
        onRetryAi={() => onRetryAi(symbol)}
      />

      <div className="card news-list-card">
        <div className="chart-card-title">Toutes les actualités récentes</div>
        {articles.length === 0 && <p className="empty-state">Aucune actualité récente.</p>}
        <ul className="full-news-list">
          {articles.map((a) => (
            <li key={a.url}>
              <a href={a.url} target="_blank" rel="noreferrer">
                {a.title}
              </a>
              <div className="full-news-meta">
                {a.source} · {a.tickerSentimentLabel || a.overallSentimentLabel}
              </div>
              <p>{a.summary}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
