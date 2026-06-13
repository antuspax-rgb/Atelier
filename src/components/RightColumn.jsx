function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getScoreTone(value) {
  if (value >= 8) return 'good';
  if (value >= 6) return 'mid';
  return 'low';
}

function normalizeScores(feedback) {
  if (!feedback?.scores) return null;

  return [
    {
      label: 'Silhouette',
      value: Number(feedback.scores.silhouette || 0)
    },
    {
      label: 'Struttura',
      value: Number(feedback.scores.structure || 0)
    },
    {
      label: 'Chiarezza',
      value: Number(feedback.scores.clarity || 0)
    }
  ];
}

function renderList(items = [], emptyText = 'Nessun dato disponibile.') {
  if (!items?.length) {
    return <p className="muted small">{emptyText}</p>;
  }

  return (
    <ul className="plain-list plain-list-soft">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export default function RightColumn({
  state,
  memory,
  curriculum,
  mobileRoadmap,
  onCreateExercise,
  onAnalyzeWork,
  busy,
  uploadedFiles,
  filePreviews,
  onFileChange,
  onOpenFilePicker,
  fileInputRef,
  onRemoveFile,
  hasActiveSession
}) {
  const scoreCards = normalizeScores(state.feedback);

  return (
    <div className="stack right-column-shell">
      <section className="panel hero-card">
        <div className="hero-card-top">
          <div className="hero-copy">
            <p className="eyebrow">Mentor Workspace</p>
            <h2>Sessione attuale</h2>
            <p className="lede">
              Genera un esercizio, carica il tuo elaborato e ricevi un feedback
              tecnico strutturato su silhouette, struttura e chiarezza.
            </p>
          </div>

          <div className={hasActiveSession ? 'mentor-status-badge' : 'mini-pill'}>
            <span className="status-dot" />
            {hasActiveSession ? 'Sessione attiva' : 'Pronto'}
          </div>
        </div>

        <div className="actions wrap" style={{ marginTop: '1rem' }}>
          <button
            className="ghost"
            onClick={() => onCreateExercise('warmup')}
            disabled={busy.exercise}
          >
            {busy.exercise ? 'Genero...' : 'Warmup'}
          </button>

          <button
            className="secondary"
            onClick={() => onCreateExercise('complex')}
            disabled={busy.exercise}
          >
            {busy.exercise ? 'Genero...' : 'Exercise'}
          </button>

          <button
            className="primary"
            onClick={() => onCreateExercise('extraComplex')}
            disabled={busy.exercise}
          >
            {busy.exercise ? 'Genero...' : 'AAA Brief'}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Current Exercise</p>
            <h3>Esercizio assegnato</h3>
          </div>
        </div>

        {state.currentExercise ? (
          <div className="stack">
            <div className="soft-block">
              <p className="label">Titolo</p>
              <h3>{state.currentExercise.title}</h3>
              <p className="muted">
                {state.currentExercise.category} • {state.currentExercise.difficulty} •{' '}
                {state.currentExercise.duration} min
              </p>
            </div>

            <div className="soft-block">
              <p className="label">Obiettivo</p>
              <p>{state.currentExercise.objective}</p>
            </div>

            <div className="soft-block">
              <p className="label">Brief</p>
              <p>{state.currentExercise.promptText}</p>
            </div>

            <div className="split two">
              <div className="soft-block">
                <p className="label">Vincoli</p>
                <p>{state.currentExercise.notes}</p>
              </div>

              <div className="soft-block">
                <p className="label">Reference consigliato</p>
                {state.currentExercise.reference ? (
                  <>
                    <p>
                      <strong>{state.currentExercise.reference.title}</strong>
                    </p>
                    <p className="muted small">{state.currentExercise.reference.why}</p>
                    <a
                      className="text-link"
                      href={state.currentExercise.reference.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Apri riferimento
                    </a>
                  </>
                ) : (
                  <p className="muted small">Nessun riferimento disponibile.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="muted">
            Non c’è ancora un esercizio attivo. Generane uno per iniziare una nuova
            sessione.
          </p>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Submission</p>
            <h3>Upload elaborato</h3>
          </div>
        </div>

        <div className="upload-box upload-box-elevated">
          <div className="upload-title">Carica immagini del tuo lavoro</div>
          <div className="upload-subtitle">
            Meglio screenshot puliti, leggibili e coerenti con la consegna attiva.
          </div>

          <div className="actions wrap">
            <button className="ghost" onClick={onOpenFilePicker}>
              Seleziona file
            </button>

            <button
              className="primary"
              onClick={onAnalyzeWork}
              disabled={busy.feedback || !state.currentExercise || !uploadedFiles.length}
            >
              {busy.feedback ? 'Analizzo...' : 'Analizza submission'}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {filePreviews?.length > 0 ? (
          <div className="upload-preview-grid" style={{ marginTop: '1rem' }}>
            {filePreviews.map((file, index) => (
              <article className="upload-preview-card" key={`${file.name}-${index}`}>
                <img
                  src={file.url}
                  alt={file.name}
                  className="upload-preview-image"
                />

                <div className="upload-preview-meta">
                  <strong>{file.name}</strong>
                  <span className="muted small">{formatFileSize(file.size)}</span>
                </div>

                <button className="ghost" onClick={() => onRemoveFile(index)}>
                  Rimuovi
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted small" style={{ marginTop: '1rem' }}>
            Nessun file caricato.
          </p>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Feedback</p>
            <h3>Analisi del Mentor</h3>
          </div>
          {state.feedback?.depth ? (
            <div className="mini-pill">{state.feedback.depth}</div>
          ) : null}
        </div>

        {state.feedback ? (
          <div className="stack">
            {state.feedback.opening ? (
              <div className="soft-block">
                <p>{state.feedback.opening}</p>
              </div>
            ) : null}

            {scoreCards ? (
              <div className="score-grid">
                {scoreCards.map((score) => (
                  <div
                    key={score.label}
                    className={`score-card score-${getScoreTone(score.value)}`}
                  >
                    <span>{score.label}</span>
                    <strong>{score.value}/10</strong>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="feedback-cluster">
              <div className="soft-block">
                <p className="label">Punti forti</p>
                {renderList(state.feedback.strengths, 'Nessun punto forte disponibile.')}
              </div>

              <div className="soft-block">
                <p className="label">Errori prioritari</p>
                {renderList(state.feedback.errors, 'Nessun errore rilevato.')}
              </div>

              <div className="soft-block">
                <p className="label">Azioni pratiche</p>
                {renderList(state.feedback.actions, 'Nessuna azione disponibile.')}
              </div>
            </div>

            {state.feedback.closing ? (
              <div className="success-banner">
                {state.feedback.closing}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="muted">
            Quando analizzi una submission, qui compariranno score, punti forti,
            errori e azioni correttive.
          </p>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Student Memory</p>
            <h3>Direzione di crescita</h3>
          </div>
        </div>

        <div className="mentor-priority-grid">
          <div className="priority-card priority-card-main">
            <strong>Goal</strong>
            <p className="muted">{memory?.goal || 'Non ancora impostato.'}</p>
          </div>

          <div className="priority-card">
            <strong>Focus</strong>
            <p className="muted">{memory?.focus || 'Nessun focus definito.'}</p>
          </div>

          <div className="priority-card">
            <strong>Livello</strong>
            <p className="muted">{memory?.level || 'developing'}</p>
          </div>

          <div className="priority-card">
            <strong>Stage</strong>
            <p className="muted">{curriculum?.stage || 'Percorso iniziale.'}</p>
          </div>
        </div>

        <div className="soft-block" style={{ marginTop: '1rem' }}>
          <p className="label">Target di miglioramento</p>
          {renderList(
            memory?.improvementTargets,
            'I target appariranno dopo le prime analisi.'
          )}
        </div>

        <div className="soft-block" style={{ marginTop: '1rem' }}>
          <p className="label">Principio guida</p>
          <p>{curriculum?.principle || 'Prima chiarezza e struttura, poi complessità.'}</p>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Curriculum</p>
            <h3>Piano settimanale</h3>
          </div>
        </div>

        {curriculum?.weeklyPlan?.length ? (
          <ul className="plain-list plain-list-soft">
            {curriculum.weeklyPlan.map((item, index) => (
              <li key={`${item.day}-${index}`}>
                <strong>{item.day}</strong>
                <div className="muted small">{item.focus}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nessun piano settimanale disponibile.</p>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Mobile Roadmap</p>
            <h3>Roadmap iOS</h3>
          </div>
        </div>

        {mobileRoadmap ? (
          <div className="stack">
            <div className="soft-block">
              <p>{mobileRoadmap.recommendation}</p>
            </div>

            <div className="soft-block">
              <p className="label">Step</p>
              {renderList(mobileRoadmap.steps, 'Nessuno step disponibile.')}
            </div>
          </div>
        ) : (
          <p className="muted">Roadmap mobile non disponibile.</p>
        )}
      </section>
    </div>
  );
}