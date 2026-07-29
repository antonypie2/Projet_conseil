from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def utcnow() -> datetime:
    # Naive UTC (pas de tzinfo) : SQLite n'a pas de type timezone natif, on
    # reste cohérent en comparant toujours des datetimes naïfs en UTC.
    return datetime.now(timezone.utc).replace(tzinfo=None)


class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    added_at: Mapped[datetime] = mapped_column(DateTime(), default=utcnow)


class Profile(Base):
    """Ligne unique (id=1) — démo mono-utilisateur, pas d'authentification."""

    __tablename__ = "profile"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    horizon: Mapped[str | None] = mapped_column(String(20), nullable=True)
    knowledge: Mapped[str | None] = mapped_column(String(20), nullable=True)
    objective: Mapped[str | None] = mapped_column(String(30), nullable=True)
    risk_tolerance: Mapped[str | None] = mapped_column(String(10), nullable=True)
    sectors_json: Mapped[str] = mapped_column(Text, default="[]")


class CacheEntry(Base):
    """Cache générique clé/valeur pour les réponses des APIs externes,
    avec expiration appliquée à la lecture (voir app/cache.py)."""

    __tablename__ = "cache_entries"

    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    data_json: Mapped[str] = mapped_column(Text)
    cached_at: Mapped[datetime] = mapped_column(DateTime(), default=utcnow)
