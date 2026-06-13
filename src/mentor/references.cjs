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

module.exports = {
  REFERENCE_LIBRARY,
  pickReference
};