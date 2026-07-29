import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # Postgres géré (Neon, Supabase...) — utilisé en production (Vercel).
    # pool_pre_ping évite de servir une connexion coupée par le fournisseur
    # après une période d'inactivité (fréquent sur les instances gratuites).
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    # Développement local sans configuration supplémentaire : fichier SQLite.
    DB_PATH = Path(__file__).resolve().parent.parent / "data.db"
    engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
