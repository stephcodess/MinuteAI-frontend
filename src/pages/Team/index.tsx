import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, MoreHorizontal, Crown, Shield, Eye,
  Mail, CheckCircle, X, Search, Trash2, Calendar,
  FileText, ChevronDown, Share2, Clock, CheckCircle2, AlertCircle, Zap,
  Loader2, User, Pencil, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { api } from '../../lib/api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const ROLES = ['Admin', 'Member', 'Viewer']

const ROLE_META = {
  Owner: { icon: Crown, bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-200', desc: 'Workspace owner — full control' },
  Admin: { icon: Crown, bg: 'bg-violet-50', text: 'text-violet-300', border: 'border-violet-500/30', desc: 'Full access — can invite, remove, and manage all meetings' },
  Member: { icon: Shield, bg: 'bg-blue-500/10', text: 'text-blue-700', border: 'border-blue-200', desc: 'Can upload meetings and view all shared content' },
  Viewer: { icon: Eye, bg: 'bg-white/[0.04]', text: 'text-slate-400', border: 'border-gray-200', desc: 'Read-only access to shared meetings and reports' },
}

const GRADS = [
  'from-violet-500 to-indigo-600', 'from-violet-400 to-purple-600',
  'from-indigo-400 to-blue-600', 'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-600', 'from-teal-400 to-cyan-600',
  'from-lime-400 to-green-600', 'from-fuchsia-400 to-violet-600',
]

// Member/workspace limits are now DB-driven via the usage endpoint
const MEMBERS_PAGE_SIZE = 9
const MEETINGS_PAGE_SIZE = 8

function Pagination({ page, totalPages, total, pageSize, onPage, label = 'items' }) {
  if (totalPages <= 1) return null
  const pages = []
  if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i) }
  else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <div className="mt-2 flex flex-col gap-3 border-t divider pt-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-slate-500">
        <span className="font-medium text-slate-400">{from}–{to}</span> of <span className="font-medium text-slate-400">{total}</span> {label}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-white/[0.06] text-slate-500 transition-colors">
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} className="px-1 text-slate-500 text-xs">…</span>
            : <button key={p} onClick={() => onPage(p)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${page === p ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white/[0.06]'}`}>
              {p}
            </button>
        )}
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-white/[0.06] text-slate-500 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

function fmtDate(iso) {
  const d = new Date(iso), now = new Date(), diff = now.getTime() - d.getTime()
  if (diff < 86400000) return 'Today'
  if (diff < 172800000) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }

function apiMemberToLocal(m, idx) {
  const role = m.role === 'owner' ? 'Owner' : capitalize(m.role)
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    role,
    initials: m.initials,
    avatarUrl: m.avatar_url,
    grad: GRADS[idx % GRADS.length],
    status: m.status,
    joinedAgo: role === 'Owner' ? 'Owner' : (m.status === 'pending' ? 'Invited' : 'Member'),
    lastActive: m.status === 'pending' ? '—' : 'Recently',
  }
}

// ── Role badge ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.Member
  const Icon = m.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${m.bg} ${m.text} ${m.border}`}>
      <Icon size={9} />{role}
    </span>
  )
}

// ── Member avatar ──────────────────────────────────────────────────────────────

function MemberAvatar({ member, size = 12 }) {
  if (member.avatarUrl) {
    return (
      <img
        src={`${BASE}${member.avatarUrl}`}
        alt=""
        className={`w-${size} h-${size} rounded-2xl object-cover shrink-0 shadow-sm`}
      />
    )
  }
  return (
    <div className={`w-${size} h-${size} rounded-2xl bg-gradient-to-br ${member.grad} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
      {member.initials}
    </div>
  )
}

// ── Member card ────────────────────────────────────────────────────────────────

