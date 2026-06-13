function extractJSONObject(text) {
  const start = text.indexOf("{");
  if (start === -1) {
    throw new Error("Nessun JSON object trovato nella risposta del modello");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  throw new Error("JSON object incompleto nella risposta del modello");
}

function parseModelJSON(text) {
  const cleaned = String(text || "").replace(/```json|```/gi, "").trim();
  const jsonText = extractJSONObject(cleaned);
  return JSON.parse(jsonText);
}

module.exports = {
  extractJSONObject,
  parseModelJSON
};