import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bot, CalendarPlus, Clock3, ExternalLink,
  Loader2, Plus, ShieldAlert, Square, StopCircle,
  Activity, Radio, CheckCircle2, Timer, RefreshCw,
} from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import {
  cancelMeetingBotSession,
  downloadMeetingBotCalendar, endMeetingBotSession,
  listMeetingBotSessions, listUpcomingMeetingBotSessions,
} from '../../lib/api'
import { useWorkspace } from '../../context/WorkspaceContext'
import RecordMeetingModal from '../../components/RecordMeetingModal'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  queued:           { label: 'Queued',           color: 'text-slate-400',   dot: 'bg-slate-400',   ring: 'bg-slate-400/20'   },
  scheduled:        { label: 'Scheduled',        color: 'text-violet-400',  dot: 'bg-violet-400',  ring: 'bg-violet-400/20'  },
  preparing:        { label: 'Preparing',         color: 'text-indigo-400',  dot: 'bg-indigo-400',  ring: 'bg-indigo-400/20'  },
  joining:          { label: 'Joining',           color: 'text-sky-400',     dot: 'bg-sky-400',     ring: 'bg-sky-400/20'     },
  waiting_for_host: { label: 'Waiting for host',  color: 'text-amber-400',   dot: 'bg-amber-400',   ring: 'bg-amber-400/20'   },
  recording:        { label: 'Recording',         color: 'text-emerald-400', dot: 'bg-emerald-400', ring: 'bg-emerald-400/20', pulse: true },
  processing:       { label: 'Processing',        color: 'text-violet-400',  dot: 'bg-violet-400',  ring: 'bg-violet-400/20', pulse: true },
  completed:        { label: 'Completed',         color: 'text-emerald-400', dot: 'bg-emerald-400', ring: 'bg-emerald-400/20' },
  failed:           { label: 'Failed',            color: 'text-rose-400',    dot: 'bg-rose-400',    ring: 'bg-rose-400/20'   },
  cancelled:        { label: 'Cancelled',         color: 'text-slate-500',   dot: 'bg-slate-500',   ring: 'bg-slate-500/20'  },
}

function fmt(iso) {
  if (!iso) return 'Just now'
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.queued
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.ring} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  )
}

