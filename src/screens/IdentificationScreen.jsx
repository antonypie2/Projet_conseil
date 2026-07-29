import { useState } from 'react'

export default function IdentificationScreen({ onNext, bootstrapError }) {
  const [firstName, setFirstName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = firstName.trim()
    if (trimmed) onNext(trimmed)
  }

  return (
    <div className="screen screen-centered">
      <div className="card intro-card">
        <p className="eyebrow">Assistant d'investissement</p>
        <h1>Bienvenue</h1>
        <p className="subtitle">
          Comprenez ce qui se passe réellement sur votre portefeuille, sans y passer des heures.
        </p>
        {bootstrapError && (
          <div className="error-box">
            <p>
              ⚠️ Serveur backend injoignable ({bootstrapError}). Vos données ne pourront pas être
              sauvegardées tant qu'il n'est pas démarré, mais vous pouvez continuer.
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <label htmlFor="firstName">Votre prénom</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Ex : Antony"
            autoFocus
            required
          />
          <button type="submit" className="btn btn-primary" disabled={!firstName.trim()}>
            Commencer
          </button>
        </form>
      </div>
    </div>
  )
}
