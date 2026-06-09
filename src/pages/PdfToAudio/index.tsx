import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Headphones, Upload, FileText, Clock, Mic2, CheckCircle2,
  Loader2, AlertCircle, Download, Play, ChevronRight,
  X, RotateCcw, Check, RefreshCw, BookOpen, Layers,
  Globe, Zap, AlignLeft, BrainCircuit, Search,
} from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import { formRequest, apiFetch } from '../../lib/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const PURPOSES = [
  { id: 'project_defense',    label: 'Project Defense',   desc: 'Thesis / final-year defense', emoji: '🎓' },
  { id: 'class_presentation', label: 'Class Presentation', desc: 'Present to classmates',       emoji: '📚' },
  { id: 'conference_talk',    label: 'Conference Talk',    desc: 'Academic conference',          emoji: '🏛️' },
  { id: 'study_review',       label: 'Study Review',       desc: 'Personal revision audio',      emoji: '🧠' },
  { id: 'business_pitch',     label: 'Business Pitch',     desc: 'Investor / startup pitch',     emoji: '💼' },
  { id: 'podcast',            label: 'Podcast Explainer',  desc: 'General audience explainer',   emoji: '🎙️' },
  { id: 'slide_deck',         label: 'Slide Deck',         desc: 'Voiceover narration for slides', emoji: '🖥️' },
]

const DURATIONS = [2, 3, 5, 7, 10, 15, 20, 30]

const MODES = [
  { id: 'full',          label: 'Full Script',      desc: 'Complete narration of the entire document',                 icon: AlignLeft     },
  { id: 'summary',       label: '5-Min Summary',    desc: 'Key points only — ~650 words',                              icon: Zap           },
  { id: 'brief',         label: '60-Sec Brief',     desc: 'Elevator pitch — one core insight',                         icon: Layers        },
  { id: 'active_recall', label: 'Active Recall',    desc: 'Socratic prompts — pause and recall before each answer',    icon: BrainCircuit  },
  { id: 'deep_dive',     label: 'Deep Dive',        desc: 'Expert analysis — context, nuance, and implications',       icon: Search        },
]

const VOICES = [
  { id: 'asteria', label: 'Asteria', gender: 'female', style: 'Warm & professional' },
  { id: 'luna',    label: 'Luna',    gender: 'female', style: 'Soft & clear' },
  { id: 'stella',  label: 'Stella',  gender: 'female', style: 'Upbeat & friendly' },
  { id: 'athena',  label: 'Athena',  gender: 'female', style: 'Authoritative' },
  { id: 'orion',   label: 'Orion',   gender: 'male',   style: 'Deep & confident' },
  { id: 'arcas',   label: 'Arcas',   gender: 'male',   style: 'Steady & calm' },
  { id: 'helios',  label: 'Helios',  gender: 'male',   style: 'Bright & energetic' },
  { id: 'zeus',    label: 'Zeus',    gender: 'male',   style: 'Bold & commanding' },
]

const LANGUAGES = [
  { code: 'EN', label: 'English (original)' },
  { code: 'FR', label: 'French' },
  { code: 'ES', label: 'Spanish' },
  { code: 'DE', label: 'German' },
  { code: 'PT', label: 'Portuguese' },
  { code: 'IT', label: 'Italian' },
  { code: 'NL', label: 'Dutch' },
  { code: 'PL', label: 'Polish' },
  { code: 'RU', label: 'Russian' },
  { code: 'ZH', label: 'Chinese' },
  { code: 'JA', label: 'Japanese' },
  { code: 'KO', label: 'Korean' },
  { code: 'AR', label: 'Arabic' },
]

// ── Steps progress bar ────────────────────────────────────────────────────────

const STEP_LABELS = [
  'Extracting PDF text…',
  'Generating presentation script with AI…',
  'Translating',
  'Converting script to audio…',
  'Generating comprehension quiz…',
  'Generating flashcards…',
  'Complete',
]

function stepIndex(step: string) {
  if (step.startsWith('Extracting')) return 0
  if (step.startsWith('Generating presentation')) return 1
  if (step.startsWith('Translating')) return 2
  if (step.startsWith('Converting')) return 3
  if (step.startsWith('Generating comprehension') || step.startsWith('Generating flashcards')) return 4
  if (step === 'Complete') return 5
  return 0
}

