import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .assets import get_asset
from .cache import cache_get_or_fetch
from .db import Base, engine, get_db
from .models import PortfolioItem, Profile
from .providers import ProviderError, fetch_ai_recommendation, fetch_daily_history, fetch_news_sentiment, fetch_overview, fetch_quote

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Assistant Portefeuille — API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("CORS_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATUS_BY_KIND = {"auth": 401, "rate_limit": 429, "no_data": 404, "network": 502}


@app.exception_handler(ProviderError)
async def provider_error_handler(request, exc: ProviderError):
    return JSONResponse(
        status_code=STATUS_BY_KIND.get(exc.kind, 500),
        content={"message": exc.message, "kind": exc.kind},
    )


# --------------------------------------------------------------------------
# Cache TTLs (secondes)
# --------------------------------------------------------------------------
TTL_QUOTE = 300
TTL_NEWS = 1800
TTL_OVERVIEW = 86400
TTL_HISTORY = 3600
TTL_RECOMMENDATION = 3600


@app.get("/api/health")
def health():
    return {"status": "ok"}


# --------------------------------------------------------------------------
# Profil (ligne unique, démo mono-utilisateur)
# --------------------------------------------------------------------------
class ProfilePayload(BaseModel):
    first_name: str | None = None
    horizon: str | None = None
    knowledge: str | None = None
    objective: str | None = None
    risk_tolerance: str | None = None
    sectors: list[str] | None = None


def _get_or_create_profile(db: Session) -> Profile:
    profile = db.get(Profile, 1)
    if profile is None:
        profile = Profile(id=1)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _profile_to_dict(profile: Profile) -> dict:
    return {
        "first_name": profile.first_name,
        "horizon": profile.horizon,
        "knowledge": profile.knowledge,
        "objective": profile.objective,
        "risk_tolerance": profile.risk_tolerance,
        "sectors": json.loads(profile.sectors_json),
    }


def _derive_default_risk(horizon: str | None, knowledge: str | None) -> str:
    if knowledge == "debutant":
        return "low"
    if horizon == "court":
        return "high"
    return "medium"


@app.get("/api/profile")
def get_profile(db: Session = Depends(get_db)):
    return _profile_to_dict(_get_or_create_profile(db))


@app.put("/api/profile")
def update_profile(payload: ProfilePayload, db: Session = Depends(get_db)):
    profile = _get_or_create_profile(db)
    data = payload.model_dump(exclude_unset=True)
    if "sectors" in data:
        profile.sectors_json = json.dumps(data.pop("sectors"))
    for key, value in data.items():
        setattr(profile, key, value)
    db.commit()
    return _profile_to_dict(profile)


# --------------------------------------------------------------------------
# Portefeuille
# --------------------------------------------------------------------------
class SymbolPayload(BaseModel):
    symbol: str


@app.get("/api/portfolio")
def get_portfolio(db: Session = Depends(get_db)):
    items = db.query(PortfolioItem).order_by(PortfolioItem.added_at).all()
    return {"symbols": [i.symbol for i in items]}


@app.post("/api/portfolio")
def add_to_portfolio(payload: SymbolPayload, db: Session = Depends(get_db)):
    symbol = payload.symbol.upper()
    if not db.query(PortfolioItem).filter_by(symbol=symbol).first():
        db.add(PortfolioItem(symbol=symbol))
        db.commit()
    return {"ok": True}


@app.delete("/api/portfolio/{symbol}")
def remove_from_portfolio(symbol: str, db: Session = Depends(get_db)):
    db.query(PortfolioItem).filter_by(symbol=symbol.upper()).delete()
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# Session — bootstrap au chargement du frontend (restaure ou démarre l'onboarding)
# --------------------------------------------------------------------------
class SessionInitPayload(BaseModel):
    first_name: str
    symbols: list[str]
    horizon: str | None = None
    knowledge: str | None = None
    objective: str | None = None


@app.get("/api/session")
def get_session(db: Session = Depends(get_db)):
    profile = _profile_to_dict(_get_or_create_profile(db))
    symbols = [i.symbol for i in db.query(PortfolioItem).order_by(PortfolioItem.added_at).all()]
    onboarded = bool(profile["first_name"]) and len(symbols) > 0
    return {"onboarded": onboarded, "profile": profile, "symbols": symbols}


@app.post("/api/session")
def init_session(payload: SessionInitPayload, db: Session = Depends(get_db)):
    profile = _get_or_create_profile(db)
    profile.first_name = payload.first_name
    profile.horizon = payload.horizon
    profile.knowledge = payload.knowledge
    profile.objective = payload.objective
    if not profile.risk_tolerance:
        profile.risk_tolerance = _derive_default_risk(payload.horizon, payload.knowledge)
    db.commit()

    db.query(PortfolioItem).delete()
    for symbol in payload.symbols:
        db.add(PortfolioItem(symbol=symbol.upper()))
    db.commit()

    return {"ok": True}


@app.post("/api/session/reset")
def reset_session(db: Session = Depends(get_db)):
    """Efface le portefeuille et le profil persistés — utilisé par « Recommencer »
    pour que l'onboarding reparte réellement de zéro plutôt que de restaurer
    l'ancienne session au prochain chargement."""
    db.query(PortfolioItem).delete()
    profile = _get_or_create_profile(db)
    profile.first_name = None
    profile.horizon = None
    profile.knowledge = None
    profile.objective = None
    profile.risk_tolerance = None
    profile.sectors_json = "[]"
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# Données de marché (mises en cache serveur pour économiser le quota gratuit)
# --------------------------------------------------------------------------
@app.get("/api/quote/{symbol}")
async def get_quote(symbol: str, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    return await cache_get_or_fetch(db, f"quote:{symbol}", TTL_QUOTE, lambda: fetch_quote(symbol))


@app.get("/api/news/{symbol}")
async def get_news(symbol: str, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    return await cache_get_or_fetch(db, f"news:{symbol}", TTL_NEWS, lambda: fetch_news_sentiment(symbol))


@app.get("/api/overview/{symbol}")
async def get_overview(symbol: str, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    return await cache_get_or_fetch(db, f"overview:{symbol}", TTL_OVERVIEW, lambda: fetch_overview(symbol))


@app.get("/api/history/{symbol}")
async def get_history(symbol: str, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    data = await cache_get_or_fetch(db, f"history:{symbol}", TTL_HISTORY, lambda: fetch_daily_history(symbol))
    return {"points": data}


# --------------------------------------------------------------------------
# Recommandation IA (Gemini) — assemble cours + actualités + profil en cache,
# puis appelle Gemini ; le résultat lui-même est également mis en cache.
# --------------------------------------------------------------------------
@app.get("/api/recommendation/{symbol}")
async def get_recommendation(symbol: str, refresh: bool = False, db: Session = Depends(get_db)):
    symbol = symbol.upper()

    async def build():
        quote = None
        try:
            quote = await cache_get_or_fetch(db, f"quote:{symbol}", TTL_QUOTE, lambda: fetch_quote(symbol))
        except ProviderError:
            quote = None

        articles: list[dict] = []
        try:
            news = await cache_get_or_fetch(db, f"news:{symbol}", TTL_NEWS, lambda: fetch_news_sentiment(symbol))
            articles = news.get("articles", [])
        except ProviderError:
            articles = []

        profile = _profile_to_dict(_get_or_create_profile(db))
        asset = get_asset(symbol)
        return await fetch_ai_recommendation(asset, quote, articles, profile)

    return await cache_get_or_fetch(db, f"reco:{symbol}", TTL_RECOMMENDATION, build, refresh=refresh)
