# Assistant Portefeuille — MVP

Application qui aide un investisseur à comprendre ce qui se passe sur les
actifs de son portefeuille : prix réel, contexte d'actualité, recommandation
IA structurée et alertes de crise/urgence. Frontend React (Vite) + backend
Python (FastAPI + SQLite) qui protège les clés API, met en cache les
réponses et persiste le portefeuille/profil entre les sessions.

## Architecture

```
Navigateur (React) ──► Backend (FastAPI, :8000) ──► Finnhub / Alpha Vantage / Gemini
                              │
                          SQLite (data.db)
                     portefeuille · profil · cache
```

Le frontend n'appelle plus jamais directement les APIs externes : tout passe
par le backend, qui seul détient les clés.

## Parcours

1. **Identification** — prénom.
2. **Sélection du portefeuille** — choix manuel parmi une vingtaine d'actions
   et ETF larges (actions US, ADR européennes/asiatiques, ETF S&P 500 /
   MSCI World / Nasdaq 100), avec recherche.
3. **Objectifs** — horizon, niveau de connaissance, objectif principal.
4. **Espace portefeuille** (post-onboarding), avec navigation entre 3 onglets :
   - **Portefeuille** — pour chaque actif : cours réel (Finnhub), paragraphe
     factuel construit à partir des actualités réelles (Alpha Vantage), et une
     **recommandation IA structurée générée par Gemini** (action
     BUY/SELL/HOLD/STRONG_BUY/STRONG_SELL, score de confiance, urgence,
     justification, facteurs clés, risques, signal de crise). Un panneau
     d'alertes urgentes agrège les actifs en signal fort ou en crise. Ajout/
     retrait d'actifs à tout moment (persisté).
   - **Découvrir** — actifs non détenus classés par affinité avec le profil
     (risque/horizon/secteurs), classement 100% local sans appel API.
   - **Profil** — tolérance au risque, horizon, secteurs préférés :
     éditable à tout moment, pilote directement le classement de Découvrir.
   - **Fiche détail** par actif (accessible depuis Portefeuille/Découvrir) :
     graphique de prix ~60 séances, fondamentaux (P/E, bêta, capitalisation,
     dividende, objectif analystes), toutes les actualités, et la même
     recommandation IA.

Le portefeuille et le profil sont **persistés côté serveur** (SQLite) : un
rechargement de page restaure directement l'espace portefeuille sans repasser
par l'onboarding. Le bouton « Recommencer » efface la session persistée.

## Lancer le projet

### 1. Backend (à lancer en premier)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows : .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # puis renseignez vos clés (voir tableau ci-dessous)
uvicorn app.main:app --reload --port 8000
```

Le backend écoute sur `http://localhost:8000` et crée automatiquement
`backend/data.db` (SQLite) au premier lancement.

### 2. Frontend

Dans un second terminal, à la racine du projet :

```bash
npm install
npm run dev
```

Le frontend attend le backend sur `http://localhost:8000` par défaut
(modifiable via `VITE_API_BASE_URL` dans un `.env` à la racine si besoin).

## Configuration des clés API (toutes gratuites, `backend/.env`)

| Clé | Usage | Niveau |
|---|---|---|
| `FINNHUB_API_KEY` | Cours et variations | Gratuit — https://finnhub.io/register (~60 req/min) |
| `ALPHA_VANTAGE_API_KEY` | Actualités, sentiment, fondamentaux, historique de prix | Gratuit — https://www.alphavantage.co/support/#api-key (25 req/jour, 5/min) |
| `GEMINI_API_KEY` | Recommandation IA structurée (Gemini, Google) | Gratuit, sans carte bancaire — https://aistudio.google.com/apikey |

⚠️ Le niveau gratuit d'Alpha Vantage reste très limité. Le backend met en
cache chaque réponse (cours 5 min, actualités 30 min, fondamentaux 24h,
historique 1h, recommandation IA 1h) — ce cache est **partagé entre tous les
appels**, donc revisiter un actif ou recharger la page ne consomme pas de
nouveau quota tant que le cache est frais. Le frontend échelonne aussi ses
demandes (~13s d'intervalle) pour ne pas rafaler plusieurs cache-miss d'un
coup. En cas de quota dépassé ou d'erreur, chaque carte affiche un message
clair avec un bouton pour réessayer, plutôt que d'inventer des données.

## Build (frontend)

```bash
npm run build
```
