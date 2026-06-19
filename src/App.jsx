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
  const min = String(Math.floor(value / 60)).padStart(2, '0');
  const sec = String(value % 60).padStart(2, '0');
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

function isImageFile(file) {
  return Boolean(file?.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(file?.name || ''));
}

function revokePreviewUrls(previews = []) {
  previews.forEach((file) => {
    if (file?.url) URL.revokeObjectURL(file.url);
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
    totalHours: Number((totalElapsedSeconds / 3600).toFixed(1)),
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
    'Diventare concept artist AAA/cinema con focus su concept art, character design e creature design.'
  );
  const [profile, setProfile] = useState({
    focus: 'character design e creature design',
    level: 'developing'
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
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    saveState(state);
  }, [state]);

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

  useEffect(() => () => revokePreviewUrls(filePreviewsRef.current), []);

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
            content: `Nuovo esercizio assegnato: ${data.title}. Concentrati su: ${data.objective}`
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
            content: `Feedback pronto. Errore prioritario: ${feedback.errors[0] || 'nessuno'}`
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
    setState((prev) => ({
      ...prev,
      mentorMessages: [...prev.mentorMessages, { role: 'user', content: userMessage || 'Immagini allegate' }]
    }));

    setBusy((prev) => ({ ...prev, chat: true }));

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
            currentExercise: state.currentExercise
              ? {
                  type: state.currentExercise.type,
                  title: state.currentExercise.title,
                  category: state.currentExercise.category,
                  objective: state.currentExercise.objective
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

      const reply = normalizeMentorReply(data);

      setState((prev) => ({
        ...prev,
        mentorMessages: [...prev.mentorMessages, { role: 'assistant', content: reply }]
      }));

      setChatInput('');

      if (images.length) {
        revokePreviewUrls(filePreviewsRef.current);
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
