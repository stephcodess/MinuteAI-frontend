import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, Copy, CheckCheck, FileDown, Plus,
  Circle, CheckCircle2, Loader2, CalendarDays, User as UserIcon,
  ChevronDown, ArrowLeft, TableProperties, FileText, Users,
  Clock, Hash, AlignLeft, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useResults } from '../hooks/useResults'
import { useWorkspace } from '../context/WorkspaceContext'
import { api } from '../lib/api'
import Sidebar from '../components/Sidebar'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META = {
  todo:        { label: 'To-do',       cls: 'bg-gray-100 text-gray-600',  icon: Circle       },
  in_progress: { label: 'In progress', cls: 'bg-blue-50 text-blue-600',   icon: Loader2      },
  done:        { label: 'Done',        cls: 'bg-green-50 text-green-700', icon: CheckCircle2 },
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
      user ? 'bg-gradient-to-br from-violet-500 to-indigo-600' : 'bg-gray-200'
    }`}>
      {user ? initials : <UserIcon size={11} className="text-gray-400" />}
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
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-600 transition-colors"
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
              className="absolute left-0 top-full mt-1 z-20 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden"
            >
              <button
                onClick={() => assign(null)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
              >
                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                  <UserIcon size={10} className="text-gray-400" />
                </div>
                Unassigned
              </button>
              {members.map(m => (
                <button
                  key={m.user_id}
                  onClick={() => assign(m.user_id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-violet-50 transition-colors ${
                    task.assignee?.id === m.user_id ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-gray-700'
                  }`}
                >
                  <Avatar user={{ name: m.name, avatar_url: m.avatar_url }} size={5} />
                  <span className="truncate flex-1 text-left">{m.name}</span>
                  {task.assignee?.id === m.user_id && <CheckCircle2 size={11} className="text-violet-500 shrink-0" />}
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
    <tr className="group hover:bg-violet-50/30 transition-colors">
      <td className="px-5 py-3.5 border-b border-gray-100">
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
          <span className={`text-sm leading-snug ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </span>
        </div>
      </td>
      <td className="px-5 py-3.5 border-b border-gray-100 w-40">
        {canManage ? (
          <AssigneePicker task={task} members={members} onUpdated={onUpdated} />
        ) : (
          <div className="flex items-center gap-1.5">
            <Avatar user={task.assignee} size={5} />
            <span className="text-xs text-gray-600">{task.assignee?.name ?? 'Unassigned'}</span>
          </div>
        )}
      </td>
      <td className="px-5 py-3.5 border-b border-gray-100 w-36">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${meta.cls}`}>
          <Icon size={10} className={task.status === 'in_progress' ? 'animate-spin' : ''} />
          {meta.label}
        </span>
      </td>
      <td className="px-5 py-3.5 border-b border-gray-100 w-36">
        {task.deadline ? (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <CalendarDays size={11} />
            {task.deadline}
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>
    </tr>
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
      <span className="text-xs text-gray-400">
        Page <span className="font-medium text-gray-600">{page}</span> of <span className="font-medium text-gray-600">{totalPages}</span>
        <span className="ml-1 text-gray-300">· {total} tasks</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} className="px-1 text-gray-400 text-xs">…</span>
            : <button
                key={p}
                onClick={() => onPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                  page === p
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-300/30'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Tasks tab ─────────────────────────────────────────────────────────────────

function TasksTab({ jobId, canManage, meetingTitle }) {
  const [tasks,      setTasks]      = useState([])
  const [members,    setMembers]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)
  const { activeWorkspace } = useWorkspace()

  useEffect(() => {
    api.get(`/tasks/meeting/${jobId}`)
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false))
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
    <div className="flex items-center justify-center py-24 gap-2 text-gray-400 text-sm">
      <Loader2 size={16} className="animate-spin" /> Loading tasks…
    </div>
  )

  if (!tasks.length) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mb-3">
        <TableProperties size={22} className="text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-500 mb-1">No tasks found for this meeting</p>
      <p className="text-xs text-gray-400">Action items are extracted automatically from the minutes.</p>
    </div>
  )

  const done       = tasks.filter(t => t.status === 'done').length
  const total      = tasks.length
  const totalPages = Math.max(1, Math.ceil(total / TASKS_PAGE_SIZE))
  const paginated  = tasks.slice((page - 1) * TASKS_PAGE_SIZE, page * TASKS_PAGE_SIZE)

  return (
    <div className="py-6">
      {/* summary row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-900">{total} tasks</span>
          <div className="flex items-center gap-2">
            <div className="w-40 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${total ? (done / total) * 100 : 0}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs text-gray-400 font-medium">{done}/{total} done</span>
          </div>
        </div>
        <button
          onClick={() => downloadCSV(tasks, meetingTitle)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-violet-600 border border-gray-200 hover:border-violet-300 bg-white px-3 py-1.5 rounded-lg transition-all"
        >
          <TableProperties size={12} />
          Export CSV
        </button>
      </div>

      {/* table */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Task</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Assignee</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                members={members}
                canManage={canManage}
                onUpdated={handleUpdated}
              />
            ))}
          </tbody>
        </table>
      </div>

      <TasksPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPage={setPage}
      />
    </div>
  )
}

