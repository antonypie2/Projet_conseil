// Moteur d'analyse déterministe (règles explicites, pas de génération IA à ce
// stade) : transforme les données brutes Finnhub + Alpha Vantage en un
// paragraphe factuel, une recommandation et un niveau de confiance justifié.
// Objectif de ce MVP : valider que ce format est utile avant d'y greffer une
// couche de génération de texte par IA.

const RELEVANCE_THRESHOLD = 0.15
const SENTIMENT_NEUTRAL_BAND = 0.15
const MAX_QUOTED_ARTICLES = 3

const SENTIMENT_LABEL_FR = {
  Bullish: 'très positif',
  'Somewhat-Bullish': 'plutôt positif',
  Neutral: 'neutre',
  'Somewhat-Bearish': 'plutôt négatif',
  Bearish: 'très négatif',
}

function parseAlphaVantageDate(raw) {
  // Format attendu : YYYYMMDDTHHMMSS
  if (!raw || raw.length < 15) return null
  const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15)}`
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateFr(date) {
  if (!date) return 'date inconnue'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function truncate(text, max) {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max).trim()}…` : text
}

function bucketOf(label) {
  if (label === 'Bullish' || label === 'Somewhat-Bullish') return 'bullish'
  if (label === 'Bearish' || label === 'Somewhat-Bearish') return 'bearish'
  return 'neutral'
}

