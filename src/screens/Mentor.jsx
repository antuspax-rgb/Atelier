import { useEffect, useRef } from 'react';

export default function Mentor({ state, chatInput, setChatInput, onSendMessage, busy }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [state.mentorMessages, busy]);

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
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
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Chiedi un drill, una correzione o come studiare un artista."
          />

          <div className="chat-actions">
            <button className="btn primary" disabled={busy.chat || !chatInput.trim()}>
              Invia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}