import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, LayoutDashboard, Upload, CreditCard, Settings, LogOut,
  Zap, Plus, Users, ChevronsUpDown, Check, Pencil, Trash2, X, Loader2, CheckSquare,
  Bell, CheckCircle2, ClipboardList, Bot, Menu, Languages, Sun, Moon, ChevronDown, Disc, Plug, Headphones, GitBranch, BarChart2,
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
      { key: 'analytics', icon: BarChart2, label: 'Analytics', to: '/analytics' },
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
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 glass-dropdown border"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Plus size={16} className="text-violet-400" />
            </div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>New workspace</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>
              Workspace name
            </label>
            <input
              autoFocus value={name}
              onChange={e => { setName(e.target.value); setError(null) }}
              placeholder="e.g. Marketing team…"
              className="glass-input w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
            />
            {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
          </div>
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-full border text-sm font-semibold transition-colors"
              style={{ borderColor: 'var(--input-border)', color: 'var(--text-2)' }}>
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
    <div ref={ref} className="relative px-3 py-2 border-b divider">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors"
        style={{ color: 'var(--text-1)' }}>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {initials}
        </div>
        <span className="text-sm font-semibold flex-1 text-left truncate">
          {activeWorkspace?.name ?? 'Select workspace'}
        </span>
        <ChevronsUpDown size={13} style={{ color: 'var(--text-3)' }} className="shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute left-3 right-3 top-full mt-1 glass-dropdown border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest px-4 pt-3 pb-1.5" style={{ color: 'var(--text-3)' }}>
              Workspaces
            </p>
            {workspaces.map(ws => {
              const wsInit = ws.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
              const isActive = ws.id === activeWorkspace?.id
              const isEditing = editingId === ws.id
              return (
                <div key={ws.id} className={`group flex items-center gap-2.5 px-3 py-2 transition-colors ${isActive ? 'bg-violet-500/10' : ''}`}
                  style={{ background: isActive ? undefined : undefined }}>
                  {isEditing ? (
                    <form onSubmit={e => handleRename(e, ws.id)} className="flex-1 flex gap-1.5 items-center">
                      <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                        className="glass-input flex-1 px-2 py-1 text-xs rounded-lg border focus:outline-none focus:border-violet-500/50" />
                      <button type="submit" className="text-violet-400 hover:text-violet-300 text-xs font-semibold px-1.5">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} style={{ color: 'var(--text-3)' }}><X size={12} /></button>
                    </form>
                  ) : (
                    <button onClick={() => { switchWorkspace(ws.id); setOpen(false) }}
                      className="flex-1 flex items-center gap-2.5 text-left min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${isActive ? 'bg-violet-600 text-white' : ''}`}
                        style={isActive ? {} : { background: 'var(--input-bg)', color: 'var(--text-2)' }}>
                        {wsInit}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${isActive ? 'text-violet-300' : ''}`}
                          style={isActive ? {} : { color: 'var(--text-1)' }}>
                          {ws.name}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                          {ws.member_count} member{ws.member_count !== 1 ? 's' : ''} · {ws.is_owner ? 'Owner' : 'Member'}
                        </p>
                      </div>
                      {isActive && <Check size={13} className="text-violet-400 shrink-0" />}
                    </button>
                  )}
                  {ws.is_owner && !isEditing && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => { setEditingId(ws.id); setEditName(ws.name) }}
                        className="p-1 rounded hover:text-violet-400 transition-colors"
                        style={{ color: 'var(--text-3)' }}>
                        <Pencil size={11} />
                      </button>
                      {workspaces.length > 1 && (
                        <button onClick={() => handleDelete(ws.id)}
                          className="p-1 rounded hover:text-red-400 transition-colors"
                          style={{ color: 'var(--text-3)' }}>
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            <div className="border-t divider p-2">
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

  useEffect(() => {
    load()
    const onVisible = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

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
        className="relative p-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--text-3)' }}>
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
                className="fixed left-4 right-4 top-4 bottom-4 z-[110] flex flex-col overflow-hidden rounded-3xl glass-dropdown border shadow-2xl md:bottom-0 md:left-60 md:right-auto md:top-0 md:w-80 md:rounded-none md:border-r"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b divider shrink-0">
                  <div className="flex items-center gap-2">
                    <Bell size={15} className="text-violet-400" />
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Notifications</h3>
                    {unread > 0 && <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-300 text-[10px] font-bold rounded-full">{unread} new</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-[11px] font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} className="p-1 rounded-lg transition-colors"
                      style={{ color: 'var(--text-3)' }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8 py-12">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
                        <Bell size={20} style={{ color: 'var(--text-3)' }} />
                      </div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>No notifications yet</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>You'll be notified when meetings are ready or tasks are assigned.</p>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
                      {notifications.map(n => {
                        const Icon = NOTIF_ICONS[n.type] || Bell
                        const isGreen = n.type === 'meeting_done'
                        return (
                          <button style={{ borderRadius: 2 }} key={n.id} onClick={() => handleClick(n)}
                            className={`w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition-colors ${!n.read ? 'bg-violet-500/5' : ''}`}>
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isGreen ? 'bg-emerald-500/10' : 'bg-violet-500/10'}`}>
                              <Icon size={12} className={isGreen ? 'text-emerald-400' : 'text-violet-400'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold leading-snug"
                                style={{ color: n.read ? 'var(--text-2)' : 'var(--text-1)' }}>
                                {n.title}
                              </p>
                              {n.body && <p className="text-[11px] mt-0.5 leading-snug line-clamp-1" style={{ color: 'var(--text-3)' }}>{n.body}</p>}
                              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{timeAgo(n.created_at)}</p>
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => { api.get('/users/me/usage').then(setUsage).catch(() => { }) }, [])
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const plan = usage?.plan ?? 'free'
  const used = usage?.meetings_used ?? 0
  const limit = usage?.meetings_limit ?? 3
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const planLabel = plan === 'free' ? 'Free plan' : plan === 'pro' ? 'Pro plan' : 'Team plan'

  function closeMobileSidebar() { setMobileOpen(false) }

  function handleSignOut() {
    setShowLogoutConfirm(false)
    closeMobileSidebar()
    signOut()
    navigate('/')
  }

  const meetingKeys = NAV_GROUPS.find(g => g.label === 'Meetings')?.items.map(i => i.key) ?? []
  const isMeetingActive = meetingKeys.includes(active)

  const [openGroups, setOpenGroups] = useState(() => ({ Meetings: true }))

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
        className="fixed right-3 top-3 z-[80] flex h-10 w-10 items-center justify-center rounded-2xl border glass-dropdown shadow-lg backdrop-blur md:hidden"
        style={{ color: 'var(--text-2)' }}
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
                    style={{ color: hasActiveItem ? 'var(--nav-active-txt)' : 'var(--text-3)' }}
                    data-active={hasActiveItem}
                  >
                    <span className="flex-1 text-left">{group.label}</span>
                    {hasActiveItem && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="shrink-0"
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
                      <div className={`space-y-0.5 ${group.collapsible ? 'pl-2 ml-3' : ''}`}
                        style={group.collapsible ? { borderLeft: '1px solid var(--divider)' } : {}}>
                        {group.items.map(({ key, icon: Icon, label, to, badge, accent }) => {
                          const isActive = active === key
                          return (
                            <Link key={key} to={to} onClick={closeMobileSidebar}
                              data-tour={`nav-${key}`}
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
            <div className="ml-auto w-9 h-5 rounded-full relative transition-colors" style={{ background: isDark ? 'var(--primary-glow)' : 'var(--input-border)' }}>
              <motion.div animate={{ x: isDark ? 16 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
            </div>
          </button>
          {/* User profile + sign out */}
          <div className="flex items-center gap-2">
            <Link to="/settings" onClick={closeMobileSidebar}
              className="min-w-0 flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors nav-idle"
              title="Account settings">
              <UserAvatar name={user?.name || 'User'} avatarUrl={user?.avatar_url} size={8} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{user?.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{user?.email}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl transition-colors hover:bg-red-500/10 hover:text-red-400"
              style={{ color: 'var(--text-3)' }}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {createPortal(
        <AnimatePresence>
          {showLogoutConfirm && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 rounded-none bg-black/60 backdrop-blur-sm"
                onClick={() => setShowLogoutConfirm(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.18 }}
                className="relative w-full max-w-sm rounded-2xl border p-5 shadow-2xl"
                style={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-1)',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold">Sign out?</h2>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                      You will need to sign in again to access your meetings and workspace.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors"
                    style={{ color: 'var(--text-3)' }}
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(false)}
                    className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                    style={{ color: 'var(--text-2)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-red-500/20 transition-colors hover:bg-red-600"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
