import { useEffect, useRef, useState } from 'react'
import { getAssetBySymbol } from '../data/assets'
import { fetchQuote } from '../api/finnhub'
import { fetchNewsSentiment } from '../api/alphaVantage'
import { fetchAiRecommendation } from '../api/claude'
import { ALPHA_VANTAGE_REQUEST_DELAY_MS } from '../config'
import NavBar from '../components/NavBar'
import DashboardView from './DashboardScreen'
import DiscoverScreen from './DiscoverScreen'
import ProfileScreen from './ProfileScreen'
import StockDetailScreen from './StockDetailScreen'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function deriveDefaultRiskTolerance(goals) {
  if (goals.knowledge === 'debutant') return 'low'
  if (goals.horizon === 'court') return 'high'
  return 'medium'
}

function freshAssetState(symbol) {
  return {
    symbol,
    asset: getAssetBySymbol(symbol),
    quote: null,
    quoteStatus: 'loading',
    quoteError: null,
    news: null,
    newsStatus: 'queued',
    newsError: null,
    aiStatus: 'queued',
    aiRecommendation: null,
    aiError: null,
  }
}

export default function PortfolioWorkspace({ firstName, initialSymbols, initialGoals, onRestart }) {
  const [symbols, setSymbols] = useState(initialSymbols)
  const [assetStates, setAssetStates] = useState(() => {
    const map = {}
    initialSymbols.forEach((s) => {
      map[s] = freshAssetState(s)
    })
    return map
  })
  const [profile, setProfile] = useState(() => ({
    ...initialGoals,
    risk_tolerance: initialGoals.risk_tolerance || deriveDefaultRiskTolerance(initialGoals),
    sectors: initialGoals.sectors || [],
  }))
  const [view, setView] = useState({ type: 'dashboard' })

  const hasFetchedRef = useRef(new Set())
  const aiTriggeredRef = useRef(new Set())
  const newsQueueRef = useRef(Promise.resolve())

  function updateAssetState(symbol, patch) {
    setAssetStates((prev) => {
      if (!prev[symbol]) return prev
      return { ...prev, [symbol]: { ...prev[symbol], ...patch } }
    })
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

  // Alpha Vantage a un quota gratuit très restreint : on enchaîne les demandes
  // sur une file unique (partagée entre le chargement initial et les ajouts
  // ultérieurs depuis Découvrir) pour respecter le rythme d'une requête toutes
  // les ~13s, quelle que soit la provenance de la demande.
  function enqueueNews(symbol) {
    newsQueueRef.current = newsQueueRef.current.then(async () => {
      const result = await loadNewsFor(symbol)
      if (result.rateLimited) {
        // Laisse le prochain élément de la file gérer sa propre erreur ;
        // pas de logique globale de "pause" nécessaire ici car chaque appel
        // gère déjà son propre message d'erreur.
      }
      await delay(ALPHA_VANTAGE_REQUEST_DELAY_MS)
    })
    return newsQueueRef.current
  }

  async function loadAi(assetState) {
    updateAssetState(assetState.symbol, { aiStatus: 'loading', aiError: null })
    try {
      const rec = await fetchAiRecommendation({
        asset: assetState.asset,
        quote: assetState.quoteStatus === 'ok' ? assetState.quote : null,
        articles: assetState.newsStatus === 'ok' ? assetState.news?.articles || [] : [],
        profile,
      })
      updateAssetState(assetState.symbol, { aiStatus: 'ok', aiRecommendation: rec })
    } catch (err) {
      updateAssetState(assetState.symbol, { aiStatus: 'error', aiError: err.message })
    }
  }

  function startFetchingAsset(symbol) {
    if (hasFetchedRef.current.has(symbol)) return
    hasFetchedRef.current.add(symbol)
    loadQuote(symbol)
    enqueueNews(symbol)
  }

  // Chargement initial du portefeuille sélectionné à l'onboarding.
  useEffect(() => {
    symbols.forEach(startFetchingAsset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Déclenche l'analyse IA dès que le cours ET les actualités d'un actif sont
  // arrivés à un état stable (succès ou erreur), une seule fois par actif.
  useEffect(() => {
    Object.values(assetStates).forEach((s) => {
      const settled = s.quoteStatus !== 'loading' && s.newsStatus !== 'loading' && s.newsStatus !== 'queued'
      if (settled && !aiTriggeredRef.current.has(s.symbol)) {
        aiTriggeredRef.current.add(s.symbol)
        loadAi(s)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetStates])

  function addSymbol(symbol) {
    setAssetStates((prev) => (prev[symbol] ? prev : { ...prev, [symbol]: freshAssetState(symbol) }))
    startFetchingAsset(symbol)
    setSymbols((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]))
  }

  function removeSymbol(symbol) {
    setSymbols((prev) => prev.filter((s) => s !== symbol))
    if (view.type === 'detail' && view.symbol === symbol) {
      setView({ type: 'dashboard' })
    }
    // L'entrée reste en cache dans assetStates (cours/actualités/IA déjà
    // récupérés) au cas où l'actif serait revisité depuis Découvrir, sans
    // nouvel appel API tant que rien n'a expiré.
  }

  // Ouvre la fiche détail d'un actif, qu'il soit déjà suivi ou non — amorce
  // son chargement (cours/actualités/IA) sans l'ajouter au portefeuille.
  function openDetail(symbol) {
    setAssetStates((prev) => (prev[symbol] ? prev : { ...prev, [symbol]: freshAssetState(symbol) }))
    startFetchingAsset(symbol)
    setView({ type: 'detail', symbol })
  }

  const orderedAssetStates = symbols.map((s) => assetStates[s]).filter(Boolean)

  return (
    <div className="screen">
      <NavBar
        firstName={firstName}
        current={view.type}
        onNavigate={(type) => setView({ type })}
        onRestart={onRestart}
      />

      {view.type === 'dashboard' && (
        <DashboardView
          assetStates={orderedAssetStates}
          onRetryQuote={loadQuote}
          onRetryNews={(symbol) => loadNewsFor(symbol)}
          onRetryAi={(symbol) => loadAi(assetStates[symbol])}
          onRemove={removeSymbol}
          onOpenDetail={openDetail}
        />
      )}

      {view.type === 'discover' && (
        <DiscoverScreen ownedSymbols={symbols} profile={profile} onAdd={addSymbol} onOpenDetail={openDetail} />
      )}

      {view.type === 'profile' && <ProfileScreen profile={profile} onSave={setProfile} />}

      {view.type === 'detail' && (
        <StockDetailScreen
          assetState={assetStates[view.symbol]}
          onBack={() => setView({ type: 'dashboard' })}
          onRetryQuote={loadQuote}
          onRetryNews={(symbol) => loadNewsFor(symbol)}
          onRetryAi={(symbol) => loadAi(assetStates[symbol])}
          onAddToPortfolio={addSymbol}
          isOwned={symbols.includes(view.symbol)}
        />
      )}
    </div>
  )
}
