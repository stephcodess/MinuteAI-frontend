import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, Calendar, Clock,
  Search, Loader2, AlertCircle, Play, Pause, Trash2,
  Mic, FileAudio, ExternalLink, RotateCcw, RotateCw,
  Headphones,
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
  const d   = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)  return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtSeconds(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function groupKey(iso: string | null) {
  if (!iso) return 'Older'
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)  return 'This week'
  if (diffDays < 30) return 'This month'
  return 'Older'
}

const GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'This month', 'Older']

// ── Waveform decoration ───────────────────────────────────────────────────────

function Waveform({ playing, id }: { playing: boolean; id: string }) {
  const bars = useMemo(() => {
    // Deterministic pseudo-random from id string
    let seed = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
    return Array.from({ length: 36 }, () => 15 + rand() * 38)
  }, [id])

  return (
    <div className="flex items-center gap-[3px] h-10 px-1">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full bg-white/30 origin-center ${playing ? 'animate-pulse' : ''}`}
          style={{
            height: `${h}%`,
            animationDuration: `${0.6 + (i % 5) * 0.15}s`,
            animationDelay: `${(i % 7) * 0.07}s`,
          }}
        />
      ))}
    </div>
  )
}

// ── Recording card ────────────────────────────────────────────────────────────

function RecordingCard({ meeting, onDelete }: { meeting: Meeting; onDelete: (id: string) => void }) {
  const [playing,       setPlaying]       = useState(false)
  const [currentTime,   setCurrentTime]   = useState(0)
  const [duration,      setDuration]      = useState(0)
  const [speed,         setSpeed]         = useState(1)
  const [playerOpen,    setPlayerOpen]    = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [downloading,   setDownloading]   = useState(false)
  const mediaRef = useRef<HTMLAudioElement & HTMLVideoElement>(null)

  const src      = getDownloadUrl(meeting.id, 'audio')
  const progress = duration ? (currentTime / duration) * 100 : 0

  function togglePlay() {
    const el = mediaRef.current
    if (!el) { setPlayerOpen(true); return }
    if (!playerOpen) setPlayerOpen(true)
    if (el.paused) el.play()
    else el.pause()
  }

  function seekFromClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!duration || !mediaRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    mediaRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  function jump(delta: number) {
    const el = mediaRef.current
    if (!el) return
    el.currentTime = Math.max(0, Math.min(el.currentTime + delta, duration || el.duration || 0))
  }

  function cycleSpeed() {
    const opts = [1, 1.25, 1.5, 2]
    const next = opts[(opts.indexOf(speed) + 1) % opts.length]
    setSpeed(next)
    if (mediaRef.current) mediaRef.current.playbackRate = next
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

  function handleDownload() {
    setDownloading(true)
    window.open(src, '_blank')
    setTimeout(() => setDownloading(false), 1500)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={`group rounded-2xl border overflow-hidden flex flex-col transition-colors duration-200 ${
        playerOpen ? 'border-violet-500/40' : ''
      }`}
      style={{
        background: 'var(--card-bg)',
        borderColor: playerOpen ? undefined : 'var(--card-border)',
      }}
    >
      {/* ── Cover ── */}
      <div
        className="relative flex-shrink-0 h-[140px] cursor-pointer overflow-hidden bg-gradient-to-br from-violet-900 via-violet-700 to-indigo-700"
        onClick={togglePlay}
      >
        {/* dot-grid overlay */}
        <div className="absolute inset-0 recording-cover-dots" />

        {/* waveform */}
        <div className="absolute inset-0 flex items-center px-6">
          <Waveform playing={playing} id={meeting.id} />
        </div>

        {/* hidden audio element */}
        <audio
          ref={mediaRef as any}
          src={src}
          preload="metadata"
          onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
          onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />

        {/* play overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-lg transition-all group-hover:bg-white/30 group-hover:scale-110 ${playing ? 'scale-95' : ''}`}>
            {playing
              ? <Pause size={20} className="text-white" fill="white" />
              : <Play  size={20} className="text-white ml-0.5" fill="white" />}
          </div>
        </div>

        {/* type badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 rounded-lg bg-black/30 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          <Headphones size={10} />
          Audio
        </div>

        {/* duration badge */}
        {(meeting.duration || duration > 0) && (
          <div className="absolute bottom-3 right-3 rounded-lg bg-black/40 px-2 py-0.5 text-[11px] font-mono text-white backdrop-blur-sm">
            {duration > 0 ? fmtSeconds(duration) : meeting.duration}
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold leading-snug line-clamp-2 flex-1" style={{ color: 'var(--text-1)' }}>
            {meeting.title}
          </p>
          <Link
            to={`/results/${meeting.id}`}
            title="View minutes"
            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/[0.06]"
            style={{ color: 'var(--text-3)' }}
          >
            <ExternalLink size={12} />
          </Link>
        </div>
        <div className="flex items-center gap-2 mb-3">
          {meeting.date && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
              <Calendar size={10} />
              {fmtDate(meeting.date)}
            </span>
          )}
          {meeting.date && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
              <Clock size={10} />
              {fmtTime(meeting.date)}
            </span>
          )}
        </div>

        {/* ── Inline player ── */}
        <AnimatePresence>
          {playerOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              style={{ overflow: 'hidden' }}
            >
              {/* progress bar */}
              <div
                className="group/bar relative mb-2 h-1.5 cursor-pointer rounded-full"
                style={{ background: 'var(--input-bg)' }}
                onClick={seekFromClick}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-none"
                  style={{ width: `${progress}%` }}
                />
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-violet-500 opacity-0 shadow transition-opacity group-hover/bar:opacity-100"
                  style={{ left: `calc(${progress}% - 6px)` }}
                />
              </div>

              {/* time + controls */}
              <div className="flex items-center justify-between text-[11px] mb-3" style={{ color: 'var(--text-3)' }}>
                <span className="tabular-nums font-medium" style={{ color: 'var(--text-2)' }}>
                  {fmtSeconds(currentTime)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => jump(-10)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
                    style={{ color: 'var(--text-3)' }}
                    title="Back 10s"
                  >
                    <RotateCcw size={12} />
                  </button>
                  <button
                    onClick={cycleSpeed}
                    className="min-w-[32px] rounded-lg px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors hover:bg-white/[0.06]"
                    style={{ color: 'var(--text-2)' }}
                  >
                    {speed}x
                  </button>
                  <button
                    onClick={() => jump(10)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
                    style={{ color: 'var(--text-3)' }}
                    title="Forward 10s"
                  >
                    <RotateCw size={12} />
                  </button>
                </div>
                <span className="tabular-nums">{fmtSeconds(duration)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Action row ── */}
        <div className="mt-auto flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all"
            style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}
          >
            {playing
              ? <><Pause size={12} fill="currentColor" /> Pause</>
              : <><Play  size={12} fill="currentColor" className="ml-0.5" /> Play</>}
          </button>

          <button
            onClick={handleDownload}
            disabled={downloading}
            title="Download"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all hover:bg-white/[0.06]"
            style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          </button>

          <AnimatePresence mode="wait">
            {confirmDelete ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex shrink-0 items-center gap-1"
              >
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={10} className="animate-spin" /> : null}
                  {deleting ? '…' : 'Delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-white/[0.04]"
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
                onClick={() => setConfirmDelete(true)}
                title="Delete"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all hover:bg-red-500/10 hover:text-red-400"
                style={{ background: 'var(--input-bg)', color: 'var(--text-3)' }}
              >
                <Trash2 size={13} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-28 gap-4 text-center">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center border-2 border-dashed"
        style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)' }}>
        <FileAudio size={32} style={{ color: 'var(--text-3)' }} />
      </div>
      <div>
        <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-2)' }}>
          No recordings yet
        </p>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          Upload an audio file to see it here.
        </p>
      </div>
      <Link
        to="/upload"
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-500 hover:to-indigo-500"
      >
        <Mic size={14} /> Upload recording
      </Link>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Recordings() {
  const { activeWorkspace } = useWorkspace()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = activeWorkspace?.id ? `?workspace_id=${activeWorkspace.id}` : ''
    api.get<Meeting[]>(`/meetings${params}`)
      .then(data => setMeetings(data))
      .catch(err  => setError(err.message || 'Failed to load recordings'))
      .finally(()  => setLoading(false))
  }, [activeWorkspace?.id])

  function handleDelete(id: string) {
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, has_audio: false } : m))
  }

  const withAudio = meetings.filter(m => m.has_audio)
  const filtered  = search.trim()
    ? withAudio.filter(m => m.title.toLowerCase().includes(search.toLowerCase()))
    : withAudio

  const grouped = useMemo(() => {
    const map: Record<string, Meeting[]> = {}
    for (const m of filtered) {
      const key = groupKey(m.date)
      if (!map[key]) map[key] = []
      map[key].push(m)
    }
    return GROUP_ORDER.filter(k => map[k]).map(k => ({ label: k, items: map[k] }))
  }, [filtered])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Sidebar active="recordings" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* ── Sticky header ── */}
        <div className="shrink-0 border-b px-5 py-5 sm:px-8" style={{ borderColor: 'var(--divider)', background: 'var(--page-bg)' }}>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Recordings</h1>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--text-3)' }}>
                Play, download, or remove your original recordings
              </p>
            </div>
            <Link
              to="/upload"
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-500 hover:to-indigo-500"
            >
              <Mic size={14} /> Upload new
            </Link>
          </div>
          <div className="max-w-sm">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search recordings…"
                className="w-full rounded-xl border py-2 pl-8 pr-3 text-sm outline-none transition focus:ring-1 focus:ring-violet-500/40"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-1)' }}
              />
            </div>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">

          {/* ── Content ── */}
          {loading ? (
            <div className="flex items-center justify-center py-28">
              <Loader2 size={26} className="animate-spin text-violet-400" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            search ? (
              <div className="flex flex-col items-center justify-center py-28 gap-3 text-center">
                <Search size={32} style={{ color: 'var(--text-3)' }} />
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>No recordings match "{search}"</p>
                <button onClick={() => setSearch('')} className="text-sm text-violet-400 hover:underline">
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <EmptyState />
              </div>
            )
          ) : (
            <div className="space-y-8">
              {grouped.map(({ label, items }) => (
                <div key={label}>
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                    {label}
                  </p>
                  <AnimatePresence mode="popLayout">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map(m => (
                        <RecordingCard key={m.id} meeting={m} onDelete={handleDelete} />
                      ))}
                    </div>
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
