"""Clients pour les APIs externes (Finnhub, Alpha Vantage, Gemini), appelés
côté serveur avec les clés tenues en dehors du bundle livré au navigateur.
Portage direct de la logique déjà validée côté frontend (src/api/*.js) —
mêmes formes de retour, pour que le client backend.js du frontend n'ait
besoin d'aucune reformulation."""

import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY", "")
ALPHA_VANTAGE_API_KEY = os.environ.get("ALPHA_VANTAGE_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

FINNHUB_BASE_URL = "https://finnhub.io/api/v1"
ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
GEMINI_MODEL = "gemini-flash-latest"


class ProviderError(Exception):
    def __init__(self, message: str, kind: str):
        super().__init__(message)
        self.message = message
        self.kind = kind  # 'auth' | 'rate_limit' | 'network' | 'no_data'


# --------------------------------------------------------------------------
# Finnhub — cotation temps réel
# --------------------------------------------------------------------------
async def fetch_quote(symbol: str) -> dict:
    if not FINNHUB_API_KEY:
        raise ProviderError("Clé API Finnhub manquante côté serveur (backend/.env).", "auth")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{FINNHUB_BASE_URL}/quote", params={"symbol": symbol, "token": FINNHUB_API_KEY})
    except httpx.RequestError:
        raise ProviderError("Impossible de contacter Finnhub (réseau indisponible).", "network")

    if r.status_code in (401, 403):
        raise ProviderError("Clé API Finnhub invalide ou refusée.", "auth")
    if r.status_code == 429:
        raise ProviderError("Limite de requêtes Finnhub atteinte (niveau gratuit).", "rate_limit")
    if r.status_code != 200:
        raise ProviderError(f"Erreur Finnhub (HTTP {r.status_code}).", "network")

    data = r.json()
    has_data = bool(data) and (data.get("c") != 0 or data.get("pc") != 0) and data.get("t")
    if not has_data:
        raise ProviderError(f"Aucune donnée de marché disponible pour {symbol}.", "no_data")

    return {
        "price": data["c"],
        "change": data["d"],
        "changePercent": data["dp"],
        "high": data["h"],
        "low": data["l"],
        "open": data["o"],
        "previousClose": data["pc"],
        "timestamp": data["t"],
    }


# --------------------------------------------------------------------------
# Alpha Vantage — actualités/sentiment, fondamentaux, historique de prix
# --------------------------------------------------------------------------
async def _alpha_vantage_get(params: dict) -> dict:
    if not ALPHA_VANTAGE_API_KEY:
        raise ProviderError("Clé API Alpha Vantage manquante côté serveur (backend/.env).", "auth")

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(ALPHA_VANTAGE_BASE_URL, params={**params, "apikey": ALPHA_VANTAGE_API_KEY})
    except httpx.RequestError:
        raise ProviderError("Impossible de contacter Alpha Vantage (réseau indisponible).", "network")

    if r.status_code == 429:
        raise ProviderError("Limite de requêtes Alpha Vantage atteinte (niveau gratuit : 25 req/jour, 5/min).", "rate_limit")
    if r.status_code != 200:
        raise ProviderError(f"Erreur Alpha Vantage (HTTP {r.status_code}).", "network")

    data = r.json()

    note = data.get("Note")
    information = data.get("Information")
    if note or (information and any(w in information.lower() for w in ("rate limit", "frequency"))):
        raise ProviderError("Limite de requêtes Alpha Vantage atteinte (niveau gratuit : 25 req/jour, 5/min).", "rate_limit")
    if information:
        raise ProviderError(f"Clé API Alpha Vantage invalide : {information}", "auth")
    if data.get("Error Message"):
        raise ProviderError(f"Erreur Alpha Vantage : {data['Error Message']}", "network")

    return data


def _parse_article(item: dict, symbol: str) -> dict:
    ticker_match = next((t for t in item.get("ticker_sentiment", []) if t.get("ticker") == symbol), None)
    return {
        "title": item.get("title"),
        "summary": item.get("summary"),
        "source": item.get("source"),
        "url": item.get("url"),
        "timePublished": item.get("time_published"),
        "overallSentimentLabel": item.get("overall_sentiment_label"),
        "overallSentimentScore": float(item.get("overall_sentiment_score") or 0),
        "relevance": float(ticker_match["relevance_score"]) if ticker_match else 0.0,
        "tickerSentimentScore": float(ticker_match["ticker_sentiment_score"]) if ticker_match else None,
        "tickerSentimentLabel": ticker_match["ticker_sentiment_label"] if ticker_match else None,
    }


async def fetch_news_sentiment(symbol: str) -> dict:
    data = await _alpha_vantage_get({"function": "NEWS_SENTIMENT", "tickers": symbol, "sort": "LATEST", "limit": "50"})
    feed = data.get("feed") or []
    if not feed:
        return {"articles": []}
    articles = sorted(
        (_parse_article(item, symbol) for item in feed),
        key=lambda a: a["timePublished"] or "",
        reverse=True,
    )
    return {"articles": articles}


async def fetch_overview(symbol: str) -> dict:
    data = await _alpha_vantage_get({"function": "OVERVIEW", "symbol": symbol})
    if not data or not data.get("Symbol"):
        raise ProviderError(f"Aucune donnée fondamentale disponible pour {symbol}.", "no_data")
    return {
        "name": data.get("Name"),
        "sector": data.get("Sector"),
        "industry": data.get("Industry"),
        "marketCap": data.get("MarketCapitalization"),
        "peRatio": data.get("PERatio"),
        "dividendYield": data.get("DividendYield"),
        "eps": data.get("EPS"),
        "week52High": data.get("52WeekHigh"),
        "week52Low": data.get("52WeekLow"),
        "beta": data.get("Beta"),
        "analystTarget": data.get("AnalystTargetPrice"),
    }


async def fetch_daily_history(symbol: str) -> list[dict]:
    data = await _alpha_vantage_get({"function": "TIME_SERIES_DAILY", "symbol": symbol, "outputsize": "compact"})
    series = data.get("Time Series (Daily)")
    if not series:
        raise ProviderError(f"Aucun historique de prix disponible pour {symbol}.", "no_data")
    points = sorted(
        ({"date": date, "close": float(values["4. close"])} for date, values in series.items()),
        key=lambda p: p["date"],
    )
    return points[-60:]


# --------------------------------------------------------------------------
# Gemini — recommandation IA structurée
# --------------------------------------------------------------------------
RECOMMENDATION_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "action": {"type": "STRING", "enum": ["STRONG_SELL", "SELL", "HOLD", "BUY", "STRONG_BUY"]},
        "confidence": {"type": "INTEGER"},
        "urgency": {"type": "STRING", "enum": ["NONE", "WATCH", "URGENT"]},
        "rationale": {"type": "STRING"},
        "key_drivers": {"type": "ARRAY", "items": {"type": "STRING"}},
        "risks": {"type": "ARRAY", "items": {"type": "STRING"}},
        "crisis_flag": {"type": "BOOLEAN"},
        "crisis_reason": {"type": "STRING"},
    },
    "required": ["action", "confidence", "urgency", "rationale", "key_drivers", "risks", "crisis_flag", "crisis_reason"],
}

