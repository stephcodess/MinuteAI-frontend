import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, Copy, CheckCheck, FileDown, Plus,
  Circle, CheckCircle2, Loader2, CalendarDays, User as UserIcon,
  ChevronDown, TableProperties, FileText, Users,
  Clock, Hash, AlignLeft, ChevronLeft, ChevronRight,
  X, Zap, BarChart2, Minimize2, Lightbulb, HelpCircle,
  ArrowRight, MessageSquare, Target, List, ArrowLeft,
  GitBranch, AlertCircle, Share2, Search, Headphones,
  Play, Pause, RotateCcw, RotateCw, Volume2,
  Link2, Code2, Globe2, UserPlus, PencilLine, Save,
  Mail, Wand2,
} from 'lucide-react'
import { useResults } from '../../hooks/useResults'
import { useWorkspace } from '../../context/WorkspaceContext'
import { api, getThreadForJob, getThreadContinuity, updateThread, getDownloadUrl } from '../../lib/api'
import Sidebar from '../../components/Sidebar'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META = {
  todo:        { label: 'To-do',       cls: 'bg-white/[0.06] text-slate-400',      icon: Circle       },
  in_progress: { label: 'In progress', cls: 'bg-blue-500/15 text-blue-400',         icon: Loader2      },
  done:        { label: 'Done',        cls: 'bg-emerald-500/15 text-emerald-400',   icon: CheckCircle2 },
}
const NEXT_STATUS = { todo: 'in_progress', in_progress: 'done', done: 'todo' }

function sectionIcon(title = '') {
  const t = title.toLowerCase()
  if (t.includes('summary') || t.includes('overview'))  return FileText
  if (t.includes('participant') || t.includes('attend')) return Users
  if (t.includes('decision'))                            return CheckCircle2
  if (t.includes('action') || t.includes('task'))        return TableProperties
  if (t.includes('agenda'))                              return Hash
  if (t.includes('duration') || t.includes('time'))     return Clock
  return AlignLeft
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ user, size = 7 }) {
  const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const initials = user ? (user.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?'
  if (user?.avatar_url) {
    return <img src={`${BASE}${user.avatar_url}`} alt="" className={`w-${size} h-${size} rounded-full object-cover`} />
  }
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${
      user ? 'bg-gradient-to-br from-violet-500 to-indigo-600' : 'bg-white/[0.08]'
    }`}>
      {user ? initials : <UserIcon size={11} style={{ color: 'var(--text-3)' }} />}
    </div>
  )
}

// ── Assignee picker ───────────────────────────────────────────────────────────

function AssigneePicker({ task, members, onUpdated }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function assign(userId) {
    setSaving(true)
    setOpen(false)
    try {
      const updated = await api.patch(`/tasks/${task.id}`, { assignee_id: userId ?? '' })
      onUpdated(updated)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={saving}
        className="flex items-center gap-1.5 text-xs transition-colors"
        style={{ color: 'var(--text-3)' }}
      >
        <Avatar user={task.assignee} size={5} />
        <span className="max-w-[110px] truncate">{task.assignee?.name ?? 'Unassigned'}</span>
        {saving ? <Loader2 size={10} className="animate-spin" /> : <ChevronDown size={10} />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 top-full mt-1 z-20 w-52 rounded-xl shadow-2xl border py-1 overflow-hidden"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
            >
              <button
                onClick={() => assign(null)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-white/[0.04]"
                style={{ color: 'var(--text-2)' }}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
                  <UserIcon size={10} style={{ color: 'var(--text-3)' }} />
                </div>
                Unassigned
              </button>
              {members.map(m => (
                <button
                  key={m.user_id}
                  onClick={() => assign(m.user_id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                    task.assignee?.id === m.user_id ? 'bg-violet-500/10 text-violet-300' : 'hover:bg-white/[0.04]'
                  }`}
                  style={{ color: task.assignee?.id === m.user_id ? undefined : 'var(--text-2)' }}
                >
                  <Avatar user={{ name: m.name, avatar_url: m.avatar_url }} size={5} />
                  <span className="truncate flex-1 text-left">{m.name}</span>
                  {task.assignee?.id === m.user_id && <CheckCircle2 size={11} className="text-violet-400 shrink-0" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ task, members, canManage, onUpdated }) {
  const [cycling, setCycling] = useState(false)
  const meta = STATUS_META[task.status] || STATUS_META.todo
  const Icon = meta.icon

  async function cycleStatus() {
    setCycling(true)
    try {
      const updated = await api.patch(`/tasks/${task.id}`, { status: NEXT_STATUS[task.status] })
      onUpdated(updated)
    } finally {
      setCycling(false)
    }
  }

  return (
    <tr className="group transition-colors hover:bg-white/[0.03]" style={{ borderBottom: '1px solid var(--card-border)' }}>
      <td className="px-5 py-3.5">
        <div className="flex items-start gap-3">
          <button
            onClick={cycleStatus}
            disabled={cycling}
            title="Cycle status"
            className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110 ${meta.cls}`}
          >
            {cycling
              ? <Loader2 size={11} className="animate-spin" />
              : <Icon size={11} className={task.status === 'in_progress' ? 'animate-spin' : ''} />
            }
          </button>
          <span className={`text-sm leading-snug ${task.status === 'done' ? 'line-through opacity-40' : ''}`}
            style={{ color: 'var(--text-1)' }}>
            {task.title}
          </span>
        </div>
      </td>
      <td className="px-5 py-3.5 w-40">
        {canManage ? (
          <AssigneePicker task={task} members={members} onUpdated={onUpdated} />
        ) : (
          <div className="flex items-center gap-1.5">
            <Avatar user={task.assignee} size={5} />
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>{task.assignee?.name ?? 'Unassigned'}</span>
          </div>
        )}
      </td>
      <td className="px-5 py-3.5 w-36">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${meta.cls}`}>
          <Icon size={10} className={task.status === 'in_progress' ? 'animate-spin' : ''} />
          {meta.label}
        </span>
      </td>
      <td className="px-5 py-3.5 w-36">
        {task.deadline ? (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-3)' }}>
            <CalendarDays size={11} />
            {task.deadline}
          </span>
        ) : (
          <span className="text-xs opacity-30" style={{ color: 'var(--text-3)' }}>—</span>
        )}
      </td>
    </tr>
  )
}

