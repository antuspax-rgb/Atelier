import { useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import { loadState, saveState } from './lib/storage';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Dashboard from './screens/Dashboard';
import Exercises from './screens/Exercises';
import Session from './screens/Session';
import Mentor from './screens/Mentor';
import Progress from './screens/Progress';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const defaultState = {
  streak: 0,
  totalHours: 0,
  dailyMinutes: 0,
  currentExercise: null,
  feedback: null,
  recurringErrors: [],
  recentSessions: [],
  mentorMessages: [
    {
      role: 'assistant',
      content:
        'Sono il Mentor di Atelier. Il mio compito è farti crescere come concept artist con disciplina, chiarezza e feedback concreto.'
    }
  ],
  focusMode: {
    running: false,
    secondsLeft: 25 * 60,
    duration: 25 * 60,
    blockedApps: ['Instagram', 'TikTok', 'YouTube', 'X', 'Discord'],
    elapsedSecondsToday: 0,
    totalElapsedSeconds: 0,
    lastTickAt: null,
    lastStudiedOn: null
  }
};

function secondsToClock(value) {
  const safeValue = Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
  const min = String(Math.floor(safeValue / 60)).padStart(2, '0');
  const sec = String(safeValue % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        mimeType: file.type,
        base64: String(reader.result).split(',')[1]
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function createImageThumbnail(file, maxSize = 160, quality = 0.55) {
  return new Promise((resolve) => {
    if (!isImageFile(file)) {
      resolve('');
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };

    image.src = url;
  });
}

function isImageFile(file) {
  return Boolean(file?.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(file?.name || ''));
}

function revokePreviewUrls(previews = []) {
  previews.forEach((file) => {
    if (file?.url) URL.revokeObjectURL(file.url);
  });
}

function revokePreviewUrlStrings(urls = []) {
  urls.forEach((url) => {
    if (url) URL.revokeObjectURL(url);
  });
}

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isYesterday(dateString) {
  if (!dateString) return false;
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d) === dateString;
}

function withFocusDefaults(stateLike) {
  const baseFocus = defaultState.focusMode;
  return {
    ...stateLike,
    recurringErrors: Array.isArray(stateLike?.recurringErrors) ? stateLike.recurringErrors : [],
    recentSessions: Array.isArray(stateLike?.recentSessions) ? stateLike.recentSessions : [],
    mentorMessages: Array.isArray(stateLike?.mentorMessages)
      ? stateLike.mentorMessages.map((message) => ({
          ...message,
          attachments: Array.isArray(message.attachments)
            ? message.attachments.map((file) =>
                file?.url?.startsWith('blob:')
                  ? { ...file, url: '', previewUnavailable: !file.thumbnailDataUrl }
                  : file
              )
            : undefined
        }))
      : defaultState.mentorMessages,
    focusMode: {
      ...baseFocus,
      ...(stateLike?.focusMode || {})
    }
  };
}

function parseJsonSafely(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Risposta non valida dal server.');
  }
}

function isValidExercise(data) {
  return Boolean(
    data &&
      typeof data === 'object' &&
      typeof data.title === 'string' &&
      typeof data.objective === 'string' &&
      typeof data.promptText === 'string'
  );
}

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(10, Math.round(n)));
}

function normalizeTextList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).slice(0, 3) : [];
}

function normalizeFeedback(data) {
  return {
    opening: typeof data?.opening === 'string' ? data.opening : '',
    strengths: normalizeTextList(data?.strengths),
    errors: normalizeTextList(data?.errors),
    actions: normalizeTextList(data?.actions),
    closing: typeof data?.closing === 'string' ? data.closing : '',
    depth: typeof data?.depth === 'string' ? data.depth : 'media',
    scores: {
      silhouette: clampScore(data?.scores?.silhouette),
      structure: clampScore(data?.scores?.structure),
      clarity: clampScore(data?.scores?.clarity)
    },
    recurringErrors: normalizeTextList(data?.recurringErrors || data?.errors)
  };
}

function normalizeMentorReply(data) {
  return typeof data?.reply === 'string' && data.reply.trim()
    ? data.reply.trim()
    : 'Ho ricevuto il messaggio, ma la risposta non era completa. Riprova con una richiesta più specifica.';
}

function cleanActionValue(value, max = 220) {
  if (typeof value === 'string' && value.trim()) return value.trim().slice(0, max);
  if (value && typeof value === 'object') {
    return cleanActionValue(value.value || value.focus || value.goal || value.level || value.text, max);
  }
  return '';
}

