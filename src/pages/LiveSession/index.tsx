import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Bot, Clock, Loader2, CheckCircle2, XCircle, Radio } from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const STATUS_CONFIG = {
  queued:           { label: 'Waiting to start',      color: 'text-slate-400',   dot: 'bg-slate-400',   pulse: false },
  scheduled:        { label: 'Scheduled',              color: 'text-slate-400',   dot: 'bg-slate-400',   pulse: false },
  preparing:        { label: 'Preparing to join',      color: 'text-indigo-400',  dot: 'bg-indigo-400',  pulse: true  },
  joining:          { label: 'Joining the meeting',    color: 'text-sky-400',     dot: 'bg-sky-400',     pulse: true  },
  waiting_for_host: { label: 'Waiting for host',       color: 'text-amber-400',   dot: 'bg-amber-400',   pulse: true  },
  recording:        { label: 'Recording',              color: 'text-emerald-400', dot: 'bg-emerald-400', pulse: true  },
  processing:       { label: 'Processing notes…',      color: 'text-violet-400',  dot: 'bg-violet-400',  pulse: true  },
  completed:        { label: 'Notes ready',            color: 'text-emerald-400', dot: 'bg-emerald-400', pulse: false },
  failed:           { label: 'Session ended',          color: 'text-slate-400',   dot: 'bg-slate-400',   pulse: false },
  cancelled:        { label: 'Cancelled',              color: 'text-slate-400',   dot: 'bg-slate-400',   pulse: false },
}

const PLATFORM_LABEL: Record<string, string> = {
  google_meet: 'Google Meet',
  zoom:        'Zoom',
  teams:       'Microsoft Teams',
}

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  const start = startedAt ? new Date(startedAt).getTime() : null
  const end   = endedAt   ? new Date(endedAt).getTime()   : Date.now()
  if (!start) return ''
  const secs = Math.floor((end - start) / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}m ${s < 10 ? '0' : ''}${s}s`
}

export default function LiveSession() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch(`${BASE}/meeting-bots/live/${shareToken}`)
        if (!res.ok) throw new Error('not found')
        const data = await res.json()
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
  }, [shareToken])

  // Live elapsed timer for active sessions
  useEffect(() => {
    if (!session?.started_at || !session.is_live) return
    const tick = () => setElapsed(formatDuration(session.started_at, null))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session?.started_at, session?.is_live])

  const cfg = STATUS_CONFIG[session?.status] ?? STATUS_CONFIG.queued

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--page-bg, #0f1117)', color: 'var(--text-1, #f1f5f9)' }}>

      {/* Brand header */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600">
          <Bot size={18} className="text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">MinuteAI</span>
      </div>

      {loading ? (
        <Loader2 size={28} className="animate-spin text-violet-400" />
      ) : !session ? (
        <div className="text-center space-y-2">
          <XCircle size={40} className="mx-auto text-slate-500" />
          <p className="text-slate-400 text-sm">Session not found or the link has expired.</p>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-5">

          {/* Main status card */}
          <div className="rounded-2xl border p-7 text-center space-y-4"
            style={{ background: 'var(--card-bg, #1a1f2e)', borderColor: 'var(--card-border, rgba(255,255,255,0.08))' }}>

            {/* Animated status indicator */}
            <div className="flex items-center justify-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                {cfg.pulse && (
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.dot}`} />
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dot}`} />
              </span>
              <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
            </div>

            {/* Meeting title */}
            <h1 className="text-xl font-bold leading-snug" style={{ color: 'var(--text-1, #f1f5f9)' }}>
              {session.title || 'Meeting in progress'}
            </h1>

            {/* Platform + duration */}
            <div className="flex items-center justify-center gap-4 text-xs" style={{ color: 'var(--text-3, #64748b)' }}>
              {session.platform && (
                <span>{PLATFORM_LABEL[session.platform] ?? session.platform}</span>
              )}
              {session.is_live && elapsed && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {elapsed}
                </span>
              )}
              {!session.is_live && session.started_at && session.ended_at && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {formatDuration(session.started_at, session.ended_at)}
                </span>
              )}
            </div>

            {/* Body message */}
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2, #94a3b8)' }}>
              {session.status === 'recording' && (
                <>
                  <Radio size={13} className="inline mr-1.5 text-emerald-400" />
                  {session.bot_name} is recording this meeting. Notes and transcript will be ready after the call ends.
                </>
              )}
              {(session.status === 'preparing' || session.status === 'joining' || session.status === 'waiting_for_host') && (
                <>{session.bot_name} is joining the meeting now. Recording will begin shortly.</>
              )}
              {session.status === 'processing' && (
                <>Meeting finished. {session.bot_name} is generating your notes and transcript — this usually takes a few minutes.</>
              )}
              {session.status === 'completed' && (
                <><CheckCircle2 size={13} className="inline mr-1.5 text-emerald-400" />Notes are ready. Ask the meeting organiser to share the summary with you.</>
              )}
              {(session.status === 'failed' || session.status === 'cancelled') && (
                <>The recording session has ended.</>
              )}
              {(session.status === 'queued' || session.status === 'scheduled') && (
                <>{session.bot_name} will join this meeting automatically and start recording.</>
              )}
            </p>
          </div>

          {/* Compliance notice */}
          <p className="text-center text-xs leading-relaxed" style={{ color: 'var(--text-3, #475569)' }}>
            This meeting is being recorded by an AI notetaker. All participants have been notified.
            If you do not wish to be recorded, please leave the meeting.
          </p>

          {/* MinuteAI link */}
          <p className="text-center text-xs" style={{ color: 'var(--text-3, #475569)' }}>
            Powered by{' '}
            <a href="https://minuteai.com" target="_blank" rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 transition-colors">
              MinuteAI
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
