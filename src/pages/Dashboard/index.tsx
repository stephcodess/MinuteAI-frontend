import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Clock, Users, Zap, Search, MoreHorizontal,
  Trash2, AlertCircle, CheckCircle2, Calendar,
  Plus, Star, UserPlus, Bell, Loader2,
  CheckSquare, TrendingUp, ChevronLeft, ChevronRight,
  Bot, Copy, CalendarClock, ExternalLink,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import Sidebar from '../../components/Sidebar'
import { api, getWorkspaceBotAccount, listUpcomingMeetingBotSessions } from '../../lib/api'

const PAGE_SIZE = 8

// ── Utilities ─────────────────────────────────────────────────────────────────

const GRADS = [
  'from-violet-500 to-indigo-600',
  'from-sky-400   to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400  to-pink-500',
  'from-cyan-400  to-sky-500',
]

function meetingGradient(str = '') {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return GRADS[Math.abs(hash) % GRADS.length]
}

function buildStats(s) {
  return [
    { label: 'Total Meetings', value: s?.total_meetings ?? 0, delta: `${s?.processing ?? 0} processing`, icon: FileText, gradient: 'from-violet-500 to-indigo-600' },
    { label: 'This Month', value: s?.meetings_this_month ?? 0, delta: 'meetings this month', icon: Calendar, gradient: 'from-sky-400 to-blue-500' },
    { label: 'Hours Saved', value: `${Math.round((s?.total_meetings ?? 0) * 0.75)}h`, delta: 'vs writing manually', icon: Clock, gradient: 'from-emerald-400 to-teal-500' },
    { label: 'Action Items', value: s?.total_action_items ?? 0, delta: 'tracked across meetings', icon: Zap, gradient: 'from-amber-400 to-orange-500' },
  ]
}

