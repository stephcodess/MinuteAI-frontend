import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Disc, Music, Film, Download, Calendar, Clock,
  Search, Loader2, AlertCircle, FolderOpen,
} from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceContext'
import Sidebar from '../../components/Sidebar'
import { api, getDownloadUrl } from '../../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Meeting {
  id: string
  title: string
  date: string | null
  duration: string
  status: string
  has_audio: boolean
  audio_type: 'audio' | 'video' | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86_400_000) return 'Today'
  if (diff < 172_800_000) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: 'audio' | 'video' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
        {tab === 'audio'
          ? <Music size={28} className="text-slate-500" />
          : <Film size={28} className="text-slate-500" />}
      </div>
      <div>
        <p className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>
          No {tab} recordings yet
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
          Recordings will appear here once you upload a{tab === 'audio' ? 'n audio' : ' video'} file.
        </p>
      </div>
    </div>
  )
}

// ── Recording row ─────────────────────────────────────────────────────────────

function RecordingRow({ meeting }: { meeting: Meeting }) {
  const [downloading, setDownloading] = useState(false)

  function handleDownload() {
    setDownloading(true)
    window.open(getDownloadUrl(meeting.id, 'audio'), '_blank')
    setTimeout(() => setDownloading(false), 1500)
  }

  const isVideo = meeting.audio_type === 'video'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-4 px-5 py-4 rounded-2xl border transition-colors group"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: isVideo ? 'rgba(59,130,246,0.12)' : 'rgba(139,92,246,0.12)' }}>
        {isVideo
          ? <Film size={18} className="text-blue-400" />
          : <Music size={18} className="text-violet-400" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
          {meeting.title}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-3)' }}>
            <Calendar size={11} />
            {fmtDate(meeting.date)}
          </span>
          {meeting.date && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-3)' }}>
              <Clock size={11} />
              {fmtTime(meeting.date)}
            </span>
          )}
          {meeting.duration && meeting.duration !== '—' && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}>
              {meeting.duration}
            </span>
          )}
        </div>
      </div>

      {/* Download */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0"
        style={{
          background: 'rgba(139,92,246,0.12)',
          color: 'rgb(167,139,250)',
          border: '1px solid rgba(139,92,246,0.2)',
        }}
      >
        {downloading
          ? <Loader2 size={13} className="animate-spin" />
          : <Download size={13} />}
        {downloading ? 'Opening…' : 'Download'}
      </button>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'audio' as const, label: 'Audio recordings', icon: Music },
  { id: 'video' as const, label: 'Video recordings', icon: Film },
]

export default function Recordings() {
  const { activeWorkspace } = useWorkspace()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'audio' | 'video'>('audio')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = activeWorkspace?.id ? `?workspace_id=${activeWorkspace.id}` : ''
    api.get<Meeting[]>(`/meetings${params}`)
      .then(data => setMeetings(data))
      .catch(err => setError(err.message || 'Failed to load recordings'))
      .finally(() => setLoading(false))
  }, [activeWorkspace?.id])

  const withAudio = meetings.filter(m => m.has_audio && m.audio_type === tab)

  const filtered = search.trim()
    ? withAudio.filter(m => m.title.toLowerCase().includes(search.toLowerCase()))
    : withAudio

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Sidebar active="recordings" />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="w-full px-6 py-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Disc size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Recordings</h1>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                Download your original audio and video files
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-2xl mb-6 w-fit"
            style={{ background: 'var(--input-bg)' }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ color: tab === id ? 'var(--text-1)' : 'var(--text-3)' }}
              >
                {tab === id && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'var(--card-bg)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon size={14} className="relative z-10" />
                <span className="relative z-10">{label}</span>
                {withAudio.length > 0 && tab === id && (
                  <span className="relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 ml-0.5">
                    {filtered.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search recordings…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-all"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-1)',
              }}
            />
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={24} className="animate-spin text-violet-400" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-red-500/20 bg-red-500/5">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            search ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <FolderOpen size={32} className="text-slate-600" />
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>No recordings match "{search}"</p>
              </div>
            ) : (
              <EmptyState tab={tab} />
            )
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {filtered.map(m => (
                  <RecordingRow key={m.id} meeting={m} />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}
