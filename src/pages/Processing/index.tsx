import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Sparkles, FileText, Loader2, Upload, CheckCircle, Mail, RefreshCw } from 'lucide-react'
import { useJobStatus } from '../../hooks/useJobStatus'
import { retryJob } from '../../lib/api'

const stages = [
  { key: 'uploading',    icon: Upload,    label: 'Uploading',              doneLabel: 'Uploaded',           desc: 'Sending your file to the server' },
  { key: 'transcribing', icon: Mic,       label: 'Transcribing',           doneLabel: 'Transcribed',        desc: 'Whisper is converting audio to text' },
  { key: 'formatting',   icon: Sparkles,  label: 'Formatting with Claude', doneLabel: 'Formatted',          desc: 'Structuring transcript into minutes' },
  { key: 'generating',   icon: FileText,  label: 'Generating document',    doneLabel: 'Document generated', desc: 'Building your .docx and PDF' },
]

function stageIndex(status) {
  return { uploading: 0, transcribing: 1, formatting: 2, generating: 3 }[status] ?? 0
}

/* Streams words into view one by one to simulate live transcription */
function TranscriptStream({ text }) {
  const [visibleCount, setVisibleCount] = useState(0)
  const words = text.split(/\s+/)
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (visibleCount >= words.length) return
    // Fast reveal: 30ms per word — feels live without being distracting
    const t = setTimeout(() => setVisibleCount(c => c + 1), 30)
    return () => clearTimeout(t)
  }, [visibleCount, words.length])

  // Auto-scroll to bottom as words appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [visibleCount])

  const visible = words.slice(0, visibleCount).join(' ')
  const isComplete = visibleCount >= words.length

  return (
    <div ref={containerRef} className="h-full overflow-y-auto pr-1">
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
        {visible}
        {!isComplete && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-violet-500 ml-0.5 align-middle"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.7, repeat: Infinity }}
          />
        )}
      </p>
      <div ref={bottomRef} />
    </div>
  )
}

export default function Processing() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { status, transcript, error } = useJobStatus(jobId)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState(null)
  const ready = status !== null          // false until first WS message arrives
  const current = stageIndex(status ?? 'uploading')
  const showTranscript = !!transcript
  const email = sessionStorage.getItem(`job_email_${jobId}`) || null

  useEffect(() => {
    if (status === 'done') navigate(`/results/${jobId}`)
  }, [status, jobId, navigate])

  async function handleRetry() {
    setRetrying(true)
    setRetryError(null)
    try {
      await retryJob(jobId)
      // WebSocket will push the new status — no need to do anything else
    } catch (err) {
      setRetryError(err.message || 'Retry failed.')
    } finally {
      setRetrying(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="text-violet-400 animate-spin" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className={`mx-auto px-6 py-14 transition-all duration-700 ${
          showTranscript ? 'max-w-4xl' : 'max-w-lg'
        }`}
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            className="w-14 h-14 rounded-2xl bg-white border border-violet-100 shadow-sm flex items-center justify-center mx-auto mb-5"
            animate={{ boxShadow: ['0 0 0 0 rgba(124,58,237,0)', '0 0 0 8px rgba(124,58,237,0.08)', '0 0 0 0 rgba(124,58,237,0)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Loader2 className="text-violet-600 animate-spin" size={26} />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Processing your meeting…</h1>
          <p className="text-gray-400 text-sm">Usually 1–3 minutes. You can watch the transcript appear below.</p>

          {email && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium px-4 py-2 rounded-full"
            >
              <Mail size={13} />
              We'll email <strong>{email}</strong> when it's ready — safe to close this tab
            </motion.div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {showTranscript ? (
            /* ── Two-column layout once transcript is ready ── */
            <motion.div
              key="split"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-5 gap-6 items-start"
            >
              {/* Stages — left column */}
              <div className="col-span-2 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Progress</p>
                {stages.map(({ key, icon: Icon, label, doneLabel, desc }, i) => {
                  const done = i < current
                  const active = i === current
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${
                        active ? 'border-violet-300 bg-violet-50'
                        : done  ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        active ? 'bg-violet-200' : done ? 'bg-green-200' : 'bg-gray-100'
                      }`}>
                        {done
                          ? <CheckCircle size={15} className="text-green-600" />
                          : <Icon size={15} className={active ? 'text-violet-600' : 'text-gray-400'} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${active ? 'text-violet-900' : done ? 'text-green-800' : 'text-gray-400'}`}>
                          {done ? doneLabel : label}
                        </p>
                        {active && <p className="text-xs text-violet-500 mt-0.5 truncate">{desc}</p>}
                      </div>
                      {active && <Loader2 size={14} className="text-violet-400 animate-spin shrink-0" />}
                    </div>
                  )
                })}
              </div>

              {/* Transcript — right column */}
              <motion.div
                className="col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                style={{ height: '420px' }}
              >
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <Mic size={14} className="text-violet-500" />
                    <span className="text-sm font-semibold text-gray-700">Live transcript</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-violet-500 font-medium">
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block"
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    {status === 'formatting' ? 'Claude is reading this…' : 'Transcribed'}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden p-5">
                  <TranscriptStream text={transcript} />
                </div>
              </motion.div>
            </motion.div>

          ) : (
            /* ── Single-column stage list before transcript arrives ── */
            <motion.div
              key="single"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {stages.map(({ key, icon: Icon, label, doneLabel, desc }, i) => {
                const done = i < current
                const active = i === current
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                      active ? 'border-violet-300 bg-violet-50'
                      : done  ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? 'bg-violet-200' : done ? 'bg-green-200' : 'bg-gray-100'
                    }`}>
                      {done
                        ? <CheckCircle size={16} className="text-green-600" />
                        : <Icon size={18} className={active ? 'text-violet-600' : 'text-gray-400'} />
                      }
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${active ? 'text-violet-900' : done ? 'text-green-800' : 'text-gray-400'}`}>
                        {done ? doneLabel : label}
                      </p>
                      {active && <p className="text-xs text-violet-500 mt-0.5">{desc}</p>}
                    </div>
                    {active && <Loader2 size={16} className="text-violet-400 animate-spin shrink-0" />}
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-8 bg-red-50 border border-red-200 rounded-xl px-5 py-4"
            >
              <p className="text-red-700 text-sm font-medium mb-3">{error}</p>
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={handleRetry}
                  disabled={retrying}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
                  {retrying ? 'Retrying…' : 'Retry from last step'}
                </motion.button>
                <button
                  onClick={() => navigate('/')}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Re-upload instead
                </button>
              </div>
              {retryError && (
                <p className="text-red-500 text-xs mt-2">{retryError}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
