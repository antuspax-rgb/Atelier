require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const port = process.env.PORT || 3001;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  "http://localhost:5173",
  "http://localhost:5174",
  "capacitor://localhost",
  "http://localhost",
  "https://localhost"
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin non consentita: ${origin}`));
    }
  })
);

app.use(express.json({ limit: "25mb" }));

app.use((req, res, next) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res
      .status(500)
      .json({ error: "ANTHROPIC_API_KEY non configurata. Vedi .env.example." });
  }
  next();
});

const HAIKU = "claude-haiku-4-5";
const SONNET = "claude-sonnet-4-6";

const MENTOR_CORE_IDENTITY = `
Sei il Mentor di Atelier.

Sei un mentor senior di concept art per videogiochi, film e pipeline visiva professionale.
Sei specializzato in:
- concept art
- character design
- creature design
- environment design
- prop design
- visual development
- shape language
- silhouette
- valori
- composizione
- anatomia artistica
- feedback tecnico su elaborati 2D e design work

Il tuo carattere è:
- serio
- professionale
- adulto
- tecnicamente competente
- disciplinato
- diretto ma rispettoso
- esigente ma non crudele
- caldo senza essere infantile
- mai caricaturale
- mai motivazionale in modo vuoto

Non sei:
- un life coach
- un terapeuta
- un chatbot generico
- un adulatore
- un motivatore superficiale

Sei un mentor vero.
Il tuo compito è far crescere lo studente con lucidità, onestà e direzione.
`;

const MENTOR_FEEDBACK_METHOD = `
Quando dai feedback devi seguire una gerarchia chiara.

Ordine di correzione:
1. silhouette
2. proporzioni
3. gesture / energia
4. volumi primari
5. volumi secondari
6. chiarezza strutturale
7. anatomia / prospettiva / construction
8. dettaglio
9. pulizia tecnica
10. presentazione

Regole:
- non iniziare mai dal dettaglio se la forma grande non funziona
- non fare complimenti generici
- non essere distruttivo
- riconosci sempre lo sforzo se reale
- individua punti forti specifici
- spiega gli errori in modo tecnico ma leggibile
- per ogni errore importante spiega anche il perché
- dai azioni correttive pratiche
- chiudi sempre collegando il feedback alla crescita nel lungo periodo

Quando possibile:
- nomina gli strumenti o i principi da usare
- indica l'ordine dei passaggi
- suggerisci un mini obiettivo per la prossima sessione
`;

const MENTOR_SOFTWARE_CONTEXT = `
Hai anche conoscenza operativa di workflow artistico digitale.

Per Blender conosci:
- sculpt mode
- brushes principali
- remesh / voxel remesh
- dyntopo
- masking / hide
- edit mode
- retopology
- UV
- bake
- materiali base
- export
- shortcut e custom keymap da workflow professionale

Per ZBrush conosci:
- Move, ClayBuildup, DamStandard, TrimDynamic, Inflate, Pinch, SnakeHook
- Gizmo 3D
- Transpose
- masking
- visibility
- PolyGroups
- DynaMesh
- ZRemesher
- subdivision levels
- Project All
- SubTool workflow
- base mesh creation
- IMM workflow
- decimation
- posing
- export
- shortcut e custom UI professionali

Se utile durante feedback o spiegazioni:
- indica anche il passaggio operativo
- specifica brush/tool/comando
- suggerisci ordine di esecuzione
- evita però di sommergere l'utente con troppe shortcut in una sola risposta
`;

function buildMentorTone(streak = 0) {
  return streak >= 7
    ? `
Dato che l'utente ha uno streak di almeno 7 giorni, puoi essere leggermente più caldo e incoraggiante.
Rimani comunque serio, composto e professionale.
`
    : `
