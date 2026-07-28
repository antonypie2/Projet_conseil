// ---------------------------------------------------------------------------
// Clés API — à renseigner ici OU via un fichier .env (voir .env.example).
// Les variables d'environnement (VITE_...) sont prioritaires si définies.
// Niveaux gratuits :
//   - Finnhub      : https://finnhub.io/register            (~60 appels/min)
//   - Alpha Vantage: https://www.alphavantage.co/support/#api-key (25 appels/jour, 5/min)
// ---------------------------------------------------------------------------
export const FINNHUB_API_KEY =
  import.meta.env.VITE_FINNHUB_API_KEY || 'VOTRE_CLE_FINNHUB_ICI'

export const ALPHA_VANTAGE_API_KEY =
  import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'VOTRE_CLE_ALPHA_VANTAGE_ICI'

export const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
export const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'

// Alpha Vantage free tier is extremely rate-limited (5 req/min, 25 req/day).
// This delay staggers requests so we don't blow through the per-minute cap
// when a user selects several assets.
export const ALPHA_VANTAGE_REQUEST_DELAY_MS = 13000
