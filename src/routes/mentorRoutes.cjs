const express = require("express");
const router = express.Router();

const { SONNET, callClaude, callClaudeText } = require("../config/ai.cjs");
const { buildMentorChatSystem } = require("../mentor/prompts.cjs");
const { buildStudentContextBlock } = require("../mentor/identity.cjs");
const { normalizeChatReply } = require("../utils/normalize.cjs");

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
Rispondi come il Mentor di Atelier, in italiano.
`;

  try {
    const system = buildMentorChatSystem(streak);
    const data = images.length
      ? await callClaude(SONNET, system, userPrompt, images)
      : await callClaudeText(SONNET, system, userPrompt);
    res.json(normalizeChatReply(data));
  } catch (err) {
    console.error("[mentor-chat]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
