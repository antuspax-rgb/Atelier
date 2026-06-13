export default function ChatPanel({ messages, chatInput, setChatInput, onSubmit, busy }) {
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
      <form className="chat-form" onSubmit={onSubmit}>
        <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} rows={4} placeholder="Scrivi al mentor: chiedi un drill, una correzione o come studiare un artista." />
        <button className="primary" disabled={busy}>Invia</button>
      </form>
    </section>
  );
}