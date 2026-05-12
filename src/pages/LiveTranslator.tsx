import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Square, ChevronDown, Copy, Check,
  Globe, AlertCircle, Loader2, Volume2, ArrowRight,
  Sparkles, Languages,
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { formRequest } from '../lib/api'

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
  pending: boolean   // translation not back yet
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
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:border-violet-300 transition-all text-sm font-semibold text-gray-800 w-full"
      >
        {isAuto ? (
          <><span className="text-base leading-none">🌐</span><span className="flex-1 text-left text-gray-400">Auto-detect</span></>
        ) : (
          <><span className="text-base leading-none">{selected!.flag}</span><span className="flex-1 text-left">{selected!.name}</span></>
        )}
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
          >
            <div className="max-h-48 overflow-y-auto py-1">
              {allowAuto && (
                <button
                  onClick={() => { onChange('auto'); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left border-b border-gray-50 ${
                    isAuto ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base leading-none">🌐</span>
                  <span>Auto-detect</span>
                  {isAuto && <Check size={12} className="ml-auto text-violet-600" />}
                </button>
              )}
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { onChange(lang.code); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                    lang.code === value ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {lang.code === value && <Check size={12} className="ml-auto text-violet-600" />}
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
      className="p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
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

  useEffect(() => { sourceLangRef.current = sourceLang }, [sourceLang])
  useEffect(() => { targetLangRef.current = targetLang }, [targetLang])

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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar active="translator" />

      <main className="min-w-0 flex-1 flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="shrink-0 sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur py-3 pl-16 pr-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 flex-wrap">

            {/* title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Languages size={16} className="text-violet-600 shrink-0" />
                Live Translator
              </h1>
              <p className="text-[11px] text-gray-400 mt-0.5">Mic keeps listening while translations are being processed</p>
            </div>

            {/* controls row */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* source lang */}
              <div className="w-40">
                <LangSelector value={sourceLang} onChange={setSourceLang} allowAuto />
              </div>

              <ArrowRight size={13} className="text-gray-300 shrink-0" />

              {/* target lang */}
              <div className="w-40">
                <LangSelector value={targetLang} onChange={setTargetLang} />
              </div>

              {/* mic button */}
              <motion.button
                onClick={isRecording ? stopRecording : startRecording}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 overflow-hidden ${
                  isRecording
                    ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-300/40'
                }`}
              >
                {isRecording ? (
                  <><Square size={14} className="fill-red-500 text-red-500" /> Stop</>
                ) : (
                  <><Mic size={14} /> Start listening</>
                )}
              </motion.button>

              {/* clear */}
              {segments.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-400 hover:text-red-400 transition-colors font-medium px-2"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* status row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {/* waveform + status */}
            <div className="flex items-center gap-2">
              <Waveform recording={isRecording} speaking={isSpeaking} />
              <div className="flex items-center gap-1.5">
                <motion.div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSpeaking ? 'bg-emerald-500' : isRecording ? 'bg-violet-400' : 'bg-gray-300'
                  }`}
                  animate={isRecording ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className={`text-xs font-medium ${
                  isSpeaking ? 'text-emerald-600' : isRecording ? 'text-violet-500' : 'text-gray-400'
                }`}>
                  {statusText}
                </span>
              </div>
            </div>

            {/* pending indicator — shown while translations are in-flight */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-[11px] text-violet-600 font-medium"
                >
                  <Loader2 size={11} className="animate-spin" />
                  {pendingCount > 1 ? `Translating ${pendingCount} segments…` : 'Translating…'}
                </motion.div>
              )}
            </AnimatePresence>

            {/* detected lang badge */}
            <AnimatePresence>
              {detectedLang && sourceLang === 'auto' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded-lg border border-gray-100 text-[11px] text-gray-500"
                >
                  <Volume2 size={10} className="text-gray-400" />
                  Detected: <span className="font-semibold text-gray-700">{srcLang?.flag} {srcLang?.name}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* language route badge */}
            {(detectedLang || sourceLang !== 'auto') && (
              <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 rounded-lg border border-violet-100">
                <Globe size={11} className="text-violet-400" />
                <span className="text-[11px] font-semibold text-violet-700">
                  {sourceLang === 'auto'
                    ? srcLang ? `${srcLang.flag} ${srcLang.name}` : '🌐 Auto'
                    : `${getLang(sourceLang).flag} ${getLang(sourceLang).name}`}
                </span>
                <ArrowRight size={10} className="text-violet-300" />
                <span className="text-[11px] font-semibold text-violet-700">{tgtLang.flag} {tgtLang.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Error banner ── */}
        <AnimatePresence>
          {(error || permissionDenied) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="shrink-0 mx-4 mt-3 flex items-center gap-2.5 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs"
            >
              <AlertCircle size={13} className="shrink-0" />
              {permissionDenied
                ? 'Microphone access was denied. Allow it in your browser\'s address bar and try again.'
                : error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Two-panel body ── */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* ─ Left: what you said ─ */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-100">
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-50 bg-white/60">
              <div className="flex items-center gap-2">
                <Mic size={13} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  {sourceLang === 'auto'
                    ? srcLang ? `${srcLang.flag} ${srcLang.name}` : 'What you said'
                    : `${getLang(sourceLang).flag} ${getLang(sourceLang).name}`}
                </span>
                {segments.filter(s => !s.pending).length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">
                    {segments.filter(s => !s.pending).length}
                  </span>
                )}
              </div>
            </div>

            <div ref={sourceScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {segments.length === 0 && !liveText ? (
                <EmptyPane label="Your speech will appear here" icon={<Mic size={20} className="text-gray-300" />} />
              ) : (
                <>
                  {segments.map((seg) => (
                    <motion.div
                      key={seg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`group px-4 py-3 rounded-xl border transition-all ${
                        seg.pending
                          ? 'border-violet-100 bg-violet-50/40'
                          : 'border-gray-100 bg-white shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <p className={`flex-1 text-sm leading-relaxed ${
                          seg.pending ? 'text-gray-400 italic' : 'text-gray-800'
                        }`}>
                          {seg.sourceText}
                        </p>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          {seg.pending && <Loader2 size={11} className="text-violet-400 animate-spin" />}
                          {!seg.pending && <CopyButton text={seg.sourceText} />}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-300 mt-1">
                        {seg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </motion.div>
                  ))}

                  {/* Live word-by-word display while speaking */}
                  <AnimatePresence>
                    {liveText && (
                      <motion.div
                        key="live"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50/50"
                      >
                        <div className="flex items-start gap-2">
                          <p className="flex-1 text-sm leading-relaxed text-gray-700">
                            {liveText}
                            <span className="inline-block w-0.5 h-[1em] bg-emerald-500 ml-[2px] align-middle animate-pulse" />
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

          {/* ─ Right: translation ─ */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-50 bg-white/60">
              <div className="flex items-center gap-2">
                <Globe size={13} className="text-violet-400" />
                <span className="text-xs font-bold text-violet-700 uppercase tracking-wide">
                  {tgtLang.flag} {tgtLang.name}
                </span>
                {segments.filter(s => !s.pending && s.translatedText).length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-bold">
                    {segments.filter(s => !s.pending && s.translatedText).length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Sparkles size={11} className="text-violet-400" />
                <span className="text-[10px] text-violet-400 font-medium">AI-powered</span>
              </div>
            </div>

            <div ref={transScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {segments.filter(s => !s.pending || s.translatedText).length === 0 ? (
                <EmptyPane label="Translations will appear here" icon={<Languages size={20} className="text-gray-300" />} />
              ) : (
                segments.map((seg) => (
                  <motion.div
                    key={seg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`group px-4 py-3 rounded-xl border transition-all ${
                      seg.pending
                        ? 'border-violet-100 bg-violet-50/30'
                        : 'border-violet-100/50 bg-white shadow-sm hover:shadow-md'
                    }`}
                  >
                    {seg.pending ? (
                      <div className="flex items-center gap-2 text-violet-400">
                        <Loader2 size={13} className="animate-spin shrink-0" />
                        <span className="text-sm italic">Translating…</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-2">
                          <p className="flex-1 text-sm font-medium text-gray-900 leading-relaxed">
                            {seg.translatedText || seg.sourceText}
                          </p>
                          <CopyButton text={seg.translatedText || seg.sourceText} />
                        </div>
                        {seg.sourceLanguage !== seg.targetLanguage && seg.sourceText !== '…' && (
                          <p className="text-[10px] text-gray-300 mt-1 italic line-clamp-1">
                            "{seg.sourceText}"
                          </p>
                        )}
                        <p className="text-[10px] text-gray-300 mt-1">
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
