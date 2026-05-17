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
      tone === 'good' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
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
      .then((integrations: any) => {
        setGoogleConnected(!!(integrations?.google?.connected))
      })
      .catch(() => setGoogleConnected(null))
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
      if (mode === 'schedule') {
        await downloadMeetingBotCalendar(session.id)
      }
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-950/45 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[130] flex items-end justify-center p-4 sm:items-center"
          >
            <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_35px_90px_rgba(30,41,59,0.22)]">
              <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#312e81] to-[#4f46e5] px-6 py-6 text-white">
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '22px 22px' }} />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="max-w-xl">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/14 ring-1 ring-white/20 backdrop-blur">
                      <Bot size={22} />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">Record a meeting</h2>
                    <p className="mt-2 max-w-lg text-sm leading-relaxed text-indigo-100/85">
                      {showDevelopmentNotice
                        ? 'Live meeting recording is still being prepared for production. Manual uploads remain available while we finish the recorder.'
                        : `Paste a Google Meet or Zoom link and MinuteAI will create a meeting bot session for ${activeWorkspace?.name ?? 'your workspace'}. The bot joins as the shared recorder identity instead of an individual user profile.`}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-xl bg-white/10 p-2 text-white/80 transition hover:bg-white/16 hover:text-white"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              {showDevelopmentNotice ? (
                <div className="px-6 py-6">
                  <div className="rounded-[24px] bg-[#f8fafc] p-5 ring-1 ring-slate-200/70">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-950">Meeting bot is coming soon</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          We are still hardening live call capture for Google Meet and Zoom. For now, upload a meeting recording after the call and MinuteAI will transcribe, format, and generate your minutes.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        navigate('/upload')
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800"
                    >
                      <Mic size={16} />
                      Upload recording
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
              <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.15fr_0.85fr]">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Meeting title
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <CalendarClock size={16} className="text-slate-400" />
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Weekly planning, customer sync..."
                        className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Meeting link
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-inner shadow-slate-200/40">
                      <Link2 size={16} className="text-slate-400" />
                      <input
                        value={meetingUrl}
                        onChange={(e) => { setMeetingUrl(e.target.value); setError(null) }}
                        placeholder="https://meet.google.com/... or https://zoom.us/j/..."
                        className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-1">
                    <div className="grid grid-cols-2 gap-1">
                      {MODE_OPTIONS.map(({ key, label, Icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => { setMode(key); setError(null) }}
                          className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                            mode === key ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <Icon size={15} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {mode === 'schedule' && (
                    <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Start time
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduledAt}
                          min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                          onChange={(e) => { setScheduledAt(e.target.value); setError(null) }}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 focus:border-slate-300 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Duration
                        </label>
                        <select
                          value={durationMinutes}
                          onChange={(e) => setDurationMinutes(Number(e.target.value))}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 focus:border-slate-300 focus:bg-white focus:outline-none"
                        >
                          {[15, 30, 45, 60, 90, 120].map((minutes) => (
                            <option key={minutes} value={minutes}>{minutes} min</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Recorder identity
                    </p>
                    <div className="flex items-center gap-3">
                      <Mic size={16} className="text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{RECORDER_NAME}</p>
                        <p className="text-xs text-slate-500">This shared recorder account joins meetings for your workspace.</p>
                      </div>
                    </div>
                  </div>

                  {showGoogleAuthHint && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-3">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
                      <span>
                        The bot will join as a guest. For org-restricted meetings,{' '}
                        <Link
                          to="/settings"
                          onClick={onClose}
                          className="font-semibold underline underline-offset-2 hover:text-amber-900"
                        >
                          connect your Google account in Settings
                        </Link>{' '}
                        so it can sign in instead.
                      </span>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <motion.button
                      type="submit"
                      disabled={loading || !meetingUrl.trim()}
                      whileHover={!loading && meetingUrl.trim() ? { scale: 1.01 } : {}}
                      whileTap={!loading && meetingUrl.trim() ? { scale: 0.985 } : {}}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
                      {loading ? 'Creating session...' : mode === 'schedule' ? 'Schedule bot' : 'Create bot session'}
                    </motion.button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Maybe later
                    </button>
                  </div>
                </form>

                <div className="space-y-4 rounded-[24px] bg-[#f8fafc] p-5 ring-1 ring-slate-200/70">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Support notes</p>
                  <div className="space-y-3">
                    <SupportPill icon={CalendarClock} label="Scheduled sessions include a calendar event" tone="good" />
                    <SupportPill icon={ExternalLink} label="Zoom links are accepted and tracked here too" tone="good" />
                    <SupportPill icon={Bot} label="Meetings join as the shared recorder account" tone="good" />
                  </div>
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <p className="text-sm font-semibold text-slate-900">What happens next</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-500">
                      <p>The bot session is created immediately and starts moving through queue and join states.</p>
                      <p>You can monitor every session from the meeting bots page after submission.</p>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
