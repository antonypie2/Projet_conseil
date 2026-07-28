// Univers d'actifs proposés à la sélection : actions individuelles + ETF larges.
// Tous les tickers sont cotés sur des places US (ou via ADR) afin de rester
// compatibles avec le niveau gratuit de Finnhub (quotes) et Alpha Vantage (news).
//
// `risk` (low/medium/high) et `horizon` (sous-ensemble de court/moyen/long/tres_long)
// alimentent le moteur de correspondance de l'écran Découvrir — ce sont des tags
// éditoriaux simples, pas une notation financière.
export const ASSET_UNIVERSE = [
  { symbol: 'AAPL', name: 'Apple', type: 'Action', sector: 'Technologie', region: 'États-Unis', risk: 'low', horizon: ['moyen', 'long', 'tres_long'] },
  { symbol: 'MSFT', name: 'Microsoft', type: 'Action', sector: 'Technologie', region: 'États-Unis', risk: 'low', horizon: ['moyen', 'long', 'tres_long'] },
  { symbol: 'GOOGL', name: 'Alphabet (Google)', type: 'Action', sector: 'Technologie', region: 'États-Unis', risk: 'medium', horizon: ['moyen', 'long'] },
  { symbol: 'AMZN', name: 'Amazon', type: 'Action', sector: 'Consommation discrétionnaire', region: 'États-Unis', risk: 'medium', horizon: ['moyen', 'long'] },
  { symbol: 'NVDA', name: 'Nvidia', type: 'Action', sector: 'Technologie', region: 'États-Unis', risk: 'high', horizon: ['court', 'moyen'] },
  { symbol: 'TSLA', name: 'Tesla', type: 'Action', sector: 'Consommation discrétionnaire', region: 'États-Unis', risk: 'high', horizon: ['court', 'moyen'] },
  { symbol: 'META', name: 'Meta Platforms', type: 'Action', sector: 'Communication', region: 'États-Unis', risk: 'medium', horizon: ['moyen', 'long'] },
  { symbol: 'JPM', name: 'JPMorgan Chase', type: 'Action', sector: 'Finance', region: 'États-Unis', risk: 'low', horizon: ['long', 'tres_long'] },
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'Action', sector: 'Santé', region: 'États-Unis', risk: 'low', horizon: ['long', 'tres_long'] },
  { symbol: 'V', name: 'Visa', type: 'Action', sector: 'Finance', region: 'États-Unis', risk: 'low', horizon: ['long', 'tres_long'] },
  { symbol: 'PG', name: 'Procter & Gamble', type: 'Action', sector: 'Consommation de base', region: 'États-Unis', risk: 'low', horizon: ['long', 'tres_long'] },
  { symbol: 'XOM', name: 'ExxonMobil', type: 'Action', sector: 'Énergie', region: 'États-Unis', risk: 'medium', horizon: ['moyen', 'long'] },
  { symbol: 'KO', name: 'Coca-Cola', type: 'Action', sector: 'Consommation de base', region: 'États-Unis', risk: 'low', horizon: ['long', 'tres_long'] },
  { symbol: 'DIS', name: 'Walt Disney', type: 'Action', sector: 'Communication', region: 'États-Unis', risk: 'medium', horizon: ['moyen', 'long'] },
  { symbol: 'NFLX', name: 'Netflix', type: 'Action', sector: 'Communication', region: 'États-Unis', risk: 'medium', horizon: ['moyen', 'long'] },
  { symbol: 'ASML', name: 'ASML Holding', type: 'Action', sector: 'Technologie', region: 'Europe', risk: 'medium', horizon: ['moyen', 'long'] },
  { symbol: 'NVO', name: 'Novo Nordisk', type: 'Action', sector: 'Santé', region: 'Europe', risk: 'low', horizon: ['long', 'tres_long'] },
  { symbol: 'SONY', name: 'Sony Group', type: 'Action', sector: 'Technologie', region: 'Asie', risk: 'medium', horizon: ['moyen', 'long'] },
  { symbol: 'BABA', name: 'Alibaba', type: 'Action', sector: 'Consommation discrétionnaire', region: 'Asie', risk: 'high', horizon: ['court', 'moyen'] },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'ETF', sector: 'ETF actions larges', region: 'États-Unis', risk: 'low', horizon: ['moyen', 'long', 'tres_long'] },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', type: 'ETF', sector: 'ETF actions larges', region: 'États-Unis', risk: 'medium', horizon: ['moyen', 'long'] },
  { symbol: 'URTH', name: 'iShares MSCI World ETF', type: 'ETF', sector: 'ETF actions larges', region: 'Monde', risk: 'low', horizon: ['moyen', 'long', 'tres_long'] },
]

export function getAssetBySymbol(symbol) {
  return ASSET_UNIVERSE.find((a) => a.symbol === symbol)
}
