import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

function MessageAttachment({ file, fileIndex, onLoad }) {
  const [failed, setFailed] = useState(false);
  const src = file?.url || file?.thumbnailDataUrl;

  if (!src || failed) {
    return <span className="msg-attachment-missing">Allegato inviato · anteprima non più disponibile</span>;
  }

  return (
    <img
      src={src}
      alt={file.name || `Immagine ${fileIndex + 1}`}
      className="msg-attachment-thumb"
      onLoad={onLoad}
      onError={() => setFailed(true)}
    />
  );
}

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
  const bottomRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const messages = useMemo(() => (Array.isArray(state.mentorMessages) ? state.mentorMessages : []), [state.mentorMessages]);
  const canSend = Boolean(chatInput.trim() || uploadedFiles.length);

  function scrollToBottom(force = false) {
    const node = logRef.current;
    if (force) shouldStickToBottomRef.current = true;
    if (node) {
      node.scrollTop = node.scrollHeight;
      node.scrollTo({ top: node.scrollHeight });
    }
    bottomRef.current?.scrollIntoView({ block: 'end', inline: 'nearest' });
  }

  function settleAtBottom(force = false) {
    scrollToBottom(force);
    requestAnimationFrame(() => {
      scrollToBottom(force);
      requestAnimationFrame(() => scrollToBottom(force));
    });
    setTimeout(() => scrollToBottom(force), 80);
    setTimeout(() => scrollToBottom(force), 220);
  }

  function onChatScroll() {
    const node = logRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;
  }

  useLayoutEffect(() => {
    settleAtBottom(true);
  }, []);

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      settleAtBottom();
    }
  }, [messages, busy.chat, filePreviews]);

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
        <div className="chat" ref={logRef} onScroll={onChatScroll}>
          {messages.map((msg, idx) => (
            <article key={idx} className={`msg msg-${msg.role}`}>
              <span className="msg-role">{msg.role === 'assistant' ? 'Mentor' : 'Tu'}</span>
              <p>{msg.content || 'Messaggio non disponibile.'}</p>
              {Array.isArray(msg.attachments) && msg.attachments.length ? (
                <div className="msg-attachments">
                  {msg.attachments.map((file, fileIndex) => (
                    <MessageAttachment
                      key={`${file?.url || file?.name || 'attachment'}-${fileIndex}`}
                      file={file}
                      fileIndex={fileIndex}
                      onLoad={() => {
                        if (shouldStickToBottomRef.current) scrollToBottom();
                      }}
                    />
                  ))}
                </div>
              ) : null}
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
          <div ref={bottomRef} aria-hidden="true" />
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
              className="btn ghost btn-compact"
              onClick={onOpenFilePicker}
              disabled={busy.chat}
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
