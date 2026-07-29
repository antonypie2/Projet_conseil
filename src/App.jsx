import { useEffect, useState } from 'react'
import IdentificationScreen from './screens/IdentificationScreen'
import PortfolioScreen from './screens/PortfolioScreen'
import GoalsScreen from './screens/GoalsScreen'
import PortfolioWorkspace from './screens/PortfolioWorkspace'
import { getSession, resetSession } from './api/backend'
import './App.css'

const STEPS = {
  BOOTSTRAPPING: 'bootstrapping',
  IDENTIFICATION: 'identification',
  PORTFOLIO: 'portfolio',
  GOALS: 'goals',
  DASHBOARD: 'dashboard',
}

const EMPTY_GOALS = { horizon: null, knowledge: null, objective: null }

function App() {
  const [step, setStep] = useState(STEPS.BOOTSTRAPPING)
  const [firstName, setFirstName] = useState('')
  const [selectedSymbols, setSelectedSymbols] = useState([])
  const [goals, setGoals] = useState(EMPTY_GOALS)
  const [needsInit, setNeedsInit] = useState(true)
  const [bootstrapError, setBootstrapError] = useState(null)

  // Au chargement, on demande au backend s'il a déjà un portefeuille/profil
  // persisté (session précédente) — si oui, on saute directement au tableau
  // de bord au lieu de refaire l'onboarding.
  useEffect(() => {
    getSession()
      .then((session) => {
        if (session.onboarded) {
          setFirstName(session.profile.first_name)
          setSelectedSymbols(session.symbols)
          setGoals({
            horizon: session.profile.horizon,
            knowledge: session.profile.knowledge,
            objective: session.profile.objective,
            risk_tolerance: session.profile.risk_tolerance,
            sectors: session.profile.sectors,
          })
          setNeedsInit(false)
          setStep(STEPS.DASHBOARD)
        } else {
          setStep(STEPS.IDENTIFICATION)
        }
      })
      .catch((err) => {
        setBootstrapError(err.message)
        setStep(STEPS.IDENTIFICATION)
      })
  }, [])

  async function restart() {
    setStep(STEPS.BOOTSTRAPPING)
    try {
      await resetSession()
    } catch (err) {
      console.error('resetSession failed:', err.message)
    }
    setFirstName('')
    setSelectedSymbols([])
    setGoals(EMPTY_GOALS)
    setNeedsInit(true)
    setStep(STEPS.IDENTIFICATION)
  }

  if (step === STEPS.BOOTSTRAPPING) {
    return (
      <div className="screen screen-centered">
        <p className="loading-text">Chargement…</p>
      </div>
    )
  }

  if (step === STEPS.IDENTIFICATION) {
    return (
      <IdentificationScreen
        bootstrapError={bootstrapError}
        onNext={(name) => {
          setFirstName(name)
          setStep(STEPS.PORTFOLIO)
        }}
      />
    )
  }

  if (step === STEPS.PORTFOLIO) {
    return (
      <PortfolioScreen
        firstName={firstName}
        initialSelection={selectedSymbols}
        onBack={() => setStep(STEPS.IDENTIFICATION)}
        onNext={(symbols) => {
          setSelectedSymbols(symbols)
          setStep(STEPS.GOALS)
        }}
      />
    )
  }

  if (step === STEPS.GOALS) {
    return (
      <GoalsScreen
        firstName={firstName}
        initialGoals={goals}
        onBack={(answers) => {
          setGoals(answers)
          setStep(STEPS.PORTFOLIO)
        }}
        onNext={(answers) => {
          setGoals(answers)
          setStep(STEPS.DASHBOARD)
        }}
      />
    )
  }

  return (
    <PortfolioWorkspace
      firstName={firstName}
      initialSymbols={selectedSymbols}
      initialGoals={goals}
      needsInit={needsInit}
      onRestart={restart}
    />
  )
}

export default App
