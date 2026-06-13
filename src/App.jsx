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
    blockedApps: ['Instagram', 'TikTok', 'YouTube', 'X', 'Discord']
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

export default function App() {
  const saved = useMemo(() => loadState(), []);
  const [state, setState] = useState(saved || defaultState);
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
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    fetch(`${API_BASE}/health`).then((r) => r.json()).catch(() => {});

    fetch(`${API_BASE}/student-memory`)
      .then((r) => r.json())
      .then((data) => {
        setMemory(data.memory);
        setCurriculum(data.curriculum);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!state.focusMode.running) return;

    const timer = setInterval(() => {
      setState((prev) => {
        const next = Math.max(prev.focusMode.secondsLeft - 1, 0);
        const done = next === 0;

        return {
          ...prev,
          focusMode: {
            ...prev.focusMode,
            secondsLeft: done ? prev.focusMode.duration : next,
            running: done ? false : true
          },
          streak: done ? prev.streak + 1 : prev.streak,
          dailyMinutes: done
            ? prev.dailyMinutes + Math.round(prev.focusMode.duration / 60)
            : prev.dailyMinutes,
          totalHours: done
            ? Number((prev.totalHours + prev.focusMode.duration / 3600).toFixed(1))
            : prev.totalHours,
          recentSessions: done
            ? [
                {
                  type: 'Focus session',
                  when: new Date().toLocaleString('it-IT')
                },
                ...prev.recentSessions
              ].slice(0, 6)
            : prev.recentSessions
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state.focusMode.running]);

  useEffect(() => {
    return () => {
      filePreviews.forEach((file) => URL.revokeObjectURL(file.url));
    };
  }, [filePreviews]);

  async function createExercise(type) {
    setBusy((prev) => ({ ...prev, exercise: true }));

    try {
      const res = await fetch(`${API_BASE}/generate-exercise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, profile })
      });

      const data = await res.json();

      filePreviews.forEach((file) => URL.revokeObjectURL(file.url));
      setUploadedFiles([]);
      setFilePreviews([]);

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
    } finally {
      setBusy((prev) => ({ ...prev, exercise: false }));
    }
  }

  function handleFileChange(event) {
    const files = Array.from(event.target.files || []);
    filePreviews.forEach((file) => URL.revokeObjectURL(file.url));
    setUploadedFiles(files);
    const previews = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size
    }));
    setFilePreviews(previews);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function removeFile(indexToRemove) {
    setUploadedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setFilePreviews((prev) => {
      const removed = prev[indexToRemove];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, index) => index !== indexToRemove);
    });
  }

  async function analyzeWork() {
    if (!state.currentExercise) return;
    if (!uploadedFiles.length) {
      alert('Carica almeno un elaborato prima di avviare l’analisi.');
      return;
    }

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

      const data = await res.json();

      setState((prev) => ({
        ...prev,
        feedback: data,
        recurringErrors: data.recurringErrors || prev.recurringErrors,
        mentorMessages: [
          ...prev.mentorMessages,
          {
            role: 'assistant',
            content: `Feedback pronto. Errore prioritario: ${(data.errors || [])[0] || 'nessuno'}`
          }
        ]
      }));

      const memoryUpdate = {
        goal,
        level: profile.level,
        focus: profile.focus,
        recurringErrors: data.recurringErrors || state.recurringErrors
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
    } finally {
      setBusy((prev) => ({ ...prev, feedback: false }));
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');

    setState((prev) => ({
      ...prev,
      mentorMessages: [...prev.mentorMessages, { role: 'user', content: userMessage }]
    }));

    setBusy((prev) => ({ ...prev, chat: true }));

    try {
      const res = await fetch(`${API_BASE}/mentor-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
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

      const data = await res.json();

      setState((prev) => ({
        ...prev,
        mentorMessages: [
          ...prev.mentorMessages,
          { role: 'assistant', content: data.reply }
        ]
      }));
    } finally {
      setBusy((prev) => ({ ...prev, chat: false }));
    }
  }

  function toggleFocus() {
    setState((prev) => ({
      ...prev,
      focusMode: { ...prev.focusMode, running: !prev.focusMode.running }
    }));
  }

  function resetFocus() {
    setState((prev) => ({
      ...prev,
      focusMode: {
        ...prev.focusMode,
        running: false,
        secondsLeft: prev.focusMode.duration
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
    memory,
    curriculum,
    chatInput,
    setChatInput,
    onSendMessage: sendMessage,
    onCreateExercise: createExercise,
    onAnalyzeWork: analyzeWork,
    uploadedFiles,
    filePreviews,
    onFileChange: handleFileChange,
    onOpenFilePicker: openFilePicker,
    fileInputRef,
    onRemoveFile: removeFile,
    onToggleFocus: toggleFocus,
    onResetFocus: resetFocus,
    secondsToClock,
    goTo: setScreen
  };

  const ScreenComponent = {
    dashboard: Dashboard,
    exercises: Exercises,
    session: Session,
    mentor: Mentor,
    progress: Progress
  }[screen] || Dashboard;

  return (
    <div className="app-shell">
      <Sidebar
        active={screen}
        onNavigate={setScreen}
        focusMode={state.focusMode}
        secondsToClock={secondsToClock}
      />

      <main className="content">
        <ScreenComponent {...screenProps} />
      </main>

      <MobileNav active={screen} onNavigate={setScreen} />
    </div>
  );
}