// ── Session card ──────────────────────────────────────────────────────────────
function SessionCard({ session, highlighted, onNavigate, onEnd, onCancel, onCalendar, endingId, cancelId }) {
  const isBusy   = cancelId === session.id
  const isEnding = endingId === session.id
  const isActive = !['completed', 'failed', 'cancelled'].includes(session.status)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.005]"
      style={{
        background: highlighted ? 'rgba(139,92,246,0.08)' : 'var(--card-bg)',
        border: `1px solid ${highlighted ? 'rgba(139,92,246,0.4)' : 'var(--card-border)'}`,
      }}
      onClick={() => onNavigate(session.id)}
    >
      {/* recording pulse bar */}
      {session.status === 'recording' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 animate-pulse" />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left */}
          <div className="min-w-0 flex-1">
            {/* platform + status */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest"
                style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}>
                {session.platform === 'google_meet' ? 'Google Meet' : 'Zoom'}
              </span>
              <StatusPill status={session.status} />
            </div>

            {/* title */}
            <h3 className="text-base font-bold truncate mb-2" style={{ color: 'var(--text-1)' }}>
              {session.title || session.bot_name || 'Untitled meeting'}
            </h3>

            {/* meta row */}
            <div className="flex flex-wrap items-center gap-3 text-xs mb-3" style={{ color: 'var(--text-3)' }}>
              <span className="flex items-center gap-1"><Clock3 size={11} /> {fmt(session.created_at)}</span>
              {session.scheduled_for && (
                <span className="flex items-center gap-1 text-violet-400"><CalendarPlus size={11} /> {fmt(session.scheduled_for)}</span>
              )}
              <a href={session.meeting_url} target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors">
                Open <ExternalLink size={10} />
              </a>
            </div>

            {/* summary */}
            {session.failure_reason ? (
              <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 text-xs text-rose-400">
                <ShieldAlert size={13} className="shrink-0 mt-0.5" />
                <span>{session.failure_reason}</span>
              </div>
            ) : (
              <div className="rounded-xl px-3 py-2.5 text-xs leading-relaxed"
                style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}>
                {session.status === 'completed'
                  ? 'Recording finished — transcription in progress.'
                  : session.status === 'cancelled'
                  ? 'Session was cancelled.'
                  : session.status === 'scheduled'
                  ? `⏰ Scheduled — bot will join at ${fmt(session.scheduled_for)}.`
                  : session.status === 'recording'
                  ? '🔴 Live — MinuteAI is recording your meeting.'
                  : `MinuteAI Recorder is ${session.status.replace('_', ' ')}.`}
              </div>
            )}
          </div>

          {/* Right — actions */}
          <div className="flex flex-col gap-2 shrink-0">
            {session.status === 'recording' && (
              <button onClick={e => { e.stopPropagation(); onEnd(session.id) }} disabled={isEnding}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 transition-all">
                {isEnding ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} />} Stop
              </button>
            )}
            {session.job_id && (
              <button onClick={e => { e.stopPropagation(); onNavigate(`processing/${session.job_id}`, true) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all">
                View minutes
              </button>
            )}
            {session.scheduled_for && (
              <button onClick={e => { e.stopPropagation(); onCalendar(e, session.id) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition"
                style={{ background: 'var(--input-bg)', color: 'var(--text-2)', border: '1px solid var(--card-border)' }}>
                <CalendarPlus size={12} /> .ics
              </button>
            )}
            {isActive && (
              <button onClick={e => { e.stopPropagation(); onCancel(session.id) }} disabled={isBusy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                style={{ background: 'var(--input-bg)', color: 'var(--text-3)', border: '1px solid var(--card-border)' }}>
                {isBusy ? <Loader2 size={12} className="animate-spin" /> : <StopCircle size={12} />} Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MeetingBots() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { activeWorkspace } = useWorkspace()

  const [sessions, setSessions]           = useState([])
  const [upcoming, setUpcoming]           = useState([])
  const [tab, setTab]                     = useState('all')
  const [loading, setLoading]             = useState(true)
  const [refreshing, setRefreshing]       = useState(false)
  const [pendingCancel, setPendingCancel] = useState(null)
  const [pendingEnd, setPendingEnd]       = useState(null)
  const [recordOpen, setRecordOpen]       = useState(false)

  const TERMINAL = new Set(['completed', 'failed', 'cancelled'])

  const load = async () => {
    try {
      const [all, up] = await Promise.all([
        listMeetingBotSessions(activeWorkspace?.id),
        activeWorkspace?.id ? listUpcomingMeetingBotSessions(activeWorkspace.id, 50) : Promise.resolve([]),
      ])
      setSessions(all)
      setUpcoming(up)
    } catch { setSessions([]); setUpcoming([]) }
    finally { setLoading(false) }
  }

  // Load once on mount and whenever the tab regains focus
  useEffect(() => {
    load()
    const onVisible = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [activeWorkspace?.id])

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const highlighted = useMemo(() => new URLSearchParams(location.search).get('session'), [location.search])

  async function handleCancel(id) {
    setPendingCancel(id)
    try {
      const u = await cancelMeetingBotSession(id)
      setSessions(c => c.map(s => s.id === id ? u : s))
      setUpcoming(c => c.map(s => s.id === id ? u : s).filter(s => !['cancelled','failed','completed'].includes(s.status)))
    } finally { setPendingCancel(null) }
  }

  async function handleEnd(id) {
    setPendingEnd(id)
    try {
      const u = await endMeetingBotSession(id)
      setSessions(c => c.map(s => s.id === id ? u : s))
    } finally { setPendingEnd(null) }
  }

  function handleNavFromCard(idOrPath, isPath = false) {
    navigate(isPath ? `/${idOrPath}` : `/meeting-bots/${idOrPath}`)
  }

  const live    = sessions.filter(s => s.status === 'recording')
  const active  = sessions.filter(s => !['completed','failed','cancelled'].includes(s.status))

  const visibleSessions = tab === 'upcoming' ? upcoming : sessions

  const TABS = [
    { key: 'all',      label: `All  (${sessions.length})`,     Icon: Activity },
    { key: 'upcoming', label: `Upcoming  (${upcoming.length})`, Icon: CalendarPlus },
  ]

  return (
    <div className="flex h-screen app-bg app-grid overflow-hidden">
      <Sidebar active="meeting-bots" />

      <RecordMeetingModal open={recordOpen} onClose={() => setRecordOpen(false)} />

      <main className="min-w-0 flex-1 flex flex-col overflow-hidden relative z-[1]">

        {/* ── Top header ── */}
        <div className="shrink-0 px-4 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>
              {activeWorkspace?.name ?? 'Your workspace'}
            </p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-1)' }}>Meeting Bots</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
                  Deploy AI recorders into any Google Meet or Zoom call
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2.5 rounded-full transition-colors disabled:opacity-40"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                  title="Refresh">
                  <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} style={{ color: 'var(--text-2)' }} />
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setRecordOpen(true)}
                  className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-6 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm shadow-xl shadow-violet-500/30 hover:from-violet-500 hover:to-indigo-500 transition-all">
                  <Plus size={16} /><span className="hidden sm:inline">Deploy Bot</span>
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ── Stat ribbon ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-5 sm:mt-6">
            {[
              { icon: Activity,      label: 'Total',     value: sessions.length,   color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { icon: Radio,         label: 'Live now',  value: live.length,        color: 'text-emerald-400',bg: 'bg-emerald-500/10', pulse: live.length > 0 },
              { icon: Timer,         label: 'Pending',   value: active.length - live.length, color: 'text-amber-400',  bg: 'bg-amber-500/10' },
              { icon: CheckCircle2,  label: 'Completed', value: sessions.filter(s => s.status === 'completed').length, color: 'text-sky-400', bg: 'bg-sky-500/10' },
            ].map(({ icon: Icon, label, value, color, bg, pulse }) => (
              <div key={label} className="glass-card border rounded-2xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={`${color} ${pulse ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <p className="text-2xl font-black leading-none mb-1" style={{ color: 'var(--text-1)' }}>{value}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Session feed ── */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-4 sm:px-8 pb-6 sm:pb-8">
          {/* Tab bar */}
          <div className="shrink-0 flex items-center border-b mb-4" style={{ borderColor: 'var(--divider)' }}>
            {TABS.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  tab === key ? 'border-violet-500 text-violet-500' : 'border-transparent'
                }`}
                style={{ color: tab === key ? undefined : 'var(--text-3)', borderRadius: 0 }}>
                <Icon size={14} />{label}
              </button>
            ))}
            <div className="flex-1" />
            {live.length > 0 && (
              <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {live.length} live
              </motion.div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ color: 'var(--text-3)' }}>
                <Loader2 size={24} className="animate-spin" />
                <p className="text-sm">Loading sessions…</p>
              </div>
            ) : visibleSessions.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-64 gap-4 rounded-3xl border-2 border-dashed text-center px-8"
                style={{ borderColor: 'var(--card-border)' }}>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 flex items-center justify-center">
                  {tab === 'upcoming' ? <CalendarPlus size={28} className="text-violet-400" /> : <Bot size={28} className="text-violet-400" />}
                </div>
                <div>
                  <p className="font-bold text-base mb-1" style={{ color: 'var(--text-1)' }}>
                    {tab === 'upcoming' ? 'No upcoming sessions' : 'No sessions yet'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                    {tab === 'upcoming' ? 'Scheduled bots will appear here.' : 'Deploy a bot to your first meeting.'}
                  </p>
                </div>
                {tab === 'all' && (
                  <button onClick={() => setRecordOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/30">
                    <Plus size={14} /> Deploy Bot
                  </button>
                )}
              </motion.div>
            ) : (
              <AnimatePresence initial={false}>
                {visibleSessions.map((session, i) => (
                  <motion.div key={session.id} layout>
                    <SessionCard
                      session={session}
                      highlighted={session.id === highlighted}
                      onNavigate={handleNavFromCard}
                      onEnd={handleEnd}
                      onCancel={handleCancel}
                      onCalendar={(e, id) => { e.stopPropagation(); downloadMeetingBotCalendar(id) }}
                      endingId={pendingEnd}
                      cancelId={pendingCancel}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
