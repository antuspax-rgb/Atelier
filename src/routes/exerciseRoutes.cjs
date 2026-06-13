const express = require("express");
const router = express.Router();

const { HAIKU, SONNET, callClaude } = require("../config/ai.cjs");
const { pickReference } = require("../mentor/references.cjs");
const {
  SYS_WARMUP,
  SYS_COMPLEX,
  SYS_EXTRA,
  buildAnalyzeSystem
} = require("../mentor/prompts.cjs");
const {
  normalizeExercise,
  normalizeAnalysisFeedback
} = require("../utils/normalize.cjs");
const { buildStudentContextBlock } = require("../mentor/identity.cjs");

router.post("/api/generate-exercise", async (req, res) => {
  const { type, profile = {} } = req.body || {};

  if (!["warmup", "complex", "extraComplex"].includes(type)) {
    return res.status(400).json({
      error: "type deve essere warmup | complex | extraComplex"
    });
  }

  const modelMap = {
    warmup: HAIKU,
    complex: SONNET,
    extraComplex: SONNET
  };

  const systemMap = {
    warmup: SYS_WARMUP,
    complex: SYS_COMPLEX,
    extraComplex: SYS_EXTRA
  };

  const maxMap = {
    warmup: 1,
    complex: 1,
    extraComplex: 4
  };

  const mbMap = {
    warmup: 2,
    complex: 3,
    extraComplex: 3
  };

  try {
    const userPrompt = `
Genera un esercizio di tipo "${type}" per uno studente di concept art.

Profilo:
- focus: ${profile.focus || "character design e creature design"}
- livello: ${profile.level || "developing"}

L'esercizio deve sembrare serio, utile e coerente con la crescita professionale.
`;

    const rawData = await callClaude(modelMap[type], systemMap[type], userPrompt);
    const data = normalizeExercise(rawData, type);

    const reference = pickReference({
      category: data.category,
      title: data.title,
      promptText: data.promptText
    });

    res.json({
      type,
      ...data,
      reference,
      maxFiles: maxMap[type],
      maxSizeMB: mbMap[type],
      id: null,
      status: "active",
      createdAt: new Date().toISOString(),
      uploadedFiles: [],
      analysisState: "idle",
      feedbackText: null,
      correctionImage: null,
      correctionDownloadUrl: null,
      correctionSvg: null
    });
  } catch (err) {
    console.error("[generate-exercise]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/analyze-submission", async (req, res) => {
  const {
    type = "complex",
    exerciseTitle,
    exercisePrompt,
    images = [],
    context = {}
  } = req.body || {};

  if (!exerciseTitle) {
    return res.status(400).json({
      error: "Campo obbligatorio: exerciseTitle"
    });
  }

  if (!images.length) {
    return res.status(400).json({
      error: "Almeno un'immagine è richiesta per l'analisi"
    });
  }

  const userPrompt = `
${buildStudentContextBlock(context)}

Esercizio:
- titolo: ${exerciseTitle}
- consegna: ${exercisePrompt || "non specificata"}

Analizza l'elaborato caricato rispetto alla consegna.
Fai feedback tecnico da mentor di concept art.
`;

  try {
    const system = buildAnalyzeSystem(type, context.streak || 0);
    const fb = await callClaude(SONNET, system, userPrompt, images);
    const normalized = normalizeAnalysisFeedback(fb);

    res.json({
      ...normalized,
      recurringErrors: normalized.errors
    });
  } catch (err) {
    console.error("[analyze-submission]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;