function TaskCard({ task, members, canManage, onUpdated }) {
  const [cycling, setCycling] = useState(false)
  const meta = STATUS_META[task.status] || STATUS_META.todo
  const Icon = meta.icon

  async function cycleStatus() {
    setCycling(true)
    try {
      const updated = await api.patch(`/tasks/${task.id}`, { status: NEXT_STATUS[task.status] })
      onUpdated(updated)
    } finally {
      setCycling(false)
    }
  }

  return (
    <div className="rounded-2xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-start gap-3">
        <button
          onClick={cycleStatus}
          disabled={cycling}
          title="Cycle status"
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all ${meta.cls}`}
        >
          {cycling
            ? <Loader2 size={13} className="animate-spin" />
            : <Icon size={13} className={task.status === 'in_progress' ? 'animate-spin' : ''} />}
        </button>
        <p className={`min-w-0 flex-1 text-sm leading-relaxed ${task.status === 'done' ? 'line-through opacity-40' : ''}`}
          style={{ color: 'var(--text-1)' }}>
          {task.title}
        </p>
      </div>

      <div className="mt-4 grid gap-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Assignee</span>
          {canManage ? (
            <AssigneePicker task={task} members={members} onUpdated={onUpdated} />
          ) : (
            <span style={{ color: 'var(--text-2)' }}>{task.assignee?.name ?? 'Unassigned'}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Status</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}>
            <Icon size={10} className={task.status === 'in_progress' ? 'animate-spin' : ''} />
            {meta.label}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Deadline</span>
          {task.deadline ? (
            <span className="flex items-center gap-1.5" style={{ color: 'var(--text-2)' }}>
              <CalendarDays size={11} />
              {task.deadline}
            </span>
          ) : (
            <span className="opacity-30" style={{ color: 'var(--text-3)' }}>—</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── CSV export ────────────────────────────────────────────────────────────────

function downloadCSV(tasks, meetingTitle) {
  const headers = ['Task', 'Owner (from minutes)', 'Assigned To', 'Assignee Email', 'Status', 'Deadline']
  const statusLabel = { todo: 'To-do', in_progress: 'In Progress', done: 'Done' }
  const rows = tasks.map(t => [
    `"${(t.title        || '').replace(/"/g, '""')}"`,
    `"${(t.owner_name   || '').replace(/"/g, '""')}"`,
    `"${(t.assignee?.name  || 'Unassigned').replace(/"/g, '""')}"`,
    `"${(t.assignee?.email || '').replace(/"/g, '""')}"`,
    statusLabel[t.status] || t.status,
    `"${(t.deadline || '').replace(/"/g, '""')}"`,
  ])
  const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${(meetingTitle || 'tasks').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-tasks.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Pagination ────────────────────────────────────────────────────────────────

const TASKS_PAGE_SIZE = 10

function TasksPagination({ page, totalPages, total, onPage }) {
  if (totalPages <= 1) return null

  const pages = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-between py-3 px-1 mt-2">
      <span className="text-xs" style={{ color: 'var(--text-3)' }}>
        Page <span className="font-medium" style={{ color: 'var(--text-2)' }}>{page}</span> of{' '}
        <span className="font-medium" style={{ color: 'var(--text-2)' }}>{totalPages}</span>
        <span className="ml-1 opacity-40"> · {total} tasks</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 transition-colors hover:bg-white/[0.06]"
          style={{ color: 'var(--text-3)' }}
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} className="px-1 text-xs opacity-40" style={{ color: 'var(--text-3)' }}>…</span>
            : <button
                key={p}
                onClick={() => onPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                  page === p
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                    : 'hover:bg-white/[0.06]'
                }`}
                style={{ color: page === p ? undefined : 'var(--text-3)' }}
              >
                {p}
              </button>
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 transition-colors hover:bg-white/[0.06]"
          style={{ color: 'var(--text-3)' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Tasks tab ─────────────────────────────────────────────────────────────────

function TasksTab({ jobId, canManage, meetingTitle }) {
  const [tasks,   setTasks]   = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const { activeWorkspace } = useWorkspace()

  useEffect(() => {
    api.get(`/tasks/meeting/${jobId}`)
      .then(setTasks).catch(() => {}).finally(() => setLoading(false))
  }, [jobId])

  useEffect(() => {
    if (!activeWorkspace?.id) return
    api.get(`/workspaces/${activeWorkspace.id}/members`)
      .then(data => {
        const normalised = data
          .filter(m => m.status === 'active')
          .map(m => ({ ...m, user_id: m.id === 'owner' ? activeWorkspace.owner_id : m.user_id }))
          .filter(m => m.user_id)
        setMembers(normalised)
      })
      .catch(() => {})
  }, [activeWorkspace?.id, activeWorkspace?.owner_id])

  function handleUpdated(updated) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-2 text-sm" style={{ color: 'var(--text-3)' }}>
      <Loader2 size={16} className="animate-spin" /> Loading tasks…
    </div>
  )

  if (!tasks.length) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl border-2 border-dashed flex items-center justify-center mb-3"
        style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)' }}>
        <TableProperties size={22} style={{ color: 'var(--text-3)' }} />
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>No tasks found for this meeting</p>
      <p className="text-xs" style={{ color: 'var(--text-3)' }}>Action items are extracted automatically from the minutes.</p>
    </div>
  )

  const done       = tasks.filter(t => t.status === 'done').length
  const total      = tasks.length
  const totalPages = Math.max(1, Math.ceil(total / TASKS_PAGE_SIZE))
  const paginated  = tasks.slice((page - 1) * TASKS_PAGE_SIZE, page * TASKS_PAGE_SIZE)

  return (
    <div className="py-4 sm:py-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{total} tasks</span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-28 overflow-hidden rounded-full sm:w-40" style={{ background: 'var(--input-bg)' }}>
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${total ? (done / total) * 100 : 0}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>{done}/{total} done</span>
          </div>
        </div>
        <button
          onClick={() => downloadCSV(tasks, meetingTitle)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all hover:bg-white/[0.04]"
          style={{ color: 'var(--text-2)', borderColor: 'var(--card-border)' }}
        >
          <TableProperties size={12} />
          Export CSV
        </button>
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border md:block"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
        <table className="min-w-[720px] w-full text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--input-bg)' }}>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Task</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide w-40" style={{ color: 'var(--text-3)' }}>Assignee</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide w-36" style={{ color: 'var(--text-3)' }}>Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide w-36" style={{ color: 'var(--text-3)' }}>Deadline</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(task => (
              <TaskRow key={task.id} task={task} members={members} canManage={canManage} onUpdated={handleUpdated} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {paginated.map(task => (
          <TaskCard key={task.id} task={task} members={members} canManage={canManage} onUpdated={handleUpdated} />
        ))}
      </div>

      <TasksPagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
    </div>
  )
}

// ── Priority / status badges ──────────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const cfg = {
    high:   { cls: 'bg-rose-500/15 text-rose-400',   label: 'High'   },
    medium: { cls: 'bg-amber-500/15 text-amber-400',  label: 'Medium' },
    low:    { cls: 'bg-white/[0.06] text-slate-400',  label: 'Low'    },
  }[priority] ?? { cls: 'bg-white/[0.06] text-slate-400', label: priority }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg = {
    answered:   { cls: 'bg-emerald-500/15 text-emerald-400', label: 'Answered'   },
    unresolved: { cls: 'bg-rose-500/15 text-rose-400',       label: 'Unresolved' },
    deferred:   { cls: 'bg-amber-500/15 text-amber-400',     label: 'Deferred'   },
  }[status] ?? { cls: 'bg-white/[0.06] text-slate-400', label: status }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, accent = 'violet', children, delay = 0 }) {
  const colors = {
    violet: { bg: 'rgba(139,92,246,0.12)',  text: 'text-violet-400' },
    indigo: { bg: 'rgba(99,102,241,0.12)',  text: 'text-indigo-400' },
    teal:   { bg: 'rgba(20,184,166,0.12)',  text: 'text-teal-400'   },
    rose:   { bg: 'rgba(244,63,94,0.12)',   text: 'text-rose-400'   },
    amber:  { bg: 'rgba(245,158,11,0.12)',  text: 'text-amber-400'  },
  }[accent] ?? { bg: 'rgba(139,92,246,0.12)', text: 'text-violet-400' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className="rounded-lg border overflow-hidden shadow-sm"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--card-border)', background: 'var(--input-bg)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: colors.bg }}>
          <Icon size={14} className={colors.text} />
        </div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </motion.div>
  )
}

// ── Minutes tab ───────────────────────────────────────────────────────────────

function MinutesTab({ minutes, copied, onCopy }) {
  if (!minutes?.sections?.length && !minutes?.overview) return (
    <div className="py-20 text-center text-sm" style={{ color: 'var(--text-3)' }}>No content available.</div>
  )

  return (
    <div className="py-5 space-y-4">
      {minutes.overview && (
        <SectionCard icon={FileText} title="Overview" accent="violet" delay={0}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{minutes.overview}</p>
        </SectionCard>
      )}

      {minutes.keyDecisions?.length > 0 && (
        <SectionCard icon={Lightbulb} title="Key Decisions" accent="indigo" delay={0.04}>
          <ul className="space-y-3">
            {minutes.keyDecisions.map((d, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1 w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-indigo-400">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{d.decision}</p>
                  {d.made_by && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{d.made_by}</p>}
                  {d.context && <p className="text-xs mt-1 italic" style={{ color: 'var(--text-3)' }}>{d.context}</p>}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {minutes.sections?.map((section, i) => {
        const Icon = sectionIcon(section.title)
        return (
          <SectionCard key={i} icon={Icon} title={section.title} accent="violet" delay={0.06 + i * 0.04}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4" style={{ color: 'var(--text-2)' }}>
              {section.summary || section.content}
            </p>
            {section.key_points?.length > 0 && (
              <ul className="space-y-2 border-t pt-4" style={{ borderColor: 'var(--card-border)' }}>
                {section.key_points.map((point, j) => (
                  <li key={j} className="flex gap-2.5 text-sm" style={{ color: 'var(--text-2)' }}>
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )
      })}

      {minutes.actionItems?.length > 0 && (
        <SectionCard icon={TableProperties} title="Action Items" accent="teal" delay={0.12}>
          <div className="space-y-2">
            {minutes.actionItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--card-border)' }}>
                <CheckCircle2 size={14} className="text-teal-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'var(--text-1)' }}>{item.task}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {item.owner && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
                        <UserIcon size={10} /> {item.owner}
                      </span>
                    )}
                    {item.deadline && item.deadline !== 'TBD' && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
                        <CalendarDays size={10} /> {item.deadline}
                      </span>
                    )}
                    {item.priority && <PriorityBadge priority={item.priority} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-3 italic" style={{ color: 'var(--text-3)' }}>
            Track and assign these in the Tasks tab →
          </p>
        </SectionCard>
      )}

      {minutes.speakerSummaries?.length > 0 && (
        <SectionCard icon={Users} title="Speaker Summaries" accent="indigo" delay={0.16}>
          <div className="space-y-5">
            {minutes.speakerSummaries.map((spk, i) => (
              <div key={i} className={i > 0 ? 'pt-5 border-t' : ''} style={{ borderColor: 'var(--card-border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {(spk.speaker || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{spk.speaker}</p>
                    {spk.role && <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{spk.role}</p>}
                  </div>
                </div>
                {spk.key_contributions?.length > 0 && (
                  <ul className="space-y-1.5 pl-9">
                    {spk.key_contributions.map((c, j) => (
                      <li key={j} className="flex gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {minutes.questionsRaised?.length > 0 && (
        <SectionCard icon={HelpCircle} title="Questions Raised" accent="amber" delay={0.20}>
          <ul className="space-y-4">
            {minutes.questionsRaised.map((q, i) => (
              <li key={i} className={i > 0 ? 'pt-4 border-t' : ''} style={{ borderColor: 'var(--card-border)' }}>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{q.question}</p>
                  <StatusBadge status={q.status} />
                </div>
                {q.asked_by && <p className="text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>Asked by {q.asked_by}</p>}
                {q.answer_summary && <p className="text-sm italic" style={{ color: 'var(--text-2)' }}>{q.answer_summary}</p>}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {minutes.nextSteps?.length > 0 && (
        <SectionCard icon={Target} title="Next Steps" accent="teal" delay={0.24}>
          <ul className="space-y-2">
            {minutes.nextSteps.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm" style={{ color: 'var(--text-2)' }}>
                <ArrowRight size={14} className="text-teal-400 mt-0.5 shrink-0" />
                {step}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}

// ── Speaker Names Modal ───────────────────────────────────────────────────────

function parseTimecode(value = '') {
  const parts = value.split(':').map(Number)
  if (parts.some(n => Number.isNaN(n))) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

function extractLeadingTime(line = '') {
  const match = line.match(/^\s*(?:\[|\()?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?)(?:\]|\))?\s*(?:[-–—]\s*)?/)
  if (!match) return { time: null, line }
  return { time: parseTimecode(match[1]), line: line.slice(match[0].length).trim() }
}

function parseTranscript(transcript = '') {
  const lines = transcript.split(/\n+/).map(line => line.trim()).filter(Boolean)
  const entries: Array<{ speaker: string; text: string; startTime?: number | null }> = []

  lines.forEach(line => {
    let { time, line: cleanLine } = extractLeadingTime(line)
    let match = cleanLine.match(/^([^:]{1,48})\s+\[?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?)\]?:\s*(.+)$/)
    if (match) {
      time = parseTimecode(match[2])
      entries.push({ speaker: match[1].trim(), text: match[3].trim(), startTime: time })
      return
    }

    match = cleanLine.match(/^([^:]{1,48}):\s*(.+)$/)
    if (match) {
      entries.push({ speaker: match[1].trim(), text: match[2].trim(), startTime: time })
      return
    }

    const last = entries[entries.length - 1]
    if (last) last.text = `${last.text} ${cleanLine}`
    else entries.push({ speaker: 'Transcript', text: cleanLine, startTime: time })
  })

  return entries
}

function splitSentences(text = '') {
  const trimmed = text.trim()
  if (!trimmed) return []
  const matches = trimmed.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g)
  const sentences = (matches || [trimmed]).map(s => s.trim()).filter(Boolean)
  return sentences.length ? sentences : [trimmed]
}

function formatPlayerTime(seconds = 0) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function segmentsToTranscriptEntries(segments: any[] = []) {
  return segments
    .filter(segment => segment?.text)
    .map(segment => ({
      speaker: segment.speaker || 'Speaker',
      text: segment.text,
      startTime: Number.isFinite(Number(segment.start)) ? Number(segment.start) : null,
      endTime: Number.isFinite(Number(segment.end)) ? Number(segment.end) : null,
    }))
}

const SPEAKER_PALETTE = [
  { bg: 'rgba(52,211,153,0.15)',  text: '#34d399' },
  { bg: 'rgba(96,165,250,0.15)',  text: '#60a5fa' },
  { bg: 'rgba(251,146,60,0.15)',  text: '#fb923c' },
  { bg: 'rgba(232,121,249,0.15)', text: '#e879f9' },
  { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24' },
  { bg: 'rgba(167,139,250,0.15)', text: '#a78bfa' },
  { bg: 'rgba(244,114,182,0.15)', text: '#f472b6' },
  { bg: 'rgba(56,189,248,0.15)',  text: '#38bdf8' },
]

function speakerColor(speaker: string, allSpeakers: string[]) {
  const idx = allSpeakers.indexOf(speaker)
  return SPEAKER_PALETTE[(idx < 0 ? 0 : idx) % SPEAKER_PALETTE.length]
}

function TranscriptPanel({
  transcript,
  segments,
  jobId,
  onNameSpeakers,
  onSaved,
  currentTime = 0,
}: {
  transcript?: string
  segments?: any[]
  jobId?: string
  onNameSpeakers: () => void
  onSaved: () => void
  currentTime?: number
}) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(transcript || '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const hasTimedSegments = Array.isArray(segments) && segments.length > 0
  const entries = hasTimedSegments ? segmentsToTranscriptEntries(segments) : parseTranscript(transcript || '')
  const allSpeakers = [...new Set(entries.map(e => e.speaker))]
  let cursor = 0
  const indexedEntries = entries.map((item, index) => {
    const charStart = cursor
    cursor += item.text.length + 1
    return { ...item, index, charStart }
  })
  const totalTranscriptChars = Math.max(cursor, 1)
  const activeEntryRef = useRef<HTMLDivElement | null>(null)
  const activeEntryIndex = hasTimedSegments
    ? indexedEntries.reduce((found, e) => (e.startTime != null && e.startTime <= currentTime ? e.index : found), -1)
    : -1

  useEffect(() => {
    if (activeEntryIndex >= 0) {
      activeEntryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeEntryIndex])

  const filtered = query.trim()
    ? indexedEntries.filter(item =>
        `${item.speaker} ${item.text}`.toLowerCase().includes(query.trim().toLowerCase())
      )
    : indexedEntries

  useEffect(() => {
    if (!editing) setDraft(transcript || '')
  }, [transcript, editing])

  function playFrom(item, sentenceOffset = 0) {
    const nextTimed = indexedEntries.slice(item.index + 1).find(entry => entry.startTime != null)
    let time = item.startTime

    if (time != null && item.endTime != null && item.endTime > time) {
      const turnRatio = Math.max(0, Math.min(sentenceOffset / Math.max(item.text.length, 1), 1))
      time = time + ((item.endTime - time) * turnRatio)
    } else if (time != null && nextTimed?.startTime != null && nextTimed.startTime > time) {
      const turnRatio = Math.max(0, Math.min(sentenceOffset / Math.max(item.text.length, 1), 1))
      time = time + ((nextTimed.startTime - time) * turnRatio)
    }

    const ratio = Math.max(0, Math.min((item.charStart + sentenceOffset) / totalTranscriptChars, 1))
    window.dispatchEvent(new CustomEvent('minuteai:seek-recording', {
      detail: { time, ratio },
    }))
  }

  async function saveTranscript() {
    if (!jobId) return
    setSaving(true)
    setSaveError('')
    try {
      await api.patch(`/results/${jobId}/transcript`, { transcript: draft })
      setEditing(false)
      onSaved()
    } catch (err) {
      setSaveError(err?.message || 'Could not save transcript.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="shrink-0 border-b px-4 py-3" style={{ borderColor: 'var(--divider)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Transcript</p>
            <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              {entries.length
                ? `${entries.length} speaker turns${hasTimedSegments ? ' with audio sync' : ''}`
                : 'No transcript text yet'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={onNameSpeakers}
              className="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.04]"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)' }}
            >
              Name speakers
            </button>
            <button
              onClick={() => setEditing(v => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.04]"
              style={{ borderColor: 'var(--card-border)', color: editing ? 'rgb(139,92,246)' : 'var(--text-2)' }}
            >
              <PencilLine size={12} />
              {editing ? 'Preview' : 'Edit'}
            </button>
          </div>
        </div>
        {editing ? (
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              Edit speaker labels or text, then save. Audio sync uses saved timestamps when available.
            </p>
            <button
              onClick={saveTranscript}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save
            </button>
          </div>
        ) : (
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Find in transcript"
              className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none transition focus:ring-1 focus:ring-violet-500/40"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-1)' }}
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {editing ? (
          <div className="h-full">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="h-full min-h-[320px] w-full resize-none rounded-xl border p-3 text-sm leading-relaxed outline-none transition focus:ring-1 focus:ring-violet-500/40"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-1)' }}
              placeholder="Speaker 1: Paste or edit transcript text here..."
            />
            {saveError && <p className="mt-2 text-xs text-red-400">{saveError}</p>}
          </div>
        ) : !entries.length ? (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
            <MessageSquare size={24} style={{ color: 'var(--text-3)' }} />
            <p className="mt-3 text-sm font-medium" style={{ color: 'var(--text-2)' }}>Transcript unavailable</p>
            <p className="mt-1 max-w-xs text-xs" style={{ color: 'var(--text-3)' }}>
              The minutes are ready, but this meeting does not have transcript text attached.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map((item) => {
              const sentences = splitSentences(item.text)
              let sentenceCursor = 0
              const clr = speakerColor(item.speaker, allSpeakers)
              return (
                <div
                  key={`${item.speaker}-${item.index}`}
                  ref={item.index === activeEntryIndex ? activeEntryRef : undefined}
                  className={`flex gap-3 rounded-lg px-2 py-1.5 transition-all ${item.index === activeEntryIndex ? 'border-l-2 border-violet-500 bg-violet-500/[0.07] pl-1.5' : 'hover:bg-white/[0.03]'}`}
                >
                  <div
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ background: clr.bg, color: clr.text }}
                  >
                    {item.speaker.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="text-xs font-semibold" style={{ color: clr.text }}>{item.speaker}</p>
                      {item.startTime != null && (
                        <button
                          onClick={() => playFrom(item, 0)}
                          className="text-[11px] font-medium transition-colors hover:underline"
                          style={{ color: 'rgb(139,92,246)' }}
                          title="Jump to this point"
                        >
                          {formatPlayerTime(item.startTime)}
                        </button>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>
                      {sentences.map((sentence, sentenceIndex) => (
                        (() => {
                          const offset = sentenceCursor
                          sentenceCursor += sentence.length + 1
                          return (
                            <button
                              type="button"
                              key={`${item.index}-${sentenceIndex}`}
                              onClick={() => playFrom(item, offset)}
                              className="inline rounded px-0.5 text-left transition-colors hover:bg-violet-500/10 hover:text-violet-400 cursor-pointer"
                              style={{ borderRadius: 4, color: 'inherit' }}
                              title="Play from here"
                            >
                              {sentence}{sentenceIndex < sentences.length - 1 ? ' ' : ''}
                            </button>
                          )
                        })()
                      ))}
                    </p>
                  </div>
                </div>
              )
            })}
            {!filtered.length && (
              <p className="py-12 text-center text-sm" style={{ color: 'var(--text-3)' }}>No transcript matches.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Steph tab ─────────────────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  'What were the key decisions made?',
  'What are the next steps?',
  'Who is responsible for what?',
]

function StephTab({ transcript }: { transcript?: string }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [input, setInput]   = useState('')
  const [thinking, setThinking] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function send(question?: string) {
    const q = (question ?? input).trim()
    if (!q || thinking) return
    setInput('')
    const next = [...messages, { role: 'user' as const, content: q }]
    setMessages(next)
    setThinking(true)
    try {
      const data = await api.post('/ai/live/chat', {
        transcript: transcript || '',
        question: q,
        history: messages,
      })
      setMessages([...next, { role: 'assistant', content: data.answer }])
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-10">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center mb-3">
              <MessageSquare size={22} className="text-violet-400" />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Talk to Steph</p>
            <p className="mt-1 max-w-xs text-xs" style={{ color: 'var(--text-3)' }}>
              Ask Steph anything about this meeting — decisions, action items, who said what.
            </p>
            <div className="mt-5 flex flex-col gap-2 w-full max-w-xs">
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-xl border px-3 py-2.5 text-left text-xs transition-colors hover:bg-white/[0.04]"
                  style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold ${
                msg.role === 'user'
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
              }`}>
                {msg.role === 'user' ? 'You' : 'S'}
              </div>
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'
                }`}
                style={{
                  background: msg.role === 'user' ? 'rgba(139,92,246,0.15)' : 'var(--input-bg)',
                  color: 'var(--text-1)',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {thinking && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 text-[9px] font-bold text-white">S</div>
            <div className="rounded-2xl rounded-tl-sm px-3.5 py-3" style={{ background: 'var(--input-bg)' }}>
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t p-3" style={{ borderColor: 'var(--divider)' }}>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask Steph about this meeting…"
            rows={1}
            className="flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-1 focus:ring-violet-500/40"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-1)' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || thinking}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white disabled:opacity-40 transition-all hover:from-violet-500 hover:to-indigo-500"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function RecordingDock({ hasAudio, audioUrl, onDownload, onTimeUpdate }: {
  hasAudio?: boolean; audioUrl?: string; onDownload: () => void; onTimeUpdate?: (t: number) => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    function handleSeek(event: Event) {
      const audio = audioRef.current
      if (!audio) return
      const detail = (event as CustomEvent).detail || {}
      const knownDuration = duration || audio.duration || 0
      const target = Number.isFinite(detail.time)
        ? detail.time
        : knownDuration * Math.max(0, Math.min(Number(detail.ratio) || 0, 1))
      audio.currentTime = Math.max(0, Math.min(target, knownDuration || target))
      audio.play().catch(() => {})
      setCurrentTime(audio.currentTime)
    }
    function handleKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (e.code === 'Space') { e.preventDefault(); togglePlay() }
      if (e.code === 'ArrowLeft') jump(-5)
      if (e.code === 'ArrowRight') jump(5)
    }
    window.addEventListener('minuteai:seek-recording', handleSeek)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('minuteai:seek-recording', handleSeek)
      window.removeEventListener('keydown', handleKey)
    }
  }, [duration])

  if (!hasAudio || !audioUrl) return null

  function seekTo(value: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setCurrentTime(value)
  }

  function jump(delta: number) {
    const audio = audioRef.current
    if (!audio) return
    seekTo(Math.min(Math.max(audio.currentTime + delta, 0), duration || audio.duration || 0))
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play()
    else audio.pause()
  }

  function cycleSpeed() {
    const SPEEDS = [1, 1.25, 1.5, 1.75, 2]
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  function seekFromClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    seekTo(((e.clientX - rect.left) / rect.width) * duration)
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="shrink-0 border-t" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--divider)' }}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={e => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={e => { const t = e.currentTarget.currentTime || 0; setCurrentTime(t); onTimeUpdate?.(t) }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      {/* clickable progress bar */}
      <div
        role="progressbar"
        aria-label="Playback progress"
        className="group relative h-1.5 w-full cursor-pointer"
        style={{ background: 'var(--input-bg)' }}
        onClick={seekFromClick}
      >
        <div
          className="pointer-events-none h-full bg-gradient-to-r from-violet-600 to-indigo-500"
          style={{ width: `${progress}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-violet-500 opacity-0 shadow transition-opacity group-hover:opacity-100"
          style={{ left: `calc(${progress}% - 7px)` }}
        />
      </div>

      {/* controls row */}
      <div className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:gap-3">
        {/* time */}
        <div className="flex shrink-0 items-center gap-1 text-xs tabular-nums" style={{ color: 'var(--text-3)' }}>
          <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{formatPlayerTime(currentTime)}</span>
          <span>/</span>
          <span>{formatPlayerTime(duration)}</span>
        </div>

        {/* playback controls */}
        <div className="flex flex-1 items-center justify-center gap-1 sm:gap-2">
          <button
            onClick={cycleSpeed}
            className="min-w-[36px] rounded-lg px-2 py-1.5 text-[11px] font-semibold tabular-nums transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--text-2)' }}
            title="Playback speed"
          >
            {speed}x
          </button>
          <button
            onClick={() => jump(-10)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--text-2)' }}
            title="Back 10 seconds (←)"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 transition-transform hover:scale-105 active:scale-95"
            title={playing ? 'Pause (Space)' : 'Play (Space)'}
          >
            {playing
              ? <Pause size={18} fill="currentColor" />
              : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>
          <button
            onClick={() => jump(10)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--text-2)' }}
            title="Forward 10 seconds (→)"
          >
            <RotateCw size={15} />
          </button>
          <button
            onClick={onDownload}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--text-2)' }}
            title="Download recording"
          >
            <Download size={15} />
          </button>
        </div>

        {/* keyboard hint — hidden on mobile */}
        <p className="hidden shrink-0 text-[10px] sm:block" style={{ color: 'var(--text-3)' }}>
          Space · ← →
        </p>
      </div>
    </div>
  )
}

