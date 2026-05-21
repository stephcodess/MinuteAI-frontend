import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Disc, Music, Film, Download, Calendar, Clock,
  Search, Loader2, AlertCircle, FolderOpen, Play, Pause, Trash2, X,
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

function RecordingRow({ meeting, onDelete }: { meeting: Meeting; onDelete: (id: string) => void }) {
  const [showPlayer, setShowPlayer]       = useState(false)
  const [playing, setPlaying]             = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [downloading, setDownloading]     = useState(false)
  const mediaRef = useRef<HTMLAudioElement & HTMLVideoElement>(null)

  const isVideo = meeting.audio_type === 'video'
  const src     = getDownloadUrl(meeting.id, 'audio')

  function togglePlayer() {
    if (showPlayer && mediaRef.current) {
      mediaRef.current.pause()
      setPlaying(false)
    }
    setShowPlayer(v => !v)
    setConfirmDelete(false)
  }

  function handleMediaPlay()  { setPlaying(true) }
  function handleMediaPause() { setPlaying(false) }

  function handleDownload() {
    setDownloading(true)
    window.open(src, '_blank')
    setTimeout(() => setDownloading(false), 1500)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/meetings/${meeting.id}/recording`)
      onDelete(meeting.id)
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl border overflow-hidden"
      style={{
        background: 'var(--card-bg)',
        borderColor: showPlayer ? 'rgba(139,92,246,0.35)' : 'var(--card-border)',
        transition: 'border-color 0.2s',
      }}
    >
      {/* ── Main row ── */}
      <div className="flex items-center gap-4 px-5 py-4">

        {/* Type icon */}
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

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Play / Pause */}
          <button
            onClick={togglePlayer}
            title={showPlayer ? 'Close player' : 'Play'}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: showPlayer ? 'rgba(139,92,246,0.2)' : 'var(--input-bg)',
              color: showPlayer ? 'rgb(167,139,250)' : 'var(--text-2)',
            }}
          >
            {showPlayer
              ? (playing ? <Pause size={15} /> : <X size={15} />)
              : <Play size={15} />}
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            title="Download"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}
          >
            {downloading
              ? <Loader2 size={14} className="animate-spin" />
              : <Download size={14} />}
          </button>

          {/* Delete / confirm */}
          <AnimatePresence mode="wait">
            {confirmDelete ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center gap-1.5"
              >
                <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
                  Remove recording?
                </span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={11} className="animate-spin" /> : null}
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ color: 'var(--text-3)' }}
                >
                  Cancel
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="trash"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setConfirmDelete(true); setShowPlayer(false) }}
                title="Delete recording"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-red-500/10 hover:text-red-400"
                style={{ background: 'var(--input-bg)', color: 'var(--text-3)' }}
              >
                <Trash2 size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Inline player ── */}
      <AnimatePresence>
        {showPlayer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
              {isVideo ? (
                <video
                  ref={mediaRef}
                  src={src}
                  controls
                  autoPlay
                  onPlay={handleMediaPlay}
                  onPause={handleMediaPause}
                  className="w-full rounded-xl"
                  style={{ maxHeight: 360, background: '#000' }}
                />
              ) : (
                <audio
                  ref={mediaRef}
                  src={src}
                  controls
                  autoPlay
                  onPlay={handleMediaPlay}
                  onPause={handleMediaPause}
                  className="w-full"
                  style={{ accentColor: '#7c3aed' }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [tab, setTab]           = useState<'audio' | 'video'>('audio')
  const [search, setSearch]     = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = activeWorkspace?.id ? `?workspace_id=${activeWorkspace.id}` : ''
    api.get<Meeting[]>(`/meetings${params}`)
      .then(data => setMeetings(data))
      .catch(err => setError(err.message || 'Failed to load recordings'))
      .finally(() => setLoading(false))
  }, [activeWorkspace?.id])

  function handleDelete(id: string) {
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, has_audio: false } : m))
  }

  const withAudio = meetings.filter(m => m.has_audio && m.audio_type === tab)
  const filtered  = search.trim()
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
                Play, download or remove your original audio and video files
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
                {withAudio.length > 0 && (
                  <span className="relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 ml-0.5">
                    {tab === id ? filtered.length : meetings.filter(m => m.has_audio && m.audio_type === id).length}
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
                  <RecordingRow key={m.id} meeting={m} onDelete={handleDelete} />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}
