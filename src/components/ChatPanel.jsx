export default function ChatPanel({
  messages,
  chatInput,
  setChatInput,
  onSubmit,
  busy,
  chatFilePreviews,
  onChatFileChange,
  onOpenChatFilePicker,
  onRemoveChatFile,
  chatFileInputRef
}) {
  return (
    <section className="panel chat-panel">
      <h2>Mentor chat</h2>

      <div className="chat-log">
        {messages.map((msg, idx) => (
          <article key={idx} className={`bubble ${msg.role}`}>
            <span>{msg.role === 'assistant' ? 'Mentor' : 'Tu'}</span>
            <p>{msg.content}</p>
          </article>
        ))}
      </div>

      {chatFilePreviews.length > 0 && (
        <div className="upload-preview-list compact">
          {chatFilePreviews.map((file, index) => (
            <article key={`${file.name}-${index}`} className="upload-preview-item compact">
              <img src={file.url} alt={file.name} className="upload-preview-thumb compact" />
              <div className="upload-preview-meta">
                <strong>{file.name}</strong>
              </div>
              <button type="button" className="ghost" onClick={() => onRemoveChatFile(index)}>
                Rimuovi
              </button>
            </article>
          ))}
        </div>
      )}

      <form className="chat-form" onSubmit={onSubmit}>
        <input
          ref={chatFileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onChatFileChange}
        />

        <textarea
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          rows={4}
          placeholder="Scrivi al mentor, chiedi un drill, una correzione o come studiare un artista."
        />

        <div className="chat-actions">
          <button type="button" className="ghost" onClick={onOpenChatFilePicker}>
            Allega immagini
          </button>

          <button className="primary" disabled={busy}>
            Invia
          </button>
        </div>
      </form>
    </section>
  );
}
