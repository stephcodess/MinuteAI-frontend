import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Bot, CalendarPlus, Clock3, ExternalLink, Loader2, Square, ShieldAlert, StopCircle } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { cancelMeetingBotSession, downloadMeetingBotCalendar, endMeetingBotSession, listMeetingBotSessions, listUpcomingMeetingBotSessions } from '../lib/api'
import { useWorkspace } from '../context/WorkspaceContext'

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

const TAB_OPTIONS = [
  { key: 'sessions', getLabel: (sessions, upcoming) => `All sessions (${sessions.length})`, Icon: Bot },
  { key: 'upcoming', getLabel: (sessions, upcoming) => `Upcoming (${upcoming.length})`, Icon: CalendarPlus },
]

function formatDate(iso) {
  if (!iso) return 'Just now'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function sessionSummary(session) {
  if (session.scheduled_for && session.status === 'queued') return `MinuteAI Recorder is scheduled to join at ${formatDate(session.scheduled_for)}.`
  if (session.status === 'failed') return session.failure_reason || 'The session failed.'
  if (session.status === 'completed') return 'The recording finished and is ready for processing.'
  if (session.status === 'cancelled') return 'This meeting bot session was cancelled.'
  return 'MinuteAI is moving this bot session through its recording pipeline.'
}

function failureTitle(session) {
  if (!session.failure_reason) return 'Run issue'
  if (session.failure_reason.toLowerCase().includes('audio stream') || session.failure_reason.toLowerCase().includes('audio-capture')) {
    return 'Recorder capture issue'
  }
  return 'Run issue'
}

export default function MeetingBots() {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeWorkspace } = useWorkspace()
  const [sessions, setSessions] = useState([])
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [tab, setTab] = useState('sessions')
  const [loading, setLoading] = useState(true)
  const [pendingCancel, setPendingCancel] = useState(null)
  const [pendingEnd, setPendingEnd] = useState(null)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const [allSessions, upcoming] = await Promise.all([
          listMeetingBotSessions(activeWorkspace?.id),
          activeWorkspace?.id ? listUpcomingMeetingBotSessions(activeWorkspace.id, 50) : Promise.resolve([]),
        ])
        if (alive) {
          setSessions(allSessions)
          setUpcomingSessions(upcoming)
        }
      } catch {
        if (alive) {
          setSessions([])
          setUpcomingSessions([])
        }
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
  }, [activeWorkspace?.id])

  const highlightedSessionId = useMemo(() => (
    new URLSearchParams(location.search).get('session')
  ), [location.search])

  async function handleCancel(sessionId) {
    setPendingCancel(sessionId)
    try {
      const updated = await cancelMeetingBotSession(sessionId)
      setSessions((current) => current.map((session) => (
        session.id === sessionId ? updated : session
      )))
      setUpcomingSessions((current) => (
        current
          .map((session) => (session.id === sessionId ? updated : session))
          .filter((session) => !['cancelled', 'failed', 'completed'].includes(session.status))
      ))
    } finally {
      setPendingCancel(null)
    }
  }

  async function handleEnd(sessionId) {
    setPendingEnd(sessionId)
    try {
      const updated = await endMeetingBotSession(sessionId)
      setSessions((current) => current.map((session) => (
        session.id === sessionId ? updated : session
      )))
      setUpcomingSessions((current) => current.map((session) => (
        session.id === sessionId ? updated : session
      )))
    } finally {
      setPendingEnd(null)
    }
  }

  async function handleCalendarDownload(event, sessionId) {
    event.stopPropagation()
    await downloadMeetingBotCalendar(sessionId)
  }

  const visibleSessions = tab === 'upcoming' ? upcomingSessions : sessions
  const emptyTitle = tab === 'upcoming' ? 'No upcoming bot meetings' : 'No bot sessions yet'
  const emptyCopy = tab === 'upcoming'
    ? 'Upcoming meetings will appear here after the workspace recorder is invited or a scheduled bot session is created.'
    : 'Use the floating Record a meeting button to create your first session.'

  return (
    <div className="flex h-screen bg-[#f5f7fb] overflow-hidden">
      <Sidebar active="meeting-bots" />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/85 py-4 pl-16 pr-4 backdrop-blur sm:px-6 lg:px-8">
          <div>
            <h1 className="text-lg font-bold text-slate-950">Meeting bots</h1>
            <p className="text-xs text-slate-500">
              Monitor recording sessions for {activeWorkspace?.name ?? 'your workspace'}
            </p>
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to uploads
          </button>
        </div>

        <div className="px-8 py-8">
          <div className="mb-6 rounded-[28px] bg-gradient-to-br from-[#081226] via-[#13264f] to-[#164e63] p-6 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                  <Bot size={22} />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-100/70">Meeting recorder</p>
                <p className="mt-2 text-sm leading-relaxed text-cyan-100/80">
                  Create and monitor bot sessions for Google Meet and Zoom. The current scaffold already tracks queue, join, waiting, and failure states end to end.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['Total sessions', sessions.length],
              ['Upcoming meetings', upcomingSessions.length],
              ['Active sessions', sessions.filter((session) => !['failed', 'completed', 'cancelled'].includes(session.status)).length],
            ].map(([label, value], index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.06 }}
                className="rounded-[24px] border border-white/70 bg-white p-5 shadow-[0_14px_45px_rgba(148,163,184,0.16)]"
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(148,163,184,0.14)]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-bold text-slate-950">Meeting bots</p>
                <p className="text-sm text-slate-500">
                  {activeWorkspace?.name ?? 'All workspaces'} • refreshed every 5 seconds
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                Beta scaffold
              </div>
            </div>

            <div className="mb-5 flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {TAB_OPTIONS.map(({ key, getLabel, Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    tab === key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={15} />
                  {getLabel(sessions, upcomingSessions)}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Loading meeting bot sessions...
              </div>
            ) : visibleSessions.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                  {tab === 'upcoming' ? <CalendarPlus size={22} /> : <Bot size={22} />}
                </div>
                <p className="mt-4 text-base font-semibold text-slate-900">{emptyTitle}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {emptyCopy}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {visibleSessions.map((session, index) => {
                    const isHighlighted = session.id === highlightedSessionId
                    const isBusy = pendingCancel === session.id
                    const isEnding = pendingEnd === session.id
                    return (
                      <motion.button
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.24, delay: index * 0.03 }}
                        onClick={() => navigate(`/meeting-bots/${session.id}`)}
                        className={`rounded-[24px] border p-5 transition ${
                          isHighlighted
                            ? 'border-cyan-300 bg-cyan-50/50 shadow-[0_14px_40px_rgba(34,211,238,0.16)]'
                            : 'border-slate-200 bg-slate-50/30'
                        } text-left w-full`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                                {session.platform === 'google_meet' ? 'Google Meet' : 'Zoom'}
                              </span>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${STATUS_STYLES[session.status] || STATUS_STYLES.queued}`}>
                                {session.status.replaceAll('_', ' ')}
                              </span>
                            </div>
                            <p className="truncate text-lg font-bold text-slate-950">{session.title || session.bot_name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <Clock3 size={12} />
                                Created {formatDate(session.created_at)}
                              </span>
                              {session.scheduled_for && (
                                <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                                  <CalendarPlus size={12} />
                                  Joins {formatDate(session.scheduled_for)}
                                </span>
                              )}
                              <a
                                href={session.meeting_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => event.stopPropagation()}
                                className="inline-flex items-center gap-1 font-medium text-cyan-700 transition hover:text-cyan-800"
                              >
                                Open link <ExternalLink size={12} />
                              </a>
                            </div>
                            <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                              {sessionSummary(session)}
                            </div>
                            {session.failure_reason && (
                              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                                <div>
                                  <p className="font-semibold">{failureTitle(session)}</p>
                                  <p className="mt-1">{session.failure_reason}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-stretch gap-2">
                            {session.status === 'recording' && (
                              <button
                                onClick={(event) => { event.stopPropagation(); handleEnd(session.id) }}
                                disabled={isEnding}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                              >
                                {isEnding ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                                End recording
                              </button>
                            )}
                            {session.scheduled_for && (
                              <button
                                onClick={(event) => handleCalendarDownload(event, session.id)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                <CalendarPlus size={14} />
                                Calendar
                              </button>
                            )}
                            {!['completed', 'failed', 'cancelled'].includes(session.status) && (
                              <button
                                onClick={(event) => { event.stopPropagation(); handleCancel(session.id) }}
                                disabled={isBusy}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                              >
                                {isBusy ? <Loader2 size={14} className="animate-spin" /> : <StopCircle size={14} />}
                                Cancel
                              </button>
                            )}
                            {session.job_id && (
                              <button
                                onClick={(event) => { event.stopPropagation(); navigate(`/processing/${session.job_id}`) }}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                              >
                                View job
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}

            <div className="mt-5 flex items-start gap-3 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              Chromium still needs to be installed locally before the real Playwright path can run. After that, each session will expose logs, artifacts, and job handoff details here.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
