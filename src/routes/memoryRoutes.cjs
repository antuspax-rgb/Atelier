const express = require("express");
const router = express.Router();

router.get("/api/student-memory", (_, res) => {
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

router.post("/api/student-memory", (req, res) => {
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

router.get("/api/roadmap/mobile-ios", (_, res) => {
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

module.exports = router;