function ProgressSteps({ step }: { step: string }) {
  const current = stepIndex(step)
  const labels = ['Extract', 'Write script', 'Translate', 'TTS', 'Extras', 'Done']
  return (
    <div className="flex items-center gap-1 w-full">
      {labels.map((label, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            i < current ? 'bg-violet-600 text-white'
            : i === current ? 'bg-violet-500/30 text-violet-300 ring-2 ring-violet-500/50'
            : 'bg-white/[0.06] text-slate-600'
          }`}>
            {i < current ? <CheckCircle2 size={14} /> : i + 1}
          </div>
          <span className={`text-[10px] font-medium text-center leading-tight ${
            i <= current ? 'text-violet-300' : 'text-slate-600'
          }`}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'form' | 'processing' | 'done' | 'error'
type Tab = 'generate' | 'audios'
type ResultTab = 'audio' | 'quiz' | 'flashcards'

type GeneratedAudio = {
  job_id: string
  status: 'processing' | 'done' | 'error'
  step?: string
  filename?: string
  purpose?: string
  mode?: string
  duration_minutes?: number
  voice?: string
  language?: string
  created_at?: string
  completed_at?: string
  word_count?: number
  estimated_duration?: number
  error?: string
  has_audio?: boolean
  has_quiz?: boolean
  has_flashcards?: boolean
}

type QuizData = {
  mcq: { question: string; options: string[]; answer: string }[]
  short_answer: { question: string; sample_answer: string }[]
}

function formatDate(value?: string) {
  if (!value) return 'Just now'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'Just now'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function titleFromFilename(filename?: string) {
  return filename?.replace(/\.pdf$/i, '') || 'Presentation audio'
}

// ── Quiz component ─────────────────────────────────────────────────────────────

function QuizView({ quiz }: { quiz: QuizData }) {
  const [selected, setSelected] = useState<Record<number, string>>({})
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-2)' }}>Multiple Choice</p>
        <div className="space-y-4">
          {quiz.mcq.map((q, qi) => (
            <div key={qi} className="rounded-xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-1)' }}>{qi + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const letter = opt[0]
                  const isSelected = selected[qi] === letter
                  const isCorrect = q.answer === letter
                  const showResult = revealed[qi]
                  return (
                    <button
                      key={oi}
                      onClick={() => { setSelected(s => ({ ...s, [qi]: letter })); setRevealed(r => ({ ...r, [qi]: true })) }}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all border ${
                        showResult && isCorrect ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                        : showResult && isSelected && !isCorrect ? 'border-red-500/40 bg-red-500/5 text-red-300'
                        : isSelected ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-transparent bg-white/[0.04] hover:bg-white/[0.08]'
                      }`}
                      style={{ color: showResult && isCorrect ? undefined : isSelected ? 'var(--text-1)' : 'var(--text-2)' }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
              {revealed[qi] && (
                <p className="text-xs mt-2 text-emerald-400/80">Correct answer: {q.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-2)' }}>Short Answer</p>
        <div className="space-y-4">
          {quiz.short_answer.map((q, qi) => {
            const key = `sa_${qi}`
            return (
              <div key={qi} className="rounded-xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>{q.question}</p>
                {revealed[key as unknown as number] ? (
                  <div className="text-sm p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/20 text-emerald-300/90 leading-relaxed">
                    {q.sample_answer}
                  </div>
                ) : (
                  <button
                    onClick={() => setRevealed(r => ({ ...r, [key as unknown as number]: true }))}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'var(--input-bg)', color: 'var(--text-3)' }}
                  >
                    Show sample answer
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Flashcards component ───────────────────────────────────────────────────────

function FlashcardsView({ cards }: { cards: { front: string; back: string }[] }) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({})

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {cards.map((card, i) => (
        <button
          key={i}
          onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))}
          className="relative rounded-xl border p-4 text-left transition-all cursor-pointer min-h-[100px]"
          style={{ background: flipped[i] ? 'rgba(var(--brand-rgb),0.08)' : 'var(--card-bg)', borderColor: flipped[i] ? 'rgba(var(--brand-rgb),0.3)' : 'var(--card-border)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
            {flipped[i] ? 'Back' : 'Front'}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: flipped[i] ? 'var(--text-1)' : 'var(--text-2)' }}>
            {flipped[i] ? card.back : card.front}
          </p>
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-3)' }}>Click to {flipped[i] ? 'see term' : 'reveal'}</p>
        </button>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PdfToAudio() {
  const [activeTab, setActiveTab]   = useState<Tab>('generate')

  // Form
  const [file, setFile]             = useState<File | null>(null)
  const [dragging, setDragging]     = useState(false)
  const [purpose, setPurpose]       = useState('project_defense')
  const [duration, setDuration]     = useState(5)
  const [voice, setVoice]           = useState('asteria')
  const [mode, setMode]             = useState('full')
  const [language, setLanguage]     = useState('EN')
  const [doQuiz, setDoQuiz]         = useState(false)
  const [doFlashcards, setDoFlashcards] = useState(false)
  const fileInputRef                = useRef<HTMLInputElement>(null)

  // Processing
  const [phase, setPhase]           = useState<Phase>('form')
  const [step, setStep]             = useState('')
  const [error, setError]           = useState('')
  const jobIdRef                    = useRef<string | null>(null)
  const pollRef                     = useRef<ReturnType<typeof setInterval> | null>(null)

  // Result
  const [script, setScript]         = useState('')
  const [wordCount, setWordCount]   = useState(0)
  const [estDuration, setEstDuration] = useState(0)
  const [audioUrl, setAudioUrl]     = useState('')
  const [showScript, setShowScript] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [resultTab, setResultTab]   = useState<ResultTab>('audio')
  const [quiz, setQuiz]             = useState<QuizData | null>(null)
  const [flashcards, setFlashcards] = useState<{ front: string; back: string }[] | null>(null)
  const currentJobId                = useRef<string | null>(null)

  // Generated audios
  const [generatedAudios, setGeneratedAudios] = useState<GeneratedAudio[]>([])
  const [loadingAudios, setLoadingAudios] = useState(false)
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({})
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null)
  const [downloadingAudioId, setDownloadingAudioId] = useState<string | null>(null)

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])
  useEffect(() => { loadGeneratedAudios() }, [])

  // ── File handling ────────────────────────────────────────────────────────────

  function acceptFile(f: File) {
    if (!f.name.toLowerCase().endsWith('.pdf')) return
    setFile(f)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) acceptFile(f)
  }, [])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  async function loadGeneratedAudios() {
    setLoadingAudios(true)
    try {
      const res = await apiFetch('/pdf-to-audio')
      setGeneratedAudios(res.items || [])
    } catch {
      setGeneratedAudios([])
    } finally {
      setLoadingAudios(false)
    }
  }

  async function fetchAudioBlob(jobId: string) {
    const tok = localStorage.getItem('minuteai_access')
    const r = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/pdf-to-audio/${jobId}/audio`, {
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    })
    if (!r.ok) throw new Error('Could not fetch audio.')
    return r.blob()
  }

  async function handleLoadGeneratedAudio(item: GeneratedAudio) {
    if (audioUrls[item.job_id] || item.status !== 'done') return
    setLoadingAudioId(item.job_id)
    try {
      const blob = await fetchAudioBlob(item.job_id)
      setAudioUrls(prev => ({ ...prev, [item.job_id]: URL.createObjectURL(blob) }))
    } finally {
      setLoadingAudioId(null)
    }
  }

  async function handleDownloadGeneratedAudio(item: GeneratedAudio) {
    if (item.status !== 'done') return
    setDownloadingAudioId(item.job_id)
    try {
      const blob = await fetchAudioBlob(item.job_id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${titleFromFilename(item.filename)}.mp3`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingAudioId(null)
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!file) return
    setPhase('processing')
    setStep('Extracting PDF text…')
    setError('')
    setQuiz(null)
    setFlashcards(null)

    const form = new FormData()
    form.append('file', file)
    form.append('purpose', purpose)
    form.append('duration_minutes', String(duration))
    form.append('voice', voice)
    form.append('mode', mode)
    form.append('language', language)
    form.append('generate_quiz', String(doQuiz))
    form.append('generate_flashcards', String(doFlashcards))

    let jobId: string
    try {
      const res = await formRequest('/pdf-to-audio', { method: 'POST', body: form })
      jobId = res.job_id
      jobIdRef.current = jobId
      currentJobId.current = jobId
    } catch (err: any) {
      setPhase('error')
      setError(err.message || 'Failed to start job.')
      return
    }

    pollRef.current = setInterval(async () => {
      try {
        const status = await apiFetch(`/pdf-to-audio/${jobId}`)
        setStep(status.step || '')

        if (status.status === 'done') {
          clearInterval(pollRef.current!)
          setScript(status.script || '')
          setWordCount(status.word_count || 0)
          setEstDuration(status.estimated_duration || 0)

          const blob = await fetchAudioBlob(jobId)
          setAudioUrl(URL.createObjectURL(blob))

          // Fetch quiz/flashcards if generated
          if (status.has_quiz) {
            try {
              const q = await apiFetch(`/pdf-to-audio/${jobId}/quiz`)
              setQuiz(q)
            } catch {}
          }
          if (status.has_flashcards) {
            try {
              const fc = await apiFetch(`/pdf-to-audio/${jobId}/flashcards`)
              setFlashcards(fc)
            } catch {}
          }

          loadGeneratedAudios()
          setResultTab('audio')
          setPhase('done')
        } else if (status.status === 'error') {
          clearInterval(pollRef.current!)
          setPhase('error')
          setError(status.error || 'Processing failed.')
        }
      } catch (e: any) {
        clearInterval(pollRef.current!)
        setPhase('error')
        setError(e.message || 'Failed to check status.')
      }
    }, 2000)
  }

  function handleReset() {
    if (pollRef.current) clearInterval(pollRef.current)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setFile(null)
    setPurpose('project_defense')
    setDuration(5)
    setVoice('asteria')
    setMode('full')
    setLanguage('EN')
    setDoQuiz(false)
    setDoFlashcards(false)
    setPhase('form')
    setStep('')
    setError('')
    setScript('')
    setAudioUrl('')
    setShowScript(false)
    setQuiz(null)
    setFlashcards(null)
    jobIdRef.current = null
    currentJobId.current = null
  }

  function handleDownload() {
    if (!audioUrl) return
    setDownloading(true)
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `${file?.name?.replace('.pdf', '') || 'presentation'}.mp3`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => setDownloading(false), 1200)
  }

  const purposeObj = PURPOSES.find(p => p.id === purpose)
  const voiceObj   = VOICES.find(v => v.id === voice)
  const modeObj    = MODES.find(m => m.id === mode)

  const effectiveDuration = mode === 'summary' ? 5 : mode === 'brief' ? 1 : duration

  // Result tabs that exist
  const resultTabs: { id: ResultTab; label: string }[] = [
    { id: 'audio', label: 'Audio' },
    ...(quiz ? [{ id: 'quiz' as ResultTab, label: 'Quiz' }] : []),
    ...(flashcards ? [{ id: 'flashcards' as ResultTab, label: 'Flashcards' }] : []),
  ]

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Sidebar active="pdf-to-audio" />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3.5 px-8 py-5 border-b shrink-0" style={{ borderColor: 'var(--divider)', background: 'var(--sidebar-bg)' }}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
            <Headphones size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>PDF to Audio</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              Turn any PDF into a natural spoken presentation
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto w-full max-w-2xl">

            {/* Tabs */}
            <div className="mb-6 flex border-b" style={{ borderColor: 'var(--divider)' }}>
              {(['generate', 'audios'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === tab ? 'border-violet-500 text-violet-500' : 'border-transparent'
                  }`}
                  style={{ color: activeTab === tab ? undefined : 'var(--text-3)', borderRadius: 0 }}
                >
                  {tab === 'generate' ? 'Generate' : 'Generated Audios'}
                </button>
              ))}
            </div>

          {/* ── FORM ── */}
          {activeTab === 'generate' && (
          <AnimatePresence mode="wait">
            {phase === 'form' && (
              <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

                {/* 1. Upload PDF */}
                <section className="mb-8">
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                    Upload your PDF
                  </h2>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    className={`relative flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                      dragging
                        ? 'border-violet-500 bg-violet-500/10'
                        : file
                        ? 'border-violet-500/50 bg-violet-500/5'
                        : 'dz-border'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && acceptFile(e.target.files[0])}
                    />

                    {file ? (
                      <>
                        <div className="w-12 h-12 !rounded-xl bg-violet-500/15 flex items-center justify-center">
                          <FileText size={22} className="text-violet-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{file.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                            {(file.size / 1024 / 1024).toFixed(2)} MB · Click to replace
                          </p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setFile(null) }}
                          className="absolute top-3 right-3 w-7 h-7 !rounded-lg flex items-center justify-center hover:bg-white/[0.08] transition-colors cursor-pointer"
                          style={{ color: 'var(--text-3)' }}
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 !rounded-xl flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
                          <Upload size={22} style={{ color: 'var(--text-3)' }} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                            Drag & drop your PDF here
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                            or click to browse · Max 50 MB
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                {/* 2. Mode */}
                <section className="mb-8">
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                    Listening mode
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {MODES.map(m => {
                      const Icon = m.icon
                      return (
                        <button
                          key={m.id}
                          onClick={() => setMode(m.id)}
                          className={`flex flex-col gap-2 p-4 !rounded border text-left transition-all cursor-pointer ${
                            mode === m.id
                              ? 'border-violet-500 bg-violet-500/8 ring-1 ring-violet-500/20'
                              : 'hover:border-white/15 hover:bg-white/[0.02]'
                          }`}
                          style={{ borderColor: mode === m.id ? undefined : 'var(--card-border)', background: mode === m.id ? undefined : 'var(--card-bg)' }}
                        >
                          <div className="flex items-center justify-between">
                            <Icon size={16} className={mode === m.id ? 'text-violet-400' : ''} style={mode === m.id ? {} : { color: 'var(--text-3)' }} />
                            {mode === m.id && <Check size={12} className="text-violet-400" />}
                          </div>
                          <p className={`text-xs font-bold leading-snug ${mode === m.id ? 'text-violet-200' : ''}`} style={mode === m.id ? {} : { color: 'var(--text-2)' }}>
                            {m.label}
                          </p>
                          <p className="text-[10px] leading-normal" style={{ color: 'var(--text-3)' }}>{m.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* 3. Purpose */}
                <section className="mb-8">
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
                    What's this for?
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PURPOSES.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPurpose(p.id)}
                        className={`flex flex-col gap-1 p-4 !rounded border text-left transition-all relative overflow-hidden cursor-pointer ${
                          purpose === p.id
                            ? 'border-violet-500 bg-violet-500/5 ring-1 ring-violet-500/20'
                            : 'hover:border-white/15 hover:bg-white/[0.02]'
                        }`}
                        style={{ borderColor: purpose === p.id ? undefined : 'var(--card-border)', background: purpose === p.id ? undefined : 'var(--card-bg)' }}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-xl">{p.emoji}</span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                            purpose === p.id
                              ? 'border-violet-500 bg-violet-500 text-white'
                              : 'border-white/15 bg-white/[0.02]'
                          }`}>
                            {purpose === p.id && <Check size={10} className="stroke-[3]" />}
                          </div>
                        </div>
                        <p className={`text-xs font-bold leading-snug mt-1 ${purpose === p.id ? 'text-violet-200' : 'text-slate-200'}`}>
                          {p.label}
                        </p>
                        <p className="text-[10px] leading-normal mt-0.5 text-slate-400">
                          {p.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>

                {/* 4. Duration — only show for full mode */}
                {mode === 'full' && (
                  <section className="mb-8">
                    <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                      <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">4</span>
                      How long?
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {DURATIONS.map(d => (
                        <button
                          key={d}
                          onClick={() => setDuration(d)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                            duration === d
                              ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                              : 'hover:bg-white/[0.06]'
                          }`}
                          style={duration === d ? {} : { background: 'var(--input-bg)', color: 'var(--text-2)' }}
                        >
                          <Clock size={13} />
                          {d} min
                        </button>
                      ))}
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
                      ~{duration * 130} words · {duration} minute{duration !== 1 ? 's' : ''} at natural pace
                    </p>
                  </section>
                )}

                {/* 5. Voice */}
                <section className="mb-8">
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">{mode === 'full' ? '5' : '4'}</span>
                    Voice
                  </h2>
                  <div className="mb-3 flex gap-2">
                    {(['female', 'male'] as const).map(g => (
                      <button
                        key={g}
                        onClick={() => {
                          const first = VOICES.find(v => v.gender === g)
                          if (first) setVoice(first.id)
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                          VOICES.find(v => v.id === voice)?.gender === g
                            ? 'bg-violet-600 text-white'
                            : 'hover:bg-white/[0.06]'
                        }`}
                        style={VOICES.find(v => v.id === voice)?.gender === g ? {} : { background: 'var(--input-bg)', color: 'var(--text-3)' }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {VOICES.filter(v => v.gender === (VOICES.find(vv => vv.id === voice)?.gender || 'female')).map(v => (
                      <button
                        key={v.id}
                        onClick={() => setVoice(v.id)}
                        className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          voice === v.id
                            ? 'border-violet-500 bg-violet-500/10'
                            : 'hover:bg-white/[0.04]'
                        }`}
                        style={{ borderColor: voice === v.id ? undefined : 'var(--card-border)', background: voice === v.id ? undefined : 'var(--card-bg)' }}
                      >
                        <div className="flex items-center gap-1.5">
                          <Mic2 size={13} className={voice === v.id ? 'text-violet-400' : ''} style={voice === v.id ? {} : { color: 'var(--text-3)' }} />
                          <span className={`text-xs font-bold ${voice === v.id ? 'text-violet-200' : ''}`} style={voice === v.id ? {} : { color: 'var(--text-2)' }}>{v.label}</span>
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{v.style}</p>
                      </button>
                    ))}
                  </div>
                </section>

                {/* 6. Language */}
                <section className="mb-8">
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">{mode === 'full' ? '6' : '5'}</span>
                    <Globe size={13} />
                    Output language
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          language === lang.code
                            ? 'bg-violet-600 text-white'
                            : 'hover:bg-white/[0.06]'
                        }`}
                        style={language === lang.code ? {} : { background: 'var(--input-bg)', color: 'var(--text-2)' }}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                  {language !== 'EN' && (
                    <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
                      Script will be translated before audio generation. Audio is English-quality only.
                    </p>
                  )}
                </section>

                {/* 7. Extras */}
                <section className="mb-8">
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">{mode === 'full' ? '7' : '6'}</span>
                    Extras (optional)
                  </h2>
                  <div className="flex flex-col gap-3">
                    {[
                      { state: doQuiz, setter: setDoQuiz, icon: BookOpen, label: 'Comprehension quiz', desc: '5 MCQ + 2 short-answer questions generated from your script' },
                      { state: doFlashcards, setter: setDoFlashcards, icon: Layers, label: 'Flashcards', desc: '12 study cards covering key concepts and terms' },
                    ].map(({ state, setter, icon: Icon, label, desc }) => (
                      <button
                        key={label}
                        onClick={() => setter(!state)}
                        className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          state ? 'border-violet-500/50 bg-violet-500/8' : ''
                        }`}
                        style={{ borderColor: state ? undefined : 'var(--card-border)', background: state ? undefined : 'var(--card-bg)' }}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${state ? 'bg-violet-500/20' : ''}`} style={state ? {} : { background: 'var(--input-bg)' }}>
                          <Icon size={16} className={state ? 'text-violet-400' : ''} style={state ? {} : { color: 'var(--text-3)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${state ? 'text-violet-200' : ''}`} style={state ? {} : { color: 'var(--text-2)' }}>{label}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 transition-all ${
                          state ? 'bg-violet-600 border-violet-500' : 'border-white/20'
                        }`}>
                          {state && <Check size={11} className="text-white stroke-[3]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Generate */}
                <motion.button
                  onClick={handleGenerate}
                  disabled={!file}
                  whileHover={file ? { scale: 1.01 } : {}}
                  whileTap={file ? { scale: 0.98 } : {}}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 !rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    background: !file ? 'var(--input-bg)' : 'linear-gradient(135deg, var(--brand-700), var(--brand-800))',
                    color: !file ? 'var(--text-3)' : 'white',
                    boxShadow: file ? '0 4px 20px rgba(var(--brand-rgb),0.35)' : 'none',
                  }}
                >
                  <Headphones size={17} />
                  Generate {modeObj?.label || 'Audio'}
                  {file && <ChevronRight size={15} className="ml-1" />}
                </motion.button>

              </motion.div>
            )}

            {/* ── PROCESSING ── */}
            {phase === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="!rounded-xl border p-8 flex flex-col items-center gap-8" style={{ background: 'var(--card-bg)', borderColor: 'rgba(var(--brand-rgb),0.25)' }}>
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full bg-violet-600/20 animate-ping" />
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-600/30 to-indigo-600/30 flex items-center justify-center border border-violet-500/30">
                      <Loader2 size={28} className="animate-spin text-violet-400" />
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-base font-bold mb-1" style={{ color: 'var(--text-1)' }}>Generating your audio…</p>
                    <p className="text-sm" style={{ color: 'var(--text-3)' }}>{step}</p>
                  </div>

                  <div className="w-full max-w-sm">
                    <ProgressSteps step={step} />
                  </div>

                  <div className="text-center text-xs" style={{ color: 'var(--text-3)' }}>
                    <p>This usually takes 30–90 seconds</p>
                    <p className="mt-1 font-medium" style={{ color: 'var(--text-2)' }}>
                      {purposeObj?.emoji} {purposeObj?.label} · {modeObj?.label} · {voiceObj?.label}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── DONE ── */}
            {phase === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

                <div className="flex items-center gap-3 mb-6 p-4 !rounded-xl border border-emerald-500/25 bg-emerald-500/5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-emerald-300">Audio ready!</p>
                    <p className="text-xs text-emerald-400/70 mt-0.5">
                      {wordCount.toLocaleString()} words · ~{estDuration} min · {purposeObj?.label} · {voiceObj?.label}
                    </p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 !rounded-lg text-xs font-semibold transition-colors hover:bg-white/[0.06] cursor-pointer"
                    style={{ color: 'var(--text-3)' }}
                  >
                    <RotateCcw size={12} />
                    New
                  </button>
                </div>

                {/* Result tabs */}
                {resultTabs.length > 1 && (
                  <div className="mb-4 flex border-b" style={{ borderColor: 'var(--divider)' }}>
                    {resultTabs.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setResultTab(t.id)}
                        className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                          resultTab === t.id ? 'border-violet-500 text-violet-500' : 'border-transparent'
                        }`}
                        style={{ color: resultTab === t.id ? undefined : 'var(--text-3)', borderRadius: 0 }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}

                {resultTab === 'audio' && (
                  <>
                    <div className="!rounded-xl border p-5 mb-4" style={{ background: 'var(--card-bg)', borderColor: 'rgba(var(--brand-rgb),0.25)' }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
                          <Headphones size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                            {file?.name?.replace('.pdf', '') || 'Presentation'} — {modeObj?.label}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                            {voiceObj?.label} · {voiceObj?.style} · MP3
                          </p>
                        </div>
                        <button
                          onClick={handleDownload}
                          disabled={downloading}
                          className="flex items-center gap-1.5 px-3.5 py-2 !rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}
                        >
                          {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                          {downloading ? 'Saving…' : 'Download MP3'}
                        </button>
                      </div>
                      <audio src={audioUrl} controls className="w-full" style={{ accentColor: 'var(--brand-700)' }} />
                    </div>

                    <div className="!rounded-xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                      <button
                        onClick={() => setShowScript(v => !v)}
                        className="w-full flex items-center justify-between px-5 py-3.5 text-left !rounded-none cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileText size={15} style={{ color: 'var(--text-3)' }} />
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                            View generated script
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'var(--input-bg)', color: 'var(--text-3)' }}>
                            {wordCount.toLocaleString()} words
                          </span>
                        </div>
                        <motion.div animate={{ rotate: showScript ? 90 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronRight size={15} style={{ color: 'var(--text-3)' }} />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {showScript && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.22, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: 'var(--card-border)' }}>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>
                                {script}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}

                {resultTab === 'quiz' && quiz && <QuizView quiz={quiz} />}
                {resultTab === 'flashcards' && flashcards && <FlashcardsView cards={flashcards} />}

              </motion.div>
            )}

            {/* ── ERROR ── */}
            {phase === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="!rounded-xl border border-red-500/20 bg-red-500/5 p-6 flex flex-col items-center gap-5 text-center">
                  <div className="w-14 h-14 !rounded-xl bg-red-500/10 flex items-center justify-center">
                    <AlertCircle size={24} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-base font-bold mb-1 text-red-300">Something went wrong</p>
                    <p className="text-sm text-red-400/80 max-w-sm">{error}</p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-5 py-2.5 !rounded-lg text-sm font-semibold bg-white/[0.06] hover:bg-white/[0.1] transition-colors cursor-pointer"
                    style={{ color: 'var(--text-2)' }}
                  >
                    <RotateCcw size={14} />
                    Try again
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          )}

          {activeTab === 'audios' && (
            <motion.div key="audios" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Generated audios</h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Your PDF presentation audio jobs from this server session.</p>
                </div>
                <button
                  onClick={loadGeneratedAudios}
                  disabled={loadingAudios}
                  className="flex items-center gap-2 px-3.5 py-2 !rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                  style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}
                >
                  <RefreshCw size={13} className={loadingAudios ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {loadingAudios ? (
                <div className="!rounded-xl border p-8 flex items-center justify-center gap-3" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-3)' }}>
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm font-medium">Loading audios…</span>
                </div>
              ) : generatedAudios.length === 0 ? (
                <div className="!rounded-xl border p-8 text-center" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                  <div className="w-12 h-12 mx-auto mb-3 !rounded-xl flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
                    <Headphones size={22} style={{ color: 'var(--text-3)' }} />
                  </div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>No generated audios yet</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Generate one from a PDF and it will show up here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {generatedAudios.map(item => {
                    const purposeLabel = PURPOSES.find(p => p.id === item.purpose)?.label || 'Presentation'
                    const voiceLabel   = VOICES.find(v => v.id === item.voice)?.label || item.voice || 'Voice'
                    const modeLabel    = MODES.find(m => m.id === item.mode)?.label || item.mode || ''
                    const isDone = item.status === 'done' && item.has_audio
                    const isLoadingAudio = loadingAudioId === item.job_id
                    const isDownloadingAudio = downloadingAudioId === item.job_id
                    return (
                      <div key={item.job_id} className="!rounded-xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            item.status === 'done' ? 'bg-emerald-500/15' : item.status === 'error' ? 'bg-red-500/15' : 'bg-violet-500/15'
                          }`}>
                            {item.status === 'processing' ? <Loader2 size={16} className="animate-spin text-violet-400" /> : <Headphones size={16} className={item.status === 'error' ? 'text-red-400' : 'text-emerald-400'} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-1)' }}>{titleFromFilename(item.filename)}</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                                  {purposeLabel} · {modeLabel || `${item.duration_minutes || '?'} min`} · {voiceLabel} · {formatDate(item.completed_at || item.created_at)}
                                  {item.has_quiz && ' · Quiz'}
                                  {item.has_flashcards && ' · Flashcards'}
                                </p>
                              </div>
                              <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${
                                item.status === 'done' ? 'bg-emerald-500/10 text-emerald-300'
                                : item.status === 'error' ? 'bg-red-500/10 text-red-300'
                                : 'bg-violet-500/10 text-violet-300'
                              }`}>
                                {item.status}
                              </span>
                            </div>

                            {item.status === 'error' && (
                              <p className="text-xs mt-3 text-red-400/80">{item.error || 'Audio generation failed.'}</p>
                            )}

                            {isDone && (
                              <div className="mt-4">
                                {audioUrls[item.job_id] ? (
                                  <audio src={audioUrls[item.job_id]} controls className="w-full" style={{ accentColor: 'var(--brand-700)' }} />
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={() => handleLoadGeneratedAudio(item)}
                                      disabled={isLoadingAudio}
                                      className="flex items-center gap-1.5 px-3.5 py-2 !rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                                      style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}
                                    >
                                      {isLoadingAudio ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                                      {isLoadingAudio ? 'Loading…' : 'Load player'}
                                    </button>
                                    <button
                                      onClick={() => handleDownloadGeneratedAudio(item)}
                                      disabled={isDownloadingAudio}
                                      className="flex items-center gap-1.5 px-3.5 py-2 !rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                                      style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}
                                    >
                                      {isDownloadingAudio ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                                      {isDownloadingAudio ? 'Saving…' : 'Download'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  </div>
)
}