// Construit l'analyse complète d'un actif à partir de sa cotation (peut être
// null si Finnhub a échoué) et de ses actualités (peut être vide si Alpha
// Vantage n'a rien retourné ou a échoué).
export function analyzeAsset({ asset, quote, articlesResult, quoteError, newsError }) {
  const allArticles = articlesResult?.articles || []
  const relevant = allArticles
    .filter((a) => a.relevance >= RELEVANCE_THRESHOLD && a.tickerSentimentScore !== null)
    .slice(0, 10)

  const nRelevant = relevant.length

  let avgScore = null
  let majorityBucket = null
  let agreement = null

  if (nRelevant > 0) {
    const weightSum = relevant.reduce((s, a) => s + a.relevance, 0)
    avgScore = relevant.reduce((s, a) => s + a.tickerSentimentScore * a.relevance, 0) / weightSum

    const counts = { bullish: 0, bearish: 0, neutral: 0 }
    relevant.forEach((a) => {
      counts[bucketOf(a.tickerSentimentLabel)] += 1
    })
    majorityBucket = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    agreement = counts[majorityBucket] / nRelevant
  }

  // --- Niveau de confiance -------------------------------------------------
  let confidence = 'Faible'
  const confidenceReasons = []

  if (newsError) {
    confidenceReasons.push("les actualités n'ont pas pu être récupérées (voir message d'erreur)")
  } else if (nRelevant === 0) {
    confidenceReasons.push('aucune actualité suffisamment pertinente trouvée pour ce ticker')
  } else {
    confidenceReasons.push(`${nRelevant} source(s) pertinente(s) identifiée(s)`)
    confidenceReasons.push(`${Math.round(agreement * 100)}% des sources vont dans le même sens (${majorityBucket === 'bullish' ? 'positif' : majorityBucket === 'bearish' ? 'négatif' : 'neutre'})`)

    if (nRelevant >= 5 && agreement >= 0.7) {
      confidence = 'Élevé'
    } else if (nRelevant >= 2 && agreement >= 0.5) {
      confidence = 'Moyen'
    } else {
      confidence = 'Faible'
      confidenceReasons.push('trop peu de sources ou signaux contradictoires pour trancher')
    }
  }

  if (quoteError) {
    confidenceReasons.push('le prix de marché en temps réel est indisponible, ce qui empêche de croiser actualité et réaction du cours')
    confidence = 'Faible'
  }

  // --- Recommandation -------------------------------------------------------
  let recommendation = 'Données insuffisantes'
  let recommendationReason = "impossible de dégager un signal clair par manque de données."

  if (nRelevant > 0) {
    const priceUp = quote && quote.changePercent > 0
    const priceDown = quote && quote.changePercent < 0
    const newsBullish = avgScore > SENTIMENT_NEUTRAL_BAND
    const newsBearish = avgScore < -SENTIMENT_NEUTRAL_BAND

    if (newsBullish && (priceUp || !quote)) {
      recommendation = 'Renforcement possible'
      recommendationReason = quote
        ? 'les actualités récentes sont majoritairement positives et le cours progresse dans le même sens.'
        : 'les actualités récentes sont majoritairement positives (variation de cours non disponible pour confirmation).'
    } else if (newsBearish && (priceDown || !quote)) {
      recommendation = 'Signal de prudence'
      recommendationReason = quote
        ? 'les actualités récentes sont majoritairement négatives et le cours recule en cohérence.'
        : 'les actualités récentes sont majoritairement négatives (variation de cours non disponible pour confirmation).'
    } else if (newsBullish && priceDown) {
      recommendation = 'À surveiller'
      recommendationReason = 'les actualités sont positives mais le cours ne suit pas (encore) cette dynamique : divergence à surveiller.'
    } else if (newsBearish && priceUp) {
      recommendation = 'À surveiller'
      recommendationReason = 'les actualités sont négatives mais le cours résiste : divergence à surveiller.'
    } else {
      recommendation = 'Neutre'
      recommendationReason = "le ton de l'actualité est globalement neutre, sans signal fort dans un sens ou l'autre."
    }
  }

  // --- Paragraphe factuel -----------------------------------------------------
  let summaryParagraph
  if (newsError) {
    summaryParagraph = `Les actualités récentes n'ont pas pu être récupérées pour ${asset.name} (${asset.symbol}) : ${newsError}`
  } else if (nRelevant === 0) {
    summaryParagraph = `Aucune actualité suffisamment pertinente n'a été retrouvée pour ${asset.name} (${asset.symbol}) sur la fenêtre couverte par Alpha Vantage. ${allArticles.length > 0 ? `${allArticles.length} article(s) mentionnent le secteur ou le marché en général, mais sans lien direct assez fort avec ce titre.` : ''}`
  } else {
    const label = SENTIMENT_LABEL_FR[majorityBucketLabel(majorityBucket)]
    const priceSentence = quote
      ? ` Sur la dernière séance, le titre a ${quote.changePercent >= 0 ? 'progressé' : 'reculé'} de ${Math.abs(quote.changePercent).toFixed(2)}% pour clôturer à ${quote.price.toFixed(2)}.`
      : " La variation de cours n'a pas pu être récupérée pour cette analyse."

    const quotedArticles = relevant.slice(0, MAX_QUOTED_ARTICLES).map((a) => {
      const date = formatDateFr(parseAlphaVantageDate(a.timePublished))
      return `« ${a.title} » (${a.source || 'source inconnue'}, ${date}) — ${truncate(a.summary, 220)}`
    })

    summaryParagraph =
      `Sur les ${nRelevant} actualité(s) pertinente(s) analysée(s) concernant ${asset.name} (${asset.symbol}), le ton général est ${label} ` +
      `(score de sentiment moyen pondéré : ${avgScore.toFixed(2)} sur une échelle de -1 à +1), et ${Math.round(agreement * 100)}% des sources vont dans ce sens.` +
      priceSentence +
      ` Ce qui ressort des publications les plus pertinentes : ${quotedArticles.join(' ')}`
  }

  return {
    summaryParagraph,
    recommendation,
    recommendationReason,
    confidence,
    confidenceReasons,
    avgScore,
    nRelevant,
    agreement,
    articlesUsed: relevant,
  }
}

function majorityBucketLabel(bucket) {
  if (bucket === 'bullish') return 'Somewhat-Bullish'
  if (bucket === 'bearish') return 'Somewhat-Bearish'
  return 'Neutral'
}
