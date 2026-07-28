import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { ANTHROPIC_API_KEY } from '../config'

export class ClaudeError extends Error {
  constructor(message, kind) {
    super(message)
    this.kind = kind // 'auth' | 'rate_limit' | 'refusal' | 'network'
  }
}

const RecommendationSchema = z.object({
  action: z.enum(['STRONG_SELL', 'SELL', 'HOLD', 'BUY', 'STRONG_BUY']),
  confidence: z.number().int().min(0).max(100),
  urgency: z.enum(['NONE', 'WATCH', 'URGENT']),
  rationale: z.string(),
  key_drivers: z.array(z.string()),
  risks: z.array(z.string()),
  crisis_flag: z.boolean(),
  crisis_reason: z.string(),
})

let client = null

function getClient() {
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY.startsWith('VOTRE_CLE')) {
    throw new ClaudeError(
      "Clé API Anthropic manquante. Renseignez-la dans src/config.js ou dans .env (VITE_ANTHROPIC_API_KEY).",
      'auth',
    )
  }
  if (!client) {
    // Voir l'avertissement dans src/config.js sur l'exposition de la clé côté client.
    client = new Anthropic({ apiKey: ANTHROPIC_API_KEY, dangerouslyAllowBrowser: true })
  }
  return client
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
// clés, risques, signal de crise) à partir des données réelles déjà
// récupérées (cours Finnhub, actualités Alpha Vantage) et du profil investisseur.
export async function fetchAiRecommendation({ asset, quote, articles, profile }) {
  const anthropic = getClient()

  const prompt = `Tu es un analyste financier senior. Donne une recommandation décisive et structurée pour ${asset.name} (${asset.symbol}), un ${asset.type.toLowerCase()} du secteur ${asset.sector} (${asset.region}).

Cours actuel : ${quote ? `${quote.price.toFixed(2)} $ (variation du jour : ${quote.changePercent.toFixed(2)}%)` : 'indisponible'}
Profil de l'investisseur : horizon=${profile.horizon || 'non renseigné'}, connaissance en bourse=${profile.knowledge || 'non renseignée'}, objectif principal=${profile.objective || 'non renseigné'}

Actualités et sentiment de marché récents (Alpha Vantage) :
${buildNewsBlock(articles)}

Réponds uniquement selon le schéma structuré demandé. Rédige rationale, key_drivers, risks et crisis_reason en français, de façon concise et factuelle, ancrée sur les données ci-dessus. crisis_flag doit être true uniquement en cas de signal de crise ou d'urgence réel (actualité très négative et cohérente, ou mouvement de prix marqué), pas par défaut.`

  let response
  try {
    response = await anthropic.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 1024,
      output_config: {
        effort: 'low',
        format: zodOutputFormat(RecommendationSchema),
      },
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    const status = err?.status
    if (status === 401 || status === 403) {
      throw new ClaudeError('Clé API Anthropic invalide ou refusée.', 'auth')
    }
    if (status === 429) {
      throw new ClaudeError("Limite de requêtes Anthropic atteinte. Réessayez dans quelques instants.", 'rate_limit')
    }
    throw new ClaudeError(`Erreur Claude : ${err?.message || err}`, 'network')
  }

  if (response.stop_reason === 'refusal') {
    throw new ClaudeError("L'analyse a été refusée par les filtres de sécurité de Claude pour cet actif.", 'refusal')
  }

  if (!response.parsed_output) {
    throw new ClaudeError("Réponse de Claude non conforme au format attendu.", 'network')
  }

  return response.parsed_output
}
