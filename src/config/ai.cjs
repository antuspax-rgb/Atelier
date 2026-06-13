const Anthropic = require("@anthropic-ai/sdk");
const { parseModelJSON } = require("../utils/json.cjs");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const HAIKU = "claude-haiku-4-5";
const SONNET = "claude-sonnet-4-6";

async function callClaude(model, system, userText, images = []) {
  const content = [];

  for (const img of images) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mimeType,
        data: img.base64
      }
    });
  }

  content.push({ type: "text", text: userText });

  const msg = await anthropic.messages.create({
    model,
    max_tokens: 1600,
    system,
    messages: [{ role: "user", content }]
  });

  const raw = msg.content.map((b) => b.text || "").join("");
  return parseModelJSON(raw);
}

async function callClaudeText(model, system, userText) {
  const msg = await anthropic.messages.create({
    model,
    max_tokens: 1400,
    system,
    messages: [{ role: "user", content: [{ type: "text", text: userText }] }]
  });

  const raw = msg.content.map((b) => b.text || "").join("");
  return parseModelJSON(raw);
}

module.exports = {
  anthropic,
  HAIKU,
  SONNET,
  callClaude,
  callClaudeText
};