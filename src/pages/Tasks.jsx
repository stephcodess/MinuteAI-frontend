import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Circle, Loader2, CalendarDays, ClipboardList,
  ChevronRight, Plus, GripVertical, User, X, ChevronDown,
  Trash2, Check, Tag, AlertCircle, ExternalLink,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import Sidebar from '../components/Sidebar'
import { api } from '../lib/api'

const COLUMNS = [
  { key: 'todo',        label: 'To Do',       color: 'bg-gray-100 text-gray-600',  headerColor: 'bg-gray-50 border-gray-200',   dotColor: 'bg-gray-400',  dropBg: 'bg-gray-50/80',   dropRing: 'ring-gray-300'  },
  { key: 'in_progress', label: 'In Progress',  color: 'bg-blue-50 text-blue-600',   headerColor: 'bg-blue-50/60 border-blue-100', dotColor: 'bg-blue-500',  dropBg: 'bg-blue-50/60',   dropRing: 'ring-blue-300'  },
  { key: 'done',        label: 'Done',         color: 'bg-green-50 text-green-700', headerColor: 'bg-green-50/60 border-green-100', dotColor: 'bg-green-500', dropBg: 'bg-green-50/60', dropRing: 'ring-green-300' },
]

const STATUS_META = {
  todo:        { label: 'To Do',       cls: 'bg-gray-100 text-gray-600',  dot: 'bg-gray-400'  },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-600',   dot: 'bg-blue-500'  },
  done:        { label: 'Done',        cls: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
}

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ user, size = 6 }) {
  if (!user) return (
    <div className={`w-${size} h-${size} rounded-full bg-gray-100 flex items-center justify-center shrink-0`}>
      <User size={size * 2} className="text-gray-400" />
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
            className={`absolute top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden min-w-[180px] ${align === 'right' ? 'right-0' : 'left-0'}`}
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
  const meta   = STATUS_META[task.status] || STATUS_META.todo

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task)}
      onClick={() => onClick(task)}
      className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-violet-200 transition-all cursor-pointer active:cursor-grabbing active:opacity-60 active:scale-[0.98] select-none"
    >
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
        <GripVertical size={13} className="text-gray-400" />
      </div>

      <div className="px-4 py-3 pl-6">
        <p className={`text-sm font-medium leading-snug mb-2.5 ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.title}
        </p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {task.job_id ? (
              <span className="flex items-center gap-1 text-[10px] text-violet-500 font-medium bg-violet-50 px-1.5 py-0.5 rounded-md truncate max-w-[130px]">
                <ClipboardList size={9} />
                {task.meeting_title || 'Meeting'}
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md font-medium">
                General
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {task.deadline && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <CalendarDays size={9} />
                {task.deadline}
              </span>
            )}
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
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl border ${col.headerColor}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
        <span className="text-sm font-semibold text-gray-700">{col.label}</span>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${col.color}`}>
          {tasks.length}
        </span>
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={e => onDrop(e, col.key)}
        className={`flex-1 min-h-[360px] rounded-b-xl border border-t-0 ${col.headerColor} transition-all duration-150 sm:min-h-[520px] ${
          isOver ? `${col.dropBg} ring-2 ${col.dropRing} ring-inset` : ''
        }`}
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
            <div className="flex flex-col items-center justify-center py-12 text-gray-300 select-none">
              <div className="w-10 h-10 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center mb-2">
                <Plus size={16} className="text-gray-300" />
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
  const current = value ? members.find(m => m.user_id === value.id) : null

  return (
    <Dropdown
      trigger={
        <button
          disabled={disabled}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-violet-600 transition-colors w-full"
        >
          <Avatar user={value} size={6} />
          <span className="flex-1 text-left truncate">{value?.name ?? 'Unassigned'}</span>
          <ChevronDown size={13} className="text-gray-400 shrink-0" />
        </button>
      }
    >
      <button
        onClick={() => onChange(null)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
          <User size={12} className="text-gray-400" />
        </div>
        Unassigned
        {!value && <Check size={12} className="ml-auto text-violet-500" />}
      </button>
      {members.map(m => (
        <button
          key={m.user_id}
          onClick={() => onChange(m)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-violet-50 transition-colors ${
            value?.id === m.user_id ? 'text-violet-700 bg-violet-50/60 font-medium' : 'text-gray-700'
          }`}
        >
          <Avatar user={{ name: m.name, avatar_url: m.avatar_url, initials: m.name?.[0] }} size={6} />
          <span className="flex-1 text-left truncate">{m.name}</span>
          {value?.id === m.user_id && <Check size={12} className="text-violet-500 shrink-0" />}
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
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-violet-600 transition-colors w-full"
        >
          <ClipboardList size={14} className="text-gray-400 shrink-0" />
          <span className="flex-1 text-left truncate">{current?.title ?? 'General'}</span>
          <ChevronDown size={13} className="text-gray-400 shrink-0" />
        </button>
      }
    >
      <div className="max-h-60 overflow-y-auto">
        <button
          onClick={() => onChange(null)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 ${!value ? 'text-violet-700 font-medium' : 'text-gray-600'}`}
        >
          <Tag size={13} className="text-gray-400" />
          <span className="flex-1 text-left">General</span>
          {!value && <Check size={12} className="text-violet-500" />}
        </button>
        {meetings.map(m => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-violet-50 ${value === m.id ? 'text-violet-700 bg-violet-50/60 font-medium' : 'text-gray-700'}`}
          >
            <ClipboardList size={13} className="text-gray-400" />
            <span className="flex-1 text-left truncate">{m.title}</span>
            {value === m.id && <Check size={12} className="text-violet-500 shrink-0" />}
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
      // revert local state on failure
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
      {/* backdrop */}
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      {/* panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed bottom-0 right-0 top-0 z-40 flex w-full max-w-[440px] flex-col bg-white shadow-2xl sm:w-[440px]"
      >
        {/* header */}
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${STATUS_META[task.status]?.dot ?? 'bg-gray-400'}`} />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Task</span>
            {saving && <Loader2 size={12} className="animate-spin text-violet-400" />}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000) } else handleDelete() }}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all ${
                confirmDel
                  ? 'bg-red-500 text-white font-semibold'
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
            >
              <Trash2 size={13} />
              {confirmDel ? 'Confirm delete' : 'Delete'}
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
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
                className="w-full text-lg font-semibold text-gray-900 leading-snug resize-none border-0 outline-0 focus:ring-2 focus:ring-violet-300 rounded-lg p-2 -ml-2 bg-violet-50/50"
                rows={3}
                autoFocus
              />
            ) : (
              <h2
                onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.focus(), 10) }}
                className="text-lg font-semibold text-gray-900 leading-snug cursor-text hover:bg-violet-50/50 rounded-lg p-2 -ml-2 transition-colors"
              >
                {task.title}
              </h2>
            )}
          </div>

          {/* status */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => patch({ status: key })}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    task.status === key
                      ? `${meta.cls} border-current shadow-sm`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          {/* details */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Details</p>

            <div className="space-y-3">
              {/* assignee */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-xs text-gray-500 sm:w-20 sm:shrink-0">Assignee</span>
                <div className="flex-1">
                  <AssigneePicker
                    value={task.assignee}
                    members={members}
                    onChange={m => patch({ assignee_id: m ? m.user_id : '' })}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* meeting */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-xs text-gray-500 sm:w-20 sm:shrink-0">Meeting</span>
                <div className="flex-1">
                  <MeetingPicker
                    value={task.job_id}
                    meetings={meetings}
                    onChange={jobId => patch({ job_id: jobId ?? '' })}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* deadline */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-xs text-gray-500 sm:w-20 sm:shrink-0">Deadline</span>
                <input
                  type="date"
                  value={task.deadline ?? ''}
                  onChange={e => patch({ deadline: e.target.value || '' })}
                  disabled={saving}
                  className="flex-1 text-sm text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* meeting link */}
          {linkedMeeting && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Linked Meeting</p>
              <Link
                to={`/results/${task.job_id}`}
                onClick={onClose}
                className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium"
              >
                <ClipboardList size={14} />
                <span className="flex-1 truncate">{linkedMeeting.title}</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          )}

          {/* meta */}
          <div className="pt-2 border-t border-gray-100">
            {task.owner_name && !task.assignee && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                <AlertCircle size={12} />
                Originally assigned to <strong>{task.owner_name}</strong> (no matching user found)
              </div>
            )}
            {task.created_at && (
              <p className="text-xs text-gray-400">
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
      <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{ opacity: 0,  scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none"
      >
        <form
          onSubmit={handleSubmit}
          className="pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Create Task</h2>
            <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-4 py-5 space-y-4 sm:px-6">
            {/* title */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Task title <span className="text-red-400">*</span></label>
              <input
                autoFocus
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="What needs to be done?"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
              />
            </div>

            {/* status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Status</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_META).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set('status', key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      form.status === key
                        ? `${meta.cls} border-current shadow-sm`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>

            {/* assignee */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Assignee</label>
              <Dropdown
                trigger={
                  <button type="button" className="w-full flex items-center gap-2 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 hover:border-violet-300 transition-colors">
                    <Avatar user={selectedMember ? { name: selectedMember.name, avatar_url: selectedMember.avatar_url } : null} size={5} />
                    <span className="flex-1 text-left truncate">{selectedMember?.name ?? 'Unassigned'}</span>
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>
                }
              >
                <button type="button" onClick={() => set('assignee_id', '')} className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 ${!form.assignee_id ? 'font-medium' : ''}`}>
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"><User size={12} className="text-gray-400" /></div>
                  Unassigned
                  {!form.assignee_id && <Check size={12} className="ml-auto text-violet-500" />}
                </button>
                {members.map(m => (
                  <button key={m.user_id} type="button" onClick={() => set('assignee_id', m.user_id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-violet-50 ${form.assignee_id === m.user_id ? 'text-violet-700 bg-violet-50/60 font-medium' : 'text-gray-700'}`}>
                    <Avatar user={{ name: m.name, avatar_url: m.avatar_url }} size={5} />
                    <span className="flex-1 text-left truncate">{m.name}</span>
                    {form.assignee_id === m.user_id && <Check size={12} className="text-violet-500 shrink-0" />}
                  </button>
                ))}
              </Dropdown>
            </div>

            {/* meeting */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Meeting</label>
              <Dropdown
                trigger={
                  <button type="button" className="w-full flex items-center gap-2 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 hover:border-violet-300 transition-colors">
                    <ClipboardList size={14} className="text-gray-400" />
                    <span className="flex-1 text-left truncate">{selectedMeeting?.title ?? 'General'}</span>
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>
                }
              >
                <div className="max-h-52 overflow-y-auto">
                  <button type="button" onClick={() => set('job_id', '')} className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 ${!form.job_id ? 'text-violet-700 font-medium' : 'text-gray-600'}`}>
                    <Tag size={13} className="text-gray-400" />
                    <span className="flex-1 text-left">General</span>
                    {!form.job_id && <Check size={12} className="text-violet-500" />}
                  </button>
                  {meetings.map(m => (
                    <button key={m.id} type="button" onClick={() => set('job_id', m.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-violet-50 ${form.job_id === m.id ? 'text-violet-700 bg-violet-50/60 font-medium' : 'text-gray-700'}`}>
                      <ClipboardList size={13} className="text-gray-400" />
                      <span className="flex-1 text-left truncate">{m.title}</span>
                      {form.job_id === m.id && <Check size={12} className="text-violet-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              </Dropdown>
            </div>

            {/* deadline */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => set('deadline', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 text-sm">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* footer */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-4 py-4 sm:px-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 text-white disabled:text-gray-400 text-sm font-semibold rounded-xl transition-all"
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

  // Fetch tasks
  useEffect(() => {
    if (!activeWorkspace?.id) return
    setLoading(true)
    api.get(`/tasks/workspace/${activeWorkspace.id}`)
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeWorkspace?.id])

  // Fetch members
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

  // Fetch meetings
  useEffect(() => {
    if (!activeWorkspace?.id) return
    api.get(`/meetings?workspace_id=${activeWorkspace.id}`)
      .then(data => setMeetings(data.filter(m => m.status === 'done')))
      .catch(() => {})
  }, [activeWorkspace?.id])

  // Drag & drop
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
    // Also update drawer if open
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

  const byStatus = s => tasks.filter(t => t.status === s)
  const totalDone = tasks.filter(t => t.status === 'done').length

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar active="tasks" />

      <main className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* top bar */}
        <div className="shrink-0 border-b border-gray-100 bg-white/80 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Tasks</h1>
            <p className="text-xs text-gray-400">
              {activeWorkspace?.name ?? 'Workspace'} · {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {tasks.length > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  <span className="font-semibold text-green-600">{totalDone}</span> / {tasks.length} done
                </span>
                <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${tasks.length ? (totalDone / tasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-3.5 py-2 rounded-xl shadow-sm shadow-violet-200 transition-all hover:shadow-md"
            >
              <Plus size={15} />
              Create Task
            </button>
          </div>
          </div>
        </div>

        {/* board */}
        <div className="flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-5">
          {loading ? (
            <div className="flex items-center justify-center h-full gap-2 text-gray-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading tasks…</span>
            </div>
          ) : (
            <div className="grid h-full min-w-[900px] grid-cols-3 gap-4 lg:min-w-0">
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

      {/* Task detail drawer */}
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

      {/* Create task modal */}
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