function SpeakerNamesModal({ jobId, onClose, onApplied }) {
  const [speakers,      setSpeakers]      = useState<Array<{ label: string; samples: string[] }>>([])
  const [nameMap,       setNameMap]       = useState<Record<string, string>>({})
  const [suggestions,   setSuggestions]   = useState<Record<string, { name: string; confidence: number; source: string }>>({})
  const [attendees,     setAttendees]     = useState<string[]>([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get(`/results/${jobId}/speakers`),
      api.get(`/results/${jobId}/speaker-suggestions`).catch(() => ({ suggestions: {}, attendees: [] })),
    ]).then(([spkData, suggestData]) => {
      const spks = spkData.speakers || []
      setSpeakers(spks)
      setAttendees(suggestData.attendees || [])
      const suggs: Record<string, { name: string; confidence: number; source: string }> = suggestData.suggestions || {}
      setSuggestions(suggs)
      // Pre-fill nameMap: existing speaker_map takes priority, then suggestions with confidence >= 0.50
      const base: Record<string, string> = { ...(spkData.speaker_map || {}) }
      for (const [label, sugg] of Object.entries(suggs)) {
        if (!base[label] && sugg.confidence >= 0.50) {
          base[label] = sugg.name
        }
      }
      setNameMap(base)
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false))
  }, [jobId])

  async function handleApply() {
    setSaving(true); setError(null)
    try { await api.post(`/results/${jobId}/speakers/apply`, { speaker_map: nameMap }); await onApplied(); onClose() }
    catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  // Attendee pills — exclude anyone already assigned to a different speaker
  function attendeePillsFor(label: string) {
    const usedElsewhere = new Set(
      Object.entries(nameMap)
        .filter(([k, v]) => k !== label && v)
        .map(([, v]) => v)
    )
    return attendees.filter(a => !usedElsewhere.has(a))
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }} transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Name Speakers</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                {attendees.length > 0
                  ? 'Select from attendees or type a name — Steph will remember for next time.'
                  : 'Assign real names — Steph will remember for next time.'}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.06]" style={{ color: 'var(--text-3)' }}>
              <X size={14} />
            </button>
          </div>

          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-sm" style={{ color: 'var(--text-3)' }}>
                <Loader2 size={15} className="animate-spin" /> Loading speakers…
              </div>
            ) : speakers.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: 'var(--text-3)' }}>No speakers detected in this transcript.</p>
            ) : (
              <div className="space-y-4">
                {speakers.map(spk => {
                  const sugg = suggestions[spk.label]
                  const isRemembered = sugg?.source === 'voice_profile'
                  const isProfileMatch = sugg?.source === 'attendee_profile'
                  const pills = attendeePillsFor(spk.label)
                  return (
                    <div key={spk.label} className="rounded-2xl border p-4" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)' }}>
                      {/* Speaker header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {spk.label.replace('Speaker ', '').trim().charAt(0)}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{spk.label}</span>
                        {isRemembered && (
                          <span className="ml-auto text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                            ◉ Remembered
                          </span>
                        )}
                        {isProfileMatch && !isRemembered && (
                          <span className="ml-auto text-[9px] font-bold text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-full">
                            Known attendee
                          </span>
                        )}
                      </div>

                      {/* Sample quotes */}
                      {spk.samples.length > 0 && (
                        <div className="mb-3 space-y-1.5">
                          {spk.samples.map((s, i) => (
                            <p key={i} className="text-[11px] italic leading-relaxed pl-2 border-l-2 border-violet-500/30" style={{ color: 'var(--text-3)' }}>
                              "{s}"
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Attendee quick-select pills */}
                      {pills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {pills.map(a => (
                            <button
                              key={a}
                              onClick={() => setNameMap(m => ({ ...m, [spk.label]: a }))}
                              className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all ${
                                nameMap[spk.label] === a
                                  ? 'bg-violet-600/25 border-violet-500/50 text-violet-300'
                                  : 'border-white/10 hover:border-violet-500/30 hover:bg-violet-600/10'
                              }`}
                              style={{ color: nameMap[spk.label] === a ? undefined : 'var(--text-2)' }}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Free-text input */}
                      <input
                        type="text"
                        placeholder={`Type a name for ${spk.label}…`}
                        value={nameMap[spk.label] || ''}
                        onChange={e => setNameMap(m => ({ ...m, [spk.label]: e.target.value }))}
                        className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition"
                        style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-1)' }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
          </div>

          <div className="px-6 py-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--card-border)', background: 'var(--input-bg)' }}>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Leave blank to keep the original label.</p>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-xl transition-colors hover:bg-white/[0.04]" style={{ color: 'var(--text-2)' }}>Cancel</button>
              <motion.button
                onClick={handleApply}
                disabled={saving || loading || speakers.length === 0}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                Save & Remember
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── Template Picker Modal ─────────────────────────────────────────────────────

const EXPORT_TEMPLATES = [
  { id: 'standard',  name: 'Standard',  desc: 'Classic numbered sections with action items table', icon: FileText,  gradient: 'from-violet-500 to-indigo-600', ring: 'ring-violet-400', headerBg: '#1e104f', preview: { heading: '#3c2878', tag: '#7c3aed', tagBg: '#f5f3ff' } },
  { id: 'modern',    name: 'Modern',    desc: 'Clean teal design, active direct language',          icon: Zap,       gradient: 'from-teal-500 to-emerald-600',  ring: 'ring-teal-400',   headerBg: '#00695c', preview: { heading: '#00897b', tag: '#009688', tagBg: '#e6f7f5' } },
  { id: 'executive', name: 'Executive', desc: 'Action items first, concise summaries for leadership',icon: BarChart2, gradient: 'from-blue-700 to-blue-900',    ring: 'ring-blue-500',   headerBg: '#0a2463', preview: { heading: '#1e40af', tag: '#1d4ed8', tagBg: '#ebf0ff' } },
  { id: 'minimal',   name: 'Minimal',   desc: 'Understated grey layout, maximum whitespace',        icon: Minimize2, gradient: 'from-gray-500 to-gray-700',    ring: 'ring-gray-400',   headerBg: '#282828', preview: { heading: '#505050', tag: '#6b7280', tagBg: '#f5f5f5' } },
]

function DocPreview({ tpl }) {
  return (
    <div className="w-full rounded-lg overflow-hidden border border-white/[0.08] shadow-sm select-none pointer-events-none">
      <div className="px-3 pt-3 pb-2" style={{ backgroundColor: tpl.headerBg }}>
        <div className="h-2 w-16 rounded-full bg-white/80 mb-1.5" />
        <div className="h-1 w-10 rounded-full bg-white/40" />
      </div>
      <div className="px-3 py-2 space-y-2" style={{ background: 'var(--card-bg)' }}>
        {[1, 2, 3].map(i => (
          <div key={i}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: tpl.preview.heading }} />
              <div className="h-1.5 rounded-full" style={{ width: `${40 + i * 10}%`, backgroundColor: tpl.preview.heading }} />
            </div>
            <div className="space-y-0.5 pl-3.5">
              <div className="h-1 rounded-full bg-white/[0.06]" style={{ width: '90%' }} />
              <div className="h-1 rounded-full bg-white/[0.06]" style={{ width: '75%' }} />
            </div>
          </div>
        ))}
        <div className="flex items-center gap-1 mt-1">
          {[8, 6].map((w, i) => (
            <div key={i} className="h-4 rounded px-1.5 flex items-center" style={{ backgroundColor: tpl.preview.tagBg }}>
              <div className={`h-1 w-${w} rounded-full`} style={{ backgroundColor: tpl.preview.tag }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TemplatePickerModal({ format, onClose, onDownload }) {
  const [selected, setSelected] = useState('standard')
  const formatLabel = format === 'pdf' ? 'PDF' : '.docx'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }} transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Choose a template</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Select a style for your {formatLabel} document</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.06]" style={{ color: 'var(--text-3)' }}>
              <X size={14} />
            </button>
          </div>

          <div className="px-6 py-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {EXPORT_TEMPLATES.map(tpl => {
              const Icon = tpl.icon
              const isSelected = selected === tpl.id
              return (
                <motion.button
                  key={tpl.id}
                  onClick={() => setSelected(tpl.id)}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                  className={`relative flex flex-col gap-2 p-3 rounded-2xl border-2 text-left transition-all duration-200 ${
                    isSelected ? `border-transparent ring-2 ${tpl.ring}` : 'border-white/[0.08] hover:border-white/20'
                  }`}
                  style={{ background: isSelected ? 'var(--input-bg)' : 'var(--card-bg)' }}
                >
                  <DocPreview tpl={tpl} />
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={`w-5 h-5 rounded-lg bg-gradient-to-br ${tpl.gradient} flex items-center justify-center shrink-0`}>
                      <Icon size={11} className="text-white" />
                    </div>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{tpl.name}</p>
                  </div>
                  <p className="text-[10px] leading-snug" style={{ color: 'var(--text-3)' }}>{tpl.desc}</p>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                      <CheckCircle2 size={10} className="text-white" />
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>

          <div className="px-6 py-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--card-border)', background: 'var(--input-bg)' }}>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Template applies colors and layout — content stays the same</p>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-xl transition-colors hover:bg-white/[0.04]" style={{ color: 'var(--text-2)' }}>Cancel</button>
              <motion.button
                onClick={() => { onDownload(selected); onClose() }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
              >
                {format === 'pdf' ? <FileDown size={14} /> : <Download size={14} />}
                Download {formatLabel}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ── Share modal ───────────────────────────────────────────────────────────────

const SHAREABLE_PROVIDERS: Record<string, { label: string; icon: string }> = {
  slack:        { label: 'Slack',        icon: '💬' },
  notion:       { label: 'Notion',       icon: '⬜' },
  hubspot:      { label: 'HubSpot',      icon: '🟠' },
  linear:       { label: 'Linear',       icon: '🔷' },
  google_drive: { label: 'Google Drive', icon: '📁' },
  webhook:      { label: 'Webhook',      icon: '🔗' },
}

function ShareModal({ jobId, minutes, onClose }: { jobId: string; minutes?: any; onClose: () => void }) {
  const [integrations, setIntegrations] = useState<any>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [results, setResults] = useState<Record<string, string> | null>(null)
  const [activeTab, setActiveTab] = useState<'share' | 'embed'>('share')
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)

  useEffect(() => {
    api.get('/integrations')
      .then(setIntegrations)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const connected = Object.entries(SHAREABLE_PROVIDERS).filter(
    ([provider]) => integrations[provider]?.connected
  )
  const meetingUrl = `${window.location.origin}/results/${jobId}`
  const title = minutes?.title || 'Meeting Minutes'
  const meta = minutes?.metadata
  const subtitle = [meta?.date, meta?.duration].filter(Boolean).join(' · ') || 'MinuteAI meeting'
  const embedCode = `<iframe src="${meetingUrl}" width="640" height="360" frameborder="0" allow="autoplay; clipboard-write; fullscreen" allowfullscreen></iframe>`

  function toggle(provider: string) {
    setSelected(s => {
      const next = new Set(s)
      next.has(provider) ? next.delete(provider) : next.add(provider)
      return next
    })
  }

  async function handleShare() {
    if (!selected.size) return
    setSharing(true)
    try {
      const data: any = await api.post(`/results/${jobId}/share`, { providers: [...selected] })
      setResults(data.results)
    } catch (err: any) {
      setResults({ error: err.message })
    } finally {
      setSharing(false)
    }
  }

  async function copyMeetingLink() {
    await navigator.clipboard.writeText(meetingUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 1800)
  }

  async function copyEmbedCode() {
    await navigator.clipboard.writeText(embedCode)
    setCopiedEmbed(true)
    setTimeout(() => setCopiedEmbed(false), 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18 }}
        className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-lg shadow-2xl"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <div className="flex items-start justify-between px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold" style={{ color: 'var(--text-1)' }}>{title}</h2>
            <p className="mt-1 truncate text-sm" style={{ color: 'var(--text-3)' }}>{subtitle}</p>
          </div>
          <button onClick={onClose} className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.08]"
            style={{ color: 'var(--text-3)' }}>
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 border-b px-6" style={{ borderColor: 'var(--divider)' }}>
          {(['share', 'embed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'border-violet-600 text-violet-500' : 'border-transparent'
              }`}
              style={{ color: activeTab === tab ? undefined : 'var(--text-3)' }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'share' ? (
            <div>
              <div className="border-b px-6 py-3" style={{ background: 'var(--input-bg)', borderColor: 'var(--divider)' }}>
                <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                  <span className="rounded-md bg-violet-600 px-2 py-0.5 text-[11px] font-bold text-white">NEW</span>
                  <span>Share with specific teammates or connected apps.</span>
                </div>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="flex gap-3">
                  <div className="relative min-w-0 flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
                    <input
                      placeholder="Name, email, or user group"
                      className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-violet-500/40"
                      style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-1)' }}
                    />
                  </div>
                  <button disabled className="rounded-lg bg-violet-600/20 px-4 text-sm font-semibold text-violet-400 opacity-60">
                    Invite
                  </button>
                </div>

                <div>
                  <p className="mb-2 text-sm" style={{ color: 'var(--text-2)' }}>Share with contacts on</p>
                  <div className="flex flex-wrap gap-2">
                    {loading ? (
                      <span className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}>
                        <Loader2 size={13} className="animate-spin" /> Loading apps
                      </span>
                    ) : connected.length ? connected.map(([provider, providerMeta]) => {
                      const isSelected = selected.has(provider)
                      return (
                        <button
                          key={provider}
                          onClick={() => toggle(provider)}
                          className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition-all ${
                            isSelected ? 'border-violet-500/50 bg-violet-500/10' : 'hover:border-violet-500/30'
                          }`}
                          style={{ borderColor: isSelected ? undefined : 'var(--divider)', color: 'var(--text-2)' }}
                        >
                          <span>{providerMeta.icon}</span>
                          {providerMeta.label}
                        </button>
                      )
                    }) : (
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>No connected apps yet.</span>
                    )}
                  </div>
                  {selected.size > 0 && (
                    <button
                      onClick={handleShare}
                      disabled={sharing}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                    >
                      {sharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                      Share to selected apps
                    </button>
                  )}
                  {results && (
                    <div className="mt-3 space-y-1.5">
                      {Object.entries(results).map(([provider, status]) => (
                        <p key={provider} className="text-xs" style={{ color: status === 'ok' ? '#34d399' : '#fb7185' }}>
                          {SHAREABLE_PROVIDERS[provider]?.label ?? provider}: {status === 'ok' ? 'Sent' : status}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-sm" style={{ color: 'var(--text-3)' }}>Teammates with access</p>
                  <div className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: 'var(--input-bg)' }}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-xs font-bold text-white">
                      RW
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: 'var(--text-1)' }}>Raji Olaoluwa</p>
                      <p className="truncate text-xs" style={{ color: 'var(--text-3)' }}>Host</p>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>Host</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 px-6 py-5">
              <div className="relative overflow-hidden rounded-lg bg-black p-4 text-white">
                <div className="relative z-10 flex min-h-[250px] flex-col">
                  <div>
                    <p className="text-sm font-bold">{title}</p>
                    <p className="text-xs text-white/70">{subtitle}</p>
                  </div>
                  <div className="flex flex-1 items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600 shadow-2xl shadow-violet-500/30">
                      <Play size={26} fill="currentColor" className="ml-1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/80">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-600 font-bold">M</span>
                    By AI-Powered MinuteAI
                  </div>
                </div>
                <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 50% 45%, #7c3aed, transparent 35%)' }} />
              </div>

              <div className="rounded-lg p-4" style={{ background: 'var(--input-bg)' }}>
                <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {embedCode}
                </pre>
                <button
                  onClick={copyEmbedCode}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-sm font-semibold transition hover:bg-white/[0.04]"
                  style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)' }}
                >
                  <Code2 size={15} /> {copiedEmbed ? 'Copied Embed Code' : 'Copy Embed Code'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4" style={{ background: 'var(--input-bg)', borderColor: 'var(--divider)' }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border" style={{ borderColor: 'var(--card-border)' }}>
                <Globe2 size={17} style={{ color: 'var(--text-3)' }} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Anyone with link</p>
                <p className="truncate text-xs" style={{ color: 'var(--text-3)' }}>Anyone who has this link can access this meeting.</p>
              </div>
            </div>
            <button
              onClick={copyMeetingLink}
              className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition hover:bg-white/[0.04]"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)' }}
            >
              <Link2 size={15} /> {copiedLink ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function LegacyShareModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [integrations, setIntegrations] = useState<any>({})
  const [selected,     setSelected]     = useState<Set<string>>(new Set())
  const [loading,      setLoading]      = useState(true)
  const [sharing,      setSharing]      = useState(false)
  const [results,      setResults]      = useState<Record<string, string> | null>(null)

  useEffect(() => {
    api.get('/integrations')
      .then(setIntegrations)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const connected = Object.entries(SHAREABLE_PROVIDERS).filter(
    ([provider]) => integrations[provider]?.connected
  )

  function toggle(provider: string) {
    setSelected(s => {
      const next = new Set(s)
      next.has(provider) ? next.delete(provider) : next.add(provider)
      return next
    })
  }

  async function handleShare() {
    if (!selected.size) return
    setSharing(true)
    try {
      const data: any = await api.post(`/results/${jobId}/share`, { providers: [...selected] })
      setResults(data.results)
    } catch (err: any) {
      setResults({ error: err.message })
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.18 }}
          className="relative z-10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          {/* header */}
          <div className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Share2 size={13} className="text-violet-400" />
              </div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Share meeting</h2>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.08]"
              style={{ color: 'var(--text-3)' }}>
              <X size={14} />
            </button>
          </div>

          <div className="px-5 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2" style={{ color: 'var(--text-3)' }}>
                <Loader2 size={15} className="animate-spin" />
                <span className="text-sm">Loading integrations…</span>
              </div>
            ) : results ? (
              /* results view */
              <div className="space-y-2 py-2">
                {Object.entries(results).map(([provider, status]) => {
                  const meta = SHAREABLE_PROVIDERS[provider]
                  const ok = status === 'ok'
                  return (
                    <div key={provider} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: 'var(--input-bg)' }}>
                      <span className="text-lg">{meta?.icon ?? '🔗'}</span>
                      <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                        {meta?.label ?? provider}
                      </span>
                      {ok
                        ? <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1"><CheckCircle2 size={13} /> Sent</span>
                        : <span className="text-xs text-red-400">{status}</span>
                      }
                    </div>
                  )
                })}
                <button onClick={onClose}
                  className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all">
                  Done
                </button>
              </div>
            ) : connected.length === 0 ? (
              /* no connected apps */
              <div className="text-center py-8">
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-1)' }}>No apps connected</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>Connect an integration first to share meetings.</p>
                <button onClick={onClose}
                  className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                  Go to Integrations →
                </button>
              </div>
            ) : (
              /* provider selection */
              <>
                <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>
                  Select where to share this meeting:
                </p>
                <div className="space-y-2 mb-4">
                  {connected.map(([provider, meta]) => {
                    const isSelected = selected.has(provider)
                    return (
                      <button
                        key={provider}
                        onClick={() => toggle(provider)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                          isSelected ? 'border-violet-500/50 bg-violet-500/10' : 'hover:border-violet-500/20'
                        }`}
                        style={{ borderColor: isSelected ? undefined : 'var(--divider)', background: isSelected ? undefined : 'var(--input-bg)' }}
                      >
                        <span className="text-lg">{meta.icon}</span>
                        <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                          {meta.label}
                        </span>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-violet-500 border-violet-500' : ''
                        }`} style={{ borderColor: isSelected ? undefined : 'var(--divider)' }}>
                          {isSelected && <CheckCircle2 size={10} className="text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={handleShare}
                  disabled={sharing || !selected.size}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white transition-all"
                >
                  {sharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                  {sharing ? 'Sharing…' : `Share to ${selected.size || ''} app${selected.size !== 1 ? 's' : ''}`}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}

// ── Thread banner ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'engineering',  label: 'Engineering',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  { value: 'product',      label: 'Product',        color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  { value: 'design',       label: 'Design',         color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  { value: 'sales',        label: 'Sales',          color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  { value: 'marketing',    label: 'Marketing',      color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  { value: 'client',       label: 'Client',         color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { value: 'leadership',   label: 'Leadership',     color: '#e879f9', bg: 'rgba(232,121,249,0.12)' },
  { value: 'all_hands',    label: 'All-Hands',      color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  { value: 'one_on_one',   label: '1:1',            color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  { value: 'other',        label: 'Other',          color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
]

function getCategoryMeta(value: string | null | undefined) {
  return CATEGORIES.find(c => c.value === value) ?? null
}

function ThreadBanner({ thread, onCategoryChanged }: { thread: any; onCategoryChanged?: (cat: string | null) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const catMeta = getCategoryMeta(thread.category)

  async function setCategory(value: string | null) {
    if (value === (thread.category ?? null)) { setPickerOpen(false); return }
    setSaving(true)
    setPickerOpen(false)
    try {
      await updateThread(thread.id, { category: value ?? '' })
      onCategoryChanged?.(value)
    } catch {}
    finally { setSaving(false) }
  }

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border mb-4 relative"
      style={{ background: 'var(--input-bg)', borderColor: 'var(--divider)' }}>

      {/* Thread icon */}
      <div className="w-6 h-6 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
        <GitBranch size={12} className="text-violet-400" />
      </div>

      {/* Thread info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-1)' }}>
          <Link to="/threads" className="text-violet-400 hover:underline">{thread.name}</Link>
          <span style={{ color: 'var(--text-3)' }}> · Session {thread.session_number} of {thread.session_count}</span>
        </p>
        <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
          Recurring meeting series
        </p>
      </div>

      {/* Category badge / picker */}
      <div className="relative shrink-0">
        <button
          onClick={() => setPickerOpen(o => !o)}
          disabled={saving}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
          style={catMeta
            ? { background: catMeta.bg, color: catMeta.color }
            : { background: 'var(--card-bg)', color: 'var(--text-3)', border: '1px dashed var(--divider)' }}
        >
          {saving && <Loader2 size={10} className="animate-spin" />}
          {catMeta ? catMeta.label : 'Set type…'}
        </button>

        <AnimatePresence>
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-xl p-1.5 grid grid-cols-2 gap-0.5 w-52"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-left transition-all"
                    style={{
                      background: thread.category === cat.value ? cat.bg : 'transparent',
                      color: cat.color,
                    }}>
                    {cat.label}
                  </button>
                ))}
                {thread.category && (
                  <button
                    onClick={() => setCategory(null)}
                    className="col-span-2 text-[10px] font-medium py-1 text-center rounded-lg transition-colors"
                    style={{ color: 'var(--text-3)' }}>
                    Clear type
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Continuity panel ──────────────────────────────────────────────────────────

function ContinuityPanel({ data }: { data: any }) {
  const [collapsed, setCollapsed] = useState(false)

  if (!data?.has_previous) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border mb-4 overflow-hidden"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
        style={{ borderBottom: collapsed ? 'none' : '1px solid var(--card-border)' }}
      >
        <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
          <GitBranch size={13} className="text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
            Last time in this series
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
            Session {data.session_number}
            {data.title ? ` · ${data.title}` : ''}
            {data.date ? ` · ${new Date(data.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
          </p>
        </div>
        <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          style={{ color: 'var(--text-3)' }} />
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-5 py-4 space-y-4">
              {data.overview && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Overview</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{data.overview}</p>
                </div>
              )}

              {data.key_decisions?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Key Decisions</p>
                  <ul className="space-y-1.5">
                    {data.key_decisions.map((d: any, i: number) => (
                      <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                        <CheckCircle2 size={13} className="text-indigo-400 mt-0.5 shrink-0" />
                        {typeof d === 'string' ? d : d.decision}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.open_action_items?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
                    Open Action Items from Last Session
                  </p>
                  <div className="space-y-1.5">
                    {data.open_action_items.map((item: any) => (
                      <div key={item.id} className="flex items-start gap-2.5 py-1.5 px-3 rounded-lg"
                        style={{ background: 'var(--input-bg)' }}>
                        <AlertCircle size={12} className="text-amber-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-snug" style={{ color: 'var(--text-1)' }}>{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {item.owner_name && (
                              <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{item.owner_name}</span>
                            )}
                            {item.deadline && (
                              <span className="flex items-center gap-1 text-[10px] text-amber-400">
                                <CalendarDays size={9} /> {item.deadline}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Follow-up Email tab ───────────────────────────────────────────────────────

const TONES = [
  { id: 'professional', label: 'Professional', desc: 'Formal and structured' },
  { id: 'friendly',     label: 'Friendly',     desc: 'Warm and conversational' },
  { id: 'concise',      label: 'Concise',      desc: 'Short and bullet-driven' },
]

function FollowUpTab({ jobId }: { jobId: string }) {
  const [tone, setTone]                   = useState('professional')
  const [recipientName, setRecipientName] = useState('')
  const [context, setContext]             = useState('')
  const [generating, setGenerating]       = useState(false)
  const [subject, setSubject]             = useState('')
  const [body, setBody]                   = useState('')
  const [error, setError]                 = useState('')
  const [copied, setCopied]               = useState<'subject' | 'body' | 'all' | null>(null)

  async function generate() {
    setGenerating(true)
    setError('')
    setSubject('')
    setBody('')
    try {
      const res = await api.post(`/results/${jobId}/follow-up-email`, {
        tone,
        recipient_name: recipientName.trim() || undefined,
        context: context.trim() || undefined,
      })
      setSubject(res.subject || '')
      setBody(res.body || '')
    } catch (err: any) {
      setError(err.message || 'Failed to generate email.')
    } finally {
      setGenerating(false)
    }
  }

  async function copyText(type: 'subject' | 'body' | 'all') {
    const text = type === 'subject' ? subject
      : type === 'body' ? body
      : `Subject: ${subject}\n\n${body}`
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 1800)
  }

  const hasResult = subject || body

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b px-4 py-3" style={{ borderColor: 'var(--divider)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-violet-500/15 flex items-center justify-center">
            <Mail size={13} className="text-violet-400" />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Follow-up Email</p>
        </div>
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
          Draft a follow-up email from this meeting's key points
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Tone */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }}>Tone</p>
          <div className="grid grid-cols-3 gap-1.5">
            {TONES.map(t => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className={`flex flex-col gap-0.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  tone === t.id ? 'border-violet-500/50 bg-violet-500/10' : 'hover:bg-white/[0.04]'
                }`}
                style={{ borderColor: tone === t.id ? undefined : 'var(--card-border)', background: tone === t.id ? undefined : 'var(--card-bg)' }}
              >
                <span className={`text-[11px] font-bold ${tone === t.id ? 'text-violet-300' : ''}`}
                  style={tone === t.id ? {} : { color: 'var(--text-2)' }}>
                  {t.label}
                </span>
                <span className="text-[10px] leading-snug" style={{ color: 'var(--text-3)' }}>{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recipient */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>
            Recipient name <span className="font-normal opacity-50">(optional)</span>
          </label>
          <input
            value={recipientName}
            onChange={e => setRecipientName(e.target.value)}
            placeholder="e.g. Sarah, the Acme team…"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-1 focus:ring-violet-500/40"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-1)' }}
          />
        </div>

        {/* Extra context */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>
            Additional context <span className="font-normal opacity-50">(optional)</span>
          </label>
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            rows={2}
            placeholder="e.g. Focus on the pricing discussion, include the demo link…"
            className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-1 focus:ring-violet-500/40"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-1)' }}
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 px-3 py-2 rounded-xl bg-red-500/8 border border-red-500/20">{error}</p>
        )}

        <button
          onClick={generate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            color: 'white',
            boxShadow: '0 3px 14px rgba(124,58,237,0.3)',
          }}
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          {generating ? 'Generating…' : hasResult ? 'Regenerate' : 'Generate email'}
        </button>

        {/* Result */}
        {hasResult && (
          <div className="space-y-3">
            {/* Copy all */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Generated email</p>
              <button
                onClick={() => copyText('all')}
                className="flex items-center gap-1 text-[11px] font-medium transition-colors"
                style={{ color: copied === 'all' ? 'rgb(52,211,153)' : 'var(--text-3)' }}
              >
                {copied === 'all' ? <CheckCheck size={11} /> : <Copy size={11} />}
                {copied === 'all' ? 'Copied' : 'Copy all'}
              </button>
            </div>

            {/* Subject */}
            {subject && (
              <div className="rounded-xl border p-3" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Subject</span>
                  <button
                    onClick={() => copyText('subject')}
                    className="flex items-center gap-1 text-[11px]"
                    style={{ color: copied === 'subject' ? 'rgb(52,211,153)' : 'var(--text-3)' }}
                  >
                    {copied === 'subject' ? <CheckCheck size={10} /> : <Copy size={10} />}
                    {copied === 'subject' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{subject}</p>
              </div>
            )}

            {/* Body */}
            {body && (
              <div className="rounded-xl border p-3" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Body</span>
                  <button
                    onClick={() => copyText('body')}
                    className="flex items-center gap-1 text-[11px]"
                    style={{ color: copied === 'body' ? 'rgb(52,211,153)' : 'var(--text-3)' }}
                  >
                    {copied === 'body' ? <CheckCheck size={10} /> : <Copy size={10} />}
                    {copied === 'body' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>{body}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Results page ──────────────────────────────────────────────────────────────

const TABS = [
  { key: 'transcript', label: 'Transcript' },
  { key: 'ask_ai',    label: 'Steph'      },
  { key: 'tasks',     label: 'Tasks'      },
  { key: 'follow_up', label: 'Follow-up'  },
]

const MOBILE_TABS = [
  { key: 'minutes',    label: 'Minutes'    },
  { key: 'transcript', label: 'Transcript' },
  { key: 'ask_ai',    label: 'Steph'      },
  { key: 'tasks',     label: 'Tasks'      },
  { key: 'follow_up', label: 'Follow-up'  },
]

export default function Results() {
  const { jobId } = useParams()
  const { minutes, downloadDocx, downloadPdf, downloadAudio, loading, error, refresh } = useResults(jobId)
  const [copied,        setCopied]        = useState(false)
  const [playbackTime,  setPlaybackTime]  = useState(0)
  const [activeTab,     setActiveTab]     = useState('transcript')
  const [activeMobileTab, setActiveMobileTab] = useState('minutes')
  const [templateModal, setTemplateModal] = useState<'pdf' | 'docx' | null>(null)
  const [headerExpanded, setHeaderExpanded] = useState(true)
  const [speakerModal,  setSpeakerModal]  = useState(false)
  const [shareModal,    setShareModal]    = useState(false)
  const [threadInfo,    setThreadInfo]    = useState<any | null>(null)
  const [continuity,    setContinuity]    = useState<any | null>(null)

  useEffect(() => {
    if (!jobId) return
    getThreadForJob(jobId)
      .then((data: any) => {
        if (data?.id) {
          setThreadInfo(data)
          if (data.current_session?.session_number > 1) {
            getThreadContinuity(data.id, jobId)
              .then(setContinuity)
              .catch(() => {})
          }
        }
      })
      .catch(() => {})
  }, [jobId])

  async function copyText() {
    if (!minutes?.plainText) return
    await navigator.clipboard.writeText(minutes.plainText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--page-bg)' }}>
        <Sidebar active={null} />
        <div className="flex-1 flex items-center justify-center gap-2" style={{ color: 'var(--text-3)' }}>
          <Loader2 size={18} className="animate-spin" /> Loading results…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--page-bg)' }}>
        <Sidebar active={null} />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <p className="text-red-400 mb-4">{error}</p>
          <Link to="/upload" className="text-violet-400 hover:underline text-sm">Try again</Link>
        </div>
      </div>
    )
  }

  const meta = minutes?.metadata
  const metaParts = [meta?.date, meta?.duration].filter(Boolean)
  const audioUrl = minutes?.has_audio && jobId ? getDownloadUrl(jobId, 'audio') : undefined
  const sideTab = activeMobileTab === 'tasks'
    ? 'tasks'
    : activeMobileTab === 'transcript'
      ? 'transcript'
      : activeMobileTab === 'ask_ai'
        ? 'ask_ai'
        : activeMobileTab === 'follow_up'
          ? 'follow_up'
          : activeTab

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Sidebar active={null} />

      <main className="min-w-0 flex-1 flex flex-col overflow-hidden">

        {/* ── header ── */}
        <div className="shrink-0 border-b" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--divider)' }}>
          {/* breadcrumb row — always visible, chevron collapses details on mobile */}
          <div className="flex items-center gap-1.5 border-b px-4 py-2 sm:px-6" style={{ borderColor: 'var(--divider)' }}>
            <Link
              to="/dashboard"
              className="shrink-0 text-xs transition-colors hover:text-violet-400"
              style={{ color: 'var(--text-3)' }}
            >
              My Meetings
            </Link>
            <ChevronRight size={11} className="shrink-0" style={{ color: 'var(--text-3)' }} />
            <span className="min-w-0 flex-1 truncate text-xs font-medium" style={{ color: 'var(--text-2)' }}>
              {minutes?.title ?? 'Meeting'}
            </span>
            <button
              onClick={() => setHeaderExpanded(v => !v)}
              className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors hover:bg-white/[0.06] sm:hidden"
              style={{ color: 'var(--text-3)' }}
              title={headerExpanded ? 'Collapse header' : 'Expand header'}
            >
              <ChevronDown size={13} className={`transition-transform duration-200 ${headerExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* title + compact actions — collapsible on mobile */}
          <div className={`${headerExpanded ? 'flex' : 'hidden'} sm:flex items-start gap-3 px-4 py-3 sm:px-6`}>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold leading-tight sm:text-xl" style={{ color: 'var(--text-1)' }}>
                {minutes?.title ?? 'Meeting Minutes'}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {meta?.date && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-3)' }}>
                    <CalendarDays size={11} /> {meta.date}
                  </span>
                )}
                {meta?.duration && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-3)' }}>
                    <Clock size={11} /> {meta.duration}
                  </span>
                )}
                {meta?.participants?.slice(0, 3).map((p: string) => (
                  <span key={p} className="text-xs" style={{ color: 'var(--text-3)' }}>{p}</span>
                ))}
                {meta?.participants?.length > 3 && (
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>+{meta.participants.length - 3} more</span>
                )}
              </div>
            </div>

            {/* icon action buttons */}
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                onClick={copyText}
                title={copied ? 'Copied!' : 'Copy minutes text'}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: copied ? 'rgb(52,211,153)' : 'var(--text-3)' }}
              >
                {copied ? <CheckCheck size={15} /> : <Copy size={15} />}
              </button>
              <button
                onClick={() => setSpeakerModal(true)}
                title="Name speakers"
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--text-3)' }}
              >
                <Users size={15} />
              </button>
              <button
                onClick={() => setShareModal(true)}
                title="Share"
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--text-3)' }}
              >
                <Share2 size={15} />
              </button>
              <button
                onClick={() => setTemplateModal('pdf')}
                title="Export PDF"
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--text-3)' }}
              >
                <FileDown size={15} />
              </button>
              {minutes?.has_audio && (
                <button
                  onClick={downloadAudio}
                  title="Download recording"
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
                  style={{ color: 'var(--text-3)' }}
                >
                  <Headphones size={15} />
                </button>
              )}
              <button
                onClick={() => setTemplateModal('docx')}
                className="ml-1 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:from-violet-500 hover:to-indigo-500"
              >
                <Download size={12} /> .docx
              </button>
            </div>
          </div>
        </div>

        {/* ── mobile tab bar (sticky below header, hidden on xl) ── */}
        <div className="shrink-0 border-b px-4 py-2 xl:hidden"
          style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--divider)' }}>
          <div className="grid grid-cols-4 gap-1 rounded-xl p-1"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
            {MOBILE_TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveMobileTab(tab.key)}
                className={`px-2 py-2 text-xs font-semibold transition-all ${
                  activeMobileTab === tab.key
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                    : ''
                }`}
                style={{
                  borderRadius: 8,
                  color: activeMobileTab === tab.key ? undefined : 'var(--text-3)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── scrollable content ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 sm:px-5 lg:px-6 xl:px-8">

            {/* thread banner */}
            {threadInfo?.id && (
              <div className="pt-5">
                <ThreadBanner
                  thread={{
                    ...threadInfo,
                    session_number: threadInfo.current_session?.session_number,
                  }}
                  onCategoryChanged={(cat) => setThreadInfo((t: any) => ({ ...t, category: cat }))}
                />
              </div>
            )}

            <div className={`${threadInfo?.id ? '' : 'pt-5 sm:pt-6'} grid gap-5 xl:grid-cols-[minmax(560px,0.95fr)_minmax(520px,0.85fr)] xl:gap-6`}>
              <div className={`${activeMobileTab === 'minutes' ? 'block' : 'hidden'} min-w-0 xl:flex xl:justify-center`}>
                <div className="w-full max-w-[760px]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Minutes</p>
                    <h2 className="mt-1 text-lg font-bold" style={{ color: 'var(--text-1)' }}>Meeting notes</h2>
                  </div>
                  <button onClick={copyText}
                    className="hidden items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-white/[0.04] sm:flex"
                    style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)' }}>
                    {copied ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <ContinuityPanel data={continuity} />
                <MinutesTab minutes={minutes} copied={copied} onCopy={copyText} />
                </div>
              </div>

              <aside className={`${activeMobileTab === 'minutes' ? 'hidden' : 'flex flex-col'} min-w-0 overflow-hidden xl:flex xl:flex-col xl:sticky xl:top-5 xl:max-h-[calc(100vh-220px)] xl:rounded-lg xl:border xl:shadow-sm`}
                style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--divider)' }}>
                {/* tab strip */}
                <div className="hidden border-b px-4 pt-3 xl:block" style={{ borderColor: 'var(--divider)' }}>
                  <div className="grid w-full grid-cols-4 gap-1 rounded-xl p-1 sm:w-fit" style={{ background: 'var(--input-bg)' }}>
                    {TABS.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                          activeTab === tab.key
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                            : ''
                        }`}
                        style={{ color: activeTab === tab.key ? undefined : 'var(--text-3)' }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden xl:h-[calc(100vh-282px)] xl:max-h-[calc(100vh-280px)]">
                  {sideTab === 'transcript' ? (
                    <TranscriptPanel
                      transcript={minutes?.transcript}
                      segments={minutes?.transcript_segments}
                      jobId={jobId}
                      onNameSpeakers={() => setSpeakerModal(true)}
                      onSaved={refresh} currentTime={playbackTime}
                    />
                  ) : sideTab === 'ask_ai' ? (
                    <StephTab transcript={minutes?.transcript} />
                  ) : sideTab === 'follow_up' ? (
                    <FollowUpTab jobId={jobId} />
                  ) : (
                    <div className="h-full overflow-y-auto px-4">
                      <TasksTab jobId={jobId} canManage={true} meetingTitle={minutes?.title} />
                    </div>
                  )}
                </div>
              </aside>
            </div>
            <div className="py-8 text-center border-t mt-4" style={{ borderColor: 'var(--card-border)' }}>
              <Link to="/upload"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
                <Plus size={14} /> Process another meeting
              </Link>
            </div>
          </div>
        </div>
        <RecordingDock hasAudio={minutes?.has_audio} audioUrl={audioUrl} onDownload={downloadAudio} onTimeUpdate={setPlaybackTime} />
      </main>

      {templateModal && (
        <TemplatePickerModal
          format={templateModal}
          onClose={() => setTemplateModal(null)}
          onDownload={(template) => {
            if (templateModal === 'pdf') downloadPdf(template)
            else downloadDocx(template)
          }}
        />
      )}

      {speakerModal && (
        <SpeakerNamesModal jobId={jobId} onClose={() => setSpeakerModal(false)} onApplied={refresh} />
      )}

      <AnimatePresence>
        {shareModal && (
          <ShareModal jobId={jobId} minutes={minutes} onClose={() => setShareModal(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
