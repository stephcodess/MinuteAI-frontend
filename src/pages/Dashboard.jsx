import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Clock, Users, Zap, Search, MoreHorizontal,
  Eye, Trash2, AlertCircle, CheckCircle2, Calendar,
  Plus, Star, UserPlus, Bell, Loader2,
  CheckSquare, TrendingUp, ChevronLeft, ChevronRight,
  Bot, Copy, CalendarClock, ExternalLink,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import Sidebar from '../components/Sidebar'
import { api, getWorkspaceBotAccount, listUpcomingMeetingBotSessions } from '../lib/api'

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
    { label: 'Total Meetings', value: s?.total_meetings    ?? 0,     delta: `${s?.processing ?? 0} processing`,    icon: FileText, gradient: 'from-violet-500 to-indigo-600' },
    { label: 'This Month',     value: s?.meetings_this_month ?? 0,   delta: 'meetings this month',                  icon: Calendar, gradient: 'from-sky-400 to-blue-500'      },
    { label: 'Hours Saved',    value: `${Math.round((s?.total_meetings ?? 0) * 0.75)}h`, delta: 'vs writing manually', icon: Clock, gradient: 'from-emerald-400 to-teal-500'  },
    { label: 'Action Items',   value: s?.total_action_items ?? 0,    delta: 'tracked across meetings',               icon: Zap,      gradient: 'from-amber-400 to-orange-500' },
  ]
}

