import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, CalendarClock, Clock3, ExternalLink, Link2, Loader2, Mic, Sparkles, X, AlertTriangle } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { createMeetingBotSession, downloadMeetingBotCalendar, getIntegrations } from '../../lib/api'
import { useWorkspace } from '../../context/WorkspaceContext'

const RECORDER_NAME = 'MinuteAI Recorder'
const IS_PRODUCTION = import.meta.env.PROD
const MEETING_BOT_ENABLED = import.meta.env.VITE_MEETING_BOT_ENABLED === 'true'
const MODE_OPTIONS = [
  { key: 'now', label: 'Join now', Icon: Bot },
  { key: 'schedule', label: 'Schedule', Icon: Clock3 },
]

function SupportPill({ icon: Icon, label, tone }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
      tone === 'good' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
    }`}>
      <Icon size={13} />
      {label}
    </div>
  )
}

function isGoogleMeetUrl(url: string) {
  return /meet\.google\.com\/[a-z]/.test(url)
}

export default function RecordMeetingModal({ open, onClose }) {
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspace()
  const [meetingUrl, setMeetingUrl] = useState('')
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null)
  const showDevelopmentNotice = IS_PRODUCTION && !MEETING_BOT_ENABLED

  useEffect(() => {
    if (!open) return
    getIntegrations()
      .then((integrations: any) => setGoogleConnected(!!(integrations?.google?.connected)))
      .catch(() => setGoogleConnected(null))
  }, [open])

  // Prevent body scroll while modal is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const showGoogleAuthHint = isGoogleMeetUrl(meetingUrl) && googleConnected === false

  async function handleSubmit(e) {
    e.preventDefault()
    if (!meetingUrl.trim() || loading) return
    if (mode === 'schedule' && !scheduledAt) {
      setError('Choose a meeting time before scheduling the bot.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const session = await createMeetingBotSession({
        meeting_url: meetingUrl.trim(),
        title: title.trim() || null,
        workspace_id: activeWorkspace?.id || null,
        scheduled_for: mode === 'schedule' ? new Date(scheduledAt).toISOString() : null,
        duration_minutes: mode === 'schedule' ? Number(durationMinutes) : null,
      })
      if (mode === 'schedule') await downloadMeetingBotCalendar(session.id)
      onClose()
      navigate(`/meeting-bots/${session.id}`)
    } catch (err) {
      setError(err.message || 'Unable to create meeting bot session.')
    } finally {
      setLoading(false)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] backdrop-blur-sm"
            style={{ background: 'var(--modal-overlay)' }}
            onClick={onClose}
          />

          {/* Positioner — bottom-sheet on mobile, centered on sm+ */}
          <div className="fixed inset-x-0 bottom-0 z-[130] flex justify-center sm:inset-0 sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full sm:max-w-2xl flex flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px] border shadow-[0_-8px_40px_rgba(0,0,0,0.25)] sm:shadow-[0_35px_90px_rgba(0,0,0,0.35)]"
              style={{
                background: 'var(--modal-bg)',
                borderColor: 'var(--modal-border)',
                maxHeight: 'calc(100dvh - 40px)',
              }}
            >
              {/* Mobile drag handle */}
              <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--divider)' }} />
              </div>

              {/* Header — fixed, never scrolls */}
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-indigo-600 px-5 py-5 sm:px-6 sm:py-6 text-white shrink-0">
                <div className="absolute inset-0 opacity-30 recording-cover-dots" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/14 ring-1 ring-white/20 backdrop-blur sm:mb-4 sm:h-12 sm:w-12">
                      <Bot size={20} />
                    </div>
                    <h2 className="text-xl font-black tracking-tight sm:text-2xl">Record a meeting</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-indigo-100/85 sm:mt-2 line-clamp-2 sm:line-clamp-none">
                      {showDevelopmentNotice
                        ? 'Live meeting recording is still being prepared for production. Manual uploads remain available while we finish the recorder.'
                        : `Paste a Google Meet or Zoom link and MinuteAI will join ${activeWorkspace?.name ?? 'your workspace'} as the shared recorder.`}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="shrink-0 rounded-xl bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto overscroll-contain flex-1 min-h-0">

                {showDevelopmentNotice ? (
                  <div className="px-5 py-5 sm:px-6 sm:py-6">
                    <div className="rounded-[20px] p-5 border" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)' }}>
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Meeting bot is coming soon</h3>
                          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                            We are still hardening live call capture for Google Meet and Zoom. For now, upload a meeting recording after the call and MinuteAI will transcribe, format, and generate your minutes.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => { onClose(); navigate('/upload') }}
                        className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-700"
                      >
                        <Mic size={16} />
                        Upload recording
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl border px-5 py-3 text-sm font-semibold transition hover:bg-[var(--nav-hover-bg)]"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)' }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Two-column on sm+, stacked on mobile */
                  <div className="grid gap-0 sm:gap-6 sm:grid-cols-[1.15fr_0.85fr] sm:px-6 sm:py-6">

                    {/* ── Form column ── */}
                    <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 sm:px-0 sm:py-0">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                          Meeting title
                        </label>
                        <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
                          <CalendarClock size={16} style={{ color: 'var(--text-3)' }} />
                          <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Weekly planning, customer sync..."
                            className="w-full bg-transparent text-sm font-medium focus:outline-none"
                            style={{ color: 'var(--input-text)' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                          Meeting link
                        </label>
                        <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
                          <Link2 size={16} style={{ color: 'var(--text-3)' }} />
                          <input
                            value={meetingUrl}
                            onChange={(e) => { setMeetingUrl(e.target.value); setError(null) }}
                            placeholder="https://meet.google.com/... or https://zoom.us/j/..."
                            className="w-full bg-transparent text-sm font-medium focus:outline-none"
                            style={{ color: 'var(--input-text)' }}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border p-1" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                        <div className="grid grid-cols-2 gap-1">
                          {MODE_OPTIONS.map(({ key, label, Icon }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => { setMode(key); setError(null) }}
                              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                mode === key ? 'bg-violet-600 text-white shadow-sm' : 'hover:bg-[var(--nav-hover-bg)]'
                              }`}
                              style={{ color: mode === key ? undefined : 'var(--text-3)' }}
                            >
                              <Icon size={15} />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {mode === 'schedule' && (
                        <div className="grid gap-3 grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                              Start time
                            </label>
                            <input
                              type="datetime-local"
                              value={scheduledAt}
                              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                              onChange={(e) => { setScheduledAt(e.target.value); setError(null) }}
                              className="w-full rounded-2xl border px-3 py-3 text-sm font-medium focus:outline-none"
                              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }}
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                              Duration
                            </label>
                            <select
                              value={durationMinutes}
                              onChange={(e) => setDurationMinutes(Number(e.target.value))}
                              className="w-full rounded-2xl border px-3 py-3 text-sm font-medium focus:outline-none"
                              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }}
                            >
                              {[15, 30, 45, 60, 90, 120].map((m) => (
                                <option key={m} value={m}>{m} min</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="rounded-2xl border px-4 py-3" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                          Recorder identity
                        </p>
                        <div className="flex items-center gap-3">
                          <Mic size={16} style={{ color: 'var(--text-3)' }} />
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{RECORDER_NAME}</p>
                            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Shared recorder account for your workspace.</p>
                          </div>
                        </div>
                      </div>

                      {showGoogleAuthHint && (
                        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 flex items-start gap-3">
                          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                          <span>
                            The bot will join as a guest. For org-restricted meetings,{' '}
                            <Link to="/settings" onClick={onClose} className="font-semibold underline underline-offset-2 hover:text-amber-300">
                              connect your Google account in Settings
                            </Link>{' '}
                            so it can sign in instead.
                          </span>
                        </div>
                      )}

                      {error && (
                        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                          {error}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-1 pb-1">
                        <motion.button
                          type="submit"
                          disabled={loading || !meetingUrl.trim()}
                          whileHover={!loading && meetingUrl.trim() ? { scale: 1.01 } : {}}
                          whileTap={!loading && meetingUrl.trim() ? { scale: 0.985 } : {}}
                          className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
                          {loading ? 'Creating session...' : mode === 'schedule' ? 'Schedule bot' : 'Create bot session'}
                        </motion.button>
                        <button
                          type="button"
                          onClick={onClose}
                          className="rounded-2xl border px-5 py-3 text-sm font-semibold transition hover:bg-[var(--nav-hover-bg)]"
                          style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)' }}
                        >
                          Maybe later
                        </button>
                      </div>
                    </form>

                    {/* ── Support notes sidebar — hidden on mobile ── */}
                    <div className="hidden sm:block space-y-4 rounded-[20px] p-5 border self-start" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)' }}>
                      <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Support notes</p>
                      <div className="space-y-3">
                        <SupportPill icon={CalendarClock} label="Scheduled sessions include a calendar event" tone="good" />
                        <SupportPill icon={ExternalLink} label="Zoom links are accepted and tracked here too" tone="good" />
                        <SupportPill icon={Bot} label="Meetings join as the shared recorder account" tone="good" />
                      </div>
                      <div className="rounded-2xl p-4 border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>What happens next</p>
                        <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-3)' }}>
                          <p>The bot session is created immediately and starts moving through queue and join states.</p>
                          <p>You can monitor every session from the meeting bots page after submission.</p>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