// ── Minutes tab ───────────────────────────────────────────────────────────────

function MinutesTab({ minutes, copied, onCopy }) {
  if (!minutes?.sections?.length) return (
    <div className="py-20 text-center text-gray-400 text-sm">No content available.</div>
  )

  return (
    <div className="py-6 space-y-4">
      {minutes.sections.map((section, i) => {
        const Icon = sectionIcon(section.title)
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <Icon size={14} className="text-violet-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-800">{section.title}</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{section.content}</p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Results page ──────────────────────────────────────────────────────────────

const TABS = [
  { key: 'minutes', label: 'Minutes' },
  { key: 'tasks',   label: 'Tasks'   },
]

export default function Results() {
  const { jobId } = useParams()
  const { minutes, downloadDocx, downloadPdf, loading, error } = useResults(jobId)
  const [copied,  setCopied]  = useState(false)
  const [activeTab, setActiveTab] = useState('minutes')

  async function copyText() {
    if (!minutes?.plainText) return
    await navigator.clipboard.writeText(minutes.plainText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar active={null} />
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Loader2 size={18} className="animate-spin mr-2" /> Loading results…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar active={null} />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/upload" className="text-violet-600 hover:underline text-sm">Try again</Link>
        </div>
      </div>
    )
  }

  const meta = minutes?.metadata
  const metaParts = [meta?.date, meta?.duration].filter(Boolean)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar active={null} />

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ── sticky header ── */}
        <div className="shrink-0 bg-white border-b border-gray-100 px-8 pt-5 pb-0">
          <div className="flex items-start justify-between gap-6 pb-4">
            <div className="min-w-0">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-2 transition-colors"
              >
                <ArrowLeft size={13} /> Back to dashboard
              </Link>
              <h1 className="text-xl font-bold text-gray-900 leading-tight truncate">
                {minutes?.title ?? 'Meeting Minutes'}
              </h1>
              {(metaParts.length > 0 || meta?.participants?.length > 0) && (
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {metaParts.map((p, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs text-gray-400">
                      {i === 0 ? <CalendarDays size={11} /> : <Clock size={11} />}
                      {p}
                    </span>
                  ))}
                  {meta?.participants?.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Users size={11} />
                      {meta.participants.join(', ')}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* action buttons */}
            <div className="flex items-center gap-2 shrink-0 pt-6">
              <button
                onClick={copyText}
                className="flex items-center gap-1.5 text-sm border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-xl transition-colors"
              >
                {copied ? <CheckCheck size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy text'}
              </button>
              <button
                onClick={downloadPdf}
                className="flex items-center gap-1.5 text-sm border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-xl transition-colors"
              >
                <FileDown size={14} />
                PDF
              </button>
              <button
                onClick={downloadDocx}
                className="flex items-center gap-1.5 text-sm bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm shadow-violet-200"
              >
                <Download size={14} />
                Download .docx
              </button>
            </div>
          </div>

          {/* tab strip */}
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-violet-700'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── scrollable content ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-8">
            <AnimatePresence mode="wait">
              {activeTab === 'minutes' ? (
                <motion.div
                  key="minutes"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <MinutesTab minutes={minutes} copied={copied} onCopy={copyText} />
                </motion.div>
              ) : (
                <motion.div
                  key="tasks"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <TasksTab jobId={jobId} canManage={true} meetingTitle={minutes?.title} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="py-8 text-center border-t border-gray-100 mt-4">
              <Link
                to="/upload"
                className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium"
              >
                <Plus size={14} />
                Process another meeting
              </Link>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
