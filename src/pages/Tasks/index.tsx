import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Circle, Loader2, CalendarDays, ClipboardList,
  ChevronRight, Plus, GripVertical, User, X, ChevronDown,
  Trash2, Check, Tag, AlertCircle, ExternalLink, CheckSquare,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import Sidebar from '../../components/Sidebar'
import { api } from '../../lib/api'

const COLUMNS = [
  { key: 'todo',        label: 'To Do',       color: 'bg-white/[0.06] text-slate-400',   dotColor: 'bg-slate-500',   dropRing: 'ring-white/20'         },
  { key: 'in_progress', label: 'In Progress',  color: 'bg-blue-500/20 text-blue-300',     dotColor: 'bg-blue-400',    dropRing: 'ring-blue-400/50'      },
  { key: 'done',        label: 'Done',         color: 'bg-emerald-500/20 text-emerald-300', dotColor: 'bg-emerald-400', dropRing: 'ring-emerald-400/50' },
]

const STATUS_META = {
  todo:        { label: 'To Do',       cls: 'bg-white/[0.06] text-slate-400',     dot: 'bg-slate-500'   },
  in_progress: { label: 'In Progress', cls: 'bg-blue-500/15 text-blue-300',       dot: 'bg-blue-400'    },
  done:        { label: 'Done',        cls: 'bg-emerald-500/15 text-emerald-300', dot: 'bg-emerald-400' },
}

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ user, size = 6 }) {
  if (!user) return (
    <div className={`w-${size} h-${size} rounded-full bg-white/[0.08] flex items-center justify-center shrink-0`}>
      <User size={size * 2} className="text-slate-500" />
    </div>
  )
  const initials = (user.initials || (user.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('')).toUpperCase()
  return (
    <div title={user.name} className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold overflow-hidden shrink-0`}>
      {user.avatar_url
        ? <img src={`${BASE}${user.avatar_url}`} alt="" className="w-full h-full object-cover" />
        : initials}
    </div>
  )
}

// ── Dropdown ──────────────────────────────────────────────────────────────────

function Dropdown({ trigger, children, align = 'left' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            onClick={() => setOpen(false)}
            className={`absolute top-full mt-1 z-50 rounded-xl shadow-2xl border py-1 overflow-hidden min-w-[180px] ${align === 'right' ? 'right-0' : 'left-0'}`}
            style={{ background: 'var(--card-bg)', borderColor: 'var(--divider)' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({ task, onDragStart, onClick }) {
  const isDone = task.status === 'done'

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task)}
      onClick={() => onClick(task)}
      className="group relative rounded-xl border transition-all cursor-pointer active:cursor-grabbing active:opacity-60 active:scale-[0.98] select-none hover:border-violet-500/40"
      style={{ background: 'var(--input-bg)', borderColor: 'var(--divider)' }}
    >
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
        <GripVertical size={13} style={{ color: 'var(--text-3)' }} />
      </div>

      <div className="px-4 py-3 pl-6">
        <p className={`text-sm font-medium leading-snug mb-2.5 ${isDone ? 'line-through' : ''}`}
          style={{ color: isDone ? 'var(--text-3)' : 'var(--text-1)' }}>
          {task.title}
        </p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {task.job_id ? (
              <span className="flex items-center gap-1 text-[10px] text-violet-400 font-medium bg-violet-500/10 px-1.5 py-0.5 rounded-md truncate max-w-[130px]">
                <ClipboardList size={9} />
                {task.meeting_title || 'Meeting'}
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-white/[0.06]" style={{ color: 'var(--text-3)' }}>
                General
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {task.deadline && (() => {
              const isOverdue = task.status !== 'done' && task.deadline < new Date().toISOString().slice(0, 10)
              return (
                <span className={`flex items-center gap-0.5 text-[10px] ${isOverdue ? 'text-red-400 font-semibold' : ''}`}
                  style={isOverdue ? undefined : { color: 'var(--text-3)' }}>
                  <CalendarDays size={9} />
                  {task.deadline}
                  {isOverdue && <span className="ml-0.5 px-1 py-0.5 rounded bg-red-500/15 text-[9px] font-bold">overdue</span>}
                </span>
              )
            })()}
            <Avatar user={task.assignee} size={5} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────

function Column({ col, tasks, onDragStart, onDrop, draggingOver, onDragOver, onDragLeave, onCardClick }) {
  const isOver = draggingOver === col.key

  return (
    <div className="flex w-full min-w-[280px] flex-col sm:min-w-0">
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl border-x border-t" style={{ borderColor: 'var(--divider)', background: 'var(--input-bg)' }}>
        <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>{col.label}</span>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${col.color}`}>
          {tasks.length}
        </span>
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={e => onDrop(e, col.key)}
        className={`flex-1 min-h-[360px] rounded-b-xl border border-t-0 transition-all duration-150 sm:min-h-[520px] ${
          isOver ? `ring-2 ring-inset ${col.dropRing}` : ''
        }`}
        style={{ borderColor: 'var(--divider)', background: isOver ? 'rgba(139,92,246,0.04)' : 'var(--input-bg)' }}
      >
        <div className="p-2.5 space-y-2.5">
          <AnimatePresence mode="popLayout">
            {tasks.map(task => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18 }}
              >
                <TaskCard task={task} onDragStart={onDragStart} onClick={onCardClick} />
              </motion.div>
            ))}
          </AnimatePresence>

          {tasks.length === 0 && !isOver && (
            <div className="flex flex-col items-center justify-center py-12 select-none" style={{ color: 'var(--text-3)' }}>
              <div className="w-10 h-10 rounded-xl border-2 border-dashed flex items-center justify-center mb-2" style={{ borderColor: 'var(--divider)' }}>
                <Plus size={16} style={{ color: 'var(--text-3)' }} />
              </div>
              <p className="text-xs">Drop here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AssigneePicker ────────────────────────────────────────────────────────────

function AssigneePicker({ value, members, onChange, disabled }) {
  return (
    <Dropdown
      trigger={
        <button
          disabled={disabled}
          className="flex items-center gap-2 text-sm transition-colors w-full hover:text-violet-400"
          style={{ color: 'var(--text-2)' }}
        >
          <Avatar user={value} size={6} />
          <span className="flex-1 text-left truncate">{value?.name ?? 'Unassigned'}</span>
          <ChevronDown size={13} style={{ color: 'var(--text-3)' }} className="shrink-0" />
        </button>
      }
    >
      <button
        onClick={() => onChange(null)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/[0.05]"
        style={{ color: 'var(--text-3)' }}
      >
        <div className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center">
          <User size={12} style={{ color: 'var(--text-3)' }} />
        </div>
        Unassigned
        {!value && <Check size={12} className="ml-auto text-violet-400" />}
      </button>
      {members.map(m => (
        <button
          key={m.user_id}
          onClick={() => onChange(m)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-violet-500/10 ${
            value?.id === m.user_id ? 'text-violet-400 font-medium' : ''
          }`}
          style={{ color: value?.id === m.user_id ? undefined : 'var(--text-2)' }}
        >
          <Avatar user={{ name: m.name, avatar_url: m.avatar_url, initials: m.name?.[0] }} size={6} />
          <span className="flex-1 text-left truncate">{m.name}</span>
          {value?.id === m.user_id && <Check size={12} className="text-violet-400 shrink-0" />}
        </button>
      ))}
    </Dropdown>
  )
}

// ── MeetingPicker ─────────────────────────────────────────────────────────────

function MeetingPicker({ value, meetings, onChange, disabled }) {
  const current = value ? meetings.find(m => m.id === value) : null

  return (
    <Dropdown
      trigger={
        <button
          disabled={disabled}
          className="flex items-center gap-2 text-sm transition-colors w-full hover:text-violet-400"
          style={{ color: 'var(--text-2)' }}
        >
          <ClipboardList size={14} style={{ color: 'var(--text-3)' }} className="shrink-0" />
          <span className="flex-1 text-left truncate">{current?.title ?? 'General'}</span>
          <ChevronDown size={13} style={{ color: 'var(--text-3)' }} className="shrink-0" />
        </button>
      }
    >
      <div className="max-h-60 overflow-y-auto">
        <button
          onClick={() => onChange(null)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/[0.05] ${!value ? 'text-violet-400 font-medium' : ''}`}
          style={{ color: value ? 'var(--text-3)' : undefined }}
        >
          <Tag size={13} style={{ color: 'var(--text-3)' }} />
          <span className="flex-1 text-left">General</span>
          {!value && <Check size={12} className="text-violet-400" />}
        </button>
        {meetings.map(m => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-violet-500/10 ${value === m.id ? 'text-violet-400 font-medium' : ''}`}
            style={{ color: value === m.id ? undefined : 'var(--text-2)' }}
          >
            <ClipboardList size={13} style={{ color: 'var(--text-3)' }} />
            <span className="flex-1 text-left truncate">{m.title}</span>
            {value === m.id && <Check size={12} className="text-violet-400 shrink-0" />}
          </button>
        ))}
      </div>
    </Dropdown>
  )
}

// ── Task Drawer ───────────────────────────────────────────────────────────────

function TaskDrawer({ task: initialTask, members, meetings, onClose, onUpdated, onDeleted }) {
  const [task,         setTask]        = useState(initialTask)
  const [title,        setTitle]       = useState(initialTask.title)
  const [editingTitle, setEditingTitle]= useState(false)
  const [saving,       setSaving]      = useState(false)
  const [confirmDel,   setConfirmDel]  = useState(false)
  const titleRef = useRef(null)

  useEffect(() => { setTask(initialTask); setTitle(initialTask.title) }, [initialTask.id])

  async function patch(body) {
    setSaving(true)
    try {
      const updated = await api.patch(`/tasks/${task.id}`, body)
      setTask(updated)
      onUpdated(updated)
    } catch {
      setTask(t => ({ ...t }))
    } finally {
      setSaving(false)
    }
  }

  async function handleTitleBlur() {
    setEditingTitle(false)
    if (title.trim() && title.trim() !== task.title) {
      await patch({ title: title.trim() })
    } else {
      setTitle(task.title)
    }
  }

  async function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return }
    setSaving(true)
    try {
      await api.delete(`/tasks/${task.id}`)
      onDeleted(task.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const linkedMeeting = task.job_id ? meetings.find(m => m.id === task.job_id) : null

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed bottom-0 right-0 top-0 z-40 flex w-full max-w-[440px] flex-col shadow-2xl sm:w-[440px]"
        style={{ background: 'var(--card-bg)', borderLeft: '1px solid var(--divider)' }}
      >
        {/* header */}
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
          style={{ borderBottom: '1px solid var(--divider)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${STATUS_META[task.status]?.dot ?? 'bg-slate-500'}`} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Task</span>
            {saving && <Loader2 size={12} className="animate-spin text-violet-400" />}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000) } else handleDelete() }}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all ${
                confirmDel
                  ? 'bg-red-500 text-white font-semibold'
                  : 'hover:text-red-400 hover:bg-red-500/10'
              }`}
              style={{ color: confirmDel ? undefined : 'var(--text-3)' }}
            >
              <Trash2 size={13} />
              {confirmDel ? 'Confirm delete' : 'Delete'}
            </button>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.08]"
              style={{ color: 'var(--text-3)' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 sm:px-6">

          {/* title */}
          <div>
            {editingTitle ? (
              <textarea
                ref={titleRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); titleRef.current?.blur() } if (e.key === 'Escape') { setTitle(task.title); setEditingTitle(false) } }}
                className="w-full text-lg font-semibold leading-snug resize-none border-0 outline-0 focus:ring-2 focus:ring-violet-500/40 rounded-lg p-2 -ml-2 bg-violet-500/10"
                style={{ color: 'var(--text-1)' }}
                rows={3}
                autoFocus
              />
            ) : (
              <h2
                onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.focus(), 10) }}
                className="text-lg font-semibold leading-snug cursor-text hover:bg-white/[0.05] rounded-lg p-2 -ml-2 transition-colors"
                style={{ color: 'var(--text-1)' }}
              >
                {task.title}
              </h2>
            )}
          </div>

          {/* status */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-3)' }}>Status</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => patch({ status: key })}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    task.status === key
                      ? `${meta.cls} border-current shadow-sm`
                      : 'hover:bg-white/[0.06]'
                  }`}
                  style={{ borderColor: task.status === key ? undefined : 'var(--divider)', color: task.status === key ? undefined : 'var(--text-3)' }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          {/* details */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Details</p>

            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-xs sm:w-20 sm:shrink-0" style={{ color: 'var(--text-3)' }}>Assignee</span>
                <div className="flex-1">
                  <AssigneePicker
                    value={task.assignee}
                    members={members}
                    onChange={m => patch({ assignee_id: m ? m.user_id : '' })}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-xs sm:w-20 sm:shrink-0" style={{ color: 'var(--text-3)' }}>Meeting</span>
                <div className="flex-1">
                  <MeetingPicker
                    value={task.job_id}
                    meetings={meetings}
                    onChange={jobId => patch({ job_id: jobId ?? '' })}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-xs sm:w-20 sm:shrink-0" style={{ color: 'var(--text-3)' }}>Deadline</span>
                <input
                  type="date"
                  value={task.deadline ?? ''}
                  onChange={e => patch({ deadline: e.target.value || '' })}
                  disabled={saving}
                  className="flex-1 text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500/40 glass-input"
                  style={{ border: '1px solid var(--input-border)', color: 'var(--text-2)' }}
                />
              </div>
            </div>
          </div>

          {/* meeting link */}
          {linkedMeeting && (
            <div className="pt-2" style={{ borderTop: '1px solid var(--divider)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-3)' }}>Linked Meeting</p>
              <Link
                to={`/results/${task.job_id}`}
                onClick={onClose}
                className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
              >
                <ClipboardList size={14} />
                <span className="flex-1 truncate">{linkedMeeting.title}</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          )}

          {/* meta */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--divider)' }}>
            {task.owner_name && !task.assignee && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
                <AlertCircle size={12} />
                Originally assigned to <strong>{task.owner_name}</strong> (no matching user found)
              </div>
            )}
            {task.created_at && (
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                Created {new Date(task.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ── Create Task Modal ─────────────────────────────────────────────────────────

function CreateTaskModal({ workspaceId, members, meetings, onCreate, onClose }) {
  const [form,   setForm]   = useState({ title: '', status: 'todo', assignee_id: '', job_id: '', deadline: '' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Task title is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const task = await api.post('/tasks', {
        title:        form.title.trim(),
        workspace_id: workspaceId,
        job_id:       form.job_id   || null,
        assignee_id:  form.assignee_id || null,
        status:       form.status,
        deadline:     form.deadline || null,
      })
      onCreate(task)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create task.')
    } finally {
      setSaving(false)
    }
  }

  const selectedMember  = form.assignee_id ? members.find(m => m.user_id === form.assignee_id)  : null
  const selectedMeeting = form.job_id      ? meetings.find(m => m.id      === form.job_id)       : null

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{ opacity: 0,  scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none"
      >
        <form
          onSubmit={handleSubmit}
          className="pointer-events-auto w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}
        >
          {/* header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Create Task</h2>
            <button type="button" onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.08]"
              style={{ color: 'var(--text-3)' }}>
              <X size={15} />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-4 py-5 space-y-4 sm:px-6">
            {/* title */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>
                Task title <span className="text-red-400">*</span>
              </label>
              <input
                autoFocus
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="What needs to be done?"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/40 glass-input"
                style={{ border: '1px solid var(--input-border)', color: 'var(--text-1)' }}
              />
            </div>

            {/* status */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Status</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_META).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set('status', key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      form.status === key
                        ? `${meta.cls} border-current shadow-sm`
                        : 'hover:bg-white/[0.06]'
                    }`}
                    style={{ borderColor: form.status === key ? undefined : 'var(--divider)', color: form.status === key ? undefined : 'var(--text-3)' }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>

            {/* assignee */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Assignee</label>
              <Dropdown
                trigger={
                  <button type="button"
                    className="w-full flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm transition-colors hover:border-violet-500/40 glass-input"
                    style={{ border: '1px solid var(--input-border)', color: 'var(--text-2)' }}>
                    <Avatar user={selectedMember ? { name: selectedMember.name, avatar_url: selectedMember.avatar_url } : null} size={5} />
                    <span className="flex-1 text-left truncate">{selectedMember?.name ?? 'Unassigned'}</span>
                    <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />
                  </button>
                }
              >
                <button type="button" onClick={() => set('assignee_id', '')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/[0.05] ${!form.assignee_id ? 'font-medium text-violet-400' : ''}`}
                  style={{ color: form.assignee_id ? 'var(--text-3)' : undefined }}>
                  <div className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center">
                    <User size={12} style={{ color: 'var(--text-3)' }} />
                  </div>
                  Unassigned
                  {!form.assignee_id && <Check size={12} className="ml-auto text-violet-400" />}
                </button>
                {members.map(m => (
                  <button key={m.user_id} type="button" onClick={() => set('assignee_id', m.user_id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-violet-500/10 ${form.assignee_id === m.user_id ? 'text-violet-400 font-medium' : ''}`}
                    style={{ color: form.assignee_id === m.user_id ? undefined : 'var(--text-2)' }}>
                    <Avatar user={{ name: m.name, avatar_url: m.avatar_url }} size={5} />
                    <span className="flex-1 text-left truncate">{m.name}</span>
                    {form.assignee_id === m.user_id && <Check size={12} className="text-violet-400 shrink-0" />}
                  </button>
                ))}
              </Dropdown>
            </div>

            {/* meeting */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Meeting</label>
              <Dropdown
                trigger={
                  <button type="button"
                    className="w-full flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm transition-colors hover:border-violet-500/40 glass-input"
                    style={{ border: '1px solid var(--input-border)', color: 'var(--text-2)' }}>
                    <ClipboardList size={14} style={{ color: 'var(--text-3)' }} />
                    <span className="flex-1 text-left truncate">{selectedMeeting?.title ?? 'General'}</span>
                    <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />
                  </button>
                }
              >
                <div className="max-h-52 overflow-y-auto">
                  <button type="button" onClick={() => set('job_id', '')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/[0.05] ${!form.job_id ? 'text-violet-400 font-medium' : ''}`}
                    style={{ color: form.job_id ? 'var(--text-3)' : undefined }}>
                    <Tag size={13} style={{ color: 'var(--text-3)' }} />
                    <span className="flex-1 text-left">General</span>
                    {!form.job_id && <Check size={12} className="text-violet-400" />}
                  </button>
                  {meetings.map(m => (
                    <button key={m.id} type="button" onClick={() => set('job_id', m.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-violet-500/10 ${form.job_id === m.id ? 'text-violet-400 font-medium' : ''}`}
                      style={{ color: form.job_id === m.id ? undefined : 'var(--text-2)' }}>
                      <ClipboardList size={13} style={{ color: 'var(--text-3)' }} />
                      <span className="flex-1 text-left truncate">{m.title}</span>
                      {form.job_id === m.id && <Check size={12} className="text-violet-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </Dropdown>
            </div>

            {/* deadline */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => set('deadline', e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/40 glass-input"
                style={{ border: '1px solid var(--input-border)', color: 'var(--text-2)' }}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-2.5 text-sm">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* footer */}
          <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-4 sm:px-6"
            style={{ borderTop: '1px solid var(--divider)' }}>
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium transition-colors hover:text-violet-400"
              style={{ color: 'var(--text-3)' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Tasks() {
  const { user }              = useAuth()
  const { activeWorkspace }   = useWorkspace()
  const [tasks,        setTasks]        = useState([])
  const [members,      setMembers]      = useState([])
  const [meetings,     setMeetings]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [draggingId,   setDraggingId]   = useState(null)
  const [draggingOver, setDraggingOver] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [createOpen,   setCreateOpen]   = useState(false)
  const [mobileTab,    setMobileTab]    = useState('todo')

  useEffect(() => {
    if (!activeWorkspace?.id) return
    setLoading(true)
    api.get(`/tasks/workspace/${activeWorkspace.id}`)
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeWorkspace?.id])

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

  useEffect(() => {
    if (!activeWorkspace?.id) return
    api.get(`/meetings?workspace_id=${activeWorkspace.id}`)
      .then(data => setMeetings(data.filter(m => m.status === 'done')))
      .catch(() => {})
  }, [activeWorkspace?.id])

  function handleDragStart(e, task) {
    setDraggingId(task.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('taskId', task.id)
  }

  function handleDragOver(e, colKey) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDraggingOver(colKey)
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDraggingOver(null)
  }

  async function handleDrop(e, newStatus) {
    e.preventDefault()
    setDraggingOver(null)
    const taskId = e.dataTransfer.getData('taskId')
    const task   = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) { setDraggingId(null); return }

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    setDraggingId(null)
    if (selectedTask?.id === taskId) setSelectedTask(t => ({ ...t, status: newStatus }))

    try {
      const updated = await api.patch(`/tasks/${taskId}`, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    } catch {
      setTasks(prev => prev.map(t => t.id === taskId ? task : t))
    }
  }

  function handleUpdated(updated) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    if (selectedTask?.id === updated.id) setSelectedTask(updated)
  }

  function handleDeleted(taskId) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    if (selectedTask?.id === taskId) setSelectedTask(null)
  }

  function handleCreated(task) {
    setTasks(prev => [task, ...prev])
  }

  const byStatus   = s => tasks.filter(t => t.status === s)
  const totalDone  = tasks.filter(t => t.status === 'done').length

  return (
    <div className="flex h-screen app-bg app-grid overflow-hidden">
      <Sidebar active="tasks" />

      <main className="min-w-0 flex-1 flex flex-col overflow-hidden relative z-[1]">

        {/* ── Page header ── */}
        <div className="shrink-0 px-4 sm:px-8 pt-6 sm:pt-7 pb-4 sm:pb-5" style={{ borderBottom: '1px solid var(--divider)' }}>
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>
              {activeWorkspace?.name ?? 'Your workspace'}
            </p>
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5" style={{ color: 'var(--text-1)' }}>
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
                  <CheckSquare size={17} className="text-white" />
                </span>
                Tasks
              </h1>
              <div className="flex items-center gap-3 sm:gap-4">
                {tasks.length > 0 && (
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                      <span className="font-semibold text-emerald-400">{totalDone}</span>
                      <span> / {tasks.length} done</span>
                    </span>
                    <div className="w-28 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${tasks.length ? (totalDone / tasks.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-3.5 py-2 rounded-xl shadow-sm shadow-violet-500/20 transition-all"
                >
                  <Plus size={15} />
                  Create Task
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Mobile tab bar ── */}
        <div className="lg:hidden shrink-0 flex" style={{ borderBottom: '1px solid var(--divider)' }}>
          {COLUMNS.map(col => (
            <button
              key={col.key}
              onClick={() => setMobileTab(col.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors relative"
              style={{ color: mobileTab === col.key ? 'var(--text-1)' : 'var(--text-3)' }}
            >
              <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
              {col.label}
              <span className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${col.color}`}>
                {byStatus(col.key).length}
              </span>
              {mobileTab === col.key && (
                <motion.div layoutId="mobile-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Mobile list ── */}
        <div className="lg:hidden flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2" style={{ color: 'var(--text-3)' }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading tasks…</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileTab}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-2.5"
              >
                {byStatus(mobileTab).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'var(--text-3)' }}>
                    <div className="w-12 h-12 rounded-2xl border-2 border-dashed flex items-center justify-center" style={{ borderColor: 'var(--divider)' }}>
                      <Plus size={18} style={{ color: 'var(--text-3)' }} />
                    </div>
                    <p className="text-sm">No tasks here</p>
                  </div>
                ) : (
                  byStatus(mobileTab).map(task => (
                    <motion.div key={task.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <TaskCard task={task} onDragStart={() => {}} onClick={setSelectedTask} />
                    </motion.div>
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* ── Desktop kanban board ── */}
        <div className="hidden lg:block flex-1 overflow-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-full gap-2" style={{ color: 'var(--text-3)' }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading tasks…</span>
            </div>
          ) : (
            <div className="grid h-full grid-cols-3 gap-4">
              {COLUMNS.map(col => (
                <Column
                  key={col.key}
                  col={col}
                  tasks={byStatus(col.key)}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  draggingOver={draggingOver}
                  onDragOver={e => handleDragOver(e, col.key)}
                  onDragLeave={handleDragLeave}
                  onCardClick={setSelectedTask}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {selectedTask && (
          <TaskDrawer
            key={selectedTask.id}
            task={selectedTask}
            members={members}
            meetings={meetings}
            onClose={() => setSelectedTask(null)}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {createOpen && (
          <CreateTaskModal
            workspaceId={activeWorkspace?.id}
            members={members}
            meetings={meetings}
            onCreate={handleCreated}
            onClose={() => setCreateOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