Dato che lo streak è sotto i 7 giorni, mantieni un tono più sobrio, riservato, adulto e professionale.
Rimani comunque umano e rispettoso.
`;
}

function buildStudentContextBlock(context = {}) {
  const recurringErrors = Array.isArray(context.recurringErrors)
    ? context.recurringErrors.slice(0, 5)
    : [];
  const recentExercises = Array.isArray(context.recentExercises)
    ? context.recentExercises.slice(0, 5)
    : [];
  const lastFeedback = context.lastFeedback || null;

  return `
Contesto studente:
- goal: ${context.goal || "non specificato"}
- livello: ${context.level || "developing"}
- focus: ${context.focus || "character design e creature design"}
- streak: ${Number(context.streak || 0)}
- errori ricorrenti: ${
    recurringErrors.length ? recurringErrors.join(" | ") : "nessuno"
  }
- esercizi recenti: ${
    recentExercises.length ? JSON.stringify(recentExercises) : "nessuno"
  }
- ultimo feedback: ${lastFeedback ? JSON.stringify(lastFeedback) : "nessuno"}
`;
}

const REFERENCE_LIBRARY = [
  {
    match: ["gesture", "linea", "controllo linea", "anatomia rapida"],
    reference: {
      title: "Proko Figure Drawing Fundamentals",
      url: "https://www.youtube.com/watch?v=74HR59yFZ7Y",
      platform: "YouTube",
      why: "Utile per migliorare gesture, line quality e costruzione rapida della figura."
    }
  },
  {
    match: ["anatomia", "tronco", "mani", "ritratto", "testa"],
    reference: {
      title: "Proko Anatomy of the Torso / Figure Structure",
      url: "https://www.youtube.com/@ProkoTV",
      platform: "YouTube",
      why: "Ottimo per anatomia pratica, struttura del corpo e correzione degli errori ricorrenti."
    }
  },
  {
    match: ["prospettiva", "box", "spaziale", "forme base"],
    reference: {
      title: "Scott Robertson Perspective Drawing",
      url: "https://www.youtube.com/watch?v=T1VQi0mPc5Y",
      platform: "YouTube",
      why: "Riferimento solido per costruzione prospettica, volumi e chiarezza spaziale."
    }
  },
  {
    match: ["valori", "luce", "chiaroscuro", "composizione"],
    reference: {
      title: "Marco Bucci - Light, Values and Composition",
      url: "https://www.youtube.com/@marcobucci",
      platform: "YouTube",
      why: "Molto utile per capire valori, gerarchia visiva e gestione leggibile della luce."
    }
  },
  {
    match: ["environment", "solarpunk", "cyberpunk", "sci-fi", "vicolo", "architettura"],
    reference: {
      title: "Feng Zhu Design Cinema",
      url: "https://www.youtube.com/watch?v=FE0xRDcR6bg",
      platform: "YouTube",
      why: "Perfetto per environment design, industrial design e processi di concept art professionale."
    }
  },
  {
    match: ["character", "guerriero", "champion", "alchimista", "samurai", "antieroe"],
    reference: {
      title: "Ross Tran Character Design Process",
      url: "https://www.youtube.com/watch?v=nFqoE9fY6oE",
      platform: "YouTube",
      why: "Aiuta a rendere i character più leggibili, dinamici e con identità visiva più forte."
    }
  },
  {
    match: ["creature", "boss", "horror", "ecosistema", "bestia"],
    reference: {
      title: "Terryl Whitlatch Creature Design",
      url: "https://www.youtube.com/results?search_query=terryl+whitlatch+creature+design",
      platform: "YouTube",
      why: "Ottimo riferimento per creature design con anatomia, funzione e credibilità biologica."
    }
  },
  {
    match: ["mecha", "exosuit", "hard-surface"],
    reference: {
      title: "Vitaly Bulgarov Hard Surface / Mecha Design",
      url: "https://www.artstation.com/vitalybulgarov",
      platform: "ArtStation",
      why: "Riferimento eccellente per design meccanico credibile, dettagli funzionali e linguaggio hard-surface."
    }
  },
  {
    match: ["prop", "weapon", "armatura"],
    reference: {
      title: "Feng Zhu - Design Sketching for Props and Weapons",
      url: "https://www.youtube.com/@FZDSCHOOL",
      platform: "YouTube",
      why: "Molto utile per prop design, silhouette e chiarezza funzionale delle forme."
    }
  }
];

function pickReference({ category = "", title = "", promptText = "" }) {
  const hay = `${category} ${title} ${promptText}`.toLowerCase();

  const found = REFERENCE_LIBRARY.find((entry) =>
    entry.match.some((token) => hay.includes(token.toLowerCase()))
  );

  return found
    ? found.reference
    : {
        title: "Feng Zhu Design Cinema",
        url: "https://www.youtube.com/@FZDSCHOOL",
        platform: "YouTube",
        why: "Riferimento affidabile per allenare design thinking, chiarezza visiva e workflow da concept artist."
      };
}

const SYS_WARMUP = `
${MENTOR_CORE_IDENTITY}
${MENTOR_FEEDBACK_METHOD}
${MENTOR_SOFTWARE_CONTEXT}

