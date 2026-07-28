import { useEffect, useRef, useState } from 'react'
import { getAssetBySymbol } from '../data/assets'
import { fetchQuote } from '../api/finnhub'
import { fetchNewsSentiment } from '../api/alphaVantage'
import { ALPHA_VANTAGE_REQUEST_DELAY_MS } from '../config'
import PortfolioOverview from '../components/PortfolioOverview'
import AssetCard from '../components/AssetCard'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function initialState(symbols) {
  return symbols.map((symbol) => ({
    symbol,
    asset: getAssetBySymbol(symbol),
    quote: null,
    quoteStatus: 'loading',
    quoteError: null,
    news: null,
    newsStatus: 'queued',
    newsError: null,
  }))
}

export default function DashboardScreen({ firstName, selectedSymbols, onRestart }) {
  const [assetStates, setAssetStates] = useState(() => initialState(selectedSymbols))
  const hasFetchedRef = useRef(false)

  function updateAssetState(symbol, patch) {
    setAssetStates((prev) => prev.map((s) => (s.symbol === symbol ? { ...s, ...patch } : s)))
  }

  async function loadQuote(symbol) {
    updateAssetState(symbol, { quoteStatus: 'loading', quoteError: null })
    try {
      const quote = await fetchQuote(symbol)
      updateAssetState(symbol, { quote, quoteStatus: 'ok' })
    } catch (err) {
      updateAssetState(symbol, { quoteStatus: 'error', quoteError: err.message })
    }
  }

  async function loadNewsFor(symbol) {
    updateAssetState(symbol, { newsStatus: 'loading', newsError: null })
    try {
      const news = await fetchNewsSentiment(symbol)
      updateAssetState(symbol, { news, newsStatus: 'ok' })
      return { ok: true }
    } catch (err) {
      updateAssetState(symbol, { newsStatus: 'error', newsError: err.message })
      return { ok: false, rateLimited: err.kind === 'rate_limit' }
    }
  }

  async function loadNewsQueue(symbols) {
    let rateLimited = false
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i]
      if (rateLimited) {
        updateAssetState(symbol, {
          newsStatus: 'skipped',
          newsError:
            "Non récupéré : le quota gratuit Alpha Vantage a été atteint pendant le chargement des actifs précédents. Réessayez plus tard (quota quotidien) ou individuellement.",
        })
        continue
      }
      const result = await loadNewsFor(symbol)
      if (result.rateLimited) rateLimited = true
      if (i < symbols.length - 1 && !rateLimited) {
        await delay(ALPHA_VANTAGE_REQUEST_DELAY_MS)
      }
    }
  }

  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    selectedSymbols.forEach(loadQuote)
    loadNewsQueue(selectedSymbols)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const assets = assetStates.map((s) => s.asset)

  return (
    <div className="screen">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Votre portefeuille</p>
          <h1>Bonjour {firstName}</h1>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onRestart}>
          Recommencer
        </button>
      </div>

      <div className="info-banner">
        Les prix proviennent de Finnhub (niveau gratuit) et les actualités/sentiment
        d'Alpha Vantage (niveau gratuit, limité à 25 requêtes/jour et 5/minute). Si le quota est
        atteint, certaines cartes afficheront un message d'erreur clair avec un bouton pour
        réessayer plus tard, plutôt que des données inventées.
      </div>

      <PortfolioOverview assets={assets} />

      <div className="asset-list">
        {assetStates.map((assetState) => (
          <AssetCard
            key={assetState.symbol}
            assetState={assetState}
            onRetryQuote={() => loadQuote(assetState.symbol)}
            onRetryNews={() => loadNewsFor(assetState.symbol)}
          />
        ))}
      </div>
    </div>
  )
}
