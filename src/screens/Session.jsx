function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function scoreTone(v) {
  if (v >= 8) return 'good';
  if (v >= 6) return 'mid';
  return 'low';
}

function normalizeScores(fb) {
  if (!fb?.scores) return null;
  return [
    { label: 'Silhouette', value: Number(fb.scores.silhouette || 0) },
    { label: 'Struttura', value: Number(fb.scores.structure || 0) },
    { label: 'Chiarezza', value: Number(fb.scores.clarity || 0) }
  ];
}

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

export default function Session({
  state,
  busy,
  onAnalyzeWork,
  uploadedFiles,
  filePreviews,
  uploadError,
  onFileChange,
  onOpenFilePicker,
  fileInputRef,
  onRemoveFile,
  goTo
}) {
  const ex = state.currentExercise;
  const fb = state.feedback;
  const scores = normalizeScores(fb);

  if (!ex) {
    return (
      <div className="screen">
        <header className="screen-head">
          <div>
            <p className="eyebrow">Sessione</p>
            <h1>Nessun esercizio attivo</h1>
          </div>
        </header>
        <section className="card empty-card">
          <p className="muted">Genera un esercizio per iniziare la sessione di studio.</p>
          <button className="btn primary" onClick={() => goTo('exercises')}>Vai agli esercizi</button>
        </section>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">{ex.category} · {ex.difficulty} · {ex.duration} min</p>
          <h1>{ex.title}</h1>
        </div>
      </header>

      <section className="card">
        <div className="brief-grid">
          <div>
            <p className="field-label">Obiettivo</p>
            <p className="body">{ex.objective}</p>
          </div>
          <div>
            <p className="field-label">Brief</p>
            <p className="body">{ex.promptText}</p>
          </div>
          {ex.notes ? (
            <div>
              <p className="field-label">Vincoli</p>
              <p className="body">{ex.notes}</p>
            </div>
          ) : null}
          {ex.reference ? (
            <div>
              <p className="field-label">Reference</p>
              <p className="body"><strong>{ex.reference.title}</strong></p>
              <p className="muted small">{ex.reference.why}</p>
              {ex.reference.url ? (
                <a className="link" href={ex.reference.url} target="_blank" rel="noopener noreferrer">
                  Apri riferimento →
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Carica elaborato</h2>
          <div className="row gap">
            <button className="btn ghost" onClick={onOpenFilePicker}>Seleziona file</button>
            <button
              className="btn primary"
              onClick={onAnalyzeWork}
              disabled={busy.feedback || !uploadedFiles.length}
            >
              {busy.feedback ? 'Analizzo…' : 'Analizza'}
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          onChange={onFileChange}
          style={{ display: 'none' }}
        />

        {uploadError ? (
          <div className="banner banner-error" role="alert">
            {uploadError}
          </div>
        ) : null}

        {filePreviews?.length ? (
          <div className="thumb-grid">
            {filePreviews.map((file, i) => (
              <figure className="thumb" key={`${file.name}-${i}`}>
                <img src={file.url} alt={file.name} />
                <figcaption>
                  <span className="truncate">{file.name}</span>
                  <span className="muted small">{formatFileSize(file.size)}</span>
                </figcaption>
                <button className="thumb-remove" onClick={() => onRemoveFile(i)} aria-label="Rimuovi">×</button>
              </figure>
            ))}
          </div>
        ) : (
          <div className="dropzone">
            <p>Trascina qui o seleziona le immagini del tuo lavoro.</p>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Feedback del Mentor</h2>
          {fb?.depth ? <span className="pill">{fb.depth}</span> : null}
        </div>

        {fb ? (
          <div className="stack">
            {fb.opening ? <p className="body lead">{fb.opening}</p> : null}

            {scores ? (
              <div className="score-row">
                {scores.map((s) => (
                  <div key={s.label} className={`score-cell score-${scoreTone(s.value)}`}>
                    <span className="score-label">{s.label}</span>
                    <strong className="score-value">{s.value}<small>/10</small></strong>
                    <div className="score-bar"><div style={{ width: `${s.value * 10}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid-3">
              <div>
                <p className="field-label">Punti forti</p>
                <List items={fb.strengths} empty="Nessun dato." />
              </div>
              <div>
                <p className="field-label">Errori prioritari</p>
                <List items={fb.errors} empty="Nessun errore rilevato." />
              </div>
              <div>
                <p className="field-label">Azioni pratiche</p>
                <List items={fb.actions} empty="Nessuna azione." />
              </div>
            </div>

            {fb.closing ? <div className="banner">{fb.closing}</div> : null}
          </div>
        ) : (
          <p className="muted">Carica le immagini e avvia l’analisi per ricevere score, punti forti, errori e azioni.</p>
        )}
      </section>
    </div>
  );
}
