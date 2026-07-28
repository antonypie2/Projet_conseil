import { useState } from 'react'

const QUESTIONS = [
  {
    key: 'horizon',
    label: "Quel est votre horizon d'investissement ?",
    options: [
      { value: 'court', label: 'Court terme (< 2 ans)' },
      { value: 'moyen', label: 'Moyen terme (2 à 5 ans)' },
      { value: 'long', label: 'Long terme (5 à 10 ans)' },
      { value: 'tres_long', label: 'Très long terme (10 ans et plus)' },
    ],
  },
  {
    key: 'knowledge',
    label: 'Comment décririez-vous votre niveau de connaissance en bourse ?',
    options: [
      { value: 'debutant', label: 'Débutant' },
      { value: 'intermediaire', label: 'Intermédiaire' },
      { value: 'avance', label: 'Avancé' },
    ],
  },
  {
    key: 'objective',
    label: 'Quel est votre objectif principal ?',
    options: [
      { value: 'croissance', label: 'Faire croître mon capital' },
      { value: 'revenu', label: 'Générer des revenus réguliers' },
      { value: 'preservation', label: 'Préserver mon capital' },
      { value: 'apprentissage', label: 'Apprendre en pratiquant' },
    ],
  },
]

export default function GoalsScreen({ firstName, initialGoals, onNext, onBack }) {
  const [answers, setAnswers] = useState(initialGoals)

  const allAnswered = QUESTIONS.every((q) => answers[q.key])

  function select(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="screen">
      <div className="card wide-card">
        <p className="eyebrow">Étape 3 sur 3</p>
        <h1>Vos objectifs, {firstName}</h1>
        <p className="subtitle">Ces réponses nous aident à contextualiser l'analyse de votre portefeuille.</p>

        {QUESTIONS.map((q) => (
          <fieldset key={q.key} className="question-block">
            <legend>{q.label}</legend>
            <div className="options-row">
              {q.options.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={`option-pill ${answers[q.key] === opt.value ? 'option-pill-selected' : ''}`}
                  onClick={() => select(q.key, opt.value)}
                  aria-pressed={answers[q.key] === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="button-row">
          <button type="button" className="btn btn-secondary" onClick={() => onBack(answers)}>
            Retour
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!allAnswered}
            onClick={() => onNext(answers)}
          >
            Voir mon portefeuille
          </button>
        </div>
      </div>
    </div>
  )
}