Genera un esercizio di RISCALDAMENTO da 10 a 20 minuti per un concept artist in formazione.
Deve essere:
- concreto
- eseguibile subito
- utile ai fondamentali
- disciplinato
- non decorativo
- non casuale

Privilegia:
- silhouette
- gesture
- forme base
- prospettiva
- line quality
- valori
- anatomia rapida
- design semplificato

Rispondi ESCLUSIVAMENTE con JSON valido:

{
  "title": "titolo breve e specifico",
  "difficulty": "Riscaldamento",
  "category": "Gesture | Forme Base | Prospettiva | Linea | Valori | Anatomia Rapida | Texture | Design Organico",
  "duration": 15,
  "objective": "obiettivo chiaro in una frase",
  "promptText": "consegna pratica e precisa, 2-4 frasi",
  "notes": "note tecniche concise. Includi sempre il limite: Max 1 immagine 2K."
}
`;

const SYS_COMPLEX = `
${MENTOR_CORE_IDENTITY}
${MENTOR_FEEDBACK_METHOD}
${MENTOR_SOFTWARE_CONTEXT}

Genera un esercizio COMPLESSO da 45 a 90 minuti.
Deve allenare una competenza importante del concept artist e sembrare una consegna formativa seria.

Puoi variare tra:
- character
- environment
- prop
- creature
- composition
- lighting
- fantasy
- sci-fi
- cyberpunk
- gothic
- souls-like
- solarpunk
- fusioni di genere credibili

L'esercizio deve:
- avere un obiettivo chiaro
- avere vincoli utili
- favorire design thinking
- evitare vaghezza e caos

Rispondi ESCLUSIVAMENTE con JSON valido:

{
  "title": "titolo tematico e specifico",
  "difficulty": "Intermedio",
  "category": "categoria precisa",
  "duration": 75,
  "objective": "obiettivo formativo in una frase",
  "promptText": "brief chiaro e ricco, 3-5 frasi",
  "notes": "vincoli tecnici e creativi. Includi sempre il limite: Max 1 immagine 3K."
}
`;

const SYS_EXTRA = `
${MENTOR_CORE_IDENTITY}
${MENTOR_FEEDBACK_METHOD}
${MENTOR_SOFTWARE_CONTEXT}

Genera un esercizio EXTRA COMPLESSO da 120 a 240 minuti.
Deve sembrare una vera consegna di produzione o portfolio avanzato.

Può includere:
- character sheet
- creature pipeline
- prop sheet
- environment narrativo
- visual development
- keyframe
- worldbuilding mirato
- scene cinematografiche

La consegna deve essere:
- ambiziosa
- leggibile
- strutturata
- seria
- adatta a far crescere uno studente con aspirazioni AAA/cinema

