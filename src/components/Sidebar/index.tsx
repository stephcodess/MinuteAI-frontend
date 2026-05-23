import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, LayoutDashboard, Upload, CreditCard, Settings, LogOut,
  Zap, Plus, Users, ChevronsUpDown, Check, Pencil, Trash2, X, Loader2, CheckSquare,
  Bell, CheckCircle2, ClipboardList, Bot, Menu, Languages, Sun, Moon, ChevronDown, Disc, Plug, Headphones, GitBranch,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useTheme } from '../../context/ThemeContext'
import { api } from '../../lib/api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const NAV_GROUPS = [
  {
    label: null,
    collapsible: false,
    items: [
      { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
    ],
  },
  {
    label: 'Meetings',
    collapsible: true,
    items: [
      { key: 'upload', icon: Upload, label: 'New meeting', to: '/upload', badge: 'new' },
      { key: 'recordings', icon: Disc, label: 'Recordings', to: '/recordings' },
      { key: 'meeting-bots', icon: Bot, label: 'Meeting Bots', to: '/meeting-bots' },
      { key: 'translator', icon: Languages, label: 'Live Translate', to: '/translator' },
    ],
  },
  {
    label: 'Workspace',
    collapsible: false,
    items: [
      { key: 'tasks', icon: CheckSquare, label: 'My Tasks', to: '/tasks' },
      { key: 'threads', icon: GitBranch, label: 'Meeting Threads', to: '/threads' },
      { key: 'team', icon: Users, label: 'Team', to: '/team' },
      { key: 'integrations', icon: Plug, label: 'Integrations', to: '/integrations' },
    ],
  },
  {
    label: 'Tools',
    collapsible: false,
    items: [
      { key: 'pdf-to-audio', icon: Headphones, label: 'PDF to Audio', to: '/pdf-to-audio' },
    ],
  },
  {
    label: 'Account',
    collapsible: false,
    items: [
      { key: 'upgrade plan', icon: CreditCard, label: 'Upgrade Access', to: '/billing', accent: 'zap' },
      { key: 'settings', icon: Settings, label: 'Settings', to: '/settings' },
    ],
  },
]

