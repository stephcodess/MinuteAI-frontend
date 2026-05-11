import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, MoreHorizontal, Crown, Shield, Eye,
  Mail, CheckCircle, X, Search, Trash2, Calendar,
  FileText, ChevronDown, Share2, Clock, CheckCircle2, AlertCircle, Zap,
  Loader2, User, Pencil, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { api } from '../lib/api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const ROLES = ['Admin', 'Member', 'Viewer']

const ROLE_META = {
  Owner:  { icon: Crown,  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  desc: 'Workspace owner — full control' },
  Admin:  { icon: Crown,  bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', desc: 'Full access — can invite, remove, and manage all meetings' },
  Member: { icon: Shield, bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   desc: 'Can upload meetings and view all shared content' },
  Viewer: { icon: Eye,    bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200',   desc: 'Read-only access to shared meetings and reports' },
}

const GRADS = [
  'from-violet-500 to-indigo-600', 'from-violet-400 to-purple-600',
  'from-indigo-400 to-blue-600',   'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-600',  'from-teal-400 to-cyan-600',
  'from-lime-400 to-green-600',    'from-fuchsia-400 to-violet-600',
]

const PLAN_MEMBER_LIMITS  = { free: 3, pro: 5, team: 25 }
const MEMBERS_PAGE_SIZE   = 9
const MEETINGS_PAGE_SIZE  = 8

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
  const to   = Math.min(page * pageSize, total)
  return (
    <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
      <span className="text-xs text-gray-400">
        <span className="font-medium text-gray-600">{from}–{to}</span> of <span className="font-medium text-gray-600">{total}</span> {label}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} className="px-1 text-gray-400 text-xs">…</span>
            : <button key={p} onClick={() => onPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${page === p ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
                {p}
              </button>
        )}
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

function fmtDate(iso) {
  const d = new Date(iso), now = new Date(), diff = now - d
  if (diff < 86400000)  return 'Today'
  if (diff < 172800000) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }

function apiMemberToLocal(m, idx) {
  const role = m.role === 'owner' ? 'Owner' : capitalize(m.role)
  return {
    id:         m.id,
    name:       m.name,
    email:      m.email,
    role,
    initials:   m.initials,
    avatarUrl:  m.avatar_url,
    grad:       GRADS[idx % GRADS.length],
    status:     m.status,
    joinedAgo:  role === 'Owner' ? 'Owner' : (m.status === 'pending' ? 'Invited' : 'Member'),
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
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const isOwner = member.role === 'Owner'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow relative"
    >
      {member.status === 'pending' && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Pending invite
          </span>
        </div>
      )}

      <div className="flex items-start gap-3 mb-4">
        <MemberAvatar member={member} size={12} />
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900 truncate">{member.name}</p>
            {isMe && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">You</span>}
          </div>
          <p className="text-xs text-gray-400 truncate">{member.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        {[
          { label: 'Last active', value: member.lastActive },
          { label: 'Status',      value: member.status === 'pending' ? 'Pending' : 'Active' },
          { label: 'Joined',      value: member.joinedAgo },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-xl py-2 px-1">
            <p className="text-xs font-bold text-gray-900">{value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="relative">
          <button
            onClick={() => canManage && !isMe && !isOwner && setRoleMenuOpen(v => !v)}
            disabled={!canManage || isMe || isOwner}
            className={`flex items-center gap-1.5 ${canManage && !isMe && !isOwner ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'} transition-colors rounded-lg px-1 -mx-1`}
          >
            <RoleBadge role={member.role} />
            {canManage && !isMe && !isOwner && <ChevronDown size={11} className="text-gray-400" />}
          </button>
          <AnimatePresence>
            {roleMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute left-0 top-full mt-1 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 overflow-hidden"
              >
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 pt-3 pb-1.5">Change role</p>
                {ROLES.map(r => (
                  <button
                    key={r}
                    onClick={() => { onRoleChange(member.id, r); setRoleMenuOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${r === member.role ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <RoleBadge role={r} />
                      {r === member.role && <span className="text-[10px] text-gray-400">current</span>}
                    </div>
                    <p className="text-[11px] text-gray-400 pl-0.5">{ROLE_META[r].desc}</p>
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
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
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
                  className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1"
                >
                  <button
                    onClick={() => { onRemove(member.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
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
  const [email,   setEmail]   = useState('')
  const [name,    setName]    = useState('')
  const [role,    setRole]    = useState('Member')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState(null)

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
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email address</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="email" value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
            placeholder="colleague@company.com"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-violet-400 focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)] text-sm text-gray-900 placeholder-gray-400 transition-all bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          Name <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <div className="relative">
          <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text" value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-violet-400 focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)] text-sm text-gray-900 placeholder-gray-400 transition-all bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Role</label>
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map(r => {
            const m = ROLE_META[r]; const Icon = m.icon; const active = role === r
            return (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all ${
                  active ? `${m.border} ${m.bg} ${m.text}` : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                }`}
              >
                <Icon size={15} />
                <span className="text-[11px] font-bold leading-none">{r}</span>
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">{ROLE_META[role].desc}</p>
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
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
        {loading ? 'Sending…' : 'Send invite'}
      </motion.button>

      <AnimatePresence>
        {sent && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
            className="flex items-start gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl"
          >
            <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-green-800">Invite sent!</p>
              <p className="text-[11px] text-green-600 mt-0.5">They'll receive an email with instructions to join this workspace.</p>
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

  const [members,      setMembers]      = useState([])
  const [meetings,     setMeetings]     = useState([])
  const [usage,        setUsage]        = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [tab,          setTab]          = useState('members')
  const [membersPage,  setMembersPage]  = useState(1)
  const [meetingsPage, setMeetingsPage] = useState(1)
  const [renaming,  setRenaming]  = useState(false)
  const [wsName,    setWsName]    = useState('')
  const [renameErr, setRenameErr] = useState(null)

  const canManage = activeWorkspace?.is_owner ||
    members.find(m => m.email === user?.email && (m.role === 'Admin' || m.role === 'Owner'))

  useEffect(() => {
    api.get('/meetings').then(setMeetings).catch(() => {})
    api.get('/users/me/usage').then(setUsage).catch(() => {})
  }, [])

  useEffect(() => {
    if (!wsId) { setLoading(false); return }
    setLoading(true)
    api.get(`/workspaces/${wsId}/members`)
      .then(data => setMembers(data.map((m, i) => apiMemberToLocal(m, i))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [wsId])

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleInvite(email, name, role) {
    const payload = { email, role: role.toLowerCase() }
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

  const active  = members.filter(m => m.status === 'active').length
  const pending = members.filter(m => m.status === 'pending').length

  // Reset pages on search / tab change
  useEffect(() => { setMembersPage(1) }, [search])
  useEffect(() => { setMeetingsPage(1) }, [tab])

  const membersTotalPages  = Math.max(1, Math.ceil(filtered.length / MEMBERS_PAGE_SIZE))
  const paginatedMembers   = filtered.slice((membersPage - 1) * MEMBERS_PAGE_SIZE, membersPage * MEMBERS_PAGE_SIZE)
  const isLastMembersPage  = membersPage === membersTotalPages

  const meetingsTotalPages = Math.max(1, Math.ceil(meetings.length / MEETINGS_PAGE_SIZE))
  const paginatedMeetings  = meetings.slice((meetingsPage - 1) * MEETINGS_PAGE_SIZE, meetingsPage * MEETINGS_PAGE_SIZE)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar active="team" />

      <main className="min-w-0 flex-1 overflow-y-auto pt-16 md:pt-0">
        {/* top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <Users size={15} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Team</h1>
              {activeWorkspace && (
                <p className="text-xs text-gray-400 leading-none">{activeWorkspace.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeWorkspace?.is_owner && !renaming && (
              <button
                onClick={() => { setWsName(activeWorkspace.name); setRenaming(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <Pencil size={12} /> Rename workspace
              </button>
            )}
            {renaming && (
              <form onSubmit={handleRename} className="flex items-center gap-2">
                <input
                  autoFocus value={wsName}
                  onChange={e => { setWsName(e.target.value); setRenameErr(null) }}
                  className="px-3 py-1.5 rounded-xl border-2 border-violet-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 w-44"
                />
                <button type="submit" className="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-semibold">Save</button>
                <button type="button" onClick={() => setRenaming(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                {renameErr && <p className="text-xs text-red-500">{renameErr}</p>}
              </form>
            )}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search members…"
                className="pl-8 pr-4 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent w-48 transition-all"
              />
            </div>
          </div>
        </div>

        {/* ── Hero banner ── */}
        <div className="px-8 pt-6 pb-0">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-600 p-6 mb-6"
          >
            <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-14 -left-6 w-56 h-56 rounded-full bg-white/5" />

            <div className="relative flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <Users size={26} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-xl leading-tight">
                    {activeWorkspace?.name ?? 'Workspace'}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5">
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

              <div className="flex items-center gap-4 shrink-0">
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
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-violet-700 text-sm font-bold shadow-lg hover:bg-white/90 transition-all"
                  >
                    <UserPlus size={14} /> Invite
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="px-8 py-6 flex gap-6 items-start">
          <div className="flex-1 min-w-0">

            {/* tabs */}
            <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
              {[['members', `Members (${members.length})`], ['shared', `Meetings (${meetings.length})`]].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Members tab ── */}
            {tab === 'members' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {loading ? (
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-gray-200 shrink-0" />
                          <div className="flex-1 space-y-2 pt-1">
                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                            <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {[0,1,2].map(j => <div key={j} className="h-10 bg-gray-100 rounded-xl" />)}
                        </div>
                        <div className="h-6 bg-gray-100 rounded-lg w-24" />
                      </div>
                    ))}
                  </div>
                ) : filtered.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
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
                          className="border-2 border-dashed border-violet-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-all min-h-[200px] group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
                            <UserPlus size={20} className="text-violet-500" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-violet-700">Invite a teammate</p>
                            <p className="text-xs text-gray-400 mt-1">Add someone to this workspace</p>
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
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                    <Users size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="font-semibold text-gray-900 mb-1">No members match "{search}"</p>
                    <p className="text-sm text-gray-400">Try a different search term.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Shared meetings tab ── */}
            {tab === 'shared' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {meetings.length === 0 ? (
                  <div className="py-16 text-center">
                    <FileText size={28} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-900 mb-1">No meetings yet</p>
                    <p className="text-xs text-gray-400">Upload a recording to get started.</p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-50">
                      {paginatedMeetings.map((m, i) => (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors"
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${m.status === 'done' ? 'bg-green-50' : m.status === 'processing' ? 'bg-blue-50' : 'bg-red-50'}`}>
                            {m.status === 'done' ? <CheckCircle2 size={16} className="text-green-500" />
                              : m.status === 'processing' ? <FileText size={16} className="text-blue-500" />
                              : <AlertCircle size={16} className="text-red-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{m.title || 'Untitled meeting'}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                              <span className="flex items-center gap-1"><Calendar size={10} />{fmtDate(m.date)}</span>
                              {m.duration && <span>{m.duration}</span>}
                            </div>
                          </div>
                          {m.status === 'done' && (
                            <Link to={`/results/${m.id}`}
                              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold transition-colors"
                            >
                              <Eye size={12} /> View
                            </Link>
                          )}
                        </motion.div>
                      ))}
                    </div>
                    {meetingsTotalPages > 1 && (
                      <div className="px-5 py-3 border-t border-gray-100">
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
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-bold text-gray-900">Invite a teammate</h3>
                  <button onClick={() => setTab('members')} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
                </div>
                <InviteForm onInvite={async (email, name, role) => { await handleInvite(email, name, role); setTab('members') }} />
              </motion.div>
            )}
          </div>

          {/* ── Right panel ── */}
          <div className="w-80 shrink-0 space-y-4">

            {canManage && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus size={15} className="text-violet-600" />
                  <p className="text-sm font-bold text-gray-900">Invite teammate</p>
                </div>
                <InviteForm onInvite={handleInvite} />
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.18 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <p className="text-sm font-bold text-gray-900 mb-4">Workspace overview</p>
              <div className="space-y-3">
                {[
                  { label: 'Total members',   value: members.length, icon: Users,       color: 'text-violet-600', bg: 'bg-violet-50' },
                  { label: 'Active',          value: active,         icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50'  },
                  { label: 'Pending invites', value: pending,        icon: Clock,       color: 'text-amber-600',  bg: 'bg-amber-50'  },
                  { label: 'Total meetings',  value: meetings.length,icon: Share2,      color: 'text-indigo-600', bg: 'bg-indigo-50' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                      <Icon size={14} className={color} />
                    </div>
                    <div className="flex-1"><p className="text-xs text-gray-400">{label}</p></div>
                    <p className="text-sm font-bold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.26 }}
              className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5"
            >
              {(() => {
                const plan = usage?.plan ?? 'free'
                const memberLimit = PLAN_MEMBER_LIMITS[plan] ?? 3
                const isUpgradeable = plan !== 'team'
                const planLabel = plan === 'team' ? 'Team plan' : plan === 'pro' ? 'Pro plan' : 'Free plan'
                return (
                  <>
                    <p className="text-sm font-bold text-violet-900 mb-1">{planLabel}</p>
                    <p className="text-xs text-violet-700/80 leading-relaxed mb-4">
                      {plan === 'team'
                        ? `Your Team plan supports up to ${memberLimit} members per workspace.`
                        : plan === 'pro'
                        ? `Your Pro plan supports up to ${memberLimit} members and 3 workspaces.`
                        : `Your Free plan supports up to ${memberLimit} members. Upgrade for more workspaces.`}
                    </p>
                    {isUpgradeable && (
                      <Link to="/billing"
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors"
                      >
                        <Zap size={11} />{plan === 'pro' ? 'Upgrade to Team' : 'Upgrade plan'}
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