VALID_ACTIONS = {"STRONG_SELL", "SELL", "HOLD", "BUY", "STRONG_BUY"}
VALID_URGENCY = {"NONE", "WATCH", "URGENT"}


def _validate_recommendation(obj) -> bool:
    if not isinstance(obj, dict):
        return False
    return (
        obj.get("action") in VALID_ACTIONS
        and obj.get("urgency") in VALID_URGENCY
        and isinstance(obj.get("confidence"), (int, float))
        and isinstance(obj.get("rationale"), str)
        and isinstance(obj.get("key_drivers"), list)
        and isinstance(obj.get("risks"), list)
        and isinstance(obj.get("crisis_flag"), bool)
    )


def _build_news_block(articles: list[dict]) -> str:
    if not articles:
        return "Aucune actualité récente disponible."
    lines = []
    for a in articles[:8]:
        label = a.get("tickerSentimentLabel") or a.get("overallSentimentLabel") or "Neutral"
        score = a.get("tickerSentimentScore") if a.get("tickerSentimentScore") is not None else a.get("overallSentimentScore")
        lines.append(
            f"- [{label}] {a.get('title')} — {a.get('source') or 'source inconnue'} "
            f"({a.get('timePublished') or ''}) — pertinence:{a.get('relevance', 0):.2f}, score:{score}"
        )
    return "\n".join(lines)


