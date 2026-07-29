# Miroir Python de src/data/assets.js — référence statique utilisée côté
# serveur pour construire le prompt Gemini (secteur/région/type). Le frontend
# garde sa propre copie pour l'écran Découvrir, qui ne nécessite aucun appel
# réseau ; dupliquer une vingtaine de lignes de données 100% statiques est un
# compromis raisonnable plutôt qu'un risque de dérive réel.
ASSET_UNIVERSE = [
    {"symbol": "AAPL", "name": "Apple", "type": "Action", "sector": "Technologie", "region": "États-Unis"},
    {"symbol": "MSFT", "name": "Microsoft", "type": "Action", "sector": "Technologie", "region": "États-Unis"},
    {"symbol": "GOOGL", "name": "Alphabet (Google)", "type": "Action", "sector": "Technologie", "region": "États-Unis"},
    {"symbol": "AMZN", "name": "Amazon", "type": "Action", "sector": "Consommation discrétionnaire", "region": "États-Unis"},
    {"symbol": "NVDA", "name": "Nvidia", "type": "Action", "sector": "Technologie", "region": "États-Unis"},
    {"symbol": "TSLA", "name": "Tesla", "type": "Action", "sector": "Consommation discrétionnaire", "region": "États-Unis"},
    {"symbol": "META", "name": "Meta Platforms", "type": "Action", "sector": "Communication", "region": "États-Unis"},
    {"symbol": "JPM", "name": "JPMorgan Chase", "type": "Action", "sector": "Finance", "region": "États-Unis"},
    {"symbol": "JNJ", "name": "Johnson & Johnson", "type": "Action", "sector": "Santé", "region": "États-Unis"},
    {"symbol": "V", "name": "Visa", "type": "Action", "sector": "Finance", "region": "États-Unis"},
    {"symbol": "PG", "name": "Procter & Gamble", "type": "Action", "sector": "Consommation de base", "region": "États-Unis"},
    {"symbol": "XOM", "name": "ExxonMobil", "type": "Action", "sector": "Énergie", "region": "États-Unis"},
    {"symbol": "KO", "name": "Coca-Cola", "type": "Action", "sector": "Consommation de base", "region": "États-Unis"},
    {"symbol": "DIS", "name": "Walt Disney", "type": "Action", "sector": "Communication", "region": "États-Unis"},
    {"symbol": "NFLX", "name": "Netflix", "type": "Action", "sector": "Communication", "region": "États-Unis"},
    {"symbol": "ASML", "name": "ASML Holding", "type": "Action", "sector": "Technologie", "region": "Europe"},
    {"symbol": "NVO", "name": "Novo Nordisk", "type": "Action", "sector": "Santé", "region": "Europe"},
    {"symbol": "SONY", "name": "Sony Group", "type": "Action", "sector": "Technologie", "region": "Asie"},
    {"symbol": "BABA", "name": "Alibaba", "type": "Action", "sector": "Consommation discrétionnaire", "region": "Asie"},
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "type": "ETF", "sector": "ETF actions larges", "region": "États-Unis"},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust (Nasdaq 100)", "type": "ETF", "sector": "ETF actions larges", "region": "États-Unis"},
    {"symbol": "URTH", "name": "iShares MSCI World ETF", "type": "ETF", "sector": "ETF actions larges", "region": "Monde"},
]

ASSET_BY_SYMBOL = {a["symbol"]: a for a in ASSET_UNIVERSE}


def get_asset(symbol: str) -> dict:
    return ASSET_BY_SYMBOL.get(symbol.upper(), {"symbol": symbol, "name": symbol, "type": "Action", "sector": "Inconnu", "region": "Inconnu"})
