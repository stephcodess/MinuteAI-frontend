import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Clock, Users, Zap, Search, MoreHorizontal,
  Trash2, AlertCircle, CheckCircle2, Calendar,
  Plus, Star, UserPlus, Bell, Loader2,
  CheckSquare, TrendingUp, ChevronLeft, ChevronRight,
  Bot, Copy, CalendarClock, ExternalLink,
  X, PlayCircle, Compass, ArrowRight, Briefcase, ChevronDown, Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import Sidebar from '../../components/Sidebar'
import { api, getWorkspaceBotAccount, listUpcomingMeetingBotSessions, getUpcomingCalendarEvents, searchMeetings, getPreMeetingBrief } from '../../lib/api'

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
      <span className="text-xs" style={{ color: 'var(--text-3)' }}>
        Showing <span className="font-medium" style={{ color: 'var(--text-2)' }}>{from}–{to}</span> of <span className="font-medium" style={{ color: 'var(--text-2)' }}>{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-white/[0.06] transition-colors"
          style={{ color: 'var(--text-3)' }}
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`ellipsis-${i}`} className="px-1 text-xs select-none" style={{ color: 'var(--text-3)' }}>…</span>
            : <button
              key={p}
              onClick={() => onPage(p)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${page === p
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-300/30'
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
          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-white/[0.06] transition-colors"
          style={{ color: 'var(--text-3)' }}
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
          <span className="text-[10px] font-bold px-2 py-1 rounded-full leading-tight text-right max-w-[110px]" style={{ color: 'var(--text-2)', background: 'var(--card-border)' }}>{delta}</span>
        </div>
        <p className="text-[34px] font-black leading-none mb-1 tracking-tight" style={{ color: 'var(--text-1)' }}>{String(value)}</p>
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>{label}</p>
      </div>
    </motion.div>
  )
}

// ── Meeting row ───────────────────────────────────────────────────────────────

