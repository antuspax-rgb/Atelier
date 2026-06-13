# Atelier — Setup Completo

## Struttura del progetto

```text
atelier/
├── server-2.js         ← Backend Express
├── package-4.json      ← Dipendenze backend
├── file.env-3          ← Template variabili d'ambiente
└── src/
    └── Atelier.jsx     ← Frontend React
```

## 1. Setup Backend

```bash
cd atelier
npm install
```

Se usi `file.env-3` come ambiente reale, trattalo come file `.env` del backend.

## 2. Avvia il Backend

```bash
node server-2.js
```

In sviluppo:

```bash
npx nodemon server-2.js
```

Il backend si avvia su `http://localhost:3001`.

## 3. Setup Frontend

Nel frontend, `API_BASE` deve puntare a:

```js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
```

## 4. Sicurezza

- La chiave Anthropic va solo nel backend.
- Il frontend non deve chiamare direttamente Anthropic.
- Non committare mai il file ambiente con la chiave reale.