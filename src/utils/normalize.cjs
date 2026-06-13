function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(10, Math.round(n)));
}

function normalizeExercise(data = {}, type) {
  const durationFallback =
    type === "warmup" ? 15 : type === "complex" ? 75 : 180;

  return {
    title: typeof data.title === "string" ? data.title : "Nuovo esercizio Atelier",
    difficulty:
      typeof data.difficulty === "string"
        ? data.difficulty
        : type === "warmup"
        ? "Riscaldamento"
        : type === "complex"
        ? "Intermedio"
        : "Avanzato",
    category: typeof data.category === "string" ? data.category : "Concept Art",
    duration: Number.isFinite(Number(data.duration))
      ? Number(data.duration)
      : durationFallback,
    objective:
      typeof data.objective === "string"
        ? data.objective
        : "Allenare una competenza chiave di concept art.",
    promptText:
      typeof data.promptText === "string"
        ? data.promptText
        : "Svolgi il brief con ordine, chiarezza e focus sulle forme grandi.",
    notes:
      typeof data.notes === "string"
        ? data.notes
        : "Mantieni il lavoro leggibile e disciplinato."
  };
}

function normalizeAnalysisFeedback(fb = {}) {
  return {
    opening: typeof fb.opening === "string" ? fb.opening : "",
    strengths: Array.isArray(fb.strengths) ? fb.strengths.slice(0, 3) : [],
    errors: Array.isArray(fb.errors) ? fb.errors.slice(0, 3) : [],
    actions: Array.isArray(fb.actions) ? fb.actions.slice(0, 3) : [],
    closing: typeof fb.closing === "string" ? fb.closing : "",
    depth: typeof fb.depth === "string" ? fb.depth : "media",
    scores: {
      silhouette: clampScore(fb?.scores?.silhouette),
      structure: clampScore(fb?.scores?.structure),
      clarity: clampScore(fb?.scores?.clarity)
    }
  };
}

function normalizeChatReply(data = {}) {
  return {
    reply:
      typeof data.reply === "string" && data.reply.trim()
        ? data.reply.trim()
        : "Va bene. Mandami il contesto preciso e ti aiuto a chiarire il prossimo passo."
  };
}

module.exports = {
  clampScore,
  normalizeExercise,
  normalizeAnalysisFeedback,
  normalizeChatReply
};