# Assistant Portefeuille — MVP

Application React (état en mémoire, sans base de données) qui aide un
investisseur à comprendre ce qui se passe sur les actifs de son portefeuille :
prix réel, contexte d'actualité, recommandation et niveau de confiance
explicite. Objectif de ce MVP : valider ce format avec de vraies données de
marché avant d'y ajouter une couche de génération de texte par IA.

## Parcours

1. **Identification** — prénom.
2. **Sélection du portefeuille** — choix manuel parmi une vingtaine d'actions
   et ETF larges (actions US, ADR européennes/asiatiques, ETF S&P 500 /
   MSCI World / Nasdaq 100), avec recherche.
3. **Objectifs** — horizon, niveau de connaissance, objectif principal.
4. **Dashboard** — pour chaque actif : cours réel (Finnhub), paragraphe
   factuel construit à partir des actualités réelles (Alpha Vantage),
   recommandation et niveau de confiance justifié, plus une vue d'ensemble
   sectorielle/géographique du portefeuille.

## Configuration des clés API (gratuites)

Deux façons de renseigner vos clés :

- **Fichier `.env`** (recommandé) : copiez `.env.example` en `.env` et
  renseignez `VITE_FINNHUB_API_KEY` et `VITE_ALPHA_VANTAGE_API_KEY`.
- **Ou directement dans `src/config.js`**, en remplaçant les constantes
  `VOTRE_CLE_FINNHUB_ICI` / `VOTRE_CLE_ALPHA_VANTAGE_ICI`.

Obtenir des clés gratuites :

- Finnhub : https://finnhub.io/register (~60 requêtes/minute)
- Alpha Vantage : https://www.alphavantage.co/support/#api-key (25 requêtes/jour, 5/minute)

⚠️ Le niveau gratuit d'Alpha Vantage est très limité. Le dashboard échelonne
donc ses appels (un toutes les ~13s) et affiche un message clair — avec un
bouton pour réessayer — dès que le quota est atteint, plutôt que d'inventer
des données.

## Lancer le projet

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
