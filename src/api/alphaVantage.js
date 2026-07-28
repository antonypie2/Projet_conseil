import { ALPHA_VANTAGE_API_KEY, ALPHA_VANTAGE_BASE_URL } from '../config'

export class AlphaVantageError extends Error {
  constructor(message, kind) {
    super(message)
    this.kind = kind // 'auth' | 'rate_limit' | 'network' | 'no_data'
  }
}

function parseArticle(item, symbol) {
  const tickerMatch = (item.ticker_sentiment || []).find((t) => t.ticker === symbol)
  return {
    title: item.title,
    summary: item.summary,
    source: item.source,
    url: item.url,
    timePublished: item.time_published, // format: YYYYMMDDTHHMMSS
    overallSentimentLabel: item.overall_sentiment_label,
    overallSentimentScore: Number(item.overall_sentiment_score),
    relevance: tickerMatch ? Number(tickerMatch.relevance_score) : 0,
    tickerSentimentScore: tickerMatch ? Number(tickerMatch.ticker_sentiment_score) : null,
    tickerSentimentLabel: tickerMatch ? tickerMatch.ticker_sentiment_label : null,
  }
}

// Récupère les actualités récentes et le sentiment de marché pour un ticker
// via la fonction NEWS_SENTIMENT d'Alpha Vantage.
export async function fetchNewsSentiment(symbol) {
  if (!ALPHA_VANTAGE_API_KEY || ALPHA_VANTAGE_API_KEY.startsWith('VOTRE_CLE')) {
    throw new AlphaVantageError(
      "Clé API Alpha Vantage manquante. Renseignez-la dans src/config.js ou dans .env (VITE_ALPHA_VANTAGE_API_KEY).",
      'auth',
    )
  }

  let response
  try {
    response = await fetch(
      `${ALPHA_VANTAGE_BASE_URL}?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(symbol)}&sort=LATEST&limit=50&apikey=${ALPHA_VANTAGE_API_KEY}`,
    )
  } catch {
    throw new AlphaVantageError('Impossible de contacter Alpha Vantage (réseau indisponible).', 'network')
  }

  if (response.status === 429) {
    throw new AlphaVantageError(
      "Limite de requêtes Alpha Vantage atteinte (niveau gratuit : 25 req/jour, 5/min).",
      'rate_limit',
    )
  }
  if (!response.ok) {
    throw new AlphaVantageError(`Erreur Alpha Vantage (HTTP ${response.status}).`, 'network')
  }

  const data = await response.json()

  // Alpha Vantage renvoie un HTTP 200 même en cas de quota dépassé ou de clé
  // invalide : l'information se trouve dans le corps de la réponse.
  if (data['Note'] || (data['Information'] && /rate limit|frequency/i.test(data['Information']))) {
    throw new AlphaVantageError(
      "Limite de requêtes Alpha Vantage atteinte (niveau gratuit : 25 req/jour, 5/min). Réessayez plus tard.",
      'rate_limit',
    )
  }
  if (data['Information']) {
    throw new AlphaVantageError(`Clé API Alpha Vantage invalide : ${data['Information']}`, 'auth')
  }
  if (data['Error Message']) {
    throw new AlphaVantageError(`Erreur Alpha Vantage : ${data['Error Message']}`, 'network')
  }

  const feed = Array.isArray(data.feed) ? data.feed : []
  if (feed.length === 0) {
    return { articles: [] }
  }

  const articles = feed
    .map((item) => parseArticle(item, symbol))
    .sort((a, b) => (a.timePublished < b.timePublished ? 1 : -1))

  return { articles }
}