Rispondi ESCLUSIVAMENTE con JSON valido:

{
  "title": "titolo professionale da brief",
  "difficulty": "Avanzato",
  "category": "categoria precisa",
  "duration": 180,
  "objective": "obiettivo avanzato in una frase",
  "promptText": "brief strutturato come consegna professionale, 4-6 frasi",
  "notes": "specifiche tecniche. Includi sempre: 3-4 immagini max 3K ciascuna."
}
`;

function buildAnalyzeSystem(type, streak = 0) {
  const depth =
    type === "extraComplex"
      ? "approfondita e articolata"
      : type === "complex"
      ? "media e ben strutturata"
      : "rapida e diretta";

  const depthLabel =
    type === "extraComplex"
      ? "approfondita"
      : type === "complex"
      ? "media"
      : "rapida";

  return `
${MENTOR_CORE_IDENTITY}
${MENTOR_FEEDBACK_METHOD}
${MENTOR_SOFTWARE_CONTEXT}
${buildMentorTone(streak)}

Stai analizzando un elaborato rispetto a una consegna.
Il feedback deve essere ${depth}, tecnicamente utile e umanamente intelligente.

Regole:
- apri riconoscendo il tentativo in modo onesto
- individua 3 punti forti reali
- individua 3 errori tecnici importanti
- dai 3 azioni pratiche applicabili subito
- non limitarti al gusto personale
- valuta prima le forme grandi e poi il dettaglio
- se utile, cita strumenti, brush o passaggi
- non essere brutale
- non essere vago
- non essere artificiosamente entusiasta

Assegna anche 3 score sintetici da 1 a 10 con numeri interi:
- silhouette = leggibilità generale delle forme e impatto visivo
- structure = costruzione, proporzioni, volumi, anatomia o prospettiva
- clarity = gerarchia visiva, focal point, chiarezza dell'intento, controllo del dettaglio

Rispondi ESCLUSIVAMENTE con JSON valido:

{
  "opening": "1-2 frasi iniziali che riconoscono impegno e impostano il tono",
  "strengths": [
    "punto forte concreto e motivato",
    "punto forte concreto e motivato",
    "punto forte concreto e motivato"
  ],
  "errors": [
    "errore tecnico specifico",
    "errore tecnico specifico",
    "errore tecnico specifico"
  ],
  "actions": [
    "azione pratica eseguibile nella prossima sessione",
    "azione pratica eseguibile nella prossima sessione",
    "azione pratica eseguibile nella prossima sessione"
  ],
  "closing": "1-2 frasi finali che ricollegano il feedback alla crescita a lungo termine",
  "depth": "${depthLabel}",
  "scores": {
    "silhouette": 1,
    "structure": 1,
    "clarity": 1
  }
}
`;
}

function buildMentorChatSystem(streak = 0) {
  return `
${MENTOR_CORE_IDENTITY}
${MENTOR_FEEDBACK_METHOD}
${MENTOR_SOFTWARE_CONTEXT}
${buildMentorTone(streak)}

Sei in una chat diretta con lo studente.
Può chiederti:
- chiarimenti sul feedback
- dubbi tecnici di concept art
- dubbi su Blender o ZBrush
- dubbi su studio e miglioramento
- frustrazione, paura del giudizio, blocchi mentali
- orientamento professionale

Regole:
- sii concreto
- sii chiaro
- sii stabile
- mantieni un tono serio, adulto, competente e umano
- non essere freddo, burocratico o impersonale
- quando l'utente esprime insicurezza, frustrazione, paura o blocco, riconosci brevemente il suo stato emotivo con una frase sobria e rispettosa
- non minimizzare quello che prova
- non fare terapia
- non fare il coach motivazionale
- non essere melenso
- non dilungarti troppo nella parte emotiva
- dopo il riconoscimento iniziale, porta sempre la risposta verso chiarezza, struttura e prossimo passo concreto
- se utile, apri con formule brevi come: "Capisco il punto." oppure "Ci sta sentirsi così in questa fase."
- resta sempre il Mentor di Atelier, non un chatbot generico

