import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Bot, CalendarPlus, Clock3, ExternalLink, FileVideo,
  Loader2, Logs, ShieldAlert, Square,
} from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import { downloadMeetingBotCalendar, endMeetingBotSession, getMeetingBotSession } from '../../lib/api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const STATUS_META: Record<string, { cls: string; label: string }> = {
  queued:           { cls: 'bg-white/[0.06] text-slate-400',      label: 'Queued'           },
  preparing:        { cls: 'bg-indigo-500/15 text-indigo-400',    label: 'Preparing'        },
  joining:          { cls: 'bg-sky-500/15 text-sky-400',          label: 'Joining'          },
  waiting_for_host: { cls: 'bg-amber-500/15 text-amber-400',      label: 'Waiting for host' },
  recording:        { cls: 'bg-emerald-500/15 text-emerald-400',  label: 'Recording'        },
  processing:       { cls: 'bg-violet-500/15 text-violet-400',    label: 'Processing'       },
  completed:        { cls: 'bg-emerald-500/15 text-emerald-400',  label: 'Completed'        },
  failed:           { cls: 'bg-rose-500/15 text-rose-400',        label: 'Failed'           },
  cancelled:        { cls: 'bg-white/[0.06] text-slate-400',      label: 'Cancelled'        },
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function failureTitle(message) {
  if (!message) return 'Run issue'
  const lower = message.toLowerCase()
  if (lower.includes('audio stream') || lower.includes('audio-capture')) return 'Recorder capture issue'
  return 'Run issue'
}

function FactRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--card-border)' }}>
      <span className="text-sm" style={{ color: 'var(--text-3)' }}>{label}</span>
      <span className="text-sm font-semibold text-right" style={{ color: 'var(--text-1)' }}>{value}</span>
    </div>
  )
}

const ACCESS_KEY = 'minuteai_access'

export default function MeetingBotDetail() {
  const navigate    = useNavigate()
  const { sessionId } = useParams()
  const [session, setSession]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [ending, setEnding]           = useState(false)
  const [loadingArtifact, setLoadingArtifact] = useState(false)

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
    return () => { alive = false; clearInterval(id) }
  }, [sessionId])

  const artifactUrl = useMemo(() => {
    if (!session?.recording_path) return null
    return session.recording_path.startsWith('http')
      ? session.recording_path
      : `${BASE}${session.recording_path}`
  }, [session?.recording_path])

  async function handleOpenArtifact() {
    if (!artifactUrl) return
    // External URL (not our backend) — open directly
    if (!artifactUrl.startsWith(BASE)) {
      window.open(artifactUrl, '_blank')
      return
    }
    // Internal URL — needs auth header
    setLoadingArtifact(true)
    try {
      const token = localStorage.getItem(ACCESS_KEY)
      const res = await fetch(artifactUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to load artifact')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch {
      // fall back to direct open
      window.open(artifactUrl, '_blank')
    } finally {
      setLoadingArtifact(false)
    }
  }

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

  const statusMeta = STATUS_META[session?.status] ?? STATUS_META.queued

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Sidebar active="meeting-bots" />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="px-4 py-8 pl-16 sm:px-6 lg:px-8">

          {/* Back button */}
          <button
            onClick={() => navigate('/meeting-bots')}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-white/[0.04] mb-6"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)' }}
          >
            <ArrowLeft size={14} />
            Back to meeting bots
          </button>

          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border px-5 py-5 text-sm"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-3)' }}>
              <Loader2 size={16} className="animate-spin text-violet-400" />
              Loading session…
            </div>
          ) : !session ? (
            <div className="rounded-2xl border px-6 py-8 text-sm"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-3)' }}>
              Session not found.
            </div>
          ) : (
            <div className="space-y-5">

              {/* ── Header card ── */}
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className="rounded-2xl border p-6"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    {/* Badges */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                        style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}>
                        {session.platform === 'google_meet' ? 'Google Meet' : 'Zoom'}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <h1 className="text-2xl font-bold truncate" style={{ color: 'var(--text-1)' }}>
                      {session.title || session.bot_name}
                    </h1>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--text-3)' }}>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={13} /> Created {formatDate(session.created_at)}
                      </span>
                      {session.scheduled_for && (
                        <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: 'var(--text-2)' }}>
                          <CalendarPlus size={13} /> Joins {formatDate(session.scheduled_for)}
                        </span>
                      )}
                      <a
                        href={session.meeting_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Open meeting link <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {session.status === 'recording' && (
                      <button
                        onClick={handleEndRecording}
                        disabled={ending}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 disabled:opacity-50"
                      >
                        {ending ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                        End recording
                      </button>
                    )}
                    {session.scheduled_for && (
                      <button
                        onClick={() => downloadMeetingBotCalendar(session.id)}
                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/[0.04]"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)' }}
                      >
                        <CalendarPlus size={14} /> Add to calendar
                      </button>
                    )}
                    {session.job_id && (
                      <button
                        onClick={() => navigate(`/processing/${session.job_id}`)}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-sm"
                      >
                        View processing job
                      </button>
                    )}
                  </div>
                </div>

                {/* Failure reason */}
                {session.failure_reason && (
                  <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-400">
                    <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">{failureTitle(session.failure_reason)}</p>
                      <p className="mt-0.5 opacity-80">{session.failure_reason}</p>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* ── Run log + facts ── */}
              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">

                {/* Run log */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }}
                  className="rounded-2xl border overflow-hidden"
                  style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                >
                  <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: 'var(--card-border)', background: 'var(--input-bg)' }}>
                    <Logs size={15} className="text-violet-400" />
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Run log</h2>
                  </div>
                  <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                    {(Array.isArray(session.logs) && session.logs.length > 0
                      ? session.logs
                      : ['No run logs yet.']
                    ).map((line, index) => (
                      <motion.div
                        key={`${index}-${line}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg px-3 py-2 font-mono text-xs leading-relaxed"
                        style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}
                      >
                        {line}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Right column */}
                <div className="space-y-5">

                  {/* Session facts */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.08 }}
                    className="rounded-2xl border overflow-hidden"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                  >
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: 'var(--card-border)', background: 'var(--input-bg)' }}>
                      <Bot size={15} className="text-violet-400" />
                      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Session facts</h2>
                    </div>
                    <div className="px-5 py-1">
                      <FactRow label="Started"        value={formatDate(session.started_at)} />
                      <FactRow label="Scheduled"      value={formatDate(session.scheduled_for)} />
                      <FactRow label="Ended"          value={formatDate(session.ended_at)} />
                      <FactRow label="Duration"       value={session.duration_minutes ? `${session.duration_minutes} min` : '—'} />
                      <FactRow label="Processing job" value={session.job_id || 'Not created yet'} />
                    </div>
                  </motion.div>

                  {/* Artifacts */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.11 }}
                    className="rounded-2xl border overflow-hidden"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                  >
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: 'var(--card-border)', background: 'var(--input-bg)' }}>
                      <FileVideo size={15} className="text-violet-400" />
                      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Artifacts</h2>
                    </div>
                    <div className="px-5 py-4">
                      {artifactUrl ? (
                        <button
                          onClick={handleOpenArtifact}
                          disabled={loadingArtifact}
                          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white disabled:opacity-60"
                        >
                          {loadingArtifact
                            ? <><Loader2 size={13} className="animate-spin" /> Loading…</>
                            : <><ExternalLink size={13} /> Open latest artifact</>}
                        </button>
                      ) : (
                        <p className="text-sm" style={{ color: 'var(--text-3)' }}>No artifact file is available yet.</p>
                      )}
                    </div>
                  </motion.div>

                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
