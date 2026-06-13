function List({ items, empty }) {
  if (!items?.length) return <p className="muted small">{empty}</p>;
  return (
    <ul className="list-clean">
      {items.map((x, i) => (
        <li key={i} className="list-row">{x}</li>
      ))}
    </ul>
  );
}

export default function Progress({ state, memory, curriculum }) {
  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">Progress</p>
          <h1>Crescita e direzione</h1>
        </div>
      </header>

      <section className="stat-row">
        <article className="stat-card">
          <span className="stat-label">Streak</span>
          <strong className="stat-value">{state.streak}<small>giorni</small></strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Ore studio</span>
          <strong className="stat-value">{state.totalHours}<small>h</small></strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Sessioni</span>
          <strong className="stat-value">{state.recentSessions?.length || 0}</strong>
        </article>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Direzione</h2></div>
          <div className="kv">
            <div><span className="field-label">Goal</span><p className="body">{memory?.goal || '—'}</p></div>
            <div><span className="field-label">Focus</span><p className="body">{memory?.focus || '—'}</p></div>
            <div><span className="field-label">Livello</span><p className="body">{memory?.level || 'developing'}</p></div>
            <div><span className="field-label">Stage</span><p className="body">{curriculum?.stage || '—'}</p></div>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>Principio guida</h2></div>
          <p className="body lead">{curriculum?.principle || 'Prima chiarezza e struttura, poi complessità.'}</p>
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h2>Target di miglioramento</h2></div>
        <List items={memory?.improvementTargets} empty="I target appariranno dopo le prime analisi." />
      </section>

      <section className="card">
        <div className="card-head"><h2>Errori ricorrenti</h2></div>
        <List items={state.recurringErrors} empty="Nessun errore ricorrente registrato." />
      </section>

      <section className="card">
        <div className="card-head"><h2>Piano settimanale</h2></div>
        {curriculum?.weeklyPlan?.length ? (
          <ul className="week-plan">
            {curriculum.weeklyPlan.map((item, i) => (
              <li key={i}>
                <strong>{item.day}</strong>
                <span className="muted">{item.focus}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nessun piano disponibile.</p>
        )}
      </section>
    </div>
  );
}