function MeetingRow({ meeting, delay, onStar, onDelete, snippet = null }) {
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
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{meeting.title || 'Untitled meeting'}</p>
          {meeting.starred && <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />}
          {meeting.thread_category && (() => {
            const CAT_CLASSES: Record<string, string> = {
              engineering: 'text-blue-400 bg-blue-400/15',
              product:     'text-violet-400 bg-violet-400/15',
              design:      'text-pink-400 bg-pink-400/15',
              sales:       'text-emerald-400 bg-emerald-400/15',
              marketing:   'text-orange-400 bg-orange-400/15',
              client:      'text-amber-400 bg-amber-400/15',
              leadership:  'text-fuchsia-400 bg-fuchsia-400/15',
              all_hands:   'text-slate-400 bg-slate-400/15',
              one_on_one:  'text-sky-400 bg-sky-400/15',
              other:       'text-gray-400 bg-gray-400/15',
            }
            const CAT_LABELS: Record<string, string> = {
              engineering: 'Engineering', product: 'Product', design: 'Design',
              sales: 'Sales', marketing: 'Marketing', client: 'Client',
              leadership: 'Leadership', all_hands: 'All-Hands', one_on_one: '1:1', other: 'Other',
            }
            const cls = CAT_CLASSES[meeting.thread_category] || 'text-gray-400 bg-gray-400/15'
            return (
              <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${cls}`}>
                {CAT_LABELS[meeting.thread_category] || meeting.thread_category}
              </span>
            )
          })()}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>
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
        {snippet && (
          <p className="mt-1 text-[11px] italic line-clamp-1" style={{ color: 'var(--text-3)' }}>
            {snippet}
          </p>
        )}
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
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--text-3)' }}
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
                  className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-xl border z-20 py-1" style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
                >
                  <button
                    onClick={() => { onStar?.(meeting.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-[var(--nav-hover-bg)]"
                    style={{ color: 'var(--text-2)' }}
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
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-[var(--nav-hover-bg)]"
            style={{ color: 'var(--text-3)' }}
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
                  className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-xl border z-20 py-1" style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)' }}
                >
                  <button
                    onClick={() => { onStar?.(meeting.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-[var(--nav-hover-bg)]"
                    style={{ color: 'var(--text-2)' }}
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
          <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Activity</p>
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
            <Bell size={18} style={{ color: 'var(--text-3)' }} />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>No activity yet</p>
        </div>
      ) : (
        <div className="relative">
          {/* vertical timeline line */}
          <div className="absolute left-[27px] top-4 bottom-4 w-px" style={{ background: 'var(--divider)' }} />

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
                <p className="text-xs font-semibold leading-tight truncate" style={{ color: 'var(--text-1)' }}>{item.label}</p>
                {item.to ? (
                  <Link to={item.to} className="text-[11px] text-violet-500 hover:underline mt-0.5 block">
                    {item.sub} →
                  </Link>
                ) : (
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>{item.sub}</p>
                )}
              </div>
              <span className="text-[10px] shrink-0 pt-0.5" style={{ color: 'var(--text-3)' }}>{item.time}</span>
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
          <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Team</p>
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
            <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-[11px] font-bold ring-2 ring-white" style={{ color: 'var(--text-3)' }}>
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
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-1)' }}>{m.name}{m.isMe ? ' (you)' : ''}</p>
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
        <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Workspace recorder</p>
      </div>
      <div className="px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-2)' }}>Invite this bot</p>
        <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
            {botAccount?.email || 'Setting up recorder...'}
          </span>
          <button
            onClick={copyEmail}
            disabled={!botAccount?.email}
            className="shrink-0 rounded-lg p-1.5 hover:bg-white/[0.08] hover:text-violet-400 disabled:opacity-40"
            style={{ color: 'var(--text-3)' }}
            title="Copy recorder email"
          >
            {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
          Add this address as a guest when scheduling in Google Calendar so MinuteAI can detect and join workspace meetings.
        </p>
      </div>
    </motion.div>
  )
}

const LIVE_STATUSES = new Set(['preparing', 'joining', 'waiting_for_host', 'recording'])
const LIVE_LABEL = { preparing: 'Preparing…', joining: 'Joining…', waiting_for_host: 'Waiting for host', recording: 'Recording' }

function fmtCalStart(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const prefix = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return `${prefix} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

function recordingBadge(status: string | null, auto_join: boolean) {
  if (!status && auto_join) {
    return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Will record</span>
  }
  if (status === 'recording') {
    return <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Recording</span>
  }
  if (status && LIVE_STATUSES.has(status)) {
    return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{LIVE_LABEL[status] || status}</span>
  }
  if (status === 'done') {
    return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-500/10" style={{ color: 'var(--text-2)' }}>Recorded</span>
  }
  return null
}

function CalendarEventList({ events, autoJoin }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [briefs, setBriefs] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  function handleBrief(event) {
    if (openId === event.id) { setOpenId(null); return }
    setOpenId(event.id)
    if (briefs[event.id]) return
    setLoading(prev => ({ ...prev, [event.id]: true }))
    getPreMeetingBrief(event.title, event.attendees || [])
      .then(data => setBriefs(prev => ({ ...prev, [event.id]: data })))
      .catch(() => setBriefs(prev => ({ ...prev, [event.id]: { error: true } })))
      .finally(() => setLoading(prev => ({ ...prev, [event.id]: false })))
  }

  return (
    <div className="divide-y divide-[var(--divider)]">
      {events.map((event, index) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.3 + index * 0.04 }}
        >
          <div className="px-5 py-3.5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <Calendar size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="truncate text-xs font-bold" style={{ color: 'var(--text-1)' }}>{event.title}</p>
                  {recordingBadge(event.recording_status, autoJoin)}
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{fmtCalStart(event.start)}</p>
                <div className="mt-1 flex items-center gap-3">
                  <a href={event.meet_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300">
                    Join Meet <ExternalLink size={10} />
                  </a>
                  <button
                    onClick={() => handleBrief(event)}
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${openId === event.id ? 'text-violet-400' : 'text-violet-500/60 hover:text-violet-400'}`}
                  >
                    <Sparkles size={10} />
                    {openId === event.id ? 'Hide brief' : 'Get brief'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Inline brief panel */}
          <AnimatePresence>
            {openId === event.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mx-5 mb-3 rounded-xl border px-4 py-3 text-xs" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)' }}>
                  {loading[event.id] ? (
                    <div className="flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
                      <Loader2 size={12} className="animate-spin" /> Preparing brief…
                    </div>
                  ) : briefs[event.id]?.error ? (
                    <p style={{ color: 'var(--text-3)' }}>Could not load brief. Try again.</p>
                  ) : briefs[event.id] ? (
                    <PreMeetingBriefPanel brief={briefs[event.id]} />
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  )
}

function PreMeetingBriefPanel({ brief }) {
  return (
    <div className="space-y-3">
      {brief.has_history && brief.thread_name && (
        <p className="text-[10px] font-semibold text-violet-400">
          Thread: {brief.thread_name}
        </p>
      )}

      {brief.last_meeting_overview && (
        <div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Last session</p>
          <p className="leading-relaxed" style={{ color: 'var(--text-3)' }}>{brief.last_meeting_overview}</p>
        </div>
      )}

      {brief.last_decisions?.length > 0 && (
        <div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Previous decisions</p>
          <ul className="space-y-0.5">
            {brief.last_decisions.map((d, i) => (
              <li key={i} className="flex gap-1.5" style={{ color: 'var(--text-3)' }}>
                <span className="text-violet-400 shrink-0">·</span>{d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.open_tasks?.length > 0 && (
        <div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Open tasks</p>
          <ul className="space-y-0.5">
            {brief.open_tasks.map((t, i) => (
              <li key={i} className="flex gap-1.5" style={{ color: 'var(--text-3)' }}>
                <span className="text-amber-400 shrink-0">·</span>{t.title}
                {t.deadline && <span className="text-[10px] text-amber-400/70 ml-1">due {t.deadline}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.talking_points?.length > 0 && (
        <div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Talking points</p>
          <ul className="space-y-0.5">
            {brief.talking_points.map((p, i) => (
              <li key={i} className="flex gap-1.5" style={{ color: 'var(--text-3)' }}>
                <span className="text-emerald-400 shrink-0">→</span>{p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!brief.has_history && (
        <p style={{ color: 'var(--text-3)' }}>No previous sessions found for this meeting. Talking points generated from context.</p>
      )}
    </div>
  )
}

function UpcomingMeetings({ sessions, calendarData }) {
  const { connected, auto_join, events = [] } = calendarData || {}
  const liveSessions = sessions.filter(s => LIVE_STATUSES.has(s.status) && !s.scheduled_for)
  const hasLive = liveSessions.length > 0
  const isEmpty = liveSessions.length === 0 && events.length === 0

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass-card border rounded-2xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b divider flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <CalendarClock size={12} className="text-blue-400" />
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Upcoming</p>
        </div>
        <div className="flex items-center gap-2">
          {hasLive && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live
            </span>
          )}
          <Link to="/meeting-bots" className="text-[11px] font-semibold text-violet-400 hover:text-violet-300">
            View all
          </Link>
        </div>
      </div>

      {/* Live sessions (no calendar event) */}
      {liveSessions.length > 0 && (
        <div className="divide-y divide-[var(--divider)]">
          {liveSessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.3 + index * 0.04 }}
              className="px-5 py-3.5 bg-red-500/[0.04]"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold" style={{ color: 'var(--text-1)' }}>{session.title || 'Meeting'}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-red-400">{LIVE_LABEL[session.status] || session.status}</p>
                  {session.meeting_url && (
                    <a href={session.meeting_url} target="_blank" rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300">
                      Join <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Calendar events */}
      {events.length > 0 && (
        <CalendarEventList events={events} autoJoin={auto_join} />
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="px-5 py-8 text-center">
          <CalendarClock size={22} className="mx-auto" style={{ color: 'var(--text-3)' }} />
          {connected === false ? (
            <>
              <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Connect Google Calendar to see upcoming meetings</p>
              <Link to="/settings?tab=integrations" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-400 hover:underline">
                Connect Calendar
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--text-3)' }}>No upcoming Google Meet meetings</p>
              <Link to="/meeting-bots" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-400 hover:underline">
                <Plus size={10} /> Schedule a recording
              </Link>
            </>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ── Chief of Staff card ───────────────────────────────────────────────────────

function ChiefOfStaffCard() {
  const [briefing, setBriefing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    api.get('/chief-of-staff/briefing')
      .then(data => setBriefing(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.28 }}
      className="glass-card border rounded-2xl overflow-hidden"
    >
      <button
        className="w-full px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: expanded ? '1px solid var(--divider)' : 'none' }}
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Briefcase size={12} className="text-indigo-400" />
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Morning Briefing</p>
        </div>
        <div className="flex items-center gap-2">
          {briefing && (
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>
              {briefing.todays_meetings?.length ?? 0} meetings · {briefing.open_task_count ?? 0} tasks
            </span>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-5 py-4 space-y-4">
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2].map(i => (
                    <div key={i} className="h-3 rounded-full w-4/5" style={{ background: 'var(--input-bg)' }} />
                  ))}
                </div>
              ) : briefing ? (
                <>
                  {/* AI insight */}
                  {briefing.ai_insight && (
                    <div
                      className="rounded-xl px-4 py-3"
                      style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-indigo-400">✦ Today's insight</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                        {briefing.ai_insight}
                      </p>
                    </div>
                  )}

                  {/* Overdue alert */}
                  {briefing.overdue_count > 0 && (
                    <div
                      className="rounded-xl px-4 py-3"
                      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      <p className="text-xs font-semibold text-rose-400">
                        ⚠ {briefing.overdue_count} overdue task{briefing.overdue_count !== 1 ? 's' : ''}
                      </p>
                      {briefing.overdue_tasks?.slice(0, 2).map((t: any) => (
                        <p key={t.title} className="text-[11px] mt-1 truncate" style={{ color: 'var(--text-3)' }}>
                          {t.title}
                          {t.days_overdue ? <span className="text-rose-400"> · {t.days_overdue}d overdue</span> : ''}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Today's meetings */}
                  {briefing.todays_meetings?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
                        Today's meetings
                      </p>
                      {briefing.todays_meetings.map((m: any) => (
                        <div key={m.title} className="flex items-center justify-between py-1.5">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>{m.title}</p>
                          {m.scheduled_for && (
                            <span className="text-[11px] shrink-0 ml-2" style={{ color: 'var(--text-3)' }}>{m.scheduled_for}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <Link
                    to="/tasks"
                    className="flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-colors"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--text-2)',
                    }}
                  >
                    <CheckSquare size={11} /> View all tasks
                  </Link>
                </>
              ) : (
                <p className="text-xs text-center py-4" style={{ color: 'var(--text-3)' }}>
                  No briefing data available
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const TOUR_STEPS = [
  {
    selector: '[data-tour="new-meeting"]',
    title: 'Create your first meeting',
    body: 'Upload a recording or start from the New meeting flow. This is where most teams begin.',
    placement: 'bottom',
  },
  {
    selector: '[data-tour="stats"]',
    title: 'Track your workspace momentum',
    body: 'These cards summarize meetings processed, monthly volume, time saved, and action items extracted.',
    placement: 'bottom',
  },
  {
    selector: '[data-tour="meetings"]',
    title: 'Open completed meeting results',
    body: 'Your processed meetings appear here. Click a completed row to view minutes, transcript, recording, and tasks.',
    placement: 'right',
  },
  {
    selector: '[data-tour="upcoming"]',
    title: 'Let MinuteAI join scheduled calls',
    body: 'Connect your calendar or schedule a bot recording so meetings can be captured automatically.',
    placement: 'left',
  },
  {
    selector: '[data-tour="recorder"]',
    title: 'Invite your workspace recorder',
    body: 'Add this recorder email to calendar invites when you want MinuteAI to join as a guest.',
    placement: 'left',
  },
]

function DashboardTour({ userId }: { userId?: string }) {
  const storageKey = `minuteai_dashboard_tour_done_${userId || 'anon'}`
  const introVideo = import.meta.env.VITE_INTRO_VIDEO_URL
  const [showIntro, setShowIntro] = useState(false)
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (localStorage.getItem(storageKey)) return
    const id = window.setTimeout(() => setShowIntro(true), 700)
    return () => window.clearTimeout(id)
  }, [storageKey])

  useEffect(() => {
    if (!active) return
    function updateRect() {
      const el = document.querySelector(TOUR_STEPS[stepIndex]?.selector)
      setRect(el?.getBoundingClientRect() ?? null)
    }
    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [active, stepIndex])

  function startTour() {
    setShowIntro(false)
    setActive(true)
    setStepIndex(0)
  }

  function finishTour() {
    localStorage.setItem(storageKey, 'true')
    setShowIntro(false)
    setActive(false)
  }

  function nextStep() {
    if (stepIndex >= TOUR_STEPS.length - 1) finishTour()
    else setStepIndex(i => i + 1)
  }

  function skipIntro() {
    localStorage.setItem(storageKey, 'true')
    setShowIntro(false)
  }

  useEffect(() => {
    const handler = () => startTour()
    window.addEventListener('minuteai:start-dashboard-tour', handler)
    return () => window.removeEventListener('minuteai:start-dashboard-tour', handler)
  }, [])

  const step = TOUR_STEPS[stepIndex]
  const top = rect ? Math.min(Math.max(rect.bottom + 12, 16), window.innerHeight - 220) : 120
  const preferLeft = step?.placement === 'left'
  const left = rect
    ? preferLeft
      ? Math.max(16, rect.left - 340)
      : Math.min(Math.max(16, rect.left), window.innerWidth - 340)
    : 32

  return (
    <AnimatePresence>
      {showIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={skipIntro} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl"
            style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--card-border)' }}
          >
            <button onClick={skipIntro} className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-black/30 text-white transition hover:bg-black/50">
              <X size={15} />
            </button>
            <div className="aspect-video bg-black">
              {introVideo ? (
                <video src={introVideo} controls autoPlay className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-violet-950 via-slate-950 to-indigo-950 px-8 text-center text-white">
                  <PlayCircle size={56} className="mb-4 text-violet-300" />
                  <p className="text-xl font-black">Welcome to MinuteAI</p>
                  <p className="mt-2 max-w-md text-sm text-white/65">
                    Add `VITE_INTRO_VIDEO_URL` to show your onboarding video here.
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-5">
              <p className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Let’s get you oriented</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>
                Watch the intro, then take a quick tour of where meetings, tasks, recordings, and bots live.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button onClick={skipIntro} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Skip
                </button>
                <button onClick={startTour} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                  Start tour <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-black/55" />
          {rect && (
            <motion.div
              layout
              className="absolute rounded-2xl border-2 border-violet-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
              style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
            />
          )}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-auto absolute w-[min(360px,calc(100vw-32px))] rounded-2xl border p-4 shadow-2xl backdrop-blur-none"
            style={{ left, top, background: 'var(--sidebar-bg)', borderColor: 'var(--card-border)' }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-violet-400">
                {stepIndex + 1} of {TOUR_STEPS.length}
              </span>
              <button onClick={finishTour} className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-white/[0.06]" style={{ color: 'var(--text-3)' }}>
                <X size={13} />
              </button>
            </div>
            <p className="text-base font-bold" style={{ color: 'var(--text-1)' }}>{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-3)' }}>{step.body}</p>
            <div className="mt-4 flex items-center justify-between">
              <button onClick={finishTour} className="text-sm font-semibold" style={{ color: 'var(--text-3)' }}>Skip</button>
              <button onClick={nextStep} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                {stepIndex >= TOUR_STEPS.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={13} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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
  const [calendarData, setCalendarData] = useState(null)
  const [botAccount, setBotAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

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
      getUpcomingCalendarEvents(7).catch(() => null),
    ])
      .then(([m, s, u, upcomingSessions, bot, calData]) => {
        setMeetings(m)
        setStatsData(s)
        setUsage(u)
        setUpcoming(upcomingSessions)
        setBotAccount(bot)
        setCalendarData(calData)
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

  // Debounced full-content search
  useEffect(() => {
    if (!search.trim()) { setSearchResults(null); return }
    setSearchLoading(true)
    const timer = setTimeout(() => {
      searchMeetings(search.trim(), activeWorkspace?.id)
        .then(r => setSearchResults(r))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false))
    }, 350)
    return () => clearTimeout(timer)
  }, [search, activeWorkspace?.id])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const remaining = usage ? Math.max((usage.meetings_limit ?? 3) - (usage.meetings_used ?? 0), 0) : null
  const doneMeetings = meetings.filter(m => m.status === 'done').length

  const filtered = searchResults !== null
    ? searchResults
    : meetings.filter(m => {
        return filter === 'starred' ? m.starred :
          filter === 'month' ? new Date(m.date) > new Date(Date.now() - 30 * 86400000) :
            true
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
        <div className="relative overflow-hidden border-b dashboard-hero px-4 pb-24 pt-8 sm:px-6 lg:px-8"
          style={{ borderColor: 'var(--card-border)' }}>
          {/* mesh pattern */}
          <div className="absolute inset-0 pointer-events-none dashboard-hero-dots" />
          <div className="relative mx-auto max-w-7xl">
            {/* top row: greeting + CTA */}
            <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                {/* date badge */}
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/75 mb-3">
                  <Calendar size={10} />
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                  {greeting}, {user?.name?.split(' ')[0]} 👋
                </h1>
                <p className="text-white/80 text-sm mt-1.5 font-medium">
                  {activeWorkspace?.name ?? 'Your workspace'}
                  {remaining !== null && (
                    <span className="ml-2 inline-flex items-center gap-1 bg-white/10 border border-white/15 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white/80">
                      <Zap size={9} className="text-amber-300" />
                      {remaining} meetings left
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('minuteai:start-dashboard-tour'))}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white/85 transition hover:bg-white/15"
                >
                  <Compass size={15} /> Take tour
                </button>
                <motion.button
                  data-tour="new-meeting"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/upload')}
                  className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-full bg-white text-violet-700 text-sm font-bold shadow-xl shadow-violet-900/30 hover:shadow-2xl transition-all"
                >
                  <Plus size={16} />
                  New meeting
                </motion.button>
              </div>
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
        <div data-tour="stats" className="relative z-10 mx-auto -mt-12 mb-6 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {buildStats(statsData).map((s, i) => <StatCard key={s.label} {...s} index={i} />)}
          </div>
        </div>

        {/* ── Main content: 2-col layout ── */}
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">

            {/* Left column: meetings list */}
            <div className="flex flex-col gap-5 xl:col-span-8">

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { title: 'Upload a recording', body: 'Turn audio or video into minutes.', icon: FileText, to: '/upload' },
                  { title: 'Invite the bot', body: 'Record calendar meetings automatically.', icon: Bot, to: '/meeting-bots' },
                  { title: 'Assign action items', body: 'Track extracted work with your team.', icon: CheckSquare, to: '/tasks' },
                ].map(({ title, body, icon: Icon, to }) => (
                  <Link key={title} to={to} className="glass-card group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-violet-500/30">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                      <Icon size={16} />
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{title}</p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{body}</p>
                  </Link>
                ))}
              </div>

              {/* ── Meeting list card ── */}
              <motion.div
                data-tour="meetings"
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
                    <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Meetings</p>
                    {meetings.length > 0 && (
                      <span className="text-[11px] font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">{meetings.length}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* filter tabs */}
                    <div className="flex items-center gap-1 rounded-full p-1" style={{ background: 'var(--input-bg)' }}>
                      {[['all', 'All'], ['month', 'Month'], ['starred', '★']].map(([f, label]) => (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${filter === f
                            ? 'bg-violet-600 text-white shadow-sm'
                            : ''
                          }`}
                          style={{ color: filter === f ? undefined : 'var(--text-3)' }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {/* search */}
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
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
                {loading || searchLoading ? (
                  <div className="divide-y divide-[var(--divider)]">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                        <div className="w-10 h-10 rounded-2xl shrink-0" style={{ background: 'var(--input-bg)' }} />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 rounded-full w-3/5" style={{ background: 'var(--input-bg)' }} />
                          <div className="h-2.5 rounded-full w-2/5" style={{ background: 'var(--input-bg)' }} />
                        </div>
                        <div className="h-6 w-16 rounded-full" style={{ background: 'var(--input-bg)' }} />
                      </div>
                    ))}
                  </div>
                ) : filtered.length > 0 ? (
                  <>
                    {paginated.map((m, i) => (
                      <MeetingRow key={m.id} meeting={m} delay={i * 0.03} onStar={handleStar} onDelete={handleDelete} snippet={m.snippet} />
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
                    <p className="font-bold mb-1.5" style={{ color: 'var(--text-1)' }}>
                      {search ? 'No matches found' : 'No meetings yet'}
                    </p>
                    <p className="text-sm mb-6 max-w-[260px]" style={{ color: 'var(--text-3)' }}>
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
            <div className="flex flex-col gap-4 xl:col-span-4">
              <div data-tour="upcoming">
                <UpcomingMeetings sessions={upcoming} calendarData={calendarData} />
              </div>
              <div data-tour="recorder">
                <RecorderInviteCard botAccount={botAccount} />
              </div>
              <ChiefOfStaffCard />
              <TeamPreview />
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}



