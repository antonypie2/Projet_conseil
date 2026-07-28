import { FINNHUB_API_KEY, FINNHUB_BASE_URL } from '../config'

export class FinnhubError extends Error {
  constructor(message, kind) {
    super(message)
    this.kind = kind // 'auth' | 'rate_limit' | 'network' | 'no_data'
  }
}

// Récupère la cotation temps réel (prix + variation) d'un symbole via Finnhub.
export async function fetchQuote(symbol) {
  if (!FINNHUB_API_KEY || FINNHUB_API_KEY.startsWith('VOTRE_CLE')) {
    throw new FinnhubError(
      "Clé API Finnhub manquante. Renseignez-la dans src/config.js ou dans .env (VITE_FINNHUB_API_KEY).",
      'auth',
    )
  }

  let response
  try {
    response = await fetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`,
    )
  } catch {
    throw new FinnhubError('Impossible de contacter Finnhub (réseau indisponible).', 'network')
  }

  if (response.status === 401 || response.status === 403) {
    throw new FinnhubError('Clé API Finnhub invalide ou refusée.', 'auth')
  }
  if (response.status === 429) {
    throw new FinnhubError(
      "Limite de requêtes Finnhub atteinte (niveau gratuit). Réessayez dans quelques instants.",
      'rate_limit',
    )
  }
  if (!response.ok) {
    throw new FinnhubError(`Erreur Finnhub (HTTP ${response.status}).`, 'network')
  }

  const data = await response.json()

  const hasData = data && (data.c !== 0 || data.pc !== 0) && data.t !== 0
  if (!hasData) {
    throw new FinnhubError(`Aucune donnée de marché disponible pour ${symbol}.`, 'no_data')
  }

  return {
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    timestamp: data.t,
  }
}
