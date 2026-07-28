// Univers d'actifs proposés à la sélection : actions individuelles + ETF larges.
// Tous les tickers sont cotés sur des places US (ou via ADR) afin de rester
// compatibles avec le niveau gratuit de Finnhub (quotes) et Alpha Vantage (news).
export const ASSET_UNIVERSE = [
  { symbol: 'AAPL', name: 'Apple', type: 'Action', sector: 'Technologie', region: 'États-Unis' },
  { symbol: 'MSFT', name: 'Microsoft', type: 'Action', sector: 'Technologie', region: 'États-Unis' },
  { symbol: 'GOOGL', name: 'Alphabet (Google)', type: 'Action', sector: 'Technologie', region: 'États-Unis' },
  { symbol: 'AMZN', name: 'Amazon', type: 'Action', sector: 'Consommation discrétionnaire', region: 'États-Unis' },
  { symbol: 'NVDA', name: 'Nvidia', type: 'Action', sector: 'Technologie', region: 'États-Unis' },
  { symbol: 'TSLA', name: 'Tesla', type: 'Action', sector: 'Consommation discrétionnaire', region: 'États-Unis' },
  { symbol: 'META', name: 'Meta Platforms', type: 'Action', sector: 'Communication', region: 'États-Unis' },
  { symbol: 'JPM', name: 'JPMorgan Chase', type: 'Action', sector: 'Finance', region: 'États-Unis' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'Action', sector: 'Santé', region: 'États-Unis' },
  { symbol: 'V', name: 'Visa', type: 'Action', sector: 'Finance', region: 'États-Unis' },
  { symbol: 'PG', name: 'Procter & Gamble', type: 'Action', sector: 'Consommation de base', region: 'États-Unis' },
  { symbol: 'XOM', name: 'ExxonMobil', type: 'Action', sector: 'Énergie', region: 'États-Unis' },
  { symbol: 'KO', name: 'Coca-Cola', type: 'Action', sector: 'Consommation de base', region: 'États-Unis' },
  { symbol: 'DIS', name: 'Walt Disney', type: 'Action', sector: 'Communication', region: 'États-Unis' },
  { symbol: 'NFLX', name: 'Netflix', type: 'Action', sector: 'Communication', region: 'États-Unis' },
  { symbol: 'ASML', name: 'ASML Holding', type: 'Action', sector: 'Technologie', region: 'Europe' },
  { symbol: 'NVO', name: 'Novo Nordisk', type: 'Action', sector: 'Santé', region: 'Europe' },
  { symbol: 'SONY', name: 'Sony Group', type: 'Action', sector: 'Technologie', region: 'Asie' },
  { symbol: 'BABA', name: 'Alibaba', type: 'Action', sector: 'Consommation discrétionnaire', region: 'Asie' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'ETF', sector: 'ETF actions larges', region: 'États-Unis' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', type: 'ETF', sector: 'ETF actions larges', region: 'États-Unis' },
  { symbol: 'URTH', name: 'iShares MSCI World ETF', type: 'ETF', sector: 'ETF actions larges', region: 'Monde' },
]

export function getAssetBySymbol(symbol) {
  return ASSET_UNIVERSE.find((a) => a.symbol === symbol)
}
