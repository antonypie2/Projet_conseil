// ---------------------------------------------------------------------------
// Le frontend ne parle plus jamais directement à Finnhub / Alpha Vantage /
// Gemini : toutes les clés API vivent côté serveur (backend/.env) et ne sont
// plus jamais exposées dans le bundle livré au navigateur. Le frontend
// n'appelle que ce backend.
//
// En développement local, le backend tourne séparément sur localhost:8000.
// En production sur Vercel, frontend et backend sont servis depuis le même
// déploiement (voir vercel.json) : une URL vide donne des appels relatifs
// ("/api/...") qui restent sur la même origine, sans CORS à gérer.
// ---------------------------------------------------------------------------
export const BACKEND_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '')

// Le niveau gratuit d'Alpha Vantage reste limité à 5 requêtes/minute côté
// backend (25/jour) : ce délai échelonne les demandes d'actualités envoyées
// au backend pour plusieurs actifs à la suite, en attendant qu'un cache y
// suffise seul.
export const NEWS_REQUEST_DELAY_MS = 13000
