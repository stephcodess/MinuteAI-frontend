import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, Loader2, Lock, Unlock, Pencil, Trash2, X,
  ChevronRight, Users, CalendarDays, CheckSquare, Hash,
  ArrowRight, ExternalLink, Tag,
} from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceContext'
import Sidebar from '../../components/Sidebar'
import { getThreads, getThread, updateThread, deleteThread } from '../../lib/api'

// ── category config ────────────────────────────────────────────────────────────

export const CATEGORIES: { value: string; label: string; color: string; bg: string }[] = [
  { value: 'engineering',  label: 'Engineering',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  { value: 'product',      label: 'Product',        color: 'var(--brand-400)', bg: 'rgba(167,139,250,0.12)' },
  { value: 'design',       label: 'Design',         color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  { value: 'sales',        label: 'Sales',          color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  { value: 'marketing',    label: 'Marketing',      color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  { value: 'client',       label: 'Client',         color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { value: 'leadership',   label: 'Leadership',     color: '#e879f9', bg: 'rgba(232,121,249,0.12)' },
  { value: 'all_hands',    label: 'All-Hands',      color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  { value: 'one_on_one',   label: '1:1',            color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  { value: 'other',        label: 'Other',          color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
]

export function getCategoryMeta(value: string | null | undefined) {
  return CATEGORIES.find(c => c.value === value) ?? null
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Category badge ─────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string | null | undefined }) {
  const meta = getCategoryMeta(category)
  if (!meta) return null
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: meta.bg, color: meta.color }}>
      <Tag size={8} />
      {meta.label}
    </span>
  )
}

// ── Session item in the detail drawer ────────────────────────────────────────

function SessionItem({ session, isLast }: { session: any; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      {/* timeline spine */}
      <div className="flex flex-col items-center shrink-0 w-6">
        <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0">
          <span className="text-[9px] font-black text-violet-400">{session.session_number}</span>
        </div>
        {!isLast && <div className="flex-1 w-px bg-white/[0.08] mt-1" />}
      </div>

      {/* card */}
      <div className="flex-1 min-w-0 pb-5">
        <Link to={`/results/${session.job_id}`}
          className="group block rounded-xl border p-3.5 transition-all hover:border-violet-500/40"
          style={{ background: 'var(--input-bg)', borderColor: 'var(--divider)' }}>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-sm font-semibold group-hover:text-violet-400 transition-colors leading-snug"
              style={{ color: 'var(--text-1)' }}>
              {session.title || `Session ${session.session_number}`}
            </p>
            <ExternalLink size={12} className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity"
              style={{ color: 'var(--text-3)' }} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
              <CalendarDays size={10} />
              {fmtDate(session.created_at)}
            </span>
            {session.open_task_count > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                <CheckSquare size={9} />
                {session.open_task_count} open
              </span>
            )}
          </div>
          {session.overview && (
            <p className="mt-2 text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-3)' }}>
              {session.overview}
            </p>
          )}
        </Link>
      </div>
    </div>
  )
}

// ── Thread detail drawer ──────────────────────────────────────────────────────

function ThreadDrawer({
  thread: initialThread,
  onClose,
  onRenamed,
  onDeleted,
  onLockToggled,
  onCategoryChanged,
}: {
  thread: any
  onClose: () => void
  onRenamed: (id: string, name: string) => void
  onDeleted: (id: string) => void
  onLockToggled: (id: string, locked: boolean) => void
  onCategoryChanged: (id: string, category: string | null) => void
}) {
  const [thread,        setThread]        = useState(initialThread)
  const [sessions,      setSessions]      = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [editingName,   setEditingName]   = useState(false)
  const [nameVal,       setNameVal]       = useState(initialThread.name)
  const [savingName,    setSavingName]    = useState(false)
  const [confirmDel,    setConfirmDel]    = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [categoryOpen,  setCategoryOpen]  = useState(false)
  const [savingCat,     setSavingCat]     = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setThread(initialThread)
    setNameVal(initialThread.name)
    setLoading(true)
    getThread(initialThread.id)
      .then((data: any) => {
        const { sessions, ...threadData } = data
        setThread(threadData)
        setSessions(sessions || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [initialThread.id])

  async function saveName() {
    if (!nameVal.trim() || nameVal.trim() === thread.name) { setEditingName(false); setNameVal(thread.name); return }
    setSavingName(true)
    try {
      await updateThread(thread.id, { name: nameVal.trim() })
      setThread((t: any) => ({ ...t, name: nameVal.trim() }))
      onRenamed(thread.id, nameVal.trim())
    } catch { setNameVal(thread.name) }
    finally { setSavingName(false); setEditingName(false) }
  }

  async function toggleLock() {
    const next = !thread.is_locked
    try {
      await updateThread(thread.id, { is_locked: next })
      setThread((t: any) => ({ ...t, is_locked: next }))
      onLockToggled(thread.id, next)
    } catch {}
  }

  async function saveCategory(value: string | null) {
    setCategoryOpen(false)
    if (value === (thread.category ?? null)) return
    setSavingCat(true)
    try {
      const updated = await updateThread(thread.id, { category: value ?? '' })
      setThread((t: any) => ({ ...t, category: (updated as any).category }))
      onCategoryChanged(thread.id, (updated as any).category)
    } catch {}
    finally { setSavingCat(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteThread(thread.id)
      onDeleted(thread.id)
      onClose()
    } catch { setDeleting(false); setConfirmDel(false) }
  }

  const participants: string[] = thread.participants || []

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed bottom-0 right-0 top-0 z-40 flex w-full max-w-[480px] flex-col shadow-2xl"
        style={{ background: 'var(--card-bg)', borderLeft: '1px solid var(--divider)' }}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--divider)' }}>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <form onSubmit={e => { e.preventDefault(); saveName() }} className="flex items-center gap-2">
                <input
                  ref={nameRef} autoFocus
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={e => { if (e.key === 'Escape') { setEditingName(false); setNameVal(thread.name) } }}
                  className="flex-1 text-base font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-1)' }}
                  disabled={savingName}
                />
                {savingName && <Loader2 size={13} className="animate-spin text-violet-400 shrink-0" />}
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold truncate" style={{ color: 'var(--text-1)' }}>{thread.name}</h2>
                {!thread.is_locked && (
                  <button onClick={() => { setEditingName(true); setTimeout(() => nameRef.current?.focus(), 10) }}
                    className="p-1 rounded-lg transition-colors hover:bg-white/[0.06] shrink-0"
                    style={{ color: 'var(--text-3)' }}>
                    <Pencil size={12} />
                  </button>
                )}
                {thread.is_locked && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                    <Lock size={8} /> Locked
                  </span>
                )}
              </div>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
              {(thread.session_count ?? sessions.length)} session{(thread.session_count ?? sessions.length) !== 1 ? 's' : ''}
              {thread.last_session_at && <> · Last {fmtDate(thread.last_session_at)}</>}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleLock}
              title={thread.is_locked ? 'Unlock thread' : 'Lock thread'}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
              style={{ color: 'var(--text-3)' }}>
              {thread.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
            </button>

            {confirmDel ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg bg-red-500 text-white">
                  {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  Confirm
                </button>
                <button onClick={() => setConfirmDel(false)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
                  style={{ color: 'var(--text-3)' }}>
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3500) }}
                className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-400"
                style={{ color: 'var(--text-3)' }}>
                <Trash2 size={14} />
              </button>
            )}

            <button onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
              style={{ color: 'var(--text-3)' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* category */}
        <div className="px-5 py-3 flex items-center gap-3 shrink-0 relative"
          style={{ borderBottom: '1px solid var(--divider)' }}>
          <Tag size={12} style={{ color: 'var(--text-3)' }} />
          <button
            onClick={() => setCategoryOpen(o => !o)}
            disabled={savingCat}
            className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors hover:bg-white/[0.06]"
            style={{ color: thread.category ? getCategoryMeta(thread.category)?.color : 'var(--text-3)', background: thread.category ? getCategoryMeta(thread.category)?.bg : 'transparent' }}>
            {savingCat ? <Loader2 size={11} className="animate-spin" /> : null}
            {thread.category ? getCategoryMeta(thread.category)?.label : 'Set category…'}
          </button>
          {thread.category && !savingCat && (
            <button onClick={() => saveCategory(null)} className="p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-3)' }}>
              <X size={10} />
            </button>
          )}
          <AnimatePresence>
            {categoryOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className="absolute left-10 top-full mt-1 z-50 rounded-xl shadow-xl p-1.5 grid grid-cols-2 gap-0.5 w-56"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => saveCategory(cat.value)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors text-left"
                    style={{
                      background: thread.category === cat.value ? cat.bg : 'transparent',
                      color: cat.color,
                    }}>
                    {cat.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* participants */}
        {participants.length > 0 && (
          <div className="px-5 py-3 flex items-center gap-2 flex-wrap shrink-0"
            style={{ borderBottom: '1px solid var(--divider)' }}>
            <Users size={12} style={{ color: 'var(--text-3)' }} />
            {participants.map((p, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: 'var(--input-bg)', color: 'var(--text-2)', border: '1px solid var(--divider)' }}>
                {p}
              </span>
            ))}
          </div>
        )}

        {/* sessions timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2" style={{ color: 'var(--text-3)' }}>
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading sessions…</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-center" style={{ color: 'var(--text-3)' }}>
              <Hash size={20} />
              <p className="text-sm">No sessions yet</p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>
                Sessions
              </p>
              {sessions.map((s, idx) => (
                <SessionItem key={s.id} session={s} isLast={idx === sessions.length - 1} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

// ── Thread card ───────────────────────────────────────────────────────────────

function ThreadCard({ thread, onClick }: { thread: any; onClick: () => void }) {
  const participants: string[] = thread.participants || []

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      className="w-full text-left rounded-2xl border p-5 transition-all hover:border-violet-500/40 group"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
            <GitBranch size={16} className="text-violet-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate group-hover:text-violet-400 transition-colors"
              style={{ color: 'var(--text-1)' }}>
              {thread.name}
            </h3>
            {thread.last_session_at && (
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                Last session {fmtDate(thread.last_session_at)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {thread.category && <CategoryBadge category={thread.category} />}
          {thread.is_locked && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
              <Lock size={8} /> Locked
            </span>
          )}
          <ChevronRight size={14} className="opacity-0 group-hover:opacity-60 transition-opacity"
            style={{ color: 'var(--text-3)' }} />
        </div>
      </div>

      {/* stats row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg"
          style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}>
          <Hash size={9} />
          {thread.session_count ?? 0} session{(thread.session_count ?? 0) !== 1 ? 's' : ''}
        </span>

        {participants.length > 0 && (
          <span className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg"
            style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}>
            <Users size={9} />
            {participants.length > 2
              ? `${participants.slice(0, 2).join(', ')} +${participants.length - 2}`
              : participants.join(', ')}
          </span>
        )}
      </div>
    </motion.button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Threads() {
  const { activeWorkspace } = useWorkspace()
  const [threads,    setThreads]    = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState<any | null>(null)

  useEffect(() => {
    setLoading(true)
    getThreads(activeWorkspace?.id)
      .then((data: any) => setThreads(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeWorkspace?.id])

  function handleRenamed(id: string, name: string) {
    setThreads(ts => ts.map(t => t.id === id ? { ...t, name } : t))
    if (selected?.id === id) setSelected((t: any) => ({ ...t, name }))
  }

  function handleDeleted(id: string) {
    setThreads(ts => ts.filter(t => t.id !== id))
    setSelected(null)
  }

  function handleLockToggled(id: string, locked: boolean) {
    setThreads(ts => ts.map(t => t.id === id ? { ...t, is_locked: locked } : t))
    if (selected?.id === id) setSelected((t: any) => ({ ...t, is_locked: locked }))
  }

  function handleCategoryChanged(id: string, category: string | null) {
    setThreads(ts => ts.map(t => t.id === id ? { ...t, category } : t))
    if (selected?.id === id) setSelected((t: any) => ({ ...t, category }))
  }

  return (
    <div className="flex h-screen app-bg app-grid overflow-hidden">
      <Sidebar active="threads" />

      <main className="min-w-0 flex-1 flex flex-col overflow-hidden relative z-[1]">

        {/* page header */}
        <div className="shrink-0 px-4 sm:px-8 pt-6 sm:pt-7 pb-4 sm:pb-5"
          style={{ borderBottom: '1px solid var(--divider)' }}>
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>
              {activeWorkspace?.name ?? 'Your workspace'}
            </p>
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5" style={{ color: 'var(--text-1)' }}>
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
                  <GitBranch size={17} className="text-white" />
                </span>
                Meeting Threads
              </h1>
              {!loading && threads.length > 0 && (
                <p className="text-sm hidden sm:block" style={{ color: 'var(--text-3)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{threads.length}</span> recurring series
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-48 gap-2" style={{ color: 'var(--text-3)' }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading threads…</span>
            </div>
          ) : threads.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-72 gap-4 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <GitBranch size={28} className="text-violet-400" />
              </div>
              <div>
                <p className="text-base font-bold mb-1" style={{ color: 'var(--text-1)' }}>No threads yet</p>
                <p className="text-sm max-w-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
                  Threads group your recurring meetings automatically. When two or more meetings share the same participants, they'll appear here.
                </p>
              </div>
              <Link to="/upload"
                className="flex items-center gap-2 mt-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all">
                Record a meeting <ArrowRight size={14} />
              </Link>
            </motion.div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {threads.map(t => (
                  <ThreadCard key={t.id} thread={t} onClick={() => setSelected(t)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {selected && (
          <ThreadDrawer
            key={selected.id}
            thread={selected}
            onClose={() => setSelected(null)}
            onRenamed={handleRenamed}
            onDeleted={handleDeleted}
            onLockToggled={handleLockToggled}
            onCategoryChanged={handleCategoryChanged}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