function UserAvatar({ name, avatarUrl, size = 8 }) {
  const initials = (name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  if (avatarUrl) {
    return <img src={`${BASE}${avatarUrl}`} alt="" className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />
  }
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0`}>
      {initials}
    </div>
  )
}

// ── Create workspace modal ────────────────────────────────────────────────────

function CreateWorkspaceModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setError(null); setLoading(true)
    try { await onCreate(name.trim()); onClose() }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-sm bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Plus size={16} className="text-violet-400" />
            </div>
            <h2 className="text-base font-bold text-white">New workspace</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Workspace name</label>
            <input
              autoFocus value={name}
              onChange={e => { setName(e.target.value); setError(null) }}
              placeholder="e.g. Marketing team…"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
            />
            {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
          </div>
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-white/10 text-sm font-semibold text-slate-400 hover:bg-white/[0.04] transition-colors">
              Cancel
            </button>
            <motion.button type="submit" disabled={loading || !name.trim()}
              whileHover={!loading && name.trim() ? { scale: 1.01 } : {}}
              whileTap={!loading && name.trim() ? { scale: 0.98 } : {}}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-all">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {loading ? 'Creating…' : 'Create'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Workspace switcher ────────────────────────────────────────────────────────

function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace, renameWorkspace, deleteWorkspace } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setEditingId(null) }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = (activeWorkspace?.name || 'W').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  async function handleRename(e, id) {
    e.preventDefault()
    if (!editName.trim()) return
    await renameWorkspace(id, editName.trim())
    setEditingId(null)
  }

  async function handleDelete(id) {
    try { await deleteWorkspace(id) } catch { }
  }

  return (
    <div ref={ref} className="relative px-3 py-2 border-b border-white/[0.06]">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.05] transition-colors">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {initials}
        </div>
        <span className="text-sm font-semibold text-white flex-1 text-left truncate">
          {activeWorkspace?.name ?? 'Select workspace'}
        </span>
        <ChevronsUpDown size={13} className="text-slate-500 shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute left-3 right-3 top-full mt-1 bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 pt-3 pb-1.5">Workspaces</p>
            {workspaces.map(ws => {
              const wsInit = ws.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
              const isActive = ws.id === activeWorkspace?.id
              const isEditing = editingId === ws.id
              return (
                <div key={ws.id} className={`group flex items-center gap-2.5 px-3 py-2 transition-colors ${isActive ? 'bg-violet-500/10' : 'hover:bg-white/[0.04]'}`}>
                  {isEditing ? (
                    <form onSubmit={e => handleRename(e, ws.id)} className="flex-1 flex gap-1.5 items-center">
                      <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs rounded-lg bg-white/[0.06] border border-white/10 text-white focus:outline-none focus:border-violet-500/50" />
                      <button type="submit" className="text-violet-400 hover:text-violet-300 text-xs font-semibold px-1.5">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-slate-500 hover:text-white"><X size={12} /></button>
                    </form>
                  ) : (
                    <button onClick={() => { switchWorkspace(ws.id); setOpen(false) }}
                      className="flex-1 flex items-center gap-2.5 text-left min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${isActive ? 'bg-violet-600 text-white' : 'bg-white/[0.06] text-slate-400'}`}>
                        {wsInit}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${isActive ? 'text-violet-300' : 'text-white'}`}>{ws.name}</p>
                        <p className="text-[10px] text-slate-500">{ws.member_count} member{ws.member_count !== 1 ? 's' : ''} · {ws.is_owner ? 'Owner' : 'Member'}</p>
                      </div>
                      {isActive && <Check size={13} className="text-violet-400 shrink-0" />}
                    </button>
                  )}
                  {ws.is_owner && !isEditing && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => { setEditingId(ws.id); setEditName(ws.name) }}
                        className="p-1 rounded text-slate-500 hover:text-violet-400 transition-colors"><Pencil size={11} /></button>
                      {workspaces.length > 1 && (
                        <button onClick={() => handleDelete(ws.id)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={11} /></button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            <div className="border-t border-white/[0.06] p-2">
              <button onClick={() => { setOpen(false); setShowModal(true) }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-violet-500/10 text-violet-400 transition-colors">
                <Plus size={13} />
                <span className="text-xs font-semibold">Create workspace</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showModal && createPortal(
        <AnimatePresence>
          <CreateWorkspaceModal onClose={() => setShowModal(false)} onCreate={createWorkspace} />
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

// ── Notification bell ─────────────────────────────────────────────────────────

const NOTIF_ICONS = { meeting_done: CheckCircle2, task_assigned: ClipboardList }

function timeAgo(iso) {
  if (!iso) return ''
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const panelRef = useRef(null)
  const btnRef = useRef(null)
  const unread = notifications.filter(n => !n.read).length

  function load() { api.get('/notifications').then(setNotifications).catch(() => { }) }

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id) }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleClick(n) {
    if (!n.read) {
      setNotifications(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x))
      api.post(`/notifications/${n.id}/read`, {}).catch(() => { })
    }
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  function markAllRead() {
    setNotifications(ns => ns.map(n => ({ ...n, read: true })))
    api.post('/notifications/read-all', {}).catch(() => { })
  }

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen(v => !v)}
        className="relative p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors">
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-violet-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-40 bg-black"
                onClick={() => setOpen(false)} />
              <motion.div ref={panelRef}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                className="fixed left-4 right-4 top-4 bottom-4 z-[110] flex flex-col overflow-hidden rounded-3xl bg-[#0d1117] border border-white/10 shadow-2xl md:bottom-0 md:left-60 md:right-auto md:top-0 md:w-80 md:rounded-none md:border-r"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
                  <div className="flex items-center gap-2">
                    <Bell size={15} className="text-violet-400" />
                    <h3 className="text-sm font-bold text-white">Notifications</h3>
                    {unread > 0 && <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-300 text-[10px] font-bold rounded-full">{unread} new</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-[11px] font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8 py-12">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                        <Bell size={20} className="text-slate-600" />
                      </div>
                      <p className="text-sm font-semibold text-slate-400">No notifications yet</p>
                      <p className="text-xs text-slate-600 leading-relaxed">You'll be notified when meetings are ready or tasks are assigned.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.04]">
                      {notifications.map(n => {
                        const Icon = NOTIF_ICONS[n.type] || Bell
                        const isGreen = n.type === 'meeting_done'
                        return (
                          <button style={{ borderRadius: 2 }} key={n.id} onClick={() => handleClick(n)}
                            className={`w-full flex items-start gap-2.5 px-4 py-2.5 text-left hover:bg-white/[0.03] transition-colors ${!n.read ? 'bg-violet-500/5' : ''}`}>
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isGreen ? 'bg-emerald-500/10' : 'bg-violet-500/10'}`}>
                              <Icon size={12} className={isGreen ? 'text-emerald-400' : 'text-violet-400'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold leading-snug ${n.read ? 'text-slate-400' : 'text-white'}`}>{n.title}</p>
                              {n.body && <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-1">{n.body}</p>}
                              <p className="text-[10px] text-slate-600 mt-0.5">{timeAgo(n.created_at)}</p>
                            </div>
                            {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0 mt-1.5" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar({ active }) {
  const { user, signOut } = useAuth()
  const { theme, toggle, isDark } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [usage, setUsage] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { api.get('/users/me/usage').then(setUsage).catch(() => { }) }, [])
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const plan = usage?.plan ?? 'free'
  const used = usage?.meetings_used ?? 0
  const limit = usage?.meetings_limit ?? 3
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const planLabel = plan === 'free' ? 'Free plan' : plan === 'pro' ? 'Pro plan' : 'Team plan'

  function closeMobileSidebar() { setMobileOpen(false) }

  // ── Collapsible group state ───────────────────────────────────────────────
  const meetingKeys = NAV_GROUPS.find(g => g.label === 'Meetings')?.items.map(i => i.key) ?? []
  const isMeetingActive = meetingKeys.includes(active)

  const [openGroups, setOpenGroups] = useState(() => ({
    Meetings: true,
  }))

  // Auto-open meetings group when navigating to a meetings page
  useEffect(() => {
    if (isMeetingActive) setOpenGroups(prev => ({ ...prev, Meetings: true }))
  }, [isMeetingActive])

  function toggleGroup(label) {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <>
      {/* Mobile toggle */}
      <button type="button" onClick={() => setMobileOpen(true)}
        className="fixed right-3 top-3 z-[80] flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#0a0d1a]/90 text-slate-300 shadow-lg backdrop-blur md:hidden"
        aria-label="Open sidebar">
        <Menu size={18} />
      </button>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.button type="button"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={closeMobileSidebar}
            className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm md:hidden"
            aria-label="Close sidebar backdrop" />
        )}
      </AnimatePresence>

      <aside className={`fixed inset-y-0 left-0 z-[90] w-72 max-w-[86vw] shrink-0 flex flex-col h-screen transition-transform duration-300 md:sticky md:top-0 md:z-auto md:w-60 md:max-w-none md:translate-x-0 ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`} style={{ backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>

        {/* Logo */}
        <div className="px-5 py-4 flex items-center" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          <Link to="/" onClick={closeMobileSidebar} className="flex items-center gap-2.5 font-bold flex-1" style={{ color: 'var(--text-1)' }}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Mic size={15} className="text-white" />
            </div>
            <span className="text-base">MinuteAI</span>
          </Link>
          <NotificationBell />
          <button type="button" onClick={closeMobileSidebar}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-xl transition md:hidden"
            style={{ color: 'var(--text-3)' }}
            aria-label="Close sidebar">
            <X size={16} />
          </button>
        </div>

        {/* Workspace switcher */}
        <WorkspaceSwitcher />

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => {
            const isOpen = group.collapsible ? (openGroups[group.label] ?? false) : true
            const hasActiveItem = group.items.some(i => i.key === active)
            return (
              <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
                {group.label && !group.collapsible && (
                  <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                    {group.label}
                  </p>
                )}

                {/* Collapsible group header */}
                {group.collapsible && group.label && (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5 transition-all text-xs font-bold uppercase tracking-widest"
                    style={{ color: hasActiveItem ? undefined : 'var(--text-3)', color2: hasActiveItem ? 'rgb(167,139,250)' : undefined }}
                    data-active={hasActiveItem}
                  >
                    <span className="flex-1 text-left" style={{ color: hasActiveItem ? 'rgb(167,139,250)' : 'var(--text-3)' }}>{group.label}</span>
                    {hasActiveItem && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="shrink-0"
                      style={{ color: hasActiveItem ? 'rgb(167,139,250)' : 'var(--text-3)' }}
                    >
                      <ChevronDown size={13} />
                    </motion.div>
                  </button>
                )}

                {/* Items (animated for collapsible) */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="items"
                      initial={group.collapsible ? { height: 0, opacity: 0 } : false}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className={`space-y-0.5 ${group.collapsible ? 'pl-2 border-l border-white/[0.06] ml-3' : ''}`}>
                        {group.items.map(({ key, icon: Icon, label, to, badge, accent }) => {
                          const isActive = active === key
                          return (
                            <Link key={key} to={to} onClick={closeMobileSidebar}
                              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'nav-active' : 'nav-idle'
                                }`}>
                              {isActive && <span className="absolute left-0 inset-y-1.5 w-0.5 rounded-full bg-violet-400" />}
                              <Icon size={16} />
                              <span className="flex-1">{label}</span>
                              {badge === 'new' && (
                                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-sm">
                                  <Plus size={11} className="text-white" />
                                </span>
                              )}
                              {accent === 'zap' && !isActive && (
                                <Zap size={12} className="text-violet-400 shrink-0" />
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </nav>

        {/* Usage meter */}
        <div className="mx-3 mb-3 rounded-2xl p-4 glass-card border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{planLabel}</span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>{used}/{limit}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--input-bg)' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full" />
          </div>
          {plan === 'free' && (
            <Link to="/billing" onClick={closeMobileSidebar}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold shadow-sm shadow-violet-500/30 hover:from-violet-500 hover:to-indigo-500 transition-all">
              <Zap size={11} /> Upgrade to Pro
            </Link>
          )}
        </div>

        {/* User + theme toggle */}
        <div className="px-3 pb-4 pt-3" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          {/* Theme toggle */}
          <button onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl mb-1 transition-colors"
            style={{ color: 'var(--text-3)' }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            <motion.div
              key={theme}
              initial={{ rotate: -30, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </motion.div>
            <span className="text-xs font-medium">{isDark ? 'Light mode' : 'Dark mode'}</span>
            <div className="ml-auto w-9 h-5 rounded-full relative transition-colors" style={{ background: isDark ? 'rgba(139,92,246,0.4)' : 'rgba(0,0,0,0.15)' }}>
              <motion.div animate={{ x: isDark ? 16 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
            </div>
          </button>
          {/* User / sign out */}
          <button onClick={() => { closeMobileSidebar(); signOut(); navigate('/') }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group"
            style={{ color: 'var(--text-2)' }}>
            <UserAvatar name={user?.name || 'User'} avatarUrl={user?.avatar_url} size={8} />
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{user?.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{user?.email}</p>
            </div>
            <LogOut size={14} className="group-hover:text-red-400 transition-colors shrink-0" />
          </button>
        </div>
      </aside>
    </>
  )
}