function fmtDate(iso) {
  const d = new Date(iso), now = new Date(), diff = now.getTime() - d.getTime()
  if (diff < 86400000) return 'Today'
  if (diff < 172800000) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtTimeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmtUpcoming(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, total, pageSize, onPage }) {
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

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t divider">
      <span className="text-xs text-slate-500">
        Showing <span className="font-medium text-slate-400">{from}–{to}</span> of <span className="font-medium text-slate-400">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-white/[0.06] text-slate-500 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`ellipsis-${i}`} className="px-1 text-slate-500 text-xs select-none">…</span>
            : <button
              key={p}
              onClick={() => onPage(p)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${page === p
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-300/30'
                : 'text-slate-500 hover:bg-white/[0.06]'
                }`}
            >
              {p}
            </button>
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-white/[0.06] text-slate-500 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, delta, icon: Icon, gradient, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="group relative glass-card border rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300 cursor-default overflow-hidden"
    >
      {/* gradient glow on hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradient}`} style={{ opacity: 0 }} />
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 bg-gradient-to-br ${gradient}`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            <Icon size={18} className="text-white" />
          </div>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full leading-tight text-right max-w-[100px]" style={{ color: 'var(--text-3)', background: 'var(--input-bg)' }}>{delta}</span>
        </div>
        <p className="text-[34px] font-black leading-none mb-1 tracking-tight" style={{ color: 'var(--text-1)' }}>{String(value)}</p>
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{label}</p>
      </div>
    </motion.div>
  )
}

// ── Meeting row ───────────────────────────────────────────────────────────────

function MeetingRow({ meeting, delay, onStar, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const grad = meetingGradient(meeting.title)
  const initial = (meeting.title || 'M')[0].toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
      className="group grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-4 hover:bg-violet-50/30 border-b divider last:border-0 transition-colors cursor-pointer sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4 sm:px-5"
      onClick={() => meeting.status === 'done' && navigate(`/results/${meeting.id}`)}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-md`}>
        {meeting.status === 'processing' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : meeting.status === 'error' ? (
          <AlertCircle size={16} />
        ) : initial}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-white truncate">{meeting.title || 'Untitled meeting'}</p>
          {meeting.starred && <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><Calendar size={9} />{fmtDate(meeting.date)}</span>
          {meeting.duration && meeting.duration !== '—' && (
            <span className="flex items-center gap-1"><Clock size={9} />{meeting.duration}</span>
          )}
          {meeting.participants > 0 && (
            <span className="flex items-center gap-1"><Users size={9} />{meeting.participants} people</span>
          )}
          {meeting.actions > 0 && (
            <span className="hidden items-center gap-1 text-violet-500 font-semibold sm:flex">
              <Zap size={9} />{meeting.actions} actions
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <span className={`hidden w-fit shrink-0 self-center text-[11px] font-semibold px-2.5 py-1 rounded-full sm:inline-flex sm:justify-self-center ${meeting.status === 'done' ? 'bg-emerald-500/100/10 text-emerald-400' :
        meeting.status === 'processing' ? 'bg-blue-500/100/10 text-blue-400' :
          'bg-red-500/100/10 text-red-400'
        }`}>
        {meeting.status === 'done' ? '✓ Done' : meeting.status === 'processing' ? 'Processing' : 'Failed'}
      </span>

      {/* Actions */}
      <div className="hidden items-center justify-end gap-0.5 opacity-100 transition-opacity shrink-0 sm:flex" onClick={e => e.stopPropagation()}>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white hover:text-slate-300"
            aria-label="Meeting actions"
          >
            <MoreHorizontal size={14} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-white/[0.06] z-20 py-1"
                >
                  <button
                    onClick={() => { onStar?.(meeting.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-400 hover:bg-[var(--nav-hover-bg)]"
                  >
                    <Star size={13} className={meeting.starred ? 'fill-amber-400 text-amber-400' : ''} />
                    {meeting.starred ? 'Unstar' : 'Star'}
                  </button>
                  <button
                    onClick={() => { onDelete?.(meeting.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="col-start-2 flex items-center gap-3 pt-1 sm:hidden" onClick={e => e.stopPropagation()}>
        <span className={`w-fit shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${meeting.status === 'done' ? 'bg-emerald-500/100/10 text-emerald-400' :
          meeting.status === 'processing' ? 'bg-blue-500/100/10 text-blue-400' :
            'bg-red-500/100/10 text-red-400'
          }`}>
          {meeting.status === 'done' ? '✓ Done' : meeting.status === 'processing' ? 'Processing' : 'Failed'}
        </span>

        {meeting.actions > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600">
            <Zap size={11} />
            {meeting.actions} actions
          </span>
        )}

        <div className="relative ml-auto">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-[var(--nav-hover-bg)] hover:text-slate-300"
            aria-label="Meeting actions"
          >
            <MoreHorizontal size={15} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-white/[0.06] z-20 py-1"
                >
                  <button
                    onClick={() => { onStar?.(meeting.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-400 hover:bg-[var(--nav-hover-bg)]"
                  >
                    <Star size={13} className={meeting.starred ? 'fill-amber-400 text-amber-400' : ''} />
                    {meeting.starred ? 'Unstar' : 'Star'}
                  </button>
                  <button
                    onClick={() => { onDelete?.(meeting.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ── Activity feed ─────────────────────────────────────────────────────────────

function ActivityFeed({ meetings }) {
  const items = meetings.slice(0, 7).map(m => ({
    id: m.id,
    icon: m.status === 'done' ? CheckCircle2 : m.status === 'processing' ? Loader2 : AlertCircle,
    dot: m.status === 'done' ? 'bg-emerald-400' : m.status === 'processing' ? 'bg-blue-400' : 'bg-red-400',
    label: m.status === 'done' ? (m.title || 'Meeting') : m.title || 'Meeting',
    sub: m.status === 'done' ? 'Minutes ready' : m.status === 'processing' ? 'Processing…' : 'Processing failed',
    time: fmtTimeAgo(m.date),
    to: m.status === 'done' ? `/results/${m.id}` : null,
    spinning: m.status === 'processing',
  }))

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="glass-card border rounded-2xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b divider flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Bell size={12} className="text-violet-400" />
          </div>
          <p className="text-sm font-bold text-white">Activity</p>
        </div>
        {items.some(i => i.spinning) && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/100 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-10 flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
            <Bell size={18} className="text-slate-600" />
          </div>
          <p className="text-xs text-slate-500">No activity yet</p>
        </div>
      ) : (
        <div className="relative">
          {/* vertical timeline line */}
          <div className="absolute left-[27px] top-4 bottom-4 w-px bg-white/[0.06]" />

          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.3 + i * 0.05 }}
              className="relative flex items-start gap-3 px-4 py-3 hover:bg-[var(--nav-hover-bg)]/60 transition-colors"
            >
              {/* timeline dot */}
              <div className={`relative z-10 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${item.spinning ? 'bg-blue-500/10' :
                item.dot === 'bg-emerald-400' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                }`}>
                <item.icon
                  size={13}
                  className={
                    item.spinning ? 'text-blue-500 animate-spin' :
                      item.dot === 'bg-emerald-400' ? 'text-emerald-500' : 'text-red-500'
                  }
                />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs font-semibold text-slate-200 leading-tight truncate">{item.label}</p>
                {item.to ? (
                  <Link to={item.to} className="text-[11px] text-violet-500 hover:underline mt-0.5 block">
                    {item.sub} →
                  </Link>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.sub}</p>
                )}
              </div>
              <span className="text-[10px] text-slate-600 shrink-0 pt-0.5">{item.time}</span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ── Team preview ──────────────────────────────────────────────────────────────

function TeamPreview() {
  const [members, setMembers] = useState([])
  const { user } = useAuth()

  useEffect(() => {
    api.get('/team').then(data => {
      const list = data.slice(0, 4).map((m, i) => ({
        name: m.name || m.invited_email?.split('@')[0] || 'Member',
        initials: m.initials || (m.invited_email || 'MM').slice(0, 2).toUpperCase(),
        grad: GRADS[(i + 1) % GRADS.length],
        status: m.status,
      }))
      if (user) {
        list.unshift({
          name: user.name || 'You',
          initials: (user.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
          grad: GRADS[0],
          status: 'active',
          isMe: true,
        })
      }
      setMembers(list.slice(0, 5))
    }).catch(() => {
      if (user) {
        setMembers([{
          name: user.name || 'You',
          initials: (user.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
          grad: GRADS[0],
          status: 'active',
          isMe: true,
        }])
      }
    })
  }, [user])

  const activeCount = members.filter(m => m.status === 'active').length

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="glass-card border rounded-2xl overflow-hidden"
    >
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--divider)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Users size={12} className="text-violet-400" />
          </div>
          <p className="text-sm font-bold text-white">Team</p>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
          {activeCount} active
        </span>
      </div>

      {/* stacked avatars */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center -space-x-2 mb-4">
          {members.slice(0, 5).map((m, i) => (
            <motion.div
              key={m.name + i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.4 + i * 0.05 }}
              title={m.name}
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${m.grad} flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-white shadow-sm shrink-0`}
            >
              {m.initials}
            </motion.div>
          ))}
          {members.length > 5 && (
            <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-slate-500 text-[11px] font-bold ring-2 ring-white">
              +{members.length - 5}
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          {members.slice(0, 3).map((m, i) => (
            <motion.div
              key={m.name + i}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.45 + i * 0.06 }}
              className="flex items-center gap-2.5"
            >
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${m.grad} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                {m.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{m.name}{m.isMe ? ' (you)' : ''}</p>
              </div>
              <div className="flex items-center gap-1">
                {m.isMe && (
                  <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-full">Admin</span>
                )}
                <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'pending' ? 'bg-amber-400' : 'bg-emerald-500/100'}`} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-4 flex gap-2">
        <Link
          to="/team"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold transition-all shadow-sm shadow-violet-500/30"
        >
          <Users size={12} /> Manage team
        </Link>
        <Link
          to="/team"
          className="flex items-center justify-center gap-1 px-3 py-2 rounded-full border border-violet-500/30 hover:bg-violet-50 text-violet-600 text-xs font-semibold transition-colors"
          title="Invite member"
        >
          <UserPlus size={14} />
        </Link>
      </div>
    </motion.div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function RecorderInviteCard({ botAccount }) {
  const [copied, setCopied] = useState(false)

  async function copyEmail() {
    if (!botAccount?.email) return
    await navigator.clipboard?.writeText(botAccount.email)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass-card border rounded-2xl overflow-hidden"
    >
      <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--divider)' }}>
        <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center">
          <Bot size={12} className="text-cyan-400" />
        </div>
        <p className="text-sm font-bold text-white">Workspace recorder</p>
      </div>
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Invite this bot</p>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white/[0.04] px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-200">
            {botAccount?.email || 'Setting up recorder...'}
          </span>
          <button
            onClick={copyEmail}
            disabled={!botAccount?.email}
            className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.08] hover:text-violet-400 disabled:opacity-40"
            title="Copy recorder email"
          >
            {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Add this address as a guest when scheduling in Google Calendar so MinuteAI can detect and join workspace meetings.
        </p>
      </div>
    </motion.div>
  )
}

function UpcomingMeetings({ sessions }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="glass-card border rounded-2xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b divider flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <CalendarClock size={12} className="text-blue-400" />
          </div>
          <p className="text-sm font-bold text-white">Upcoming</p>
        </div>
        <Link to="/meeting-bots" className="text-[11px] font-semibold text-violet-600 hover:underline">
          View all
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <CalendarClock size={22} className="mx-auto text-slate-600" />
          <p className="mt-2 text-xs font-semibold text-slate-500">No upcoming bot meetings</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Invite the workspace recorder or schedule from MinuteAI.</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--divider)]">
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.3 + index * 0.04 }}
              className="px-5 py-3.5"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Bot size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{session.title || 'Scheduled meeting'}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{fmtUpcoming(session.scheduled_for)}</p>
                  <a
                    href={session.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 hover:text-cyan-800"
                  >
                    Open link <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { activeWorkspace } = useWorkspace()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [meetings, setMeetings] = useState([])
  const [statsData, setStatsData] = useState(null)
  const [usage, setUsage] = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [botAccount, setBotAccount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspace) return
    setLoading(true)
    const wsParam = `?workspace_id=${activeWorkspace.id}`
    Promise.all([
      api.get(`/meetings${wsParam}`),
      api.get(`/meetings/stats${wsParam}`),
      api.get('/users/me/usage'),
      listUpcomingMeetingBotSessions(activeWorkspace.id, 5),
      getWorkspaceBotAccount(activeWorkspace.id),
    ])
      .then(([m, s, u, upcomingSessions, bot]) => {
        setMeetings(m)
        setStatsData(s)
        setUsage(u)
        setUpcoming(upcomingSessions)
        setBotAccount(bot)
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [activeWorkspace?.id])

  function handleStar(id) {
    api.patch(`/meetings/${id}/star`, {}).then(({ starred }) =>
      setMeetings(prev => prev.map(m => m.id === id ? { ...m, starred } : m))
    ).catch(() => { })
  }

  function handleDelete(id) {
    api.delete(`/meetings/${id}`).then(() =>
      setMeetings(prev => prev.filter(m => m.id !== id))
    ).catch(() => { })
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const remaining = usage ? Math.max((usage.meetings_limit ?? 3) - (usage.meetings_used ?? 0), 0) : null
  const doneMeetings = meetings.filter(m => m.status === 'done').length

  const filtered = meetings.filter(m => {
    const matchSearch = (m.title || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'starred' ? m.starred :
        filter === 'month' ? new Date(m.date) > new Date(Date.now() - 30 * 86400000) :
          true
    return matchSearch && matchFilter
  })

  // Reset to page 1 whenever filter or search changes
  useEffect(() => { setPage(1) }, [filter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex h-screen app-bg app-grid overflow-hidden">
      <Sidebar active="dashboard" />

      <main className="min-w-0 flex-1 overflow-y-auto page-content">

        {/* ── Hero banner ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#3d27b8] via-[#4b38d4] to-[#6d28d9] pb-28 pt-10 px-6 lg:px-8">
          {/* mesh pattern */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />
          {/* glow orbs */}
          <div className="absolute -top-24 -right-16 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-indigo-300/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-5xl mx-auto">
            {/* top row: greeting + CTA */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                {/* date badge */}
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/50 mb-3">
                  <Calendar size={10} />
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                  {greeting}, {user?.name?.split(' ')[0]} 👋
                </h1>
                <p className="text-white/50 text-sm mt-1.5 font-medium">
                  {activeWorkspace?.name ?? 'Your workspace'}
                  {remaining !== null && (
                    <span className="ml-2 inline-flex items-center gap-1 bg-white/10 border border-white/15 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white/80">
                      <Zap size={9} className="text-amber-300" />
                      {remaining} meetings left
                    </span>
                  )}
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/upload')}
                className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-full bg-white text-violet-300 text-sm font-bold shadow-xl shadow-violet-900/30 hover:shadow-2xl transition-all mt-1"
              >
                <Plus size={16} />
                New meeting
              </motion.button>
            </div>

            {/* Quick action chips */}
            <div className="flex gap-2 flex-wrap">
              {[
                { icon: UserPlus, label: 'Invite team', to: '/team' },
                { icon: CheckSquare, label: 'My tasks', to: '/tasks' },
                { icon: TrendingUp, label: 'Analytics', to: '/dashboard' },
                { icon: Bot, label: 'Meeting Bots', to: '/meeting-bots' },
              ].map(({ icon: Icon, label, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/85 text-xs font-semibold border border-white/10 transition-all backdrop-blur-sm"
                >
                  <Icon size={12} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Stats cards (overlap hero) ── */}
        <div className="px-6 lg:px-8 -mt-14 relative z-10 mb-6 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {buildStats(statsData).map((s, i) => <StatCard key={s.label} {...s} index={i} />)}
          </div>
        </div>

        {/* ── Main content: 2-col layout ── */}
        <div className="px-6 pb-12 lg:px-8 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

            {/* Left column: meetings list */}
            <div className="lg:col-span-2 flex flex-col gap-5">

              {/* ── Meeting list card ── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="glass-card border rounded-2xl overflow-hidden"
              >
                {/* list header */}
                <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-violet-500/10 flex items-center justify-center">
                      <FileText size={13} className="text-violet-400" />
                    </div>
                    <p className="text-sm font-bold text-white">Meetings</p>
                    {meetings.length > 0 && (
                      <span className="text-[11px] font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">{meetings.length}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* filter tabs */}
                    <div className="flex items-center gap-1 bg-white/[0.06] rounded-full p-1">
                      {[['all', 'All'], ['month', 'Month'], ['starred', '★']].map(([f, label]) => (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${filter === f
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {/* search */}
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search…"
                        className="rounded-full glass-input border py-1.5 pl-7 pr-3 text-xs transition focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20 w-32 sm:w-44"
                      />
                    </div>
                  </div>
                </div>

                {/* list body */}
                {loading ? (
                  <div className="divide-y divide-[var(--divider)]">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                        <div className="w-10 h-10 rounded-2xl bg-white/[0.06] shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-white/[0.06] rounded-full w-3/5" />
                          <div className="h-2.5 bg-white/[0.06] rounded-full w-2/5" />
                        </div>
                        <div className="h-6 w-16 bg-white/[0.06] rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : filtered.length > 0 ? (
                  <>
                    {paginated.map((m, i) => (
                      <MeetingRow key={m.id} meeting={m} delay={i * 0.03} onStar={handleStar} onDelete={handleDelete} />
                    ))}
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      total={filtered.length}
                      pageSize={PAGE_SIZE}
                      onPage={setPage}
                    />
                  </>
                ) : (
                  <div className="py-20 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-3xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                      <FileText size={26} className="text-violet-300" />
                    </div>
                    <p className="font-bold text-slate-200 mb-1.5">
                      {search ? 'No matches found' : 'No meetings yet'}
                    </p>
                    <p className="text-sm text-slate-500 mb-6 max-w-[220px]">
                      {search
                        ? 'Try a different keyword or clear the filter.'
                        : 'Upload your first recording and get AI-generated minutes in minutes.'}
                    </p>
                    {!search && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/upload')}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/30 transition-all"
                      >
                        <Plus size={15} /> Upload first meeting
                      </motion.button>
                    )}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right column: sidebar widgets */}
            <div className="flex flex-col gap-4">
              <RecorderInviteCard botAccount={botAccount} />
              <UpcomingMeetings sessions={upcoming} />
              <TeamPreview />
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}