function getActionValue(action, max) {
  return cleanActionValue(action.value || action.newValue || action.focus || action.goal || action.level, max);
}

function normalizeExercisePatch(patch = {}) {
  if (!patch || typeof patch !== 'object') return {};
  const safePatch = {
    type: cleanActionValue(patch.type, 40) || 'custom',
    title: cleanActionValue(patch.title, 120),
    difficulty: cleanActionValue(patch.difficulty, 80),
    category: cleanActionValue(patch.category, 120),
    objective: cleanActionValue(patch.objective, 360),
    promptText: cleanActionValue(patch.promptText || patch.brief, 900),
    notes: cleanActionValue(patch.notes || patch.constraints, 600)
  };

  if (Number.isFinite(Number(patch.duration))) {
    safePatch.duration = Math.max(5, Math.min(240, Math.round(Number(patch.duration))));
  }

  return Object.fromEntries(Object.entries(safePatch).filter(([, value]) => value));
}

function extractRequestedFocus(message = '') {
  const text = String(message);
  const quoted = text.match(/["“”'‘’]([^"“”'‘’]{3,180})["“”'‘’]/);
  const match =
    quoted ||
    text.match(/(?:focus|fuoco)\s*(?:è|e'|=|in|su|a|verso|:)\s*([a-zà-ù0-9][^.,;!?]{2,80})/i) ||
    text.match(/concentrarm[ia]?\s+(?:su|sul|sulla|in|nel|nella)\s*([a-zà-ù0-9][^.,;!?]{2,80})/i);

  return match ? cleanActionValue(match[1].replace(/\s+(per favore|grazie)$/i, ''), 180) : '';
}

function buildLocalMentorActions(message = '') {
  const focus = extractRequestedFocus(message);
  const wantsFocusUpdate =
    /(cambia|aggiorna|imposta|modifica).{0,32}(focus|fuoco)/i.test(message) ||
    /(voglio|vorrei).{0,32}concentrarm/i.test(message) ||
    /(?:focus|fuoco)\s*(?:è|e'|=|in|su|a|verso|:)/i.test(message);

  return wantsFocusUpdate && focus ? [{ type: 'update_focus', value: focus }] : [];
}

function buildRecentMentorContext(messages = []) {
  return Array.isArray(messages)
    ? messages
        .slice(-8)
        .map((message) => ({
          role: message.role,
          content: cleanActionValue(message.content, 420)
        }))
        .filter((message) => message.role && message.content)
    : [];
}

function normalizeMentorActions(actions) {
  if (!Array.isArray(actions)) return [];

  return actions
    .map((action) => {
      if (!action || typeof action !== 'object') return null;

      if (['update_goal', 'update_focus', 'update_level'].includes(action.type)) {
        const value = getActionValue(action);
        return value ? { type: action.type, value } : null;
      }

      if (action.type === 'update_profile_field') {
        const field = action.field === 'level' ? 'level' : action.field === 'focus' ? 'focus' : '';
        const value = getActionValue(action);
        return field && value ? { type: action.type, field, value } : null;
      }

      if (action.type === 'revise_current_exercise') {
        const safePatch = normalizeExercisePatch(action.patch);
        return Object.values(safePatch).some(Boolean) ? { type: action.type, patch: safePatch } : null;
      }

      if (['create_exercise', 'update_exercise'].includes(action.type)) {
        const safePatch = normalizeExercisePatch(action.exercise || action.patch || action);
        return safePatch.title || safePatch.objective || safePatch.promptText
          ? { type: action.type, patch: safePatch }
          : null;
      }

      if (action.type === 'delete_exercise') {
        return { type: action.type };
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 4);
}

function applyFocusElapsed(prev, now = Date.now()) {
  const focus = prev.focusMode;
  if (!focus.running || !focus.lastTickAt) return prev;

  const elapsed = Math.max(0, Math.floor((now - focus.lastTickAt) / 1000));
  if (!elapsed) return prev;

  const secondsLeft = Math.max(0, Number(focus.secondsLeft || 0));
  const applied = Math.min(elapsed, secondsLeft);
  const completed = applied >= secondsLeft;
  const nowDay = todayKey(new Date(now));
  const prevLastStudiedOn = focus.lastStudiedOn;

  let nextStreak = prev.streak;
  let elapsedSecondsToday = focus.elapsedSecondsToday || 0;

  if (prevLastStudiedOn && prevLastStudiedOn !== nowDay) {
    elapsedSecondsToday = 0;
  }

  if (prevLastStudiedOn !== nowDay) {
    if (isYesterday(prevLastStudiedOn)) {
      nextStreak = prev.streak + 1;
    } else if (!prevLastStudiedOn) {
      nextStreak = Math.max(prev.streak, 1);
    } else {
      nextStreak = 1;
    }
  }

  elapsedSecondsToday += applied;

  const totalElapsedSeconds = (focus.totalElapsedSeconds || 0) + applied;
  const nextRecentSessions = completed
    ? [
        {
          type: 'Focus session',
          when: new Date(now).toLocaleString('it-IT'),
          minutes: Math.round(focus.duration / 60)
        },
        ...(prev.recentSessions || [])
      ].slice(0, 12)
    : prev.recentSessions;

  return {
    ...prev,
    streak: nextStreak,
    dailyMinutes: Math.floor(elapsedSecondsToday / 60),
    totalHours: Number((totalElapsedSeconds / 3600).toFixed(2)),
    recentSessions: nextRecentSessions,
    focusMode: {
      ...focus,
      running: !completed,
      secondsLeft: completed ? 0 : secondsLeft - applied,
      elapsedSecondsToday,
      totalElapsedSeconds,
      lastTickAt: completed ? null : focus.lastTickAt + applied * 1000,
      lastStudiedOn: nowDay
    }
  };
}

export default function App() {
  const saved = useMemo(() => loadState(), []);
  const [state, setState] = useState(withFocusDefaults(saved || defaultState));
  const [screen, setScreen] = useState('dashboard');
  const [chatInput, setChatInput] = useState('');
  const [goal, setGoal] = useState(
    saved?.goal || 'Diventare concept artist AAA/cinema con focus su concept art, character design e creature design.'
  );
  const [profile, setProfile] = useState({
    focus: saved?.profile?.focus || 'character design e creature design',
    level: saved?.profile?.level || 'developing'
  });
  const [busy, setBusy] = useState({
    exercise: false,
    feedback: false,
    chat: false
  });
  const [memory, setMemory] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const [exerciseError, setExerciseError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const fileInputRef = useRef(null);
  const exerciseRequestRef = useRef(false);
  const feedbackRequestRef = useRef(false);
  const chatRequestRef = useRef(false);
  const filePreviewsRef = useRef([]);
  const sentPreviewUrlsRef = useRef([]);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    saveState({ ...state, goal, profile });
  }, [state, goal, profile]);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .catch(() => {});

    fetch(`${API_BASE}/student-memory`)
      .then((r) => r.json())
      .then((data) => {
        setMemory(data.memory);
        setCurriculum(data.curriculum);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const today = todayKey();

      setState((prev) => {
        if (prev.focusMode.lastStudiedOn && prev.focusMode.lastStudiedOn !== today) {
          return {
            ...prev,
            dailyMinutes: 0,
            focusMode: {
              ...prev.focusMode,
              elapsedSecondsToday: 0
            }
          };
        }
        return prev;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!state.focusMode.running) return;

    const timer = setInterval(() => {
      setState((prev) => applyFocusElapsed(prev));
    }, 1000);

    return () => clearInterval(timer);
  }, [state.focusMode.running]);

  useEffect(() => {
    function syncFocusTimer() {
      setState((prev) => applyFocusElapsed(prev));
    }

    window.addEventListener('focus', syncFocusTimer);
    document.addEventListener('visibilitychange', syncFocusTimer);

    return () => {
      window.removeEventListener('focus', syncFocusTimer);
      document.removeEventListener('visibilitychange', syncFocusTimer);
    };
  }, []);

  useEffect(() => {
    filePreviewsRef.current = filePreviews;
  }, [filePreviews]);

  useEffect(
    () => () => {
      revokePreviewUrls(filePreviewsRef.current);
      revokePreviewUrlStrings(sentPreviewUrlsRef.current);
    },
    []
  );

  async function createExercise(type) {
    if (exerciseRequestRef.current) return;

    exerciseRequestRef.current = true;
    setExerciseError('');
    setBusy((prev) => ({ ...prev, exercise: true }));

    try {
      const res = await fetch(`${API_BASE}/generate-exercise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, profile })
      });

      const data = parseJsonSafely(await res.text());

      if (!res.ok) {
        throw new Error(data?.error || 'Non sono riuscito a generare un esercizio.');
      }

      if (!isValidExercise(data)) {
        throw new Error('Il server ha restituito un esercizio incompleto.');
      }

      revokePreviewUrls(filePreviewsRef.current);
      setUploadedFiles([]);
      setFilePreviews([]);
      setUploadError('');

      setState((prev) => ({
        ...prev,
        currentExercise: data,
        feedback: null,
        mentorMessages: [
          ...prev.mentorMessages,
          {
            role: 'assistant',
            content: `Nuovo esercizio assegnato: ${data.title}. Prima blocca silhouette e forme grandi, poi passa ai dettagli. Focus: ${data.objective}`
          }
        ]
      }));

      setScreen('session');
    } catch (err) {
      console.error('[generate-exercise]', err);
      setExerciseError(err.message || 'Generazione non riuscita. Riprova tra poco.');
    } finally {
      exerciseRequestRef.current = false;
      setBusy((prev) => ({ ...prev, exercise: false }));
    }
  }

  function handleFileChange(event) {
    const input = event.target;
    const selected = Array.from(input.files || []);

    if (!selected.length) {
      input.value = '';
      return;
    }

    const seen = new Set();
    const files = selected.filter((file) => {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return isImageFile(file);
    });

    input.value = '';

    if (!files.length) {
      setUploadError('Seleziona solo file immagine.');
      return;
    }

    revokePreviewUrls(filePreviewsRef.current);
    setUploadError(files.length < selected.length ? 'Alcuni file non immagine sono stati ignorati.' : '');
    setUploadedFiles(files);

    const previews = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size
    }));

    filePreviewsRef.current = previews;
    setFilePreviews(previews);
  }

  function openFilePicker() {
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  }

  function removeFile(indexToRemove) {
    const removed = filePreviewsRef.current[indexToRemove];
    if (removed?.url) URL.revokeObjectURL(removed.url);
    setUploadedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setFilePreviews((prev) => {
      const next = prev.filter((_, index) => index !== indexToRemove);
      filePreviewsRef.current = next;
      return next;
    });
    setUploadError('');
  }

  async function analyzeWork() {
    if (feedbackRequestRef.current) return;

    if (!state.currentExercise?.title) {
      setUploadError('Genera un esercizio prima di avviare l’analisi.');
      return;
    }

    if (!uploadedFiles.length) {
      setUploadError('Carica almeno un elaborato prima di avviare l’analisi.');
      return;
    }

    if (uploadedFiles.some((file) => !isImageFile(file))) {
      setUploadError('Rimuovi i file non immagine prima di avviare l’analisi.');
      return;
    }

    feedbackRequestRef.current = true;
    setUploadError('');
    setBusy((prev) => ({ ...prev, feedback: true }));

    try {
      const images = await Promise.all(uploadedFiles.map(fileToBase64));

      const res = await fetch(`${API_BASE}/analyze-submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: state.currentExercise.type || 'complex',
          exerciseTitle: state.currentExercise.title,
          exercisePrompt: state.currentExercise.promptText,
          images,
          context: {
            goal,
            level: profile.level,
            focus: profile.focus,
            streak: state.streak,
            recurringErrors: state.recurringErrors,
            recentExercises: state.recentSessions,
            lastFeedback: state.feedback
          }
        })
      });

      const data = parseJsonSafely(await res.text());

      if (!res.ok) {
        throw new Error(data?.error || 'Analisi non riuscita.');
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Risposta vuota dal server.');
      }

      const feedback = normalizeFeedback(data);
      const recurringErrors = feedback.recurringErrors.length ? feedback.recurringErrors : state.recurringErrors;

      setState((prev) => ({
        ...prev,
        feedback,
        recurringErrors: feedback.recurringErrors.length ? feedback.recurringErrors : prev.recurringErrors,
        mentorMessages: [
          ...prev.mentorMessages,
          {
            role: 'assistant',
            content: `Feedback pronto. Prossimo focus: ${feedback.errors[0] || feedback.actions[0] || 'mantieni chiarezza e struttura nel prossimo studio.'}`
          }
        ]
      }));

      const memoryUpdate = {
        goal,
        level: profile.level,
        focus: profile.focus,
        recurringErrors
      };

      fetch(`${API_BASE}/student-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoryUpdate)
      })
        .then((r) => r.json())
        .then((payload) => {
          setMemory(payload.memory);
          setCurriculum(payload.curriculum);
        })
        .catch(() => {});
    } catch (err) {
      console.error('[analyze-submission]', err);
      setUploadError(err.message || 'Analisi non riuscita. Controlla le immagini e riprova.');
    } finally {
      feedbackRequestRef.current = false;
      setBusy((prev) => ({ ...prev, feedback: false }));
    }
  }

  function applyMentorActions(actions) {
    const validActions = normalizeMentorActions(actions);
    if (!validActions.length) return '';

    const confirmations = [];

    validActions.forEach((action) => {
      if (action.type === 'update_goal') {
        setGoal(action.value);
        setMemory((prev) => ({ ...(prev || {}), goal: action.value }));
        confirmations.push('obiettivo aggiornato');
      }

      if (action.type === 'update_focus') {
        setProfile((prev) => ({ ...prev, focus: action.value }));
        setMemory((prev) => ({ ...(prev || {}), focus: action.value }));
        confirmations.push('focus aggiornato');
      }

      if (action.type === 'update_level') {
        setProfile((prev) => ({ ...prev, level: action.value }));
        setMemory((prev) => ({ ...(prev || {}), level: action.value }));
        confirmations.push('livello aggiornato');
      }

      if (action.type === 'update_profile_field') {
        setProfile((prev) => ({ ...prev, [action.field]: action.value }));
        setMemory((prev) => ({ ...(prev || {}), [action.field]: action.value }));
        confirmations.push(action.field === 'focus' ? 'focus aggiornato' : 'livello aggiornato');
      }

      if (action.type === 'revise_current_exercise') {
        if (!state.currentExercise) {
          confirmations.push('nessun esercizio attivo da rivedere');
          return;
        }

        setState((prev) => {
          if (!prev.currentExercise) return prev;
          return {
            ...prev,
            currentExercise: {
              ...prev.currentExercise,
              ...Object.fromEntries(Object.entries(action.patch).filter(([, value]) => value))
            },
            feedback: null
          };
        });
        confirmations.push('consegna aggiornata');
      }

      if (action.type === 'create_exercise') {
        setState((prev) => ({
          ...prev,
          currentExercise: {
            type: 'custom',
            difficulty: 'Studio',
            category: prev.currentExercise?.category || profile.focus || 'Concept Art',
            duration: 45,
            ...action.patch,
            title: action.patch.title || 'Esercizio Mentor',
            objective: action.patch.objective || 'Allenare il focus attuale con una consegna mirata.',
            promptText: action.patch.promptText || action.patch.objective || 'Svolgi il brief con ordine e chiarezza.'
          },
          feedback: null
        }));
        confirmations.push('nuovo esercizio creato');
      }

      if (action.type === 'update_exercise') {
        if (!state.currentExercise) {
          confirmations.push('nessun esercizio attivo da aggiornare');
          return;
        }

        setState((prev) => {
          if (!prev.currentExercise) return prev;
          return {
            ...prev,
            currentExercise: {
              ...prev.currentExercise,
              ...action.patch
            },
            feedback: null
          };
        });
        confirmations.push('esercizio aggiornato');
      }

      if (action.type === 'delete_exercise') {
        if (!state.currentExercise) {
          confirmations.push('nessun esercizio attivo da rimuovere');
          return;
        }

        setState((prev) => ({
          ...prev,
          currentExercise: null,
          feedback: null
        }));
        confirmations.push('esercizio rimosso');
      }
    });

    return [...new Set(confirmations)].join(', ');
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (chatRequestRef.current) return;

    const userMessage = chatInput.trim();
    const hasImages = uploadedFiles.length > 0;

    if (!userMessage && !hasImages) return;

    if (uploadedFiles.some((file) => !isImageFile(file))) {
      setUploadError('Rimuovi i file non immagine prima di inviare.');
      return;
    }

    chatRequestRef.current = true;
    setUploadError('');
    setBusy((prev) => ({ ...prev, chat: true }));

    const messageAttachments = hasImages
      ? await Promise.all(
          filePreviewsRef.current.map(async (file, index) => ({
            name: file.name || uploadedFiles[index]?.name || `Immagine ${index + 1}`,
            url: file.url,
            thumbnailDataUrl: await createImageThumbnail(uploadedFiles[index]),
            size: file.size || uploadedFiles[index]?.size || 0
          }))
        ).then((files) => files.filter((file) => file.url || file.thumbnailDataUrl))
      : [];

    setState((prev) => ({
      ...prev,
      mentorMessages: [
        ...prev.mentorMessages,
        { role: 'user', content: userMessage || 'Immagini allegate', attachments: messageAttachments }
      ]
    }));

    try {
      const images = hasImages ? await Promise.all(uploadedFiles.map(fileToBase64)) : [];

      const res = await fetch(`${API_BASE}/mentor-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage || 'Analizza le immagini allegate.',
          images,
          context: {
            goal,
            level: profile.level,
            focus: profile.focus,
            streak: state.streak,
            recurringErrors: state.recurringErrors,
            recentExercises: state.recentSessions,
            progress: {
              dailyMinutes: state.dailyMinutes,
              totalHours: state.totalHours
            },
            recentMessages: buildRecentMentorContext(state.mentorMessages),
            currentExercise: state.currentExercise
              ? {
                  ...state.currentExercise
                }
              : null,
            lastFeedback: state.feedback
          }
        })
      });

      const data = parseJsonSafely(await res.text());

      if (!res.ok) {
        throw new Error(data?.error || 'Risposta del Mentor non riuscita.');
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Risposta vuota dal Mentor.');
      }

      const actionSummary = applyMentorActions([...(data.actions || []), ...buildLocalMentorActions(userMessage)]);
      const reply = actionSummary
        ? `${normalizeMentorReply(data)}\n\nModifica applicata: ${actionSummary}.`
        : normalizeMentorReply(data);

      setState((prev) => ({
        ...prev,
        mentorMessages: [...prev.mentorMessages, { role: 'assistant', content: reply }]
      }));

      setChatInput('');

      if (images.length) {
        sentPreviewUrlsRef.current = [
          ...sentPreviewUrlsRef.current,
          ...messageAttachments.map((file) => file.url)
        ];
        filePreviewsRef.current = [];
        setUploadedFiles([]);
        setFilePreviews([]);
        setUploadError('');
      }
    } catch (err) {
      console.error('[mentor-chat]', err);
      setState((prev) => ({
        ...prev,
        mentorMessages: prev.mentorMessages.slice(0, -1)
      }));
      setUploadError(err.message || 'Invio non riuscito. Riprova tra poco.');
    } finally {
      chatRequestRef.current = false;
      setBusy((prev) => ({ ...prev, chat: false }));
    }
  }

  function toggleFocus() {
    setState((prev) => {
      const synced = applyFocusElapsed(prev);
      const focus = synced.focusMode;
      const starting = !focus.running;
      const secondsLeft = Math.max(0, focus.secondsLeft || 0);

      return {
        ...synced,
        focusMode: {
          ...focus,
          running: starting,
          secondsLeft: starting && secondsLeft === 0 ? focus.duration : secondsLeft,
          lastTickAt: starting ? Date.now() : null
        }
      };
    });
  }

  function resetFocus() {
    setState((prev) => ({
      ...prev,
      focusMode: {
        ...prev.focusMode,
        running: false,
        secondsLeft: prev.focusMode.duration,
        lastTickAt: null
      }
    }));
  }

  function toggleBlockedApp(appName) {
    setState((prev) => {
      const current = Array.isArray(prev.focusMode.blockedApps) ? prev.focusMode.blockedApps : [];
      const blockedApps = current.includes(appName)
        ? current.filter((item) => item !== appName)
        : [...current, appName];

      return {
        ...prev,
        focusMode: {
          ...prev.focusMode,
          blockedApps
        }
      };
    });
  }

  const screenProps = {
    state,
    goal,
    setGoal,
    profile,
    setProfile,
    busy,
    exerciseError,
    memory,
    curriculum,
    chatInput,
    setChatInput,
    onSendMessage: sendMessage,
    onCreateExercise: createExercise,
    onAnalyzeWork: analyzeWork,
    uploadedFiles,
    filePreviews,
    uploadError,
    onFileChange: handleFileChange,
    onOpenFilePicker: openFilePicker,
    fileInputRef,
    onRemoveFile: removeFile,
    onToggleFocus: toggleFocus,
    onResetFocus: resetFocus,
    onToggleBlockedApp: toggleBlockedApp,
    secondsToClock,
    goTo: setScreen
  };

  const ScreenComponent =
    {
      dashboard: Dashboard,
      exercises: Exercises,
      session: Session,
      mentor: Mentor,
      progress: Progress
    }[screen] || Dashboard;

  return (
    <div className="app-shell">
      <Sidebar active={screen} onNavigate={setScreen} focusMode={state.focusMode} secondsToClock={secondsToClock} />
      <main className="content">
        <ScreenComponent {...screenProps} />
      </main>
      <MobileNav active={screen} onNavigate={setScreen} />
    </div>
  );
}
