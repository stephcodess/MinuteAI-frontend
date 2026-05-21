import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Headphones, Upload, FileText, Clock, Mic2, CheckCircle2,
  Loader2, AlertCircle, Download, Play, Pause, ChevronRight,
  X, RotateCcw,
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
]

const DURATIONS = [2, 3, 5, 7, 10, 15, 20, 30]

// ── Steps progress bar ────────────────────────────────────────────────────────

const STEP_LABELS = [
  'Extracting PDF text…',
  'Generating presentation script with AI…',
  'Converting script to audio…',
  'Complete',
]

function stepIndex(step: string) {
  const i = STEP_LABELS.findIndex(s => step.startsWith(s.slice(0, 20)))
  return i < 0 ? 0 : i
}

function ProgressSteps({ step }: { step: string }) {
  const current = stepIndex(step)
  const labels = ['Extract text', 'Write script', 'Generate audio', 'Done']
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
          {i < labels.length - 1 && (
            <div className="absolute" />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Phase = 'form' | 'processing' | 'done' | 'error'

export default function PdfToAudio() {
  // Form
  const [file, setFile]             = useState<File | null>(null)
  const [dragging, setDragging]     = useState(false)
  const [purpose, setPurpose]       = useState('project_defense')
  const [duration, setDuration]     = useState(5)
  const [voice, setVoice]           = useState<'female' | 'male'>('female')
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
  const [playing, setPlaying]       = useState(false)
  const audioRef                    = useRef<HTMLAudioElement>(null)
  const [showScript, setShowScript] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Cleanup blob URL on unmount
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])

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

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!file) return
    setPhase('processing')
    setStep('Extracting PDF text…')
    setError('')

    const form = new FormData()
    form.append('file', file)
    form.append('purpose', purpose)
    form.append('duration_minutes', String(duration))
    form.append('voice', voice)

    let jobId: string
    try {
      const res = await formRequest('/pdf-to-audio', { method: 'POST', body: form })
      jobId = res.job_id
      jobIdRef.current = jobId
    } catch (err: any) {
      setPhase('error')
      setError(err.message || 'Failed to start job.')
      return
    }

    // Poll every 2 seconds
    pollRef.current = setInterval(async () => {
      try {
        const status = await apiFetch(`/pdf-to-audio/${jobId}`)
        setStep(status.step || '')

        if (status.status === 'done') {
          clearInterval(pollRef.current!)
          setScript(status.script || '')
          setWordCount(status.word_count || 0)
          setEstDuration(status.estimated_duration || 0)

          // Fetch audio as blob
          const tok = localStorage.getItem('minuteai_access')
          const r = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/pdf-to-audio/${jobId}/audio`, {
            headers: tok ? { Authorization: `Bearer ${tok}` } : {},
          })
          if (!r.ok) throw new Error('Could not fetch audio.')
          const blob = await r.blob()
          setAudioUrl(URL.createObjectURL(blob))
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
    setVoice('female')
    setPhase('form')
    setStep('')
    setError('')
    setScript('')
    setAudioUrl('')
    setPlaying(false)
    setShowScript(false)
    jobIdRef.current = null
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

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Sidebar active="pdf-to-audio" />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="w-full px-6 py-8 max-w-3xl">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Headphones size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>PDF to Audio</h1>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                Turn any PDF into a natural spoken presentation
              </p>
            </div>
          </div>

          {/* ── FORM ── */}
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
                    className={`relative flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                      dragging
                        ? 'border-violet-500 bg-violet-500/10'
                        : file
                        ? 'border-violet-500/50 bg-violet-500/5'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
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
                        <div className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center">
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
                          className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                          style={{ color: 'var(--text-3)' }}
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
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

                {/* 2. Purpose */}
                <section className="mb-8">
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                    What's this presentation for?
                  </h2>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {PURPOSES.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPurpose(p.id)}
                        className={`flex flex-col gap-1.5 p-3.5 rounded-2xl border text-left transition-all ${
                          purpose === p.id
                            ? 'border-violet-500/60 bg-violet-500/10'
                            : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03]'
                        }`}
                        style={{ background: purpose === p.id ? undefined : 'var(--card-bg)' }}
                      >
                        <span className="text-xl">{p.emoji}</span>
                        <p className={`text-xs font-semibold leading-tight ${purpose === p.id ? 'text-violet-200' : ''}`}
                          style={{ color: purpose === p.id ? undefined : 'var(--text-1)' }}>
                          {p.label}
                        </p>
                        <p className="text-[10px] leading-snug" style={{ color: 'var(--text-3)' }}>
                          {p.desc}
                        </p>
                        {purpose === p.id && (
                          <div className="mt-1 self-start w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center">
                            <CheckCircle2 size={10} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                {/* 3. Duration */}
                <section className="mb-8">
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
                    How long should it be?
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
                    Approx. {duration * 130} words · {duration} minute{duration !== 1 ? 's' : ''} at a natural pace
                  </p>
                </section>

                {/* 4. Voice */}
                <section className="mb-8">
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">4</span>
                    Voice
                  </h2>
                  <div className="flex gap-2">
                    {(['female', 'male'] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => setVoice(v)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all capitalize ${
                          voice === v
                            ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                            : 'hover:bg-white/[0.06]'
                        }`}
                        style={voice === v ? {} : { background: 'var(--input-bg)', color: 'var(--text-2)' }}
                      >
                        <Mic2 size={14} />
                        {v}
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
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: !file ? 'var(--input-bg)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: !file ? 'var(--text-3)' : 'white',
                    boxShadow: file ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
                  }}
                >
                  <Headphones size={17} />
                  Generate Presentation Audio
                  {file && <ChevronRight size={15} className="ml-1" />}
                </motion.button>

              </motion.div>
            )}

            {/* ── PROCESSING ── */}
            {phase === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="rounded-2xl border p-8 flex flex-col items-center gap-8" style={{ background: 'var(--card-bg)', borderColor: 'rgba(139,92,246,0.25)' }}>
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
                      {purposeObj?.emoji} {purposeObj?.label} · {duration} min · {voice === 'female' ? 'Female' : 'Male'} voice
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── DONE ── */}
            {phase === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

                {/* Success header */}
                <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-emerald-300">Audio ready!</p>
                    <p className="text-xs text-emerald-400/70 mt-0.5">
                      {wordCount.toLocaleString()} words · ~{estDuration} min · {purposeObj?.label}
                    </p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors hover:bg-white/[0.06]"
                    style={{ color: 'var(--text-3)' }}
                  >
                    <RotateCcw size={12} />
                    New
                  </button>
                </div>

                {/* Audio player */}
                <div className="rounded-2xl border p-5 mb-4" style={{ background: 'var(--card-bg)', borderColor: 'rgba(139,92,246,0.25)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
                      <Headphones size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                        {file?.name?.replace('.pdf', '') || 'Presentation'} — {duration} min
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                        {voice === 'female' ? 'Female' : 'Male'} voice · MP3
                      </p>
                    </div>
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}
                    >
                      {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                      {downloading ? 'Saving…' : 'Download MP3'}
                    </button>
                  </div>

                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    controls
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    className="w-full"
                    style={{ accentColor: '#7c3aed' }}
                  />
                </div>

                {/* Script preview */}
                <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                  <button
                    onClick={() => setShowScript(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left"
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

              </motion.div>
            )}

            {/* ── ERROR ── */}
            {phase === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 flex flex-col items-center gap-5 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <AlertCircle size={24} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-base font-bold mb-1 text-red-300">Something went wrong</p>
                    <p className="text-sm text-red-400/80 max-w-sm">{error}</p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
                    style={{ color: 'var(--text-2)' }}
                  >
                    <RotateCcw size={14} />
                    Try again
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
