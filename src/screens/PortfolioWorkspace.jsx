import { useEffect, useRef, useState } from 'react'
import { getAssetBySymbol } from '../data/assets'
import {
  fetchQuote,
  fetchNewsSentiment,
  fetchAiRecommendation,
  addToPortfolio,
  removeFromPortfolio,
  updateProfile,
  initSession,
} from '../api/backend'
import { NEWS_REQUEST_DELAY_MS } from '../config'
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

export default function PortfolioWorkspace({ firstName, initialSymbols, initialGoals, needsInit, onRestart }) {
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

  // Le backend met déjà en cache les réponses Alpha Vantage (quota gratuit
  // partagé, 25/jour, 5/min), mais on échelonne quand même les demandes pour
  // ne pas rafaler plusieurs cache-miss simultanés au démarrage.
  function enqueueNews(symbol) {
    newsQueueRef.current = newsQueueRef.current.then(async () => {
      await loadNewsFor(symbol)
      await delay(NEWS_REQUEST_DELAY_MS)
    })
    return newsQueueRef.current
  }

  async function loadAi(symbol, { refresh = false } = {}) {
    updateAssetState(symbol, { aiStatus: 'loading', aiError: null })
    try {
      const rec = await fetchAiRecommendation(symbol, { refresh })
      updateAssetState(symbol, { aiStatus: 'ok', aiRecommendation: rec })
    } catch (err) {
      updateAssetState(symbol, { aiStatus: 'error', aiError: err.message })
    }
  }

  function startFetchingAsset(symbol) {
    if (hasFetchedRef.current.has(symbol)) return
    hasFetchedRef.current.add(symbol)
    loadQuote(symbol)
    enqueueNews(symbol)
  }

  // Persiste la sélection initiale de l'onboarding côté serveur (une seule
  // fois), puis charge le portefeuille — que la session vienne d'être créée
  // ou soit restaurée depuis le backend.
  useEffect(() => {
    if (needsInit) {
      initSession({
        firstName,
        symbols: initialSymbols,
        horizon: initialGoals.horizon,
        knowledge: initialGoals.knowledge,
        objective: initialGoals.objective,
      }).catch((err) => console.error('initSession failed:', err.message))
    }
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
        loadAi(s.symbol)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetStates])

  function addSymbol(symbol) {
    setAssetStates((prev) => (prev[symbol] ? prev : { ...prev, [symbol]: freshAssetState(symbol) }))
    startFetchingAsset(symbol)
    setSymbols((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]))
    addToPortfolio(symbol).catch((err) => console.error('addToPortfolio failed:', err.message))
  }

  function removeSymbol(symbol) {
    setSymbols((prev) => prev.filter((s) => s !== symbol))
    if (view.type === 'detail' && view.symbol === symbol) {
      setView({ type: 'dashboard' })
    }
    // L'entrée reste en cache dans assetStates (cours/actualités/IA déjà
    // récupérés) au cas où l'actif serait revisité depuis Découvrir, sans
    // nouvel appel API tant que rien n'a expiré.
    removeFromPortfolio(symbol).catch((err) => console.error('removeFromPortfolio failed:', err.message))
  }

  function saveProfile(nextProfile) {
    setProfile(nextProfile)
    updateProfile(nextProfile).catch((err) => console.error('updateProfile failed:', err.message))
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
          onRetryAi={(symbol) => loadAi(symbol, { refresh: true })}
          onRemove={removeSymbol}
          onOpenDetail={openDetail}
        />
      )}

      {view.type === 'discover' && (
        <DiscoverScreen ownedSymbols={symbols} profile={profile} onAdd={addSymbol} onOpenDetail={openDetail} />
      )}

      {view.type === 'profile' && <ProfileScreen profile={profile} onSave={saveProfile} />}

      {view.type === 'detail' && (
        <StockDetailScreen
          assetState={assetStates[view.symbol]}
          onBack={() => setView({ type: 'dashboard' })}
          onRetryQuote={loadQuote}
          onRetryNews={(symbol) => loadNewsFor(symbol)}
          onRetryAi={(symbol) => loadAi(symbol, { refresh: true })}
          onAddToPortfolio={addSymbol}
          isOwned={symbols.includes(view.symbol)}
        />
      )}
    </div>
  )
}
