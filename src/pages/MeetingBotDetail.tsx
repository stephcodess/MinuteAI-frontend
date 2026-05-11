import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Bot, CalendarPlus, Clock3, ExternalLink, FileVideo, Loader2, Logs, ShieldAlert, Square } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { downloadMeetingBotCalendar, endMeetingBotSession, getMeetingBotSession } from '../lib/api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const STATUS_STYLES = {
  queued: 'bg-slate-100 text-slate-700',
  preparing: 'bg-indigo-50 text-indigo-700',
  joining: 'bg-sky-50 text-sky-700',
  waiting_for_host: 'bg-amber-50 text-amber-700',
  recording: 'bg-emerald-50 text-emerald-700',
  processing: 'bg-violet-50 text-violet-700',
  completed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-rose-50 text-rose-700',
  cancelled: 'bg-slate-200 text-slate-700',
}

function formatDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function failureTitle(message) {
  if (!message) return 'Run issue'
  const lower = message.toLowerCase()
  if (lower.includes('audio stream') || lower.includes('audio-capture')) {
    return 'Recorder capture issue'
  }
  return 'Run issue'
}

export default function MeetingBotDetail() {
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ending, setEnding] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const data = await getMeetingBotSession(sessionId)
        if (alive) setSession(data)
      } catch {
        if (alive) setSession(null)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 5000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [sessionId])

  const artifactUrl = useMemo(() => {
    if (!session?.recording_path) return null
    return session.recording_path.startsWith('http') ? session.recording_path : `${BASE}${session.recording_path}`
  }, [session?.recording_path])

  async function handleEndRecording() {
    if (!session || ending) return
    setEnding(true)
    try {
      const updated = await endMeetingBotSession(session.id)
      setSession(updated)
    } finally {
      setEnding(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#f6f8fb] overflow-hidden">
      <Sidebar active="meeting-bots" />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="py-8 pl-16 pr-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/meeting-bots')}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={14} />
            Back to meeting bots
          </button>

          {loading ? (
            <div className="mt-8 flex items-center gap-3 rounded-2xl bg-white px-5 py-5 text-sm text-slate-500 shadow-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading meeting bot session...
            </div>
          ) : !session ? (
            <div className="mt-8 rounded-2xl bg-white px-6 py-8 text-slate-600 shadow-sm">Session not found.</div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="rounded-[28px] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                        {session.platform === 'google_meet' ? 'Google Meet' : 'Zoom'}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${STATUS_STYLES[session.status] || STATUS_STYLES.queued}`}>
                        {session.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-950">{session.title || session.bot_name}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                      <span className="inline-flex items-center gap-1"><Clock3 size={14} />Created {formatDate(session.created_at)}</span>
                      {session.scheduled_for && (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                          <CalendarPlus size={14} />
                          Joins {formatDate(session.scheduled_for)}
                        </span>
                      )}
                      <a href={session.meeting_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-800">
                        Open meeting link <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {session.status === 'recording' && (
                      <button
                        onClick={handleEndRecording}
                        disabled={ending}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {ending ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                        End recording
                      </button>
                    )}
                    {session.scheduled_for && (
                      <button
                        onClick={() => downloadMeetingBotCalendar(session.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <CalendarPlus size={14} />
                        Add to calendar
                      </button>
                    )}
                    {session.job_id && (
                      <button
                        onClick={() => navigate(`/processing/${session.job_id}`)}
                        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        View processing job
                      </button>
                    )}
                  </div>
                </div>

                {session.failure_reason && (
                  <div className="mt-5 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">{failureTitle(session.failure_reason)}</p>
                      <p className="mt-1">{session.failure_reason}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[28px] bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Logs size={18} className="text-slate-500" />
                    <h2 className="text-lg font-bold text-slate-950">Run log</h2>
                  </div>
                  <div className="space-y-3">
                    {(session.logs?.length ? session.logs : ['No run logs yet.']).map((line, index) => (
                      <motion.div
                        key={`${index}-${line}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs leading-relaxed text-slate-600"
                      >
                        {line}
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[28px] bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <Bot size={18} className="text-slate-500" />
                      <h2 className="text-lg font-bold text-slate-950">Session facts</h2>
                    </div>
                    <div className="space-y-3 text-sm text-slate-600">
                      <div className="flex justify-between gap-4"><span>Started</span><span className="font-semibold text-slate-900">{formatDate(session.started_at)}</span></div>
                      <div className="flex justify-between gap-4"><span>Scheduled</span><span className="font-semibold text-slate-900">{formatDate(session.scheduled_for)}</span></div>
                      <div className="flex justify-between gap-4"><span>Ended</span><span className="font-semibold text-slate-900">{formatDate(session.ended_at)}</span></div>
                      <div className="flex justify-between gap-4"><span>Duration</span><span className="font-semibold text-slate-900">{session.duration_minutes ? `${session.duration_minutes} min` : '-'}</span></div>
                      <div className="flex justify-between gap-4"><span>Processing job</span><span className="font-semibold text-slate-900">{session.job_id || 'Not created yet'}</span></div>
                    </div>
                  </div>

                  <div className="rounded-[28px] bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <FileVideo size={18} className="text-slate-500" />
                      <h2 className="text-lg font-bold text-slate-950">Artifacts</h2>
                    </div>
                    {artifactUrl ? (
                      <a
                        href={artifactUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Open latest artifact
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <p className="text-sm text-slate-500">No artifact file is available yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
