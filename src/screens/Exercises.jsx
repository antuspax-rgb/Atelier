const TYPES = [
  {
    id: 'warmup',
    label: 'Warmup',
    description: 'Riscaldamento rapido per sciogliere mano e occhio.',
    duration: '10–15 min'
  },
  {
    id: 'complex',
    label: 'Exercise',
    description: 'Esercizio strutturato sul tuo focus attuale.',
    duration: '45–60 min'
  },
  {
    id: 'extraComplex',
    label: 'AAA Brief',
    description: 'Brief in stile produzione: vincoli, contesto, deliverable.',
    duration: '90+ min'
  }
];

export default function Exercises({ state, onCreateExercise, busy, goTo }) {
  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">Esercizi</p>
          <h1>Genera la prossima sessione</h1>
        </div>
      </header>

      <section className="exercise-grid">
        {TYPES.map((t) => (
          <article key={t.id} className={`exercise-card exercise-${t.id}`}>
            <div className="exercise-card-top">
              <h2>{t.label}</h2>
              <span className="pill">{t.duration}</span>
            </div>
            <p className="muted">{t.description}</p>
            <button
              className="btn primary"
              onClick={() => onCreateExercise(t.id)}
              disabled={busy.exercise}
            >
              {busy.exercise ? 'Genero…' : 'Genera'}
            </button>
          </article>
        ))}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Sessioni recenti</h2>
        </div>
        {state.recentSessions?.length ? (
          <ul className="list-clean">
            {state.recentSessions.map((s, i) => (
              <li key={i} className="list-row">
                <span>{s.type}</span>
                <span className="muted small">{s.when}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nessuna sessione completata ancora.</p>
        )}
      </section>

      {state.currentExercise ? (
        <section className="card">
          <div className="card-head">
            <h2>Esercizio in corso</h2>
            <button className="btn link" onClick={() => goTo('session')}>Vai alla sessione →</button>
          </div>
          <h3 className="lead">{state.currentExercise.title}</h3>
          <p className="muted small">
            {state.currentExercise.category} · {state.currentExercise.difficulty} · {state.currentExercise.duration} min
          </p>
        </section>
      ) : null}
    </div>
  );
}
