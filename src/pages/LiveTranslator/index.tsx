import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Square, ChevronDown, Copy, Check,
  Globe, AlertCircle, Loader2, Volume2, ArrowRight,
  Sparkles, Languages, Bot, X,
} from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import { formRequest, api } from '../../lib/api'

// ── Language registry ─────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', name: 'English',    flag: '🇬🇧' },
  { code: 'es', name: 'Spanish',    flag: '🇪🇸' },
  { code: 'fr', name: 'French',     flag: '🇫🇷' },
  { code: 'de', name: 'German',     flag: '🇩🇪' },
  { code: 'it', name: 'Italian',    flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'nl', name: 'Dutch',      flag: '🇳🇱' },
  { code: 'ru', name: 'Russian',    flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese',    flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese',   flag: '🇯🇵' },
  { code: 'ko', name: 'Korean',     flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic',     flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi',      flag: '🇮🇳' },
  { code: 'tr', name: 'Turkish',    flag: '🇹🇷' },
  { code: 'pl', name: 'Polish',     flag: '🇵🇱' },
  { code: 'sv', name: 'Swedish',    flag: '🇸🇪' },
  { code: 'da', name: 'Danish',     flag: '🇩🇰' },
  { code: 'no', name: 'Norwegian',  flag: '🇳🇴' },
  { code: 'fi', name: 'Finnish',    flag: '🇫🇮' },
  { code: 'uk', name: 'Ukrainian',  flag: '🇺🇦' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'th', name: 'Thai',       flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay',      flag: '🇲🇾' },
  { code: 'sw', name: 'Swahili',    flag: '🇰🇪' },
  { code: 'yo', name: 'Yoruba',     flag: '🇳🇬' },
  { code: 'ha', name: 'Hausa',      flag: '🇳🇬' },
]

const LANG_MAP = Object.fromEntries(LANGUAGES.map(l => [l.code, l]))
function getLang(code: string) {
  return LANG_MAP[code] ?? { code, name: code.toUpperCase(), flag: '🌐' }
}

// ── VAD constants ─────────────────────────────────────────────────────────────

const SILENCE_THRESHOLD = 0.022
const SILENCE_AFTER_MS  = 1200
const MIN_SPEECH_MS     = 400
const MAX_CHUNK_MS      = 30_000
const TIMESLICE_MS      = 100    // MediaRecorder fires ondataavailable every 100 ms

// ── Types ─────────────────────────────────────────────────────────────────────

