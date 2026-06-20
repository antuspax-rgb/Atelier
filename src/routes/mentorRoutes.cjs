const express = require("express");
const router = express.Router();

const { SONNET, callClaude, callClaudeText } = require("../config/ai.cjs");
const { buildMentorChatSystem } = require("../mentor/prompts.cjs");
const { buildStudentContextBlock } = require("../mentor/identity.cjs");
const { pickReferences } = require("../mentor/references.cjs");
const { normalizeChatReply } = require("../utils/normalize.cjs");

function extractQuotedValue(text) {
  const quoted = text.match(/["“”'‘’]([^"“”'‘’]{3,180})["“”'‘’]/);
  return quoted?.[1]?.trim() || "";
}

function cleanExtractedActionValue(value = "") {
  return String(value)
    .replace(/\s+(per favore|grazie)$/i, "")
    .trim()
    .slice(0, 180);
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanSearchUrl(url = "") {
  const decoded = decodeHtml(url);
  try {
    const parsed = new URL(decoded, "https://duckduckgo.com");
    const uddg = parsed.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : parsed.href;
  } catch {
    return decoded;
  }
}

async function searchWebResources(query) {
  if (!query) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
      headers: { "user-agent": "AtelierMentor/1.0" }
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results = [];
    const pattern = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = pattern.exec(html)) && results.length < 4) {
      const title = decodeHtml(match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
      const resultUrl = cleanSearchUrl(match[1]);
      if (title && resultUrl && !results.some((item) => item.url === resultUrl)) results.push({ title, url: resultUrl });
    }
    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function extractFocusValue(message = "") {
  const quoted = extractQuotedValue(message);
  if (quoted) return cleanExtractedActionValue(quoted);

  const text = String(message);
  const match =
    text.match(/(?:focus|fuoco)\s*(?:è|e'|=|in|su|a|verso|:)\s*([a-zà-ù0-9][^.,;!?]{2,80})/i) ||
    text.match(/concentrarm[ia]?\s+(?:su|sul|sulla|in|nel|nella)\s*([a-zà-ù0-9][^.,;!?]{2,80})/i);
  return match ? cleanExtractedActionValue(match[1]) : "";
}

function normalizeContextExercise(context = {}) {
  const raw = context.currentExercise || {};
  const exercise = {
    type: raw.type || "",
    title: raw.title || context.exerciseTitle || "",
    category: raw.category || "",
    difficulty: raw.difficulty || "",
    duration: raw.duration || "",
    objective: raw.objective || "",
    promptText: raw.promptText || raw.brief || context.exercisePrompt || "",
    notes: raw.notes || "",
    reference: raw.reference || null
  };

  return Object.values(exercise).some(Boolean) ? exercise : null;
}

async function buildReferenceTips(message = "", context = {}) {
  if (!/(reference|riferiment|ispiraz|artstation|artist|studio|spunti|tips|consigli|migliorare|cerca)/i.test(message)) return "";
  const currentExercise = normalizeContextExercise(context);
  const references = pickReferences({
    category: currentExercise?.category || context?.focus || "",
    title: `${message} ${currentExercise?.title || ""} ${context?.focus || ""}`,
    promptText: currentExercise?.promptText || ""
  });
  const webResults = await searchWebResources(`${message} concept art reference artist portfolio ArtStation`);
  const webBlock = webResults.length
    ? `\n\nWeb results:\n${webResults.map((item) => `- ${item.title}\n  ${item.url}`).join("\n")}`
    : "";
  return `\n\nReference directions:\n${references
    .map((reference) => `- ${reference.angle || "studio"}: ${reference.title} (${reference.platform}) - ${reference.why}\n  ${reference.url}`)
    .join("\n")}${webBlock}`;
}

function buildMentorActions(message = "", context = {}) {
  const actions = [];
  const currentExercise = normalizeContextExercise(context);
  const quoted = extractQuotedValue(message);
  const focusValue = extractFocusValue(message);
  const wantsFocusUpdate =
    /(cambia|aggiorna|imposta|modifica).{0,32}(focus|fuoco)/i.test(message) ||
    /(voglio|vorrei).{0,32}concentrarm/i.test(message) ||
    /(?:focus|fuoco)\s*(?:è|e'|=|in|su|a|verso|:)/i.test(message);

  if (wantsFocusUpdate && focusValue) {
    actions.push({ type: "update_focus", value: focusValue });
  }
  if (/(cambia|aggiorna|imposta|modifica).{0,24}(obiettivo|goal)/i.test(message) && quoted) {
    actions.push({ type: "update_goal", value: quoted });
  }
  if (/(cambia|aggiorna|imposta|modifica).{0,24}(livello|level)/i.test(message) && quoted) {
    actions.push({ type: "update_level", value: quoted });
  }
  if (/(rivedi|modifica|riscrivi|revisiona).{0,40}(esercizio|consegna|brief)/i.test(message) && currentExercise) {
    actions.push({ type: "revise_current_exercise", patch: { objective: quoted || currentExercise.objective, promptText: quoted || currentExercise.promptText || currentExercise.objective } });
  }
  if (/(cancella|elimina|rimuovi|archivia).{0,40}(esercizio|consegna|brief)/i.test(message)) {
    actions.push({ type: "delete_exercise" });
  }
  const thumbnailMatch = message.match(/(?:porta|cambia|modifica|aggiorna).{0,80}(?:a|in)\s*(\d{1,2})\s*(thumbnail|thumb|bozzetti|sketch)/i);
  if (thumbnailMatch && currentExercise) {
    actions.push({
      type: "update_exercise",
      patch: {
        notes: `Deliverable aggiornato: ${Number(thumbnailMatch[1])} ${thumbnailMatch[2]}.`,
        promptText: `${currentExercise.promptText || currentExercise.objective || ""}\n\nAggiornamento Mentor: porta il deliverable a ${Number(thumbnailMatch[1])} ${thumbnailMatch[2]}.`.trim()
      }
    });
  }
  if (/(crea|genera|prepara).{0,32}(un|nuovo|una)?\s*(esercizio|brief|consegna)/i.test(message)) {
    actions.push({
      type: "create_exercise",
      exercise: {
        type: "custom",
        title: quoted || "Esercizio Mentor",
        difficulty: "Studio",
        category: context?.focus || "Concept Art",
        duration: 45,
        objective: quoted || "Allenare il focus attuale con una consegna mirata.",
        promptText: quoted || "Svolgi uno studio mirato: prima chiarezza della forma grande, poi vincoli e dettagli funzionali.",
        notes: "Creato dal Mentor in chat."
      }
    });
  }
  if (!actions.length && message.toLowerCase().includes("creature design") && /(focus|fuoco)/i.test(message)) {
    actions.push({ type: "update_focus", value: "creature design" });
  }
  return actions;
}

router.post("/api/mentor-chat", async (req, res) => {
  const { message, images = [], context = {} } = req.body || {};

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "Campo obbligatorio: message" });
  }

  const streak = Number(context.streak || 0);

  const userPrompt = `
${buildStudentContextBlock(context)}

Messaggio utente:
${String(message).trim()}

Se sono presenti immagini, trattale come materiale visivo da analizzare o commentare.
Possono essere sketch, concept, studi di silhouette, anatomy study, sculpt screenshot, blockout o design work.
Se l'immagine è poco leggibile, dichiaralo con chiarezza e chiedi un'inquadratura o un'immagine migliore.
Se l'utente chiede di cambiare goal, focus, livello o rivedere l'esercizio attivo, puoi proporre anche actions strutturate.
Se nel contesto leggi "stato esercizio attivo: presente", considera quell'esercizio come attivo anche se alcuni campi sono incompleti. Non dire che manca un esercizio attivo.
Puoi creare, aggiornare o cancellare l'esercizio attivo solo se l'utente lo chiede chiaramente.
Non inventare action se la richiesta non è esplicita.
Rispondi come il Mentor di Atelier, in italiano.
`;

  try {
    const system = buildMentorChatSystem(streak);
    const data = images.length
      ? await callClaude(SONNET, system, userPrompt, images)
      : await callClaudeText(SONNET, system, userPrompt);
    const normalized = normalizeChatReply(data);
    res.json({
      ...normalized,
      reply: `${normalized.reply}${await buildReferenceTips(String(message), context)}`,
      actions: [...normalized.actions, ...buildMentorActions(String(message), context)].slice(0, 4)
    });
  } catch (err) {
    console.error("[mentor-chat]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
