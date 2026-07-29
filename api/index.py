"""Point d'entrée serverless pour Vercel (@vercel/python). Réexporte
simplement l'application FastAPI définie dans backend/app/main.py — la
logique métier du backend n'est pas dupliquée, ce fichier n'est qu'un
adaptateur pour l'hébergement.

En local, on lance plutôt `uvicorn app.main:app` depuis le dossier backend/
(voir README) ; ce fichier n'est utile qu'au déploiement Vercel."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.main import app  # noqa: E402