interface Segment {
  id: number
  sourceLanguage: string
  targetLanguage: string
  sourceText: string
  translatedText: string
  timestamp: Date
  pending: boolean
  speaker?: number        // 0-based index from Deepgram (null when unavailable)
  speakerLabel?: string   // e.g. "Speaker 1"
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Waveform({ recording, speaking }: { recording: boolean; speaking: boolean }) {
  const heights = [5, 12, 8, 16, 10, 14, 7, 18, 11, 9, 15, 8, 13, 6, 11]
  const active = recording && speaking
  const idle   = recording && !speaking
  return (
    <div className="flex items-end justify-center gap-[3px] h-8">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className={`w-[3px] rounded-full transition-colors duration-300 ${
            active ? 'bg-emerald-400' : idle ? 'bg-violet-300' : 'bg-gray-200'
          }`}
          style={{ height: `${h}px` }}
          animate={
            active
              ? { scaleY: [1, 2.4, 0.5, 1.9, 1] }
              : idle
              ? { scaleY: [1, 1.3, 0.85, 1] }
              : { scaleY: 1 }
          }
          transition={
            active
              ? { duration: 1.0, repeat: Infinity, delay: i * 0.07, ease: 'easeInOut' }
              : idle
              ? { duration: 2.2, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  )
}

function LangSelector({
  value, onChange, allowAuto = false,
}: {
  value: string
  onChange: (code: string) => void
  allowAuto?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isAuto = value === 'auto'
  const selected = isAuto ? null : getLang(value)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold w-full transition-all focus:outline-none glass-input"
        style={{ border: '1px solid var(--card-border)', color: 'var(--text-1)' }}
      >
        {isAuto ? (
          <><span className="text-base leading-none">🌐</span><span className="flex-1 text-left" style={{ color: 'var(--text-3)' }}>Auto-detect</span></>
        ) : (
          <><span className="text-base leading-none">{selected!.flag}</span><span className="flex-1 text-left">{selected!.name}</span></>
        )}
        <ChevronDown size={13} style={{ color: 'var(--text-3)' }} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl shadow-2xl overflow-hidden glass-dropdown"
            style={{ border: '1px solid var(--card-border)' }}
          >
            <div className="max-h-56 overflow-y-auto py-1">
              {allowAuto && (
                <button
                  onClick={() => { onChange('auto'); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors"
                  style={{
                    background: isAuto ? 'rgba(139,92,246,0.1)' : 'transparent',
                    color: isAuto ? 'rgb(167,139,250)' : 'var(--text-3)',
                    borderBottom: '1px solid var(--divider)',
                  }}
                >
                  <span className="text-base leading-none">🌐</span>
                  <span>Auto-detect</span>
                  {isAuto && <Check size={12} className="ml-auto text-violet-400" />}
                </button>
              )}
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { onChange(lang.code); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors"
                  style={{
                    background: lang.code === value ? 'rgba(139,92,246,0.1)' : 'transparent',
                    color: lang.code === value ? 'rgb(167,139,250)' : 'var(--text-2)',
                  }}
                  onMouseEnter={e => { if (lang.code !== value) (e.currentTarget as HTMLElement).style.background = 'var(--card-hover)' }}
                  onMouseLeave={e => { if (lang.code !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {lang.code === value && <Check size={12} className="ml-auto text-violet-400" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
      className="p-1 rounded-lg transition-colors shrink-0 hover:bg-white/10"
      style={{ color: 'var(--text-3)' }}
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  )
}


function EmptyPane({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8 py-16 text-gray-300">
      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-xs font-medium text-gray-400">{label}</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LiveTranslator() {
  const [isRecording, setIsRecording]   = useState(false)
  const [isSpeaking, setIsSpeaking]     = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [sourceLang, setSourceLang]     = useState('auto')
  const [targetLang, setTargetLang]     = useState('en')
  const [segments, setSegments]         = useState<Segment[]>([])
  const [detectedLang, setDetectedLang] = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [liveText, setLiveText]         = useState('')
  const [activeBotSession, setActiveBotSession] = useState<any>(null)
  const [showBotNotice, setShowBotNotice]       = useState(false)
  const [isBotMode, setIsBotMode]               = useState(false)

  const streamRef       = useRef<MediaStream | null>(null)
  const audioCtxRef     = useRef<AudioContext | null>(null)
  const vadIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const mrRef           = useRef<MediaRecorder | null>(null)
  const chunksRef       = useRef<Blob[]>([])
  const mimeTypeRef     = useRef('')
  const speechStartRef  = useRef<number | null>(null)
  const silenceStartRef = useRef<number | null>(null)
  const isSpeakingRef   = useRef(false)
  const isRecordingRef  = useRef(false)
  const sourceLangRef   = useRef(sourceLang)
  const targetLangRef   = useRef(targetLang)
  const sourceScrollRef = useRef<HTMLDivElement>(null)
  const transScrollRef  = useRef<HTMLDivElement>(null)
  const segIdRef        = useRef(0)
  const recognitionRef  = useRef<any>(null)
  const botWsRef        = useRef<WebSocket | null>(null)

  useEffect(() => { sourceLangRef.current = sourceLang }, [sourceLang])
  useEffect(() => { targetLangRef.current = targetLang }, [targetLang])

  useEffect(() => {
    const ACTIVE = ['queued', 'preparing', 'joining', 'waiting_for_host', 'recording']
    api.get('/meeting-bots').then((sessions: any[]) => {
      const active = sessions?.find(s => ACTIVE.includes(s.status))
      if (active) { setActiveBotSession(active); setShowBotNotice(true) }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (sourceScrollRef.current) sourceScrollRef.current.scrollTop = sourceScrollRef.current.scrollHeight
    if (transScrollRef.current)  transScrollRef.current.scrollTop  = transScrollRef.current.scrollHeight
  }, [segments.length, liveText])

  useEffect(() => () => teardown(), [])

  // ── Non-blocking translation: mic keeps running while this resolves ─────────
  async function processBlob(blob: Blob, segId: number) {
    setPendingCount(p => p + 1)
    try {
      const form = new FormData()
      form.append('audio', blob, 'chunk.webm')
      form.append('target_language', targetLangRef.current)
      if (sourceLangRef.current !== 'auto') form.append('source_language', sourceLangRef.current)
      const result = await formRequest('/translate/audio', { method: 'POST', body: form })

      if (result.source_text) {
        setDetectedLang(result.source_language)
        setError(null)
        setSegments(prev => {
          // Check we're not adding a duplicate of the last segment
          const last = prev[prev.length - 1]
          if (last && last.sourceText.trim().toLowerCase() === result.source_text.trim().toLowerCase()) {
            return prev.map(s => s.id === segId ? { ...s, pending: false } : s)
          }
          // Update the pending placeholder if it exists, otherwise add
          const existing = prev.find(s => s.id === segId)
          if (existing) {
            return prev.map(s => s.id === segId ? {
              ...s,
              sourceText: result.source_text,
              translatedText: result.translated_text,
              sourceLanguage: result.source_language,
              pending: false,
            } : s)
          }
          return prev
        })
      } else {
        // No speech detected — remove the placeholder
        setSegments(prev => prev.filter(s => s.id !== segId))
      }
    } catch (err: any) {
      setError(err.message || 'Translation failed.')
      setSegments(prev => prev.filter(s => s.id !== segId))
    } finally {
      setPendingCount(p => p - 1)
    }
  }

  // ── Start a new MediaRecorder segment — mic stream stays alive throughout ────
  // Each call creates a fresh MediaRecorder so the resulting Blob is a complete,
  // self-contained WebM that ffmpeg can decode without needing a prepended header.
  function startChunk(stream: MediaStream) {
    if (!isRecordingRef.current) return
    const mr = new MediaRecorder(stream, { mimeType: mimeTypeRef.current })
    mrRef.current  = mr
    chunksRef.current = []

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mr.onstop = () => {
      setLiveText('')   // segment is flushed — clear live words
      const blobs = chunksRef.current.splice(0)
      const blob  = new Blob(blobs, { type: mimeTypeRef.current })
      if (blob.size >= 500) {
        const segId = ++segIdRef.current
        setSegments(prev => [...prev, {
          id: segId,
          sourceLanguage: sourceLangRef.current === 'auto' ? '' : sourceLangRef.current,
          targetLanguage: targetLangRef.current,
          sourceText: '…',
          translatedText: '',
          timestamp: new Date(),
          pending: true,
        }])
        processBlob(blob, segId)  // fire-and-forget — mic keeps running
      }
      speechStartRef.current  = null
      silenceStartRef.current = null
      // Restart immediately so the next speech segment is captured
      if (isRecordingRef.current) startChunk(stream)
    }

    mr.start(TIMESLICE_MS)
  }

  // ── VAD: poll amplitude every 80 ms ─────────────────────────────────────────
  function setupVAD(stream: MediaStream) {
    const audioCtx = new AudioContext()
    audioCtxRef.current = audioCtx

    const source   = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.4
    source.connect(analyser)

    const buf = new Float32Array(analyser.frequencyBinCount)

    vadIntervalRef.current = setInterval(() => {
      if (!isRecordingRef.current) return

      analyser.getFloatTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
      const rms = Math.sqrt(sum / buf.length)

      const now = Date.now()

      if (rms > SILENCE_THRESHOLD) {
        if (!isSpeakingRef.current) {
          isSpeakingRef.current   = true
          silenceStartRef.current = null
          if (!speechStartRef.current) speechStartRef.current = now
          setIsSpeaking(true)
        }
      } else {
        if (isSpeakingRef.current) {
          isSpeakingRef.current   = false
          silenceStartRef.current = now
          setIsSpeaking(false)
        }

        const silenceDuration = silenceStartRef.current ? now - silenceStartRef.current : 0
        const speechStart     = speechStartRef.current
        const speechDuration  = speechStart
          ? (silenceStartRef.current ?? now) - speechStart
          : 0

        // Silence long enough after real speech → stop recorder (onstop will flush + restart)
        if (
          silenceDuration >= SILENCE_AFTER_MS &&
          speechDuration  >= MIN_SPEECH_MS &&
          speechStart !== null &&
          mrRef.current?.state === 'recording'
        ) {
          mrRef.current.stop()
        }
      }

      // Hard cap: cut the segment if a single speech run exceeds MAX_CHUNK_MS
      const speechStart    = speechStartRef.current
      const speechDuration = speechStart ? now - speechStart : 0
      if (speechDuration >= MAX_CHUNK_MS && speechStart !== null && mrRef.current?.state === 'recording') {
        mrRef.current.stop()
      }
    }, 80)
  }

  // ── Live word-by-word display via Web Speech API ────────────────────────────
  // Runs in parallel with the MediaRecorder pipeline purely for visual feedback.
  // SpeechRecognition is not available in Firefox; we degrade gracefully.
  function startLiveRecognition() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    recognition.continuous      = true
    recognition.interimResults  = true
    recognition.maxAlternatives = 1
    if (sourceLangRef.current !== 'auto') recognition.lang = sourceLangRef.current

    recognition.onresult = (e: any) => {
      if (!isRecordingRef.current) return
      let text = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript
      }
      setLiveText(text.trim())
    }

    recognition.onerror = () => { /* ignore */ }

    // Auto-restart on natural end (browser times out after silence)
    recognition.onend = () => {
      if (isRecordingRef.current) {
        try { recognition.start() } catch { /* ignore */ }
      }
    }

    recognitionRef.current = recognition
    try { recognition.start() } catch { /* ignore */ }
  }

  function teardown() {
    isRecordingRef.current = false
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current)
    // Stopping the recorder triggers onstop; isRecordingRef is false so startChunk
    // will return early — no restart loop after teardown.
    if (mrRef.current?.state === 'recording') mrRef.current.stop()
    if (audioCtxRef.current) audioCtxRef.current.close()
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    streamRef.current       = null
    audioCtxRef.current     = null
    mrRef.current           = null
    chunksRef.current       = []
    speechStartRef.current  = null
    silenceStartRef.current = null
    setLiveText('')
  }

  // ── Bot audio mode ───────────────────────────────────────────────────────────
  function startBotAudio(sessionId: string) {
    setError(null)
    setIsBotMode(true)
    setIsRecording(true)
    const token = localStorage.getItem('minuteai_access') || ''
    const wsUrl = `${import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'}/ws/bot-live-translate/${sessionId}?token=${token}&target_lang=${targetLang}&source_lang=${sourceLang}`
    const ws = new WebSocket(wsUrl)
    botWsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'partial') {
          setLiveText(msg.speaker_label ? `[${msg.speaker_label}] ${msg.text}` : msg.text)
        } else if (msg.type === 'result') {
          setLiveText('')
          const segId = ++segIdRef.current
          setDetectedLang(msg.source_language)
          setSegments(prev => [...prev, {
            id: segId,
            sourceLanguage: msg.source_language || sourceLang,
            targetLanguage: targetLang,
            sourceText: msg.source_text,
            translatedText: msg.translated_text,
            timestamp: new Date(),
            pending: false,
            speaker: msg.speaker,
            speakerLabel: msg.speaker_label,
          }])
        } else if (msg.type === 'error') {
          setError(msg.message)
        }
      } catch { /* ignore */ }
    }

    ws.onerror = () => setError('Bot audio connection failed.')
    ws.onclose = () => {
      setIsRecording(false)
      setIsBotMode(false)
      setLiveText('')
    }
  }

  function stopBotAudio() {
    botWsRef.current?.close()
    botWsRef.current = null
    setIsRecording(false)
    setIsBotMode(false)
    setLiveText('')
  }

  async function startRecording() {
    setError(null)
    setPermissionDenied(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      mimeTypeRef.current = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'

      isRecordingRef.current = true
      setIsRecording(true)
      setupVAD(stream)
      startChunk(stream)        // begin first MediaRecorder segment
      startLiveRecognition()    // begin live word display (graceful no-op if unsupported)
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true)
      } else {
        setError('Could not access microphone. Please check your device settings.')
      }
    }
  }

  function stopRecording() {
    if (isBotMode) { stopBotAudio(); return }
    teardown()
    setIsRecording(false)
    setIsSpeaking(false)
  }

  function clearAll() {
    setSegments([])
    setDetectedLang(null)
    setError(null)
  }

  const isProcessing = pendingCount > 0
  const srcLang = detectedLang ? getLang(detectedLang) : null
  const tgtLang = getLang(targetLang)

  const statusText = isRecording && isSpeaking
    ? 'Listening…'
    : isRecording
    ? 'Waiting for speech…'
    : 'Ready'

  return (
    <div className="flex h-screen app-bg app-grid overflow-hidden">
      <Sidebar active="translator" />

      <main className="min-w-0 flex-1 flex flex-col overflow-hidden relative z-[1]">

        {/* ── Bot-on-call notice ── */}
        <AnimatePresence>
          {showBotNotice && activeBotSession && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="shrink-0 flex items-center gap-3 px-4 sm:px-8 py-3 border-b"
              style={{
                background: 'linear-gradient(90deg, rgba(124,58,237,0.1), rgba(79,70,229,0.06))',
                borderColor: 'rgba(139,92,246,0.2)',
              }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-400">
                <Bot size={15} />
              </span>
              <p className="flex-1 min-w-0 text-sm" style={{ color: 'var(--text-2)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-1)' }}>
                  MinuteAI bot is on your call
                </span>
                {activeBotSession.title ? ` — ${activeBotSession.title}` : ''}
                . Use bot audio for speaker labels.
              </p>
              {!isRecording && (
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => { startBotAudio(activeBotSession.id); setShowBotNotice(false) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition"
                  >
                    <Bot size={12} />
                    Bot audio
                  </button>
                  <button
                    onClick={() => { startRecording(); setShowBotNotice(false) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border hover:bg-white/5 transition"
                    style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)' }}
                  >
                    <Mic size={12} />
                    Mic
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowBotNotice(false)}
                className="shrink-0 p-1.5 rounded-full transition hover:bg-white/10"
                style={{ color: 'var(--text-3)' }}
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ── */}
        <div className="shrink-0 px-4 sm:px-8 pt-6 sm:pt-7 pb-4 sm:pb-5" style={{ borderBottom: '1px solid var(--divider)' }}>
          {/* top row */}
          <div className="mb-4">
            <div className="flex items-start justify-between gap-3 mb-3 pr-14 sm:pr-0">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Real-time</p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5" style={{ color: 'var(--text-1)' }}>
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
                    <Languages size={16} className="text-white" />
                  </span>
                  Live Translator
                </h1>
              </div>
              {/* mic button — top-right on all sizes */}
              <motion.button
                onClick={isRecording ? stopRecording : startRecording}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className={`relative flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full font-semibold text-sm transition-all overflow-hidden shrink-0 ${
                  isRecording
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30'
                }`}>
                {isRecording ? (
                  <><Square size={14} className="fill-rose-400 text-rose-400" /><span className="hidden sm:inline">Stop</span></>
                ) : (
                  <><Mic size={14} /><span className="hidden sm:inline">Start listening</span></>
                )}
              </motion.button>
            </div>

            {/* language selectors row */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0"><LangSelector value={sourceLang} onChange={setSourceLang} allowAuto /></div>
              <ArrowRight size={14} style={{ color: 'var(--text-3)' }} className="shrink-0" />
              <div className="flex-1 min-w-0"><LangSelector value={targetLang} onChange={setTargetLang} /></div>
              {segments.length > 0 && (
                <button onClick={clearAll}
                  className="text-xs font-medium px-3 py-2 rounded-full transition hover:bg-rose-500/10 hover:text-rose-400 shrink-0"
                  style={{ color: 'var(--text-3)' }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* status bar */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Waveform recording={isRecording} speaking={isSpeaking} />
              <div className="flex items-center gap-1.5">
                <motion.span
                  className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-400' : isRecording ? 'bg-violet-400' : 'bg-white/20'}`}
                  animate={isRecording ? { scale: [1, 1.4, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className={`text-xs font-semibold ${
                  isSpeaking ? 'text-emerald-400' : isRecording ? 'text-violet-400' : ''
                }`} style={{ color: isSpeaking || isRecording ? undefined : 'var(--text-3)' }}>
                  {statusText}
                </span>
              </div>
            </div>

            <AnimatePresence>
              {isProcessing && (
                <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-[11px] text-violet-400 font-semibold">
                  <Loader2 size={11} className="animate-spin" />
                  <span className="hidden sm:inline">{pendingCount > 1 ? `Translating ${pendingCount} segments…` : 'Translating…'}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {(detectedLang || sourceLang !== 'auto') && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-violet-400"
                style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <Globe size={11} />
                {sourceLang === 'auto' ? srcLang ? `${srcLang.flag} ${srcLang.name}` : '🌐' : `${getLang(sourceLang).flag}`}
                <ArrowRight size={10} className="text-violet-500/50" />
                {tgtLang.flag} <span className="hidden sm:inline">{tgtLang.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* error */}
        <AnimatePresence>
          {(error || permissionDenied) && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="shrink-0 mx-4 sm:mx-6 mt-4 flex items-center gap-2.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3 text-sm text-rose-400">
              <AlertCircle size={14} className="shrink-0" />
              {permissionDenied ? "Microphone access was denied. Allow it in your browser's address bar and try again." : error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Two panels ── */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row min-h-0">

          {/* Left — source */}
          <div className="flex-1 flex flex-col min-w-0 border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--divider)' }}>
            {/* panel header */}
            <div className="shrink-0 flex items-center gap-2.5 px-6 py-3" style={{ borderBottom: '1px solid var(--divider)', background: 'var(--card-bg)' }}>
              <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                <Mic size={12} style={{ color: 'var(--text-3)' }} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
                {sourceLang === 'auto' ? srcLang ? `${srcLang.flag} ${srcLang.name}` : 'What you said' : `${getLang(sourceLang).flag} ${getLang(sourceLang).name}`}
              </span>
              {segments.filter(s => !s.pending).length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--input-bg)', color: 'var(--text-3)' }}>
                  {segments.filter(s => !s.pending).length}
                </span>
              )}
            </div>

            <div ref={sourceScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {segments.length === 0 && !liveText ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8 py-16">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
                    <Mic size={20} style={{ color: 'var(--text-3)' }} />
                  </div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Your speech will appear here</p>
                </div>
              ) : (
                <>
                  {segments.map(seg => (
                    <motion.div key={seg.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                      className="group px-4 py-3 rounded-xl border transition-all"
                      style={{
                        background: seg.pending ? 'rgba(139,92,246,0.05)' : 'var(--card-bg)',
                        borderColor: seg.pending ? 'rgba(139,92,246,0.2)' : 'var(--card-border)',
                      }}>
                      {seg.speakerLabel && (
                        <p className="text-[10px] font-bold mb-1 text-violet-400">{seg.speakerLabel}</p>
                      )}
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-sm leading-relaxed"
                          style={{ color: seg.pending ? 'var(--text-3)' : 'var(--text-1)', fontStyle: seg.pending ? 'italic' : 'normal' }}>
                          {seg.sourceText}
                        </p>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          {seg.pending && <Loader2 size={11} className="text-violet-400 animate-spin" />}
                          {!seg.pending && <CopyButton text={seg.sourceText} />}
                        </div>
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>
                        {seg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </motion.div>
                  ))}

                  <AnimatePresence>
                    {liveText && (
                      <motion.div key="live"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}
                        className="px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                        <div className="flex items-start gap-2">
                          <p className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>
                            {liveText}
                            <span className="inline-block w-0.5 h-[1em] bg-emerald-400 ml-[2px] align-middle animate-pulse" />
                          </p>
                          <Mic size={11} className="text-emerald-400 shrink-0 mt-1 animate-pulse" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </div>

          {/* Right — translation */}
          <div className="flex-1 flex flex-col min-w-0 min-h-[300px] lg:min-h-0">
            {/* panel header */}
            <div className="shrink-0 flex items-center justify-between gap-2.5 px-6 py-3" style={{ borderBottom: '1px solid var(--divider)', background: 'var(--card-bg)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Globe size={12} className="text-violet-400" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-violet-400">
                  {tgtLang.flag} {tgtLang.name}
                </span>
                {segments.filter(s => !s.pending && s.translatedText).length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300">
                    {segments.filter(s => !s.pending && s.translatedText).length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-violet-400 font-semibold">
                <Sparkles size={11} /> AI-powered
              </div>
            </div>

            <div ref={transScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {segments.filter(s => !s.pending || s.translatedText).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8 py-16">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
                    <Languages size={20} style={{ color: 'var(--text-3)' }} />
                  </div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Translations will appear here</p>
                </div>
              ) : (
                segments.map(seg => (
                  <motion.div key={seg.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                    className="group px-4 py-3 rounded-xl border transition-all"
                    style={{
                      background: seg.pending ? 'rgba(139,92,246,0.05)' : 'var(--card-bg)',
                      borderColor: seg.pending ? 'rgba(139,92,246,0.2)' : 'var(--card-border)',
                    }}>
                    {seg.speakerLabel && (
                      <p className="text-[10px] font-bold mb-1 text-violet-400">{seg.speakerLabel}</p>
                    )}
                    {seg.pending ? (
                      <div className="flex items-center gap-2 text-violet-400">
                        <Loader2 size={13} className="animate-spin shrink-0" />
                        <span className="text-sm italic">Translating…</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-2">
                          <p className="flex-1 text-sm font-medium leading-relaxed" style={{ color: 'var(--text-1)' }}>
                            {seg.translatedText || seg.sourceText}
                          </p>
                          <CopyButton text={seg.translatedText || seg.sourceText} />
                        </div>
                        {seg.sourceLanguage !== seg.targetLanguage && seg.sourceText !== '…' && (
                          <p className="text-[10px] mt-1 italic line-clamp-1" style={{ color: 'var(--text-3)' }}>
                            "{seg.sourceText}"
                          </p>
                        )}
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>
                          {seg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
