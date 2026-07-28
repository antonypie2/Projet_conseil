# Assistant Portefeuille — MVP

Application React (état en mémoire, sans base de données) qui aide un
investisseur à comprendre ce qui se passe sur les actifs de son portefeuille :
prix réel, contexte d'actualité, recommandation IA structurée et alertes de
crise/urgence.

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
     retrait d'actifs à tout moment.
   - **Découvrir** — actifs non détenus classés par affinité avec le profil
     (risque/horizon/secteurs), classement 100% local sans appel API.
   - **Profil** — tolérance au risque, horizon, secteurs préférés :
     éditable à tout moment, pilote directement le classement de Découvrir.
   - **Fiche détail** par actif (accessible depuis Portefeuille/Découvrir) :
     graphique de prix ~60 séances, fondamentaux (P/E, bêta, capitalisation,
     dividende, objectif analystes), toutes les actualités, et la même
     recommandation IA.

## Configuration des clés API (toutes gratuites)

Trois façons de renseigner vos clés :

- **Fichier `.env`** (recommandé) : copiez `.env.example` en `.env` et
  renseignez les trois variables ci-dessous.
- **Ou directement dans `src/config.js`**, en remplaçant les constantes
  `VOTRE_CLE_..._ICI`.

| Clé | Usage | Niveau |
|---|---|---|
| `VITE_FINNHUB_API_KEY` | Cours et variations | Gratuit — https://finnhub.io/register (~60 req/min) |
| `VITE_ALPHA_VANTAGE_API_KEY` | Actualités, sentiment, fondamentaux, historique de prix | Gratuit — https://www.alphavantage.co/support/#api-key (25 req/jour, 5/min) |
| `VITE_GEMINI_API_KEY` | Recommandation IA structurée (Gemini, Google) | Gratuit, sans carte bancaire — https://aistudio.google.com/apikey |

⚠️ Le niveau gratuit d'Alpha Vantage est très limité. Les appels sont donc
échelonnés (un toutes les ~13s, y compris pour les actifs ajoutés depuis
Découvrir) et chaque carte affiche un message clair — avec un bouton pour
réessayer — dès que le quota est atteint, plutôt que d'inventer des données.
Idem pour Gemini et Finnhub en cas d'erreur ou de limite de requêtes.

⚠️ Les trois clés sont appelées **directement depuis le navigateur** (pas de
backend), donc visibles dans le bundle livré au client — cohérent avec
l'architecture 100% frontend de ce MVP, mais à ne pas reproduire tel quel en
production sans un backend qui les protège.

## Lancer le projet

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
