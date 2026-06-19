export default function Dashboard({
  state,
  goal,
  setGoal,
  profile,
  setProfile,
  onToggleFocus,
  onResetFocus,
  secondsToClock,
  busy,
  goTo
}) {
  const ex = state.currentExercise;
  const fb = state.feedback;

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">Bentornato</p>
          <h1>Studio di oggi</h1>
        </div>
        <button className="btn primary" onClick={() => goTo('exercises')} disabled={busy.exercise}>
          {busy.exercise ? 'Genero...' : 'Nuovo esercizio'}
        </button>
      </header>

      <section className="stat-row">
        <article className="stat-card">
          <span className="stat-label">Streak</span>
          <strong className="stat-value">{state.streak}<small>giorni</small></strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Ore totali</span>
          <strong className="stat-value">{state.totalHours}<small>h</small></strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Oggi</span>
          <strong className="stat-value">{state.dailyMinutes}<small>min</small></strong>
        </article>
        <article className="stat-card stat-card-accent">
          <span className="stat-label">Focus</span>
          <strong className="stat-value mono">{secondsToClock(state.focusMode.secondsLeft)}</strong>
        </article>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Focus session</h2>
            <span className={`pill ${state.focusMode.running ? 'pill-live' : ''}`}>
              {state.focusMode.running ? 'In corso' : 'In pausa'}
            </span>
          </div>
          <div className="focus-timer-large mono">{secondsToClock(state.focusMode.secondsLeft)}</div>
          <div className="row gap">
            <button className="btn primary" onClick={onToggleFocus}>
              {state.focusMode.running ? 'Pausa' : 'Avvia'}
            </button>
            <button className="btn ghost" onClick={onResetFocus}>Reset</button>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Esercizio attivo</h2>
            {ex ? <span className="pill pill-live">attivo</span> : null}
          </div>
          {ex ? (
            <>
              <h3 className="lead">{ex.title}</h3>
              <p className="muted small">{ex.category} · {ex.difficulty} · {ex.duration} min</p>
              <p className="body">{ex.objective}</p>
              <button className="btn ghost" onClick={() => goTo('session')}>Apri sessione</button>
            </>
          ) : (
            <>
              <p className="muted">Nessun esercizio assegnato. Generane uno per cominciare.</p>
              <button className="btn primary" onClick={() => goTo('exercises')} disabled={busy.exercise}>
                {busy.exercise ? 'Genero...' : 'Genera esercizio'}
              </button>
            </>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Direzione</h2>
        </div>
        <label className="field">
          <span className="field-label">Obiettivo a lungo termine</span>
          <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span className="field-label">Focus</span>
            <input value={profile.focus} onChange={(e) => setProfile((p) => ({ ...p, focus: e.target.value }))} />
          </label>
          <label className="field">
            <span className="field-label">Livello</span>
            <input value={profile.level} onChange={(e) => setProfile((p) => ({ ...p, level: e.target.value }))} />
          </label>
        </div>
      </section>

      {fb ? (
        <section className="card">
          <div className="card-head">
            <h2>Ultimo feedback</h2>
            <button className="btn link" onClick={() => goTo('session')}>Vedi tutto →</button>
          </div>
          {fb.opening ? <p className="body">{fb.opening}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
