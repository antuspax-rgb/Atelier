import { useEffect, useRef } from 'react';

export default function Mentor({
  state,
  chatInput,
  setChatInput,
  onSendMessage,
  busy,
  uploadedFiles,
  filePreviews,
  uploadError,
  onFileChange,
  onOpenFilePicker,
  fileInputRef,
  onRemoveFile
}) {
  const logRef = useRef(null);
  const canSend = Boolean(chatInput.trim() || uploadedFiles.length);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [state.mentorMessages, busy, filePreviews]);

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && canSend && !busy.chat) {
      e.preventDefault();
      onSendMessage(e);
    }
  }

  return (
    <div className="screen screen-chat">
      <header className="screen-head">
        <div>
          <p className="eyebrow">Mentor</p>
          <h1>Conversazione</h1>
        </div>
      </header>

      <div className="chat-shell card">
        <div className="chat" ref={logRef}>
          {state.mentorMessages.map((msg, idx) => (
            <article key={idx} className={`msg msg-${msg.role}`}>
              <span className="msg-role">{msg.role === 'assistant' ? 'Mentor' : 'Tu'}</span>
              <p>{msg.content}</p>
            </article>
          ))}

          {busy.chat ? (
            <article className="msg msg-assistant msg-typing">
              <span className="msg-role">Mentor</span>
              <p>
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </p>
            </article>
          ) : null}
        </div>

        <form className="composer" onSubmit={onSendMessage}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            onChange={onFileChange}
            style={{ display: 'none' }}
          />

          {uploadError ? (
            <div className="banner banner-error upload-error" role="alert">
              {uploadError}
            </div>
          ) : null}

          {filePreviews?.length ? (
            <div className="upload-preview-list compact">
              {filePreviews.map((file, index) => (
                <div key={`${file.name}-${index}`} className="upload-preview-item compact">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="upload-preview-thumb compact"
                  />

                  <div className="upload-preview-meta">
                    <strong>{file.name}</strong>
                    <span>
                      {Math.max(1, Math.round((uploadedFiles?.[index]?.size || file.size || 0) / 1024))} KB
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => onRemoveFile(index)}
                  >
                    Rimuovi
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Chiedi un drill, una correzione o come studiare un artista."
          />

          <div className="chat-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={onOpenFilePicker}
            >
              Aggiungi immagini
            </button>

            <button
              type="submit"
              className="btn primary"
              disabled={busy.chat || !canSend}
            >
              {busy.chat ? 'Invio...' : 'Invia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
