import PortfolioOverview from '../components/PortfolioOverview'
import AssetCard from '../components/AssetCard'
import AlertsPanel from '../components/AlertsPanel'

export default function DashboardView({
  assetStates,
  onRetryQuote,
  onRetryNews,
  onRetryAi,
  onRemove,
  onOpenDetail,
}) {
  const assets = assetStates.map((s) => s.asset)

  return (
    <>
      <div className="info-banner">
        Les prix proviennent de Finnhub (niveau gratuit), les actualités/sentiment
        d'Alpha Vantage (niveau gratuit, limité à 25 requêtes/jour et 5/minute), et la
        recommandation structurée de Gemini (Google, niveau gratuit). Si un quota est
        atteint ou qu'un appel échoue, la carte concernée affiche un message d'erreur
        clair avec un bouton pour réessayer, plutôt que des données inventées.
      </div>

      <AlertsPanel assetStates={assetStates} onOpenDetail={onOpenDetail} />

      <PortfolioOverview assets={assets} />

      <div className="asset-list">
        {assetStates.map((assetState) => (
          <AssetCard
            key={assetState.symbol}
            assetState={assetState}
            onRetryQuote={() => onRetryQuote(assetState.symbol)}
            onRetryNews={() => onRetryNews(assetState.symbol)}
            onRetryAi={() => onRetryAi(assetState.symbol)}
            onRemove={() => onRemove(assetState.symbol)}
            onOpenDetail={() => onOpenDetail(assetState.symbol)}
          />
        ))}
        {assetStates.length === 0 && (
          <div className="card empty-portfolio">
            <p>Votre portefeuille est vide. Ajoutez des actifs depuis l'onglet Découvrir.</p>
          </div>
        )}
      </div>
    </>
  )
}