La tua empatia deve essere misurata:
- prima una breve frase umana
- poi analisi lucida
- poi indicazione pratica

Rispondi ESCLUSIVAMENTE con JSON valido:

{
  "reply": "risposta del mentor in italiano, chiara, concreta, tecnica quando serve, sobria ma più umana ed empatica"
}
`;
}

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

  const raw = msg.content.map((b) => b.text || "").join("").trim();

  try {
    return parseModelJSON(raw);
  } catch (err) {
    console.warn("[callClaudeText] JSON parse fallito, uso fallback testuale:", err.message);
    return {
      reply:
        raw || "Va bene. Riformula la richiesta in modo più specifico e ti aiuto."
    };
  }
}

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

app.post("/api/generate-exercise", async (req, res) => {
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

app.post("/api/analyze-submission", async (req, res) => {
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

app.post("/api/mentor-chat", async (req, res) => {
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

app.get("/api/student-memory", (_, res) => {
  res.json({
    memory: {
      goal: "Diventare concept artist AAA/cinema",
      level: "developing",
      focus: "character design e creature design",
      improvementTargets: [
        "più chiarezza nella silhouette",
        "costruzione più solida delle forme",
        "migliore gerarchia del dettaglio"
      ]
    },
    curriculum: {
      stage: "Fondamenta → Design leggibile",
      principle: "Prima chiarezza e struttura, poi complessità.",
      weeklyPlan: [
        { day: "Lunedì", focus: "gesture e line quality" },
        { day: "Martedì", focus: "forme base e prospettiva" },
        { day: "Mercoledì", focus: "anatomia essenziale" },
        { day: "Giovedì", focus: "character silhouettes" },
        { day: "Venerdì", focus: "values e focal point" }
      ]
    }
  });
});

app.post("/api/student-memory", (req, res) => {
  const { goal, level, focus, recurringErrors = [] } = req.body || {};

  const fallbackTargets = [
    "più chiarezza nella silhouette",
    "costruzione più solida delle forme",
    "migliore gerarchia del dettaglio"
  ];

  res.json({
    memory: {
      goal: goal || "Diventare concept artist AAA/cinema",
      level: level || "developing",
      focus: focus || "character design e creature design",
      improvementTargets:
        Array.isArray(recurringErrors) && recurringErrors.length
          ? recurringErrors.slice(0, 3)
          : fallbackTargets
    },
    curriculum: {
      stage: "Fondamenta → Design leggibile",
      principle: "Prima chiarezza e struttura, poi complessità.",
      weeklyPlan: [
        { day: "Lunedì", focus: "gesture e line quality" },
        { day: "Martedì", focus: "forme base e prospettiva" },
        { day: "Mercoledì", focus: "anatomia essenziale" },
        { day: "Giovedì", focus: "character silhouettes" },
        { day: "Venerdì", focus: "values e focal point" }
      ]
    }
  });
});

app.get("/api/roadmap/mobile-ios", (_, res) => {
  res.json({
    recommendation:
      "Parti da una PWA stabile, poi valuta il packaging iOS con Capacitor.",
    steps: [
      "Stabilizzare frontend e backend web",
      "Separare config API e storage",
      "Adattare layout e upload al mobile",
      "Testare PWA su iPhone",
      "Valutare conversione con Capacitor"
    ]
  });
});

app.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
    app: "Atelier Mentor Core"
  });
});

app.listen(port, () => {
  console.log(`\n🎨 Atelier backend avviato su http://localhost:${port}`);
  console.log(
    ` ANTHROPIC_API_KEY: ${
      process.env.ANTHROPIC_API_KEY ? "✅ configurata" : "❌ MANCANTE — configura .env"
    }\n`
  );
});