function MemberCard({ member, onRoleChange, onRemove, index, isMe, canManage }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const isOwner = member.role === 'Owner'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="glass-card border rounded-2xl p-5 hover:shadow-md transition-shadow relative"
    >
      {member.status === 'pending' && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-200">
            Pending invite
          </span>
        </div>
      )}

      <div className="flex items-start gap-3 mb-4">
        <MemberAvatar member={member} size={12} />
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white truncate">{member.name}</p>
            {isMe && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/[0.06] text-slate-500">You</span>}
          </div>
          <p className="text-xs text-slate-500 truncate">{member.email}</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 text-center min-[380px]:grid-cols-3">
        {[
          { label: 'Last active', value: member.lastActive },
          { label: 'Status', value: member.status === 'pending' ? 'Pending' : 'Active' },
          { label: 'Joined', value: member.joinedAgo },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/[0.04] rounded-xl py-2 px-1">
            <p className="text-xs font-bold text-white">{value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="relative">
          <button
            onClick={() => canManage && !isMe && !isOwner && setRoleMenuOpen(v => !v)}
            disabled={!canManage || isMe || isOwner}
            className={`flex items-center gap-1.5 ${canManage && !isMe && !isOwner ? 'hover:bg-[var(--nav-hover-bg)] cursor-pointer' : 'cursor-default'} transition-colors rounded-lg px-1 -mx-1`}
          >
            <RoleBadge role={member.role} />
            {canManage && !isMe && !isOwner && <ChevronDown size={11} className="text-slate-500" />}
          </button>
          <AnimatePresence>
            {roleMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute left-0 top-full z-20 mt-1 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl shadow-xl glass-dropdown"
                style={{ border: '1px solid var(--card-border)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest px-4 pt-3 pb-1.5" style={{ color: 'var(--text-3)' }}>Change role</p>
                {ROLES.map(r => (
                  <button
                    key={r}
                    onClick={() => { onRoleChange(member.id, r); setRoleMenuOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-white/[0.04] transition-colors ${r === member.role ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <RoleBadge role={r} />
                      {r === member.role && <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>current</span>}
                    </div>
                    <p className="text-[11px] pl-0.5" style={{ color: 'var(--text-3)' }}>{ROLE_META[r].desc}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {canManage && !isMe && !isOwner && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-400 transition-colors"
            >
              <MoreHorizontal size={15} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 w-44 glass-dropdown border rounded-xl border border-white/[0.06] z-20 py-1"
                >
                  <button
                    onClick={() => { onRemove(member.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-400 hover:bg-red-500/100/10 transition-colors"
                  >
                    <Trash2 size={13} /> Remove member
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Invite form ────────────────────────────────────────────────────────────────

function InviteForm({ onInvite }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('Member')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handle(e) {
    e.preventDefault()
    if (!email.includes('@')) { setError('Enter a valid email address.'); return }
    setError(null); setLoading(true)
    try {
      await onInvite(email, name.trim(), role)
      setSent(true); setEmail(''); setName('')
      setTimeout(() => setSent(false), 5000)
    } catch (err) {
      setError(err.message || 'Failed to send invite.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Email address</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          <input
            type="email" value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
            placeholder="colleague@company.com"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-violet-500/40 glass-input"
            style={{ border: '1px solid var(--input-border)' }}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>
          Name <span className="font-normal opacity-60">(optional)</span>
        </label>
        <div className="relative">
          <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          <input
            type="text" value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-violet-500/40 glass-input"
            style={{ border: '1px solid var(--input-border)' }}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-3)' }}>Role</label>
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map(r => {
            const m = ROLE_META[r]; const Icon = m.icon; const active = role === r
            return (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all ${active ? `${m.border} ${m.bg} ${m.text}` : 'border-white/10 hover:border-white/20'
                  }`}
                style={{ color: active ? undefined : 'var(--text-3)', background: active ? undefined : 'var(--input-bg)' }}
              >
                <Icon size={15} />
                <span className="text-[11px] font-bold leading-none">{r}</span>
              </button>
            )
          })}
        </div>
        <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--text-3)' }}>{ROLE_META[role].desc}</p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-xs text-red-500 flex items-center gap-1.5"
          >
            <AlertCircle size={12} /> {error}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        type="submit" disabled={loading || !email}
        whileHover={!loading && email ? { scale: 1.01 } : {}}
        whileTap={!loading && email ? { scale: 0.98 } : {}}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition-all"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
        {loading ? 'Sending…' : 'Send invite'}
      </motion.button>

      <AnimatePresence>
        {sent && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
            className="flex items-start gap-3 p-3.5 bg-green-500/100/10 border border-green-500/20 rounded-xl"
          >
            <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-green-300">Invite sent!</p>
              <p className="text-[11px] text-green-400 mt-0.5">They'll receive an email with instructions to join this workspace.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}

// ── Main Team page ─────────────────────────────────────────────────────────────

export default function Team() {
  const { user } = useAuth()
  const { activeWorkspace, renameWorkspace } = useWorkspace()
  const wsId = activeWorkspace?.id

  const [members, setMembers] = useState([])
  const [meetings, setMeetings] = useState([])
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('members')
  const [membersPage, setMembersPage] = useState(1)
  const [meetingsPage, setMeetingsPage] = useState(1)
  const [renaming, setRenaming] = useState(false)
  const [wsName, setWsName] = useState('')
  const [renameErr, setRenameErr] = useState(null)

  const canManage = activeWorkspace?.is_owner ||
    members.find(m => m.email === user?.email && (m.role === 'Admin' || m.role === 'Owner'))

  useEffect(() => {
    api.get('/meetings').then(setMeetings).catch(() => { })
    api.get('/users/me/usage').then(setUsage).catch(() => { })
  }, [])

  useEffect(() => {
    if (!wsId) { setLoading(false); return }
    setLoading(true)
    api.get(`/workspaces/${wsId}/members`)
      .then(data => setMembers(data.map((m, i) => apiMemberToLocal(m, i))))
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [wsId])

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleInvite(email, name, role) {
    const payload: { email: string; role: string; name?: string } = { email, role: role.toLowerCase() }
    if (name) payload.name = name
    const m = await api.post(`/workspaces/${wsId}/invite`, payload)
    setMembers(prev => [...prev, apiMemberToLocal(m, prev.length)])
  }

  async function handleRoleChange(id, role) {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m))
    await api.patch(`/workspaces/${wsId}/members/${id}`, { role: role.toLowerCase() })
  }

  async function handleRemove(id) {
    setMembers(prev => prev.filter(m => m.id !== id))
    await api.delete(`/workspaces/${wsId}/members/${id}`)
  }

  async function handleRename(e) {
    e.preventDefault()
    if (!wsName.trim()) return
    setRenameErr(null)
    try {
      await renameWorkspace(wsId, wsName.trim())
      setRenaming(false)
    } catch (err) {
      setRenameErr(err.message)
    }
  }

  const active = members.filter(m => m.status === 'active').length
  const pending = members.filter(m => m.status === 'pending').length

  // Reset pages on search / tab change
  useEffect(() => { setMembersPage(1) }, [search])
  useEffect(() => { setMeetingsPage(1) }, [tab])

  const membersTotalPages = Math.max(1, Math.ceil(filtered.length / MEMBERS_PAGE_SIZE))
  const paginatedMembers = filtered.slice((membersPage - 1) * MEMBERS_PAGE_SIZE, membersPage * MEMBERS_PAGE_SIZE)
  const isLastMembersPage = membersPage === membersTotalPages

  const meetingsTotalPages = Math.max(1, Math.ceil(meetings.length / MEETINGS_PAGE_SIZE))
  const paginatedMeetings = meetings.slice((meetingsPage - 1) * MEETINGS_PAGE_SIZE, meetingsPage * MEETINGS_PAGE_SIZE)

  return (
    <div className="flex h-screen app-bg app-grid overflow-hidden">
      <Sidebar active="team" />

      <main className="min-w-0 flex-1 overflow-y-auto">
        {/* top bar */}
        <div className="sticky top-0 z-10 flex flex-col gap-4 px-4 py-4 backdrop-blur sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between" style={{ borderBottom: '1px solid var(--divider)', background: 'var(--sidebar-bg)' }}>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Users size={15} className="text-violet-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight" style={{ color: 'var(--text-1)' }}>Team</h1>
              {activeWorkspace && (
                <p className="truncate text-xs leading-none" style={{ color: 'var(--text-3)' }}>{activeWorkspace.name}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
            {activeWorkspace?.is_owner && !renaming && (
              <button
                onClick={() => { setWsName(activeWorkspace.name); setRenaming(true) }}
                className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--text-3)' }}
              >
                <Pencil size={12} /> Rename workspace
              </button>
            )}
            {renaming && (
              <form onSubmit={handleRename} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  autoFocus value={wsName}
                  onChange={e => { setWsName(e.target.value); setRenameErr(null) }}
                  className="w-full rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/40 glass-input sm:w-44"
                  style={{ border: '2px solid rgba(139,92,246,0.4)' }}
                />
                <button type="submit" className="rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-violet-500 hover:to-violet-400 transition-all">Save</button>
                <button type="button" onClick={() => setRenaming(false)} className="flex justify-center p-1.5 transition-colors" style={{ color: 'var(--text-3)' }}><X size={14} /></button>
                {renameErr && <p className="text-xs text-red-400">{renameErr}</p>}
              </form>
            )}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search members…"
                className="w-full rounded-xl py-2 pl-8 pr-4 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-violet-500/30 glass-input sm:w-48"
                style={{ border: '1px solid var(--input-border)' }}
              />
            </div>
          </div>
        </div>

        {/* ── Hero banner ── */}
        <div className="px-4 pt-6 pb-0 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-600 p-4 sm:p-6"
          >
            <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-14 -left-6 w-56 h-56 rounded-full bg-white/5" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <Users size={26} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-white font-bold text-xl leading-tight">
                    {activeWorkspace?.name ?? 'Workspace'}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 text-white/80 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />{active} active
                    </span>
                    {pending > 0 && (
                      <span className="flex items-center gap-1.5 text-white/70 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />{pending} pending
                      </span>
                    )}
                    <span className="text-white/50 text-xs">{members.length} member{members.length !== 1 ? 's' : ''} total</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:shrink-0">
                {members.length > 0 && (
                  <div className="flex -space-x-2.5">
                    {members.slice(0, 6).map((m, i) => (
                      <motion.div
                        key={m.id} title={m.name}
                        initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                        className={`w-9 h-9 rounded-full border-2 border-white/30 shadow-md overflow-hidden shrink-0 ${m.avatarUrl ? '' : `bg-gradient-to-br ${m.grad} flex items-center justify-center text-white text-[11px] font-bold`}`}
                      >
                        {m.avatarUrl
                          ? <img src={`${BASE}${m.avatarUrl}`} alt="" className="w-full h-full object-cover" />
                          : m.initials}
                      </motion.div>
                    ))}
                    {members.length > 6 && (
                      <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-[11px] font-bold">
                        +{members.length - 6}
                      </div>
                    )}
                  </div>
                )}
                {canManage && (
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setTab('invite')}
                    className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-violet-300 shadow-lg transition-all hover:bg-white/90"
                  >
                    <UserPlus size={14} /> Invite
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col items-stretch gap-6 px-4 py-6 sm:px-6 lg:px-8 xl:flex-row xl:items-start">
          <div className="flex-1 min-w-0">

            {/* tabs */}
            <div className="mb-5 grid w-full grid-cols-2 gap-1 rounded-xl p-1 sm:inline-grid sm:w-auto" style={{ background: 'var(--input-bg)' }}>
              {[['members', `Members (${members.length})`], ['shared', `Meetings (${meetings.length})`]].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === key ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm' : ''
                    }`}
                  style={{ color: tab === key ? undefined : 'var(--text-3)' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Members tab ── */}
            {tab === 'members' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {loading ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="glass-card border rounded-2xl p-5 animate-pulse">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-gray-200 shrink-0" />
                          <div className="flex-1 space-y-2 pt-1">
                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                            <div className="h-2.5 bg-white/[0.06] rounded w-1/2" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {[0, 1, 2].map(j => <div key={j} className="h-10 bg-white/[0.06] rounded-xl" />)}
                        </div>
                        <div className="h-6 bg-white/[0.06] rounded-lg w-24" />
                      </div>
                    ))}
                  </div>
                ) : filtered.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {paginatedMembers.map((m, i) => (
                        <MemberCard
                          key={m.id} member={m} index={i}
                          isMe={m.email === user?.email}
                          canManage={!!canManage}
                          onRoleChange={handleRoleChange}
                          onRemove={handleRemove}
                        />
                      ))}
                      {canManage && isLastMembersPage && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: paginatedMembers.length * 0.07 }}
                          onClick={() => setTab('invite')}
                          className="border-2 border-dashed border-violet-500/30 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-all min-h-[200px] group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
                            <UserPlus size={20} className="text-violet-500" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-violet-300">Invite a teammate</p>
                            <p className="text-xs text-slate-500 mt-1">Add someone to this workspace</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                    <Pagination
                      page={membersPage}
                      totalPages={membersTotalPages}
                      total={filtered.length}
                      pageSize={MEMBERS_PAGE_SIZE}
                      onPage={setMembersPage}
                      label="members"
                    />
                  </>
                ) : (
                  <div className="glass-card border rounded-2xl p-8 text-center sm:p-16">
                    <Users size={32} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
                    <p className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>No members match "{search}"</p>
                    <p className="text-sm" style={{ color: 'var(--text-3)' }}>Try a different search term.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Shared meetings tab ── */}
            {tab === 'shared' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                className="glass-card border rounded-2xl overflow-hidden"
              >
                {meetings.length === 0 ? (
                  <div className="py-16 text-center">
                    <FileText size={28} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-white mb-1">No meetings yet</p>
                    <p className="text-xs text-slate-500">Upload a recording to get started.</p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-[var(--divider)]">
                      {paginatedMeetings.map((m, i) => (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}
                          className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-[var(--nav-hover-bg)]/60 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${m.status === 'done' ? 'bg-green-500/100/10' : m.status === 'processing' ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>
                            {m.status === 'done' ? <CheckCircle2 size={16} className="text-green-500" />
                              : m.status === 'processing' ? <FileText size={16} className="text-blue-500" />
                                : <AlertCircle size={16} className="text-red-400" />}
                          </div>
                          <div className="min-w-0 flex-1 self-stretch sm:self-auto">
                            <p className="text-sm font-semibold text-white truncate">{m.title || 'Untitled meeting'}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><Calendar size={10} />{fmtDate(m.date)}</span>
                              {m.duration && <span>{m.duration}</span>}
                            </div>
                          </div>
                          {m.status === 'done' && (
                            <Link to={`/results/${m.id}`}
                              className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-300 transition-colors hover:bg-violet-100"
                            >
                              <Eye size={12} /> View
                            </Link>
                          )}
                        </motion.div>
                      ))}
                    </div>
                    {meetingsTotalPages > 1 && (
                      <div className="px-5 py-3 border-t divider">
                        <Pagination
                          page={meetingsPage}
                          totalPages={meetingsTotalPages}
                          total={meetings.length}
                          pageSize={MEETINGS_PAGE_SIZE}
                          onPage={setMeetingsPage}
                          label="meetings"
                        />
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* ── Invite tab ── */}
            {tab === 'invite' && canManage && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                className="glass-card border rounded-2xl p-4 sm:p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Invite a teammate</h3>
                  <button onClick={() => setTab('members')} className="transition-colors hover:text-rose-400" style={{ color: 'var(--text-3)' }}><X size={16} /></button>
                </div>
                <InviteForm onInvite={async (email, name, role) => { await handleInvite(email, name, role); setTab('members') }} />
              </motion.div>
            )}
          </div>

          {/* ── Right panel ── */}
          <div className="w-full shrink-0 space-y-4 xl:w-80">

            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.18 }}
              className="glass-card border rounded-2xl p-5"
            >
              <p className="text-sm font-bold text-white mb-4">Workspace overview</p>
              <div className="space-y-3">
                {[
                  { label: 'Total members', value: members.length, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
                  { label: 'Active', value: active, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/100/10' },
                  { label: 'Pending invites', value: pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
                  { label: 'Total meetings', value: meetings.length, icon: Share2, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                      <Icon size={14} className={color} />
                    </div>
                    <div className="flex-1"><p className="text-xs text-slate-500">{label}</p></div>
                    <p className="text-sm font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.26 }}
              className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-500/30 rounded-2xl p-5"
            >
              {(() => {
                const planName = usage?.plan ?? 'free'
                const memberLimit = usage?.max_members ?? null
                const wsLimit = usage?.max_workspaces ?? null
                const isFree = planName === 'free' || !usage?.plan
                const planLabel = planName.charAt(0).toUpperCase() + planName.slice(1) + ' plan'
                return (
                  <>
                    <p className="text-sm font-bold text-violet-200 mb-1">{planLabel}</p>
                    <p className="text-xs text-violet-300/80 leading-relaxed mb-4">
                      {memberLimit != null
                        ? `Up to ${memberLimit} members per workspace.`
                        : 'Unlimited members per workspace.'}
                      {wsLimit != null
                        ? ` Up to ${wsLimit} workspaces.`
                        : ' Unlimited workspaces.'}
                    </p>
                    {isFree && (
                      <Link to="/billing"
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition-all"
                      >
                        <Zap size={11} /> Upgrade plan
                      </Link>
                    )}
                  </>
                )
              })()}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}



