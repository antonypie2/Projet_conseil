import { GEMINI_API_KEY, GEMINI_MODEL } from '../config'

export class GeminiError extends Error {
  constructor(message, kind) {
    super(message)
    this.kind = kind // 'auth' | 'rate_limit' | 'network'
  }
}

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

// Schéma au format OpenAPI 3.0 (sous-ensemble supporté par responseSchema) —
// pas de JSON Schema complet, pas d'additionalProperties, types en MAJUSCULES.
const RECOMMENDATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    action: { type: 'STRING', enum: ['STRONG_SELL', 'SELL', 'HOLD', 'BUY', 'STRONG_BUY'] },
    confidence: { type: 'INTEGER' },
    urgency: { type: 'STRING', enum: ['NONE', 'WATCH', 'URGENT'] },
    rationale: { type: 'STRING' },
    key_drivers: { type: 'ARRAY', items: { type: 'STRING' } },
    risks: { type: 'ARRAY', items: { type: 'STRING' } },
    crisis_flag: { type: 'BOOLEAN' },
    crisis_reason: { type: 'STRING' },
  },
  required: ['action', 'confidence', 'urgency', 'rationale', 'key_drivers', 'risks', 'crisis_flag', 'crisis_reason'],
}

const VALID_ACTIONS = new Set(['STRONG_SELL', 'SELL', 'HOLD', 'BUY', 'STRONG_BUY'])
const VALID_URGENCY = new Set(['NONE', 'WATCH', 'URGENT'])

function validateRecommendation(obj) {
  if (
    !obj ||
    !VALID_ACTIONS.has(obj.action) ||
    !VALID_URGENCY.has(obj.urgency) ||
    typeof obj.confidence !== 'number' ||
    typeof obj.rationale !== 'string' ||
    !Array.isArray(obj.key_drivers) ||
    !Array.isArray(obj.risks) ||
    typeof obj.crisis_flag !== 'boolean'
  ) {
    return false
  }
  return true
}

function buildNewsBlock(articles) {
  if (!articles || articles.length === 0) return 'Aucune actualité récente disponible.'
  return articles
    .slice(0, 8)
    .map((a) => {
      const label = a.tickerSentimentLabel || a.overallSentimentLabel || 'Neutral'
      const score = a.tickerSentimentScore ?? a.overallSentimentScore
      return `- [${label}] ${a.title} — ${a.source || 'source inconnue'} (${a.timePublished || ''}) — pertinence:${(a.relevance ?? 0).toFixed(2)}, score:${score}`
    })
    .join('\n')
}

// Génère une recommandation structurée (action, confiance, urgence, facteurs
// clés, risques, signal de crise) via l'API Gemini (niveau gratuit), à partir
// des données réelles déjà récupérées (cours Finnhub, actualités Alpha
// Vantage) et du profil investisseur.
export async function fetchAiRecommendation({ asset, quote, articles, profile }) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith('VOTRE_CLE')) {
    throw new GeminiError(
      "Clé API Gemini manquante. Renseignez-la dans src/config.js ou dans .env (VITE_GEMINI_API_KEY).",
      'auth',
    )
  }

  const prompt = `Tu es un analyste financier senior. Donne une recommandation décisive et structurée pour ${asset.name} (${asset.symbol}), un ${asset.type.toLowerCase()} du secteur ${asset.sector} (${asset.region}).

Cours actuel : ${quote ? `${quote.price.toFixed(2)} $ (variation du jour : ${quote.changePercent.toFixed(2)}%)` : 'indisponible'}
Profil de l'investisseur : horizon=${profile.horizon || 'non renseigné'}, connaissance en bourse=${profile.knowledge || 'non renseignée'}, objectif principal=${profile.objective || 'non renseigné'}

Actualités et sentiment de marché récents (Alpha Vantage) :
${buildNewsBlock(articles)}

Réponds uniquement selon le schéma structuré demandé. Rédige rationale, key_drivers, risks et crisis_reason en français, de façon concise et factuelle, ancrée sur les données ci-dessus. crisis_flag doit être true uniquement en cas de signal de crise ou d'urgence réel (actualité très négative et cohérente, ou mouvement de prix marqué), pas par défaut.`

  let response
  try {
    response = await fetch(`${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RECOMMENDATION_SCHEMA,
        },
      }),
    })
  } catch {
    throw new GeminiError('Impossible de contacter Gemini (réseau indisponible).', 'network')
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    const message = errBody?.error?.message || `HTTP ${response.status}`
    if (response.status === 400 && /api key/i.test(message)) {
      throw new GeminiError('Clé API Gemini invalide.', 'auth')
    }
    if (response.status === 401 || response.status === 403) {
      throw new GeminiError('Clé API Gemini invalide ou refusée.', 'auth')
    }
    if (response.status === 429) {
      throw new GeminiError('Limite de requêtes Gemini atteinte (niveau gratuit). Réessayez dans quelques instants.', 'rate_limit')
    }
    throw new GeminiError(`Erreur Gemini : ${message}`, 'network')
  }

  const data = await response.json()
  const finishReason = data?.candidates?.[0]?.finishReason
  if (finishReason && finishReason !== 'STOP') {
    throw new GeminiError(`Réponse Gemini incomplète ou bloquée (${finishReason}).`, 'network')
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new GeminiError('Réponse Gemini vide ou invalide.', 'network')
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new GeminiError('Réponse Gemini non conforme au format attendu (JSON invalide).', 'network')
  }

  if (!validateRecommendation(parsed)) {
    throw new GeminiError('Réponse Gemini non conforme au schéma attendu.', 'network')
  }

  return parsed
}
