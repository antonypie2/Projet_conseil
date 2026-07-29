import { BACKEND_BASE_URL } from '../config'

export class BackendError extends Error {
  constructor(message, kind) {
    super(message)
    this.kind = kind // 'auth' | 'rate_limit' | 'network' | 'no_data'
  }
}

async function request(path, options) {
  let response
  try {
    response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new BackendError(
      `Impossible de contacter le serveur backend (${BACKEND_BASE_URL}). Est-il démarré ?`,
      'network',
    )
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new BackendError(body.message || `Erreur backend (HTTP ${response.status}).`, body.kind || 'network')
  }

  return response.json()
}

// --- Session (bootstrap / onboarding) --------------------------------------
export function getSession() {
  return request('/api/session')
}

export function initSession({ firstName, symbols, horizon, knowledge, objective }) {
  return request('/api/session', {
    method: 'POST',
    body: JSON.stringify({ first_name: firstName, symbols, horizon, knowledge, objective }),
  })
}

export function resetSession() {
  return request('/api/session/reset', { method: 'POST' })
}

// --- Portefeuille -----------------------------------------------------------
export async function getPortfolio() {
  const data = await request('/api/portfolio')
  return data.symbols
}

export function addToPortfolio(symbol) {
  return request('/api/portfolio', { method: 'POST', body: JSON.stringify({ symbol }) })
}

export function removeFromPortfolio(symbol) {
  return request(`/api/portfolio/${encodeURIComponent(symbol)}`, { method: 'DELETE' })
}

// --- Profil -------------------------------------------------------------------
export function getProfile() {
  return request('/api/profile')
}

export function updateProfile(profile) {
  return request('/api/profile', { method: 'PUT', body: JSON.stringify(profile) })
}

// --- Données de marché (mises en cache côté serveur) ------------------------
export function fetchQuote(symbol) {
  return request(`/api/quote/${encodeURIComponent(symbol)}`)
}

export function fetchNewsSentiment(symbol) {
  return request(`/api/news/${encodeURIComponent(symbol)}`)
}

export function fetchOverview(symbol) {
  return request(`/api/overview/${encodeURIComponent(symbol)}`)
}

export async function fetchDailyHistory(symbol) {
  const data = await request(`/api/history/${encodeURIComponent(symbol)}`)
  return data.points
}

export function fetchAiRecommendation(symbol, { refresh = false } = {}) {
  return request(`/api/recommendation/${encodeURIComponent(symbol)}${refresh ? '?refresh=true' : ''}`)
}
