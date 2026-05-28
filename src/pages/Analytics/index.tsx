import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays, Clock, Zap, CheckCircle2,
  Users, TrendingUp, AlertCircle, Radio, ArrowUpRight, Crown, Sparkles,
} from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import { useWorkspace } from '../../context/WorkspaceContext'
import { getMeetingAnalytics, getUserUsage } from '../../lib/api'

const RANGE_OPTIONS = [
  { label: '4 weeks',  days: 28  },
  { label: '12 weeks', days: 84  },
  { label: '6 months', days: 180 },
  { label: '1 year',   days: 365 },
]

function fmtDuration(mins: number | null): string {
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// ── Smooth SVG area chart ────────────────────────────────────────────────────

function AreaChart({ series, color = '#7c3aed', height = 140 }: {
  series: { label: string; value: number }[]
  color?: string
  height?: number
}) {
  if (!series.length) return null
  const W = 560, H = height
  const max = Math.max(...series.map(d => d.value), 1)
  const pts = series.map((d, i) => ({
    x: (i / Math.max(series.length - 1, 1)) * W,
    y: 8 + (1 - d.value / max) * (H - 16),
  }))

  function smooth() {
    if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const cpx = (pts[i].x + pts[i + 1].x) / 2
      d += ` C ${cpx} ${pts[i].y}, ${cpx} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`
    }
    return d
  }

  const line = smooth()
  const area = `${line} L ${W} ${H} L 0 ${H} Z`
  const gid = `ag${color.replace(/[^a-z0-9]/gi, '')}`

  return (
    <div className="overflow-x-auto -mx-1">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ minWidth: 240 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.20" />
            <stop offset="100%" stopColor={color} stopOpacity="0.00" />
          </linearGradient>
        </defs>
        {[0, 0.33, 0.66, 1].map(t => (
          <line key={t} x1={0} y1={8 + t * (H - 16)} x2={W} y2={8 + t * (H - 16)}
            stroke="currentColor" strokeWidth={0.4} opacity={0.07} />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {pts.map((p, i) => series[i].value > 0 && (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} opacity={0.9}>
            <title>{series[i].label}: {series[i].value}</title>
          </circle>
        ))}
        {series.map((d, i) => {
          if (i % Math.ceil(series.length / 7) !== 0 && i !== series.length - 1) return null
          return (
            <text key={i} x={pts[i].x} y={H + 14} textAnchor="middle"
              fontSize={7} fill="currentColor" opacity={0.38}>
              {d.label.replace(/^\d{4}-W/, 'W')}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ── Mini sparkline (for stat cards) ─────────────────────────────────────────

function Spark({ series, color }: { series: number[]; color: string }) {
  if (series.every(v => v === 0)) return null
  const W = 80, H = 28
  const max = Math.max(...series, 1)
  const pts = series.map((v, i) => ({
    x: (i / (series.length - 1)) * W,
    y: H - (v / max) * H * 0.9,
  }))
  let d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" opacity={0.7} />
    </svg>
  )
}

// ── Day-of-week bars ─────────────────────────────────────────────────────────

function DayBars({ series }: { series: { day: string; count: number }[] }) {
  const max = Math.max(...series.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-1 mt-1" style={{ height: 72 }}>
      {series.map(({ day, count }) => {
        const pct = count / max
        const weekend = day === 'Sat' || day === 'Sun'
        return (
          <div key={day} className="flex flex-1 flex-col items-center gap-0.5">
            <div className="w-full rounded-sm" style={{
              height: `${Math.max(pct * 52, count > 0 ? 3 : 2)}px`,
              background: weekend ? 'var(--card-border)' : '#7c3aed',
              opacity: weekend ? 0.45 : Math.max(0.35, pct),
              marginTop: `${52 - Math.max(pct * 52, count > 0 ? 3 : 2)}px`,
              transition: 'height 0.5s',
            }} />
            <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>{day.slice(0, 2)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Donut ────────────────────────────────────────────────────────────────────

function Donut({ segments, size = 72 }: {
  segments: { label: string; value: number; color: string }[]
  size?: number
}) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1
  const R = 26, cx = 36, cy = 36, sw = 10
  const circ = 2 * Math.PI * R
  let cum = 0
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" className="shrink-0">
      <circle cx={cx} cy={cy} r={R} fill="none"
        stroke="currentColor" strokeWidth={sw} opacity={0.07} />
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const pct = seg.value / total
        const off = -(cum * circ)
        cum += pct
        return (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none"
            stroke={seg.color} strokeWidth={sw}
            strokeDasharray={`${pct * circ} ${circ}`}
            strokeDashoffset={off}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '36px 36px' }}>
            <title>{seg.label}: {seg.value}</title>
          </circle>
        )
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fontWeight="700"
        fill="currentColor" opacity={0.7}>{total}</text>
    </svg>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, accent, spark, delay = 0 }: {
  icon: any; label: string; value: string | number
  sub?: string; accent: string; spark?: number[]; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border p-4 flex flex-col gap-2 relative overflow-hidden"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={15} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-black leading-none" style={{ color: 'var(--text-1)' }}>{value}</p>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-3)' }}>{label}</p>
          {sub && <p className="text-[11px] mt-0.5 font-medium" style={{ color: 'var(--text-3)' }}>{sub}</p>}
        </div>
        {spark && <Spark series={spark} color={accent.includes('violet') ? '#7c3aed' : accent.includes('sky') ? '#0ea5e9' : accent.includes('amber') ? '#f59e0b' : '#10b981'} />}
      </div>
    </motion.div>
  )
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function Panel({ title, icon: Icon, accent, children, delay = 0, className = '' }: {
  title: string; icon: any; accent: string
  children: React.ReactNode; delay?: number; className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-2xl border p-5 flex flex-col ${className}`}
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <Icon size={13} className={accent} />
        <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{title}</p>
      </div>
      {children}
    </motion.div>
  )
}

function Skeleton({ h = 'h-40' }: { h?: string }) {
  return <div className={`rounded-2xl animate-pulse ${h}`} style={{ background: 'var(--card-border)' }} />
}

// ── Usage / subscription panel ───────────────────────────────────────────────

const PLAN_META: Record<string, { label: string; color: string; gradient: string }> = {
  free:  { label: 'Free',       color: 'text-slate-400',  gradient: 'from-slate-500/20 to-slate-500/5'    },
  pro:   { label: 'Pro',        color: 'text-violet-400', gradient: 'from-violet-500/20 to-violet-500/5'  },
  team:  { label: 'Team',       color: 'text-sky-400',    gradient: 'from-sky-500/20 to-sky-500/5'        },
  admin: { label: 'Admin',      color: 'text-amber-400',  gradient: 'from-amber-500/20 to-amber-500/5'    },
}

function UsageBar({ used, limit, color }: { used: number; limit: number | null; color: string }) {
  const pct = limit ? Math.min((used / limit) * 100, 100) : 0
  const near = limit ? pct >= 80 : false
  const barColor = near ? '#f87171' : color
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: limit ? `${pct}%` : '100%', background: barColor, opacity: limit ? 1 : 0.2 }} />
    </div>
  )
}

function UsagePanel() {
  const [usage, setUsage] = useState<any>(null)

  useEffect(() => {
    getUserUsage().then(setUsage).catch(() => {})
  }, [])

  if (!usage) return null

  const plan = usage.plan || 'free'
  const meta = PLAN_META[plan] || PLAN_META.free
  const isFree = plan === 'free'

  const meetingsUsed  = usage.meetings_used  ?? 0
  const meetingsLimit = usage.meetings_limit ?? null
  const hoursUsed     = usage.hours_used     ?? 0
  const hoursLimit    = usage.hours_limit    ?? null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0 }}
      className="rounded-2xl border p-5 relative overflow-hidden"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      {/* Subtle gradient bg */}
      <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} pointer-events-none`} />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">

        {/* Plan badge */}
        <div className="shrink-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Crown size={14} className={meta.color} />
            <span className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>{meta.label} Plan</span>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
            {isFree ? 'Upgrade for more capacity' : 'Current subscription'}
          </p>
        </div>

        {/* Usage bars */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Meetings */}
          <div>
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Meetings this month</span>
              <span className="text-xs tabular-nums font-bold" style={{ color: 'var(--text-1)' }}>
                {meetingsUsed}{meetingsLimit !== null ? ` / ${meetingsLimit}` : ''}
              </span>
            </div>
            <UsageBar used={meetingsUsed} limit={meetingsLimit} color="#7c3aed" />
            {meetingsLimit !== null && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>
                {Math.max(meetingsLimit - meetingsUsed, 0)} remaining
              </p>
            )}
          </div>

          {/* Hours */}
          <div>
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Audio hours used</span>
              <span className="text-xs tabular-nums font-bold" style={{ color: 'var(--text-1)' }}>
                {hoursUsed}h{hoursLimit !== null ? ` / ${hoursLimit}h` : ''}
              </span>
            </div>
            <UsageBar used={hoursUsed} limit={hoursLimit} color="#0ea5e9" />
            {hoursLimit !== null && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>
                {Math.max(hoursLimit - hoursUsed, 0)}h remaining
              </p>
            )}
          </div>

        </div>

        {/* CTA */}
        {isFree && (
          <div className="shrink-0 self-center">
            <button
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', borderRadius: 8 }}
              onClick={() => window.location.href = '/settings?tab=billing'}
            >
              <Sparkles size={12} />
              Upgrade
              <ArrowUpRight size={11} />
            </button>
          </div>
        )}

      </div>
    </motion.div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { activeWorkspace } = useWorkspace()
  const [range, setRange]   = useState(84)
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspace) return
    setLoading(true)
    getMeetingAnalytics(range, activeWorkspace.id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [range, activeWorkspace?.id])

  const weekly         = data?.weekly_series ?? []
  const meetingSeries  = weekly.map((w: any) => ({ label: w.week, value: w.meetings }))
  const actionSeries   = weekly.map((w: any) => ({ label: w.week, value: w.actions  }))
  const meetingSpark   = weekly.slice(-12).map((w: any) => w.meetings)
  const actionSpark    = weekly.slice(-12).map((w: any) => w.actions)
  const daysSeries     = data?.busiest_day_series ?? []
  const participants   = data?.top_participants   ?? []

  const totalMeetings  = data?.total_meetings    ?? 0
  const totalHours     = data?.total_hours       ?? 0
  const avgDur         = data?.avg_duration_min  ?? null
  const totalActions   = data?.total_actions     ?? 0
  const totalDecisions = data?.total_decisions   ?? 0
  const botCount       = data?.bot_count         ?? 0
  const uploadCount    = data?.upload_count      ?? 0
  const completionRate = data?.completion_rate   ?? null
  const noActions      = data?.meetings_no_actions ?? 0
  const errorCount     = data?.by_status?.error  ?? 0
  const processingCount = data?.by_status?.processing ?? 0

  const busiestDay = daysSeries.length
    ? [...daysSeries].sort((a: any, b: any) => b.count - a.count)[0]
    : null
  const hasDay = daysSeries.some((d: any) => d.count > 0)
  const hasSource = botCount + uploadCount > 0

  return (
    <div className="flex h-screen app-bg app-grid overflow-hidden">
      <Sidebar active="analytics" />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="px-4 py-7 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex flex-col gap-3 mb-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-black" style={{ color: 'var(--text-1)' }}>Meeting Analytics</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
                {activeWorkspace?.name || 'Your workspace'} · last {range === 28 ? '4 weeks' : range === 84 ? '12 weeks' : range === 180 ? '6 months' : '1 year'}
              </p>
            </div>
            <div className="flex border-b self-start sm:self-auto" style={{ borderColor: 'var(--divider)' }}>
              {RANGE_OPTIONS.map(o => (
                <button key={o.days} onClick={() => setRange(o.days)}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${range === o.days ? 'border-violet-500 text-violet-500' : 'border-transparent'}`}
                  style={{ color: range === o.days ? undefined : 'var(--text-3)', borderRadius: 0 }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Usage / subscription ── */}
          <div className="mb-4">
            <UsagePanel />
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1,2,3,4].map(i => <Skeleton key={i} h="h-28" />)}
              </div>
              <Skeleton h="h-56" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1,2,3].map(i => <Skeleton key={i} h="h-44" />)}
              </div>
              <Skeleton h="h-44" />
            </div>
          ) : (
            <div className="space-y-4">

              {/* ── Stat row ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={CalendarDays} label="Meetings completed" value={totalMeetings}
                  sub={processingCount > 0 ? `${processingCount} processing` : undefined}
                  accent="bg-violet-500/15 text-violet-400" spark={meetingSpark} delay={0} />
                <StatCard icon={Clock} label="Hours recorded" value={`${totalHours}h`}
                  sub={avgDur !== null ? `avg ${fmtDuration(avgDur)}` : undefined}
                  accent="bg-sky-500/15 text-sky-400" delay={0.04} />
                <StatCard icon={Zap} label="Action items" value={totalActions}
                  sub={totalMeetings > 0 ? `${(totalActions / totalMeetings).toFixed(1)} per meeting` : undefined}
                  accent="bg-amber-500/15 text-amber-400" spark={actionSpark} delay={0.08} />
                <StatCard icon={CheckCircle2} label="Decisions recorded" value={totalDecisions}
                  sub={totalMeetings > 0 ? `${(totalDecisions / totalMeetings).toFixed(1)} per meeting` : undefined}
                  accent="bg-emerald-500/15 text-emerald-400" delay={0.12} />
              </div>

              {/* ── Meetings chart ── */}
              <Panel title="Meetings over time" icon={TrendingUp} accent="text-violet-400" delay={0.1}>
                {meetingSeries.every((d: any) => d.value === 0)
                  ? <p className="text-sm py-8 text-center" style={{ color: 'var(--text-3)' }}>No completed meetings yet.</p>
                  : <AreaChart series={meetingSeries} color="#7c3aed" height={150} />}
              </Panel>

              {/* ── Middle row: day heatmap + action items + source ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* Busiest days */}
                <Panel title="Busiest days" icon={CalendarDays} accent="text-sky-400" delay={0.14}>
                  {hasDay ? (
                    <>
                      <DayBars series={daysSeries} />
                      {busiestDay?.count > 0 && (
                        <p className="mt-3 text-xs" style={{ color: 'var(--text-3)' }}>
                          Peak day: <span className="font-semibold" style={{ color: 'var(--text-2)' }}>{busiestDay.day}</span>
                          <span className="ml-1">({busiestDay.count} meetings)</span>
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
                        Days data will appear once meetings are recorded.
                      </p>
                    </div>
                  )}
                </Panel>

                {/* Action items chart */}
                <Panel title="Action items over time" icon={Zap} accent="text-amber-400" delay={0.17}>
                  {actionSeries.every((d: any) => d.value === 0)
                    ? <p className="text-xs text-center py-6" style={{ color: 'var(--text-3)' }}>No action items yet.</p>
                    : <AreaChart series={actionSeries} color="#f59e0b" height={100} />}
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3" style={{ borderColor: 'var(--divider)' }}>
                    {[
                      { label: 'Total actions', value: totalActions, color: '#f59e0b' },
                      { label: 'No-action mtgs', value: noActions,   color: '#f87171' },
                    ].map(s => (
                      <div key={s.label}>
                        <p className="text-lg font-black leading-none" style={{ color: 'var(--text-1)' }}>{s.value}</p>
                        <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </Panel>

                {/* Source + completion */}
                <Panel title="Source & tasks" icon={Radio} accent="text-indigo-400" delay={0.2}>
                  {hasSource ? (
                    <div className="flex items-center gap-3 mb-4">
                      <Donut segments={[
                        { label: 'Bot',    value: botCount,    color: '#7c3aed' },
                        { label: 'Upload', value: uploadCount, color: '#06b6d4' },
                      ]} />
                      <div className="space-y-2">
                        {[
                          { label: 'Bot recorded',  value: botCount,    color: 'bg-violet-500' },
                          { label: 'Manual upload', value: uploadCount, color: 'bg-cyan-400'   },
                        ].map(s => (
                          <div key={s.label} className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${s.color}`} />
                            <div>
                              <p className="text-sm font-bold leading-none" style={{ color: 'var(--text-1)' }}>{s.value}</p>
                              <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
                      {totalMeetings} meeting{totalMeetings !== 1 ? 's' : ''} recorded
                    </p>
                  )}
                  {completionRate !== null ? (
                    <div className="mt-auto">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Task completion</span>
                        <span className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{completionRate}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                          style={{ width: `${completionRate}%` }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs mt-auto" style={{ color: 'var(--text-3)' }}>No task data available.</p>
                  )}
                  {errorCount > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 pt-3 border-t" style={{ borderColor: 'var(--divider)' }}>
                      <AlertCircle size={11} className="text-rose-400 shrink-0" />
                      <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                        <span className="font-semibold text-rose-400">{errorCount}</span> failed this period
                      </p>
                    </div>
                  )}
                </Panel>
              </div>

              {/* ── Top participants ── */}
              {participants.length > 0 && (
                <Panel title="Top participants" icon={Users} accent="text-violet-400" delay={0.24}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
                    {participants.map((p: any, i: number) => (
                      <div key={p.name} className="flex items-center gap-3">
                        <span className="w-4 text-[11px] font-bold tabular-nums text-right shrink-0"
                          style={{ color: 'var(--text-3)' }}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{p.name}</span>
                            <span className="text-xs tabular-nums shrink-0 font-semibold"
                              style={{ color: 'var(--text-3)' }}>{p.count}</span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                            <div className="h-full rounded-full bg-violet-500"
                              style={{ width: `${(p.count / participants[0].count) * 100}%`, opacity: 0.55 + (p.count / participants[0].count) * 0.45 }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  )
}