function fmtDate(iso) {
  const d = new Date(iso), now = new Date(), diff = now - d
  if (diff < 86400000)  return 'Today'
  if (diff < 172800000) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtTimeAgo(iso) {
  const diff = Date.now() - new Date(iso)
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
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
  const to   = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
      <span className="text-xs text-gray-400">
        Showing <span className="font-medium text-gray-600">{from}–{to}</span> of <span className="font-medium text-gray-600">{total}</span>
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
            ? <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-xs select-none">…</span>
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

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, delta, icon: Icon, gradient, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="bg-white rounded-2xl p-5 shadow-xl shadow-gray-200/60 border border-white hover:shadow-2xl hover:-translate-y-0.5 transition-all cursor-default"
    >
      <div className="flex items-center justify-between mb-5">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon size={17} className="text-white" />
        </div>
        <span className="text-[11px] text-gray-400 font-medium">{delta}</span>
      </div>
      <p className="text-[32px] font-black text-gray-900 leading-none mb-1.5 tracking-tight">{String(value)}</p>
      <p className="text-sm font-semibold text-gray-500">{label}</p>
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
      className="group flex items-center gap-4 px-5 py-4 hover:bg-violet-50/30 border-b border-gray-50 last:border-0 transition-colors cursor-pointer"
      onClick={() => meeting.status === 'done' && navigate(`/results/${meeting.id}`)}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-sm`}>
        {meeting.status === 'processing' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : meeting.status === 'error' ? (
          <AlertCircle size={16} />
        ) : initial}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-gray-900 truncate">{meeting.title || 'Untitled meeting'}</p>
          {meeting.starred && <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><Calendar size={9} />{fmtDate(meeting.date)}</span>
          {meeting.duration && meeting.duration !== '—' && (
            <span className="flex items-center gap-1"><Clock size={9} />{meeting.duration}</span>
          )}
          {meeting.participants > 0 && (
            <span className="flex items-center gap-1"><Users size={9} />{meeting.participants} people</span>
          )}
          {meeting.actions > 0 && (
            <span className="flex items-center gap-1 text-violet-500 font-semibold">
              <Zap size={9} />{meeting.actions} actions
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
        meeting.status === 'done'       ? 'bg-emerald-50 text-emerald-700' :
        meeting.status === 'processing' ? 'bg-blue-50 text-blue-600'       :
                                          'bg-red-50 text-red-600'
      }`}>
        {meeting.status === 'done' ? '✓ Done' : meeting.status === 'processing' ? 'Processing' : 'Failed'}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
        {meeting.status === 'done' && (
          <button
            title="View"
            onClick={() => navigate(`/results/${meeting.id}`)}
            className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-violet-600 transition-colors"
          >
            <Eye size={14} />
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-gray-700 transition-colors"
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
                  className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-1"
                >
                  <button
                    onClick={() => { onStar?.(meeting.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <Star size={13} className={meeting.starred ? 'fill-amber-400 text-amber-400' : ''} />
                    {meeting.starred ? 'Unstar' : 'Star'}
                  </button>
                  <button
                    onClick={() => { onDelete?.(meeting.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 hover:bg-red-50"
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
    id:    m.id,
    icon:  m.status === 'done' ? CheckCircle2 : m.status === 'processing' ? Loader2 : AlertCircle,
    dot:   m.status === 'done' ? 'bg-emerald-400' : m.status === 'processing' ? 'bg-blue-400' : 'bg-red-400',
    label: m.status === 'done' ? (m.title || 'Meeting') : m.title || 'Meeting',
    sub:   m.status === 'done' ? 'Minutes ready' : m.status === 'processing' ? 'Processing…' : 'Processing failed',
    time:  fmtTimeAgo(m.date),
    to:    m.status === 'done' ? `/results/${m.id}` : null,
    spinning: m.status === 'processing',
  }))

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center">
            <Bell size={12} className="text-violet-600" />
          </div>
          <p className="text-sm font-bold text-gray-900">Activity</p>
        </div>
        {items.some(i => i.spinning) && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-10 flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
            <Bell size={18} className="text-gray-300" />
          </div>
          <p className="text-xs text-gray-400">No activity yet</p>
        </div>
      ) : (
        <div className="relative">
          {/* vertical timeline line */}
          <div className="absolute left-[27px] top-4 bottom-4 w-px bg-gray-100" />

          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.3 + i * 0.05 }}
              className="relative flex items-start gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors"
            >
              {/* timeline dot */}
              <div className={`relative z-10 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                item.spinning ? 'bg-blue-50' :
                item.dot === 'bg-emerald-400' ? 'bg-emerald-50' : 'bg-red-50'
              }`}>
                <item.icon
                  size={13}
                  className={
                    item.spinning     ? 'text-blue-500 animate-spin' :
                    item.dot === 'bg-emerald-400' ? 'text-emerald-500' : 'text-red-500'
                  }
                />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{item.label}</p>
                {item.to ? (
                  <Link to={item.to} className="text-[11px] text-violet-500 hover:underline mt-0.5 block">
                    {item.sub} →
                  </Link>
                ) : (
                  <p className="text-[11px] text-gray-400 mt-0.5">{item.sub}</p>
                )}
              </div>
              <span className="text-[10px] text-gray-300 shrink-0 pt-0.5">{item.time}</span>
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
        name:     m.name || m.invited_email?.split('@')[0] || 'Member',
        initials: m.initials || (m.invited_email || 'MM').slice(0, 2).toUpperCase(),
        grad:     GRADS[(i + 1) % GRADS.length],
        status:   m.status,
      }))
      if (user) {
        list.unshift({
          name:     user.name || 'You',
          initials: (user.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
          grad:     GRADS[0],
          status:   'active',
          isMe:     true,
        })
      }
      setMembers(list.slice(0, 5))
    }).catch(() => {
      if (user) {
        setMembers([{
          name:     user.name || 'You',
          initials: (user.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
          grad:     GRADS[0],
          status:   'active',
          isMe:     true,
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
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center">
            <Users size={12} className="text-violet-600" />
          </div>
          <p className="text-sm font-bold text-gray-900">Team</p>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
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
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[11px] font-bold ring-2 ring-white">
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
                <p className="text-xs font-semibold text-gray-900 truncate">{m.name}{m.isMe ? ' (you)' : ''}</p>
              </div>
              <div className="flex items-center gap-1">
                {m.isMe && (
                  <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">Admin</span>
                )}
                <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'pending' ? 'bg-amber-400' : 'bg-emerald-500'}`} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-4 flex gap-2">
        <Link
          to="/team"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors shadow-sm shadow-violet-200"
        >
          <Users size={12} /> Manage team
        </Link>
        <Link
          to="/team"
          className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-dashed border-violet-300 hover:bg-violet-50 text-violet-600 text-xs font-semibold transition-colors"
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
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-cyan-50 flex items-center justify-center">
          <Bot size={12} className="text-cyan-600" />
        </div>
        <p className="text-sm font-bold text-gray-900">Workspace recorder</p>
      </div>
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Invite this bot</p>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
            {botAccount?.email || 'Setting up recorder...'}
          </span>
          <button
            onClick={copyEmail}
            disabled={!botAccount?.email}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-violet-600 disabled:opacity-40"
            title="Copy recorder email"
          >
            {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-gray-500">
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
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
            <CalendarClock size={12} className="text-blue-600" />
          </div>
          <p className="text-sm font-bold text-gray-900">Upcoming</p>
        </div>
        <Link to="/meeting-bots" className="text-[11px] font-semibold text-violet-600 hover:underline">
          View all
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <CalendarClock size={22} className="mx-auto text-gray-300" />
          <p className="mt-2 text-xs font-semibold text-gray-500">No upcoming bot meetings</p>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-400">Invite the workspace recorder or schedule from MinuteAI.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
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
                  <p className="truncate text-xs font-bold text-gray-900">{session.title || 'Scheduled meeting'}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{fmtUpcoming(session.scheduled_for)}</p>
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
  const { user }            = useAuth()
  const { activeWorkspace } = useWorkspace()
  const navigate            = useNavigate()
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all')
  const [page,      setPage]      = useState(1)
  const [meetings,  setMeetings]  = useState([])
  const [statsData, setStatsData] = useState(null)
  const [usage,     setUsage]     = useState(null)
  const [upcoming,  setUpcoming]  = useState([])
  const [botAccount, setBotAccount] = useState(null)
  const [loading,   setLoading]   = useState(true)

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
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeWorkspace?.id])

  function handleStar(id) {
    api.patch(`/meetings/${id}/star`, {}).then(({ starred }) =>
      setMeetings(prev => prev.map(m => m.id === id ? { ...m, starred } : m))
    ).catch(() => {})
  }

  function handleDelete(id) {
    api.delete(`/meetings/${id}`).then(() =>
      setMeetings(prev => prev.filter(m => m.id !== id))
    ).catch(() => {})
  }

  const hour       = new Date().getHours()
  const greeting   = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const remaining  = usage ? Math.max((usage.meetings_limit ?? 3) - (usage.meetings_used ?? 0), 0) : null
  const doneMeetings = meetings.filter(m => m.status === 'done').length

  const filtered = meetings.filter(m => {
    const matchSearch = (m.title || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'starred' ? m.starred :
      filter === 'month'   ? new Date(m.date) > new Date(Date.now() - 30 * 86400000) :
      true
    return matchSearch && matchFilter
  })

  // Reset to page 1 whenever filter or search changes
  useEffect(() => { setPage(1) }, [filter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex h-screen bg-[#f8f7ff] overflow-hidden">
      <Sidebar active="dashboard" />

      <main className="flex-1 overflow-y-auto">

        {/* ── Hero ── */}
        <div className="relative bg-gradient-to-br from-violet-700 via-[#5b45e8] to-indigo-800 px-8 pt-10 pb-24 overflow-hidden">
          {/* dot grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)', backgroundSize: '28px 28px' }}
          />
          {/* ambient blobs */}
          <div className="absolute -top-20 -right-10 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-violet-300/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-purple-400/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-6">
            <div>
              <p className="text-violet-300/70 text-sm font-medium mb-2">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-[30px] font-bold text-white leading-tight tracking-tight">
                {greeting}, {user?.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-violet-200/60 text-sm mt-2">
                {activeWorkspace?.name ?? 'Your workspace'} ·{' '}
                <span className="text-violet-200/80 font-medium">{doneMeetings} meeting{doneMeetings !== 1 ? 's' : ''} processed</span>
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/upload')}
              className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-violet-700 text-sm font-bold shadow-xl hover:shadow-2xl transition-all mt-2"
            >
              <Plus size={16} />
              New meeting
            </motion.button>
          </div>

          {/* Quick action chips */}
          <div className="relative mt-7 flex gap-2 flex-wrap">
            {[
              { icon: UserPlus,    label: 'Invite team',   to: '/team'    },
              { icon: CheckSquare, label: 'My tasks',       to: '/tasks'   },
              { icon: Zap,         label: remaining !== null ? `${remaining} meetings left` : 'View plan', to: '/billing' },
              { icon: TrendingUp,  label: 'View analytics', to: '/dashboard' },
            ].map(({ icon: Icon, label, to }) => (
              <Link
                key={label}
                to={to}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 text-white/90 text-xs font-medium border border-white/10 transition-all backdrop-blur-sm"
              >
                <Icon size={12} />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Stats (overlap hero) ── */}
        <div className="px-8 -mt-12 relative z-10 mb-7">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {buildStats(statsData).map((s, i) => <StatCard key={s.label} {...s} index={i} />)}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="px-8 pb-10">
          <div className="flex gap-5 items-start">

            {/* ── Meeting list ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* list header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-0.5">
                  {[['all', 'All'], ['month', 'This month'], ['starred', 'Starred']].map(([f, label]) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        filter === f
                          ? 'bg-violet-600 text-white shadow-sm shadow-violet-300/30'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {f === 'starred' && <Star size={10} className={filter === f ? 'fill-white text-white' : 'text-amber-400'} />}
                      {label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search meetings…"
                    className="pl-8 pr-4 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent w-44 transition"
                  />
                </div>
              </div>

              {/* list body */}
              {loading ? (
                <div className="divide-y divide-gray-50">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-3/5" />
                        <div className="h-2.5 bg-gray-100 rounded w-2/5" />
                      </div>
                      <div className="h-6 w-16 bg-gray-100 rounded-full" />
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
                  <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <FileText size={26} className="text-violet-400" />
                  </div>
                  <p className="font-bold text-gray-900 mb-1.5">
                    {search ? 'No matches found' : 'No meetings yet'}
                  </p>
                  <p className="text-sm text-gray-400 mb-6 max-w-[220px]">
                    {search
                      ? 'Try a different keyword or clear the filter.'
                      : 'Upload your first recording and get AI-generated minutes in minutes.'}
                  </p>
                  {!search && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/upload')}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-md shadow-violet-300/30 transition-all"
                    >
                      <Plus size={15} /> Upload first meeting
                    </motion.button>
                  )}
                </div>
              )}
            </motion.div>

            {/* ── Right panel ── */}
            <div className="w-72 shrink-0 space-y-4">
              <RecorderInviteCard botAccount={botAccount} />
              <UpcomingMeetings sessions={upcoming} />
              <ActivityFeed meetings={meetings} />
              <TeamPreview />
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}
