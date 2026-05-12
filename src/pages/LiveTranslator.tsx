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

// ── Sub-components ────────────────────────────────────────────────────────────

function Waveform({ recording, speaking }: { recording: boolean; speaking: boolean }) {
  const heights = [5, 12, 8, 16, 10, 14, 7, 18, 11, 9, 15, 8, 13, 6, 11]
  const active = recording && speaking
  const idle   = recording && !speaking
  return (
    <div className="flex items-end justify-center gap-[3px] h-10">
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
              ? { duration: 2.2, repeat: Infinity, delay: i * 0.1,  ease: 'easeInOut' }
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
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border-2 border-gray-200 hover:border-violet-300 transition-all text-sm font-semibold text-gray-800 w-full"
      >
        {isAuto ? (
          <>
            <span className="text-lg leading-none">🌐</span>
            <span className="flex-1 text-left text-gray-500">Auto-detect</span>
          </>
        ) : (
          <>
            <span className="text-lg leading-none">{selected!.flag}</span>
            <span className="flex-1 text-left">{selected!.name}</span>
          </>
        )}
        <ChevronDown
          size={15}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          >
            <div className="max-h-52 overflow-y-auto py-1.5">
              {allowAuto && (
                <button
                  onClick={() => { onChange('auto'); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors text-left border-b border-gray-50 ${
                    isAuto ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base leading-none">🌐</span>
                  <span>Auto-detect</span>
                  {isAuto && <Check size={13} className="ml-auto text-violet-600" />}
                </button>
              )}
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { onChange(lang.code); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors text-left ${
                    lang.code === value
                      ? 'bg-violet-50 text-violet-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {lang.code === value && <Check size={13} className="ml-auto text-violet-600" />}
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

  function handleCopy() {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
      title="Copy translation"
    >
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  )
}

function SegmentCard({ seg, index }: { seg: Segment; index: number }) {
  const src = getLang(seg.sourceLanguage)
  const isSame = seg.sourceLanguage === seg.targetLanguage

  function timeLabel(d: Date) {
    const m = Math.floor((Date.now() - d.getTime()) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    return `${Math.floor(m / 60)}h ago`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index < 3 ? 0 : 0 }}
      className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      {/* top bar */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-50">
        <span className="text-base leading-none">{src.flag}</span>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{src.name}</span>
        {!isSame && (
          <>
            <ArrowRight size={11} className="text-gray-300" />
            <span className="text-xs font-bold text-violet-600 uppercase tracking-wide">
              {getLang(seg.targetLanguage).name}
            </span>
          </>
        )}
        <span className="ml-auto text-[10px] text-gray-300">{timeLabel(seg.timestamp)}</span>
        <CopyButton text={seg.translatedText} />
      </div>

      {/* body */}
      <div className="px-4 py-3 space-y-2">
        {!isSame && (
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 italic">
            "{seg.sourceText}"
          </p>
        )}
        <p className="text-sm font-medium text-gray-900 leading-relaxed">
          {seg.translatedText}
        </p>
      </div>
    </motion.div>
  )
}

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8 py-16">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
          <Languages size={28} className="text-violet-400" />
        </div>
        <motion.div
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles size={10} className="text-white" />
        </motion.div>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-1">Ready to translate</p>
        <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
          Start listening and translations will appear here as speech is detected.
        </p>
      </div>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Segment {
  id: number
  sourceLanguage: string
  targetLanguage: string
  sourceText: string
  translatedText: string
  timestamp: Date
}

// ── Main page ─────────────────────────────────────────────────────────────────

// VAD tuning constants
const SILENCE_THRESHOLD  = 0.022   // RMS below this = silence
const SILENCE_AFTER_MS   = 1200    // ms of silence before we send
const MIN_SPEECH_MS      = 400     // ignore clips shorter than this
const MAX_CHUNK_MS       = 30_000  // safety: force-send after 30s

export default function LiveTranslator() {
  const [isRecording, setIsRecording]     = useState(false)
  const [isSpeaking, setIsSpeaking]       = useState(false)
  const [isProcessing, setIsProcessing]   = useState(false)
  const [sourceLang, setSourceLang]       = useState('auto')
  const [targetLang, setTargetLang]       = useState('en')
  const [segments, setSegments]           = useState<Segment[]>([])
  const [detectedLang, setDetectedLang]   = useState<string | null>(null)
  const [error, setError]                 = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const streamRef       = useRef<MediaStream | null>(null)
  const audioCtxRef     = useRef<AudioContext | null>(null)
  const vadIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const mrRef           = useRef<MediaRecorder | null>(null)
  const chunksRef       = useRef<Blob[]>([])
  const mimeTypeRef     = useRef('')
  const speechStartRef  = useRef<number | null>(null)   // when current chunk started
  const silenceStartRef = useRef<number | null>(null)   // when silence began
  const isSpeakingRef   = useRef(false)                 // avoids stale closure
  const isRecordingRef  = useRef(false)
  const sourceLangRef   = useRef(sourceLang)
  const targetLangRef   = useRef(targetLang)
  const feedRef         = useRef<HTMLDivElement>(null)

  useEffect(() => { sourceLangRef.current = sourceLang }, [sourceLang])
  useEffect(() => { targetLangRef.current = targetLang }, [targetLang])

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [segments.length])

  useEffect(() => () => { teardown() }, [])

  // ── send a completed audio blob ───────────────────────────────────────────
  async function processBlob(blob: Blob) {
    setIsProcessing(true)
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
          const last = prev[prev.length - 1]
          if (last && last.sourceText.trim().toLowerCase() === result.source_text.trim().toLowerCase()) {
            return prev
          }
          return [...prev, {
            id: Date.now(),
            sourceLanguage: result.source_language,
            targetLanguage: targetLangRef.current,
            sourceText: result.source_text,
            translatedText: result.translated_text,
            timestamp: new Date(),
          }]
        })
      }
    } catch (err: any) {
      setError(err.message || 'Translation failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── start a fresh MediaRecorder segment ───────────────────────────────────
  function startChunk(stream: MediaStream) {
    chunksRef.current = []
    silenceStartRef.current = null
    isSpeakingRef.current = false
    setIsSpeaking(false)

    const mr = new MediaRecorder(stream, { mimeType: mimeTypeRef.current })
    mrRef.current = mr

    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = async () => {
      const blobs = chunksRef.current
      if (blobs.length > 0) {
        await processBlob(new Blob(blobs, { type: mimeTypeRef.current }))
      }
      if (isRecordingRef.current) startChunk(stream)
    }

    mr.start()
    speechStartRef.current = Date.now()
  }

  // ── VAD loop: check amplitude every 80 ms ────────────────────────────────
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

      const now            = Date.now()
      const speechDuration = speechStartRef.current ? now - speechStartRef.current : 0

      if (rms > SILENCE_THRESHOLD) {
        // ── sound detected ──
        if (!isSpeakingRef.current) {
          isSpeakingRef.current = true
          silenceStartRef.current = null
          setIsSpeaking(true)
        }
      } else {
        // ── silence ──
        if (isSpeakingRef.current) {
          isSpeakingRef.current = false
          silenceStartRef.current = now
          setIsSpeaking(false)
        }

        const silenceDuration = silenceStartRef.current ? now - silenceStartRef.current : 0

        if (
          silenceDuration >= SILENCE_AFTER_MS &&
          speechDuration  >= MIN_SPEECH_MS &&
          mrRef.current?.state === 'recording'
        ) {
          mrRef.current.stop()   // → onstop fires, sends blob, restarts
        }
      }

      // Safety ceiling: force-send after MAX_CHUNK_MS regardless
      if (speechDuration >= MAX_CHUNK_MS && mrRef.current?.state === 'recording') {
        mrRef.current.stop()
      }
    }, 80)
  }

  function teardown() {
    isRecordingRef.current = false
    if (vadIntervalRef.current)  clearInterval(vadIntervalRef.current)
    if (mrRef.current?.state === 'recording') mrRef.current.stop()
    if (audioCtxRef.current)    audioCtxRef.current.close()
    if (streamRef.current)      streamRef.current.getTracks().forEach(t => t.stop())
    streamRef.current   = null
    audioCtxRef.current = null
    mrRef.current       = null
  }

  async function startRecording() {
    setError(null)
    setPermissionDenied(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      isRecordingRef.current = true
      mimeTypeRef.current = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'

      setIsRecording(true)
      setupVAD(stream)
      startChunk(stream)
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

  const srcLang = detectedLang ? getLang(detectedLang) : null
  const tgtLang = getLang(targetLang)
  const statusText = isProcessing
    ? 'Translating…'
    : isRecording && isSpeaking
    ? 'Speaking…'
    : isRecording
    ? 'Waiting for speech…'
    : 'Ready'

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar active="translator" />

      <main className="min-w-0 flex-1 flex flex-col overflow-hidden">

        {/* ── sticky header ── */}
        <div className="shrink-0 sticky top-0 z-10 flex items-center gap-4 border-b border-gray-100 bg-white/80 backdrop-blur py-4 pl-16 pr-5 sm:px-6 lg:px-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Languages size={18} className="text-violet-600 shrink-0" />
              Live Translator
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Real-time speech translation — speak naturally, see results instantly</p>
          </div>

          {/* language route badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-violet-50 rounded-xl border border-violet-100">
            <Globe size={12} className="text-violet-500" />
            <span className="text-xs font-semibold text-violet-700">
              {sourceLang === 'auto'
                ? srcLang ? `${srcLang.flag} ${srcLang.name}` : '🌐 Auto-detect'
                : `${getLang(sourceLang).flag} ${getLang(sourceLang).name}`}
            </span>
            <ArrowRight size={11} className="text-violet-400" />
            <span className="text-xs font-semibold text-violet-700">{tgtLang.flag} {tgtLang.name}</span>
          </div>
        </div>

        {/* ── main content ── */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-0">

          {/* ─ left panel: controls ─ */}
          <div className="shrink-0 w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white flex flex-col p-6 gap-6">

            {/* mic hero */}
            <div className="flex flex-col items-center gap-4 pt-2">
              <div className="relative flex items-center justify-center">
                {/* pulse rings */}
                {isRecording && (
                  <>
                    <motion.div
                      className="absolute rounded-full border-2 border-red-300/60"
                      style={{ width: 120, height: 120 }}
                      animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                      className="absolute rounded-full border border-red-200/50"
                      style={{ width: 100, height: 100 }}
                      animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: 0.3, ease: 'easeInOut' }}
                    />
                  </>
                )}
                {!isRecording && !isProcessing && (
                  <motion.div
                    className="absolute rounded-full border-2 border-violet-200/50"
                    style={{ width: 110, height: 110 }}
                    animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {/* mic button */}
                <motion.button
                  onClick={isRecording ? stopRecording : startRecording}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
                    isRecording
                      ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-300/50'
                      : isProcessing
                      ? 'bg-gradient-to-br from-gray-400 to-gray-500 shadow-gray-200/50'
                      : 'bg-gradient-to-br from-violet-600 to-indigo-700 shadow-violet-300/50'
                  }`}
                >
                  {isProcessing ? (
                    <Loader2 size={28} className="text-white animate-spin" />
                  ) : isRecording ? (
                    <Square size={24} className="text-white fill-white" />
                  ) : (
                    <Mic size={28} className="text-white" />
                  )}
                </motion.button>
              </div>

              {/* waveform */}
              <Waveform recording={isRecording} speaking={isSpeaking} />

              {/* status */}
              <div className="flex items-center gap-2">
                <motion.div
                  className={`w-2 h-2 rounded-full ${
                    isSpeaking ? 'bg-emerald-500'
                    : isRecording ? 'bg-violet-400'
                    : isProcessing ? 'bg-amber-400'
                    : 'bg-gray-300'
                  }`}
                  animate={isRecording || isProcessing ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className={`text-sm font-semibold ${
                  isRecording ? 'text-red-500' : isProcessing ? 'text-amber-500' : 'text-gray-400'
                }`}>
                  {statusText}
                </span>
              </div>
            </div>

            {/* detected source lang — only shown in auto mode */}
            <AnimatePresence>
              {detectedLang && sourceLang === 'auto' && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <Volume2 size={13} className="text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide leading-none mb-0.5">Speaker language</p>
                    <p className="text-sm font-bold text-gray-800">
                      {getLang(detectedLang).flag} {getLang(detectedLang).name}
                    </p>
                  </div>
                  <span className="text-[10px] text-violet-500 font-semibold bg-violet-50 px-1.5 py-0.5 rounded-md">Auto</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* source + target language */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Speaker language</label>
                <LangSelector value={sourceLang} onChange={setSourceLang} allowAuto />
              </div>
              <div className="flex items-center gap-2 px-1">
                <div className="flex-1 h-px bg-gray-100" />
                <ArrowRight size={12} className="text-gray-300 shrink-0" />
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Translate to</label>
                <LangSelector value={targetLang} onChange={setTargetLang} />
              </div>
            </div>

            {/* CTA button */}
            <motion.button
              onClick={isRecording ? stopRecording : startRecording}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              disabled={isProcessing && !isRecording}
              className={`relative w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 overflow-hidden ${
                isRecording
                  ? 'bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-300/40 hover:shadow-xl hover:from-violet-500 hover:to-indigo-500'
              }`}
            >
              {!isRecording && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
                />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {isRecording ? (
                  <><MicOff size={15} /> Stop listening</>
                ) : (
                  <><Mic size={15} /> Start listening</>
                )}
              </span>
            </motion.button>

            {/* permission denied */}
            <AnimatePresence>
              {permissionDenied && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 text-xs"
                >
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                  <span>Microphone access was denied. Please allow it in your browser's address bar and try again.</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* hint */}
            <p className="text-xs text-gray-400 text-center leading-relaxed mt-auto">
              Audio is processed in 5-second segments.
              <br />Translations appear ~3s after each segment.
            </p>
          </div>

          {/* ─ right panel: translation feed ─ */}
          <div className="flex-1 flex flex-col min-h-0 bg-gray-50/60">

            {/* feed header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-gray-100 bg-white/60">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-700">Translations</span>
                {segments.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold">
                    {segments.length}
                  </span>
                )}
              </div>
              {segments.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-400 hover:text-red-400 font-medium transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-4 mt-3 flex items-center gap-2.5 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs shrink-0"
                >
                  <AlertCircle size={13} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* processing indicator */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-4 mt-3 flex items-center gap-2.5 text-violet-700 bg-violet-50 border border-violet-100 rounded-xl px-4 py-2.5 text-xs shrink-0"
                >
                  <Loader2 size={13} className="shrink-0 animate-spin text-violet-500" />
                  Transcribing and translating…
                </motion.div>
              )}
            </AnimatePresence>

            {/* segments */}
            <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {segments.length === 0 ? (
                <EmptyFeed />
              ) : (
                segments.map((seg, i) => (
                  <SegmentCard key={seg.id} seg={seg} index={i} />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
