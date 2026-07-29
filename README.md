# Assistant Portefeuille — MVP

Application qui aide un investisseur à comprendre ce qui se passe sur les
actifs de son portefeuille : prix réel, contexte d'actualité, recommandation
IA structurée et alertes de crise/urgence. Frontend React (Vite) + backend
Python (FastAPI) qui protège les clés API, met en cache les réponses et
persiste le portefeuille/profil entre les sessions.

## Architecture

```
Navigateur (React) ──► Backend (FastAPI) ──► Finnhub / Alpha Vantage / Gemini
                              │
                    SQLite (local) ou Postgres (production)
                     portefeuille · profil · cache
```

Le frontend n'appelle plus jamais directement les APIs externes : tout passe
par le backend, qui seul détient les clés.

**Deux modes de base de données**, sans changement de code entre les deux :
- **Local** : aucune configuration nécessaire — un fichier SQLite
  (`backend/data.db`) est créé automatiquement.
- **Production (Vercel)** : SQLite ne convient pas au serverless (disque non
  persistant entre deux requêtes) — une variable `DATABASE_URL` bascule
  automatiquement vers Postgres (voir section Déploiement).

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

Le portefeuille et le profil sont **persistés côté serveur** : un rechargement
de page restaure directement l'espace portefeuille sans repasser par
l'onboarding. Le bouton « Recommencer » efface la session persistée.

## Lancer le projet en local

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
`backend/data.db` (SQLite) au premier lancement — aucune base à installer.

### 2. Frontend

Dans un second terminal, à la racine du projet :

```bash
npm install
npm run dev
```

En développement, le frontend cible `http://localhost:8000` par défaut
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

## Déploiement sur Vercel

Frontend et backend sont déployés **ensemble, sur un seul projet Vercel** :
le frontend est servi comme site statique (build Vite), et le backend comme
fonction serverless Python sous `/api` (voir `vercel.json` et `api/index.py`
à la racine — ce dernier ne fait que réexporter l'application FastAPI de
`backend/app/main.py`, aucune logique dupliquée).

### 1. Créer une base Postgres gratuite (Neon)

1. Créez un compte sur https://neon.tech (gratuit, sans carte bancaire) et un
   projet.
2. Copiez la **pooled connection string** (pas la connexion directe — c'est
   important : le serverless ouvre potentiellement une connexion par
   requête, et seule la version "pooled" — via PgBouncer — évite d'épuiser
   les connexions Postgres disponibles).
3. Alternative équivalente : https://supabase.com (gratuit aussi), en
   utilisant sa chaîne de connexion en mode "Transaction pooler".

### 2. Configurer le projet Vercel

1. Sur https://vercel.com, "Add New… → Project", importez ce dépôt.
2. Vercel détecte `vercel.json` à la racine (pas de configuration de build
   supplémentaire à faire).
3. Dans "Environment Variables", ajoutez :
   - `FINNHUB_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `GEMINI_API_KEY` (vos clés)
   - `DATABASE_URL` = la pooled connection string Neon/Supabase de l'étape 1
   - `CORS_ORIGIN` : optionnel (frontend et backend sont sur la même origine
     une fois déployés ensemble, donc pas indispensable ici)
4. Déployez. Au premier appel, le backend crée automatiquement les tables
   dans Postgres (`CREATE TABLE IF NOT EXISTS` équivalent via SQLAlchemy).

Le frontend appelle alors `/api/...` en relatif (même origine que le site),
sans configuration supplémentaire — voir `src/config.js`.

## Build (frontend seul)

```bash
npm run build
```