async def fetch_ai_recommendation(asset: dict, quote: dict | None, articles: list[dict], profile: dict) -> dict:
    if not GEMINI_API_KEY:
        raise ProviderError("Clé API Gemini manquante côté serveur (backend/.env).", "auth")

    quote_line = (
        f"{quote['price']:.2f} $ (variation du jour : {quote['changePercent']:.2f}%)" if quote else "indisponible"
    )
    prompt = f"""Tu es un analyste financier senior. Donne une recommandation décisive et structurée pour {asset['name']} ({asset['symbol']}), un {asset['type'].lower()} du secteur {asset['sector']} ({asset['region']}).

Cours actuel : {quote_line}
Profil de l'investisseur : horizon={profile.get('horizon') or 'non renseigné'}, connaissance en bourse={profile.get('knowledge') or 'non renseignée'}, objectif principal={profile.get('objective') or 'non renseigné'}

Actualités et sentiment de marché récents (Alpha Vantage) :
{_build_news_block(articles)}

Réponds uniquement selon le schéma structuré demandé. Rédige rationale, key_drivers, risks et crisis_reason en français, de façon concise et factuelle, ancrée sur les données ci-dessus. crisis_flag doit être true uniquement en cas de signal de crise ou d'urgence réel (actualité très négative et cohérente, ou mouvement de prix marqué), pas par défaut."""

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": RECOMMENDATION_SCHEMA,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                f"{GEMINI_BASE_URL}/{GEMINI_MODEL}:generateContent",
                params={"key": GEMINI_API_KEY},
                json=body,
            )
    except httpx.RequestError:
        raise ProviderError("Impossible de contacter Gemini (réseau indisponible).", "network")

    if not r.is_success:
        try:
            message = r.json().get("error", {}).get("message", f"HTTP {r.status_code}")
        except Exception:
            message = f"HTTP {r.status_code}"
        if r.status_code == 400 and "api key" in message.lower():
            raise ProviderError("Clé API Gemini invalide.", "auth")
        if r.status_code in (401, 403):
            raise ProviderError("Clé API Gemini invalide ou refusée.", "auth")
        if r.status_code == 429:
            raise ProviderError("Limite de requêtes Gemini atteinte (niveau gratuit). Réessayez dans quelques instants.", "rate_limit")
        raise ProviderError(f"Erreur Gemini : {message}", "network")

    data = r.json()
    candidates = data.get("candidates") or []
    if not candidates:
        raise ProviderError("Réponse Gemini vide ou invalide.", "network")

    finish_reason = candidates[0].get("finishReason")
    if finish_reason and finish_reason != "STOP":
        raise ProviderError(f"Réponse Gemini incomplète ou bloquée ({finish_reason}).", "network")

    parts = candidates[0].get("content", {}).get("parts", [])
    text = parts[0].get("text") if parts else None
    if not text:
        raise ProviderError("Réponse Gemini vide ou invalide.", "network")

    import json

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        raise ProviderError("Réponse Gemini non conforme au format attendu (JSON invalide).", "network")

    if not _validate_recommendation(parsed):
        raise ProviderError("Réponse Gemini non conforme au schéma attendu.", "network")

    return parsed
