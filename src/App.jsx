import { useState } from 'react'
import IdentificationScreen from './screens/IdentificationScreen'
import PortfolioScreen from './screens/PortfolioScreen'
import GoalsScreen from './screens/GoalsScreen'
import DashboardScreen from './screens/DashboardScreen'
import './App.css'

const STEPS = {
  IDENTIFICATION: 'identification',
  PORTFOLIO: 'portfolio',
  GOALS: 'goals',
  DASHBOARD: 'dashboard',
}

const EMPTY_GOALS = { horizon: null, knowledge: null, objective: null }

function App() {
  const [step, setStep] = useState(STEPS.IDENTIFICATION)
  const [firstName, setFirstName] = useState('')
  const [selectedSymbols, setSelectedSymbols] = useState([])
  const [goals, setGoals] = useState(EMPTY_GOALS)

  function restart() {
    setStep(STEPS.IDENTIFICATION)
    setFirstName('')
    setSelectedSymbols([])
    setGoals(EMPTY_GOALS)
  }

  if (step === STEPS.IDENTIFICATION) {
    return (
      <IdentificationScreen
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

  return <DashboardScreen firstName={firstName} selectedSymbols={selectedSymbols} onRestart={restart} />
}

export default App
