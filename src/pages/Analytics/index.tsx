import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays, Clock, Zap, CheckCircle2,
  TrendingUp, AlertCircle, Radio, ArrowUpRight, Crown, Sparkles, MessageSquare, Building2, UserCheck,
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

// ── Smooth SVG area chart with y-axis ───────────────────────────────────────

function AreaChart({ series, color = 'var(--brand-700)', height = 110 }: {
  series: { label: string; value: number }[]
  color?: string
  height?: number
}) {
  if (!series.length) return null
  const W = 460, H = height, YW = 28, XH = 16
  const max = Math.max(...series.map(d => d.value), 1)
  const pts = series.map((d, i) => ({
    x: YW + (i / Math.max(series.length - 1, 1)) * W,
    y: 6 + (1 - d.value / max) * (H - 12),
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
  const area = `${line} L ${YW + W} ${H} L ${YW} ${H} Z`
  const gid  = `ag${color.replace(/[^a-z0-9]/gi, '')}`
  const yTicks = [1, 0.67, 0.33, 0].map(t => ({
    val: Math.round(t * max),
    y:   6 + (1 - t) * (H - 12),
  }))

  return (
    <div className="overflow-x-auto" style={{ color: 'var(--text-3)' }}>
      <svg viewBox={`0 0 ${W + YW} ${H + XH}`} className="w-full" style={{ minWidth: 180 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.00" />
          </linearGradient>
        </defs>
        {yTicks.map(tick => (
          <g key={tick.val}>
            <line x1={YW} y1={tick.y} x2={YW + W} y2={tick.y}
              stroke="currentColor" strokeWidth={0.5} opacity={0.12} />
            <text x={YW - 4} y={tick.y + 3} textAnchor="end" fontSize={6.5} fill="currentColor" opacity={0.55}>
              {tick.val}
            </text>
          </g>
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        {pts.map((p, i) => series[i].value > 0 && (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} opacity={0.9}>
            <title>{series[i].label}: {series[i].value}</title>
          </circle>
        ))}
        {series.map((d, i) => {
          if (i % Math.ceil(series.length / 6) !== 0 && i !== series.length - 1) return null
          return (
            <text key={i} x={pts[i].x} y={H + XH - 2} textAnchor="middle" fontSize={6.5} fill="currentColor" opacity={0.5}>
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
              background: weekend ? 'var(--card-border)' : 'var(--brand-700)',
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
        {spark && <Spark series={spark} color={accent.includes('violet') ? 'var(--brand-700)' : accent.includes('sky') ? '#0ea5e9' : accent.includes('amber') ? '#f59e0b' : '#10b981'} />}
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

const PLAN_ACCENT: Record<string, { ringColor: string; badgeBg: string; badgeText: string }> = {
  free:  { ringColor: 'var(--card-border)',  badgeBg: 'var(--input-bg)',           badgeText: 'var(--text-2)'  },
  pro:   { ringColor: 'rgba(var(--brand-rgb),.3)', badgeBg: 'rgba(var(--brand-rgb),.12)',      badgeText: 'var(--brand-400)'        },
  team:  { ringColor: 'rgba(14,165,233,.3)', badgeBg: 'rgba(14,165,233,.12)',      badgeText: '#38bdf8'        },
  admin: { ringColor: 'rgba(245,158,11,.3)', badgeBg: 'rgba(245,158,11,.12)',      badgeText: '#fbbf24'        },
}

function MiniBar({ used, limit, color }: { used: number; limit: number | null; color: string }) {
  const pct   = limit ? Math.min((used / limit) * 100, 100) : 0
  const alert = limit && pct >= 80
  return (
    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: limit ? `${pct}%` : '0%', background: alert ? '#f87171' : color }} />
    </div>
  )
}

function UsagePanel() {
  const [usage, setUsage] = useState<any>(null)

  useEffect(() => {
    getUserUsage().then(setUsage).catch(() => {})
  }, [])

  if (!usage) return null

  const plan    = usage.plan || 'free'
  const accent  = PLAN_ACCENT[plan] || PLAN_ACCENT.free
  const isFree  = plan === 'free'
  const display = usage.plan_display || plan.charAt(0).toUpperCase() + plan.slice(1)

  const trialEnd = usage.trial_ends_at ? new Date(usage.trial_ends_at) : null
  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
    : null

  const metrics = [
    {
      icon: CalendarDays,
      label: 'Meetings',
      used: usage.meetings_used ?? 0,
      limit: usage.meetings_limit ?? null,
      unit: '',
      color: 'var(--brand-700)',
    },
    {
      icon: Clock,
      label: 'Audio hours',
      used: usage.hours_used ?? 0,
      limit: usage.hours_limit ?? null,
      unit: 'h',
      color: '#0ea5e9',
    },
    {
      icon: MessageSquare,
      label: 'Steph AI credits',
      used: usage.credits_used ?? 0,
      limit: usage.credits_limit ?? null,
      unit: '',
      color: 'var(--brand-500)',
    },
    {
      icon: Building2,
      label: 'Workspaces',
      used: usage.workspaces_used ?? 0,
      limit: usage.workspaces_limit ?? null,
      unit: '',
      color: '#10b981',
    },
    {
      icon: UserCheck,
      label: 'Team members',
      used: usage.members_used ?? 0,
      limit: usage.members_limit ?? null,
      unit: '',
      color: '#f59e0b',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-5"
      style={{ background: 'var(--card-bg)', borderColor: accent.ringColor }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">

        {/* Plan badge + CTA */}
        <div className="shrink-0 flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Crown size={12} style={{ color: accent.badgeText }} />
              <span className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: accent.badgeText }}>{display}</span>
            </div>
            {trialDaysLeft !== null && trialDaysLeft > 0 && (
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-3)' }}>
                Trial · {trialDaysLeft}d left
              </p>
            )}
            {!trialDaysLeft && (
              <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                {isFree ? 'Free plan' : 'Active subscription'}
              </p>
            )}
          </div>
          {isFree && (
            <button
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,var(--brand-700),var(--brand-800))', borderRadius: 8 }}
              onClick={() => window.location.href = '/settings?tab=billing'}
            >
              <Sparkles size={10} />
              Upgrade
              <ArrowUpRight size={9} />
            </button>
          )}
        </div>

        {/* Usage metrics grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4">
          {metrics.map(({ icon: Icon, label, used, limit, unit, color }) => {
            const isUnlimited = limit === null
            const pct = limit ? Math.min((used / limit) * 100, 100) : 0
            const remaining = limit !== null ? Math.max(limit - used, 0) : null
            const alert = limit !== null && pct >= 80
            return (
              <div key={label}>
                <div className="flex items-center gap-1 mb-1">
                  <Icon size={10} style={{ color }} />
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--text-3)' }}>{label}</span>
                </div>
                <p className="text-sm font-black leading-none mb-1" style={{ color: alert ? '#f87171' : 'var(--text-1)' }}>
                  {used}{unit}
                  {!isUnlimited && <span className="text-[10px] font-medium ml-0.5" style={{ color: 'var(--text-3)' }}>/{limit}{unit}</span>}
                  {isUnlimited && <span className="text-[10px] font-medium ml-0.5" style={{ color: 'var(--text-3)' }}>/ ∞</span>}
                </p>
                <MiniBar used={used} limit={limit} color={color} />
                {remaining !== null && (
                  <p className="text-[9px] mt-0.5" style={{ color: alert ? '#f87171' : 'var(--text-3)' }}>
                    {remaining}{unit} left
                  </p>
                )}
              </div>
            )
          })}
        </div>

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
  const daysSeries = data?.busiest_day_series ?? []

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1,2].map(i => <Skeleton key={i} h="h-48" />)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1,2].map(i => <Skeleton key={i} h="h-44" />)}
              </div>
            </div>
          ) : (
            <div className="space-y-4">

              {/* ── Stat row ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={CalendarDays} label="Meetings completed" value={totalMeetings}
                  sub={processingCount > 0 ? `${processingCount} processing` : undefined}
                  accent="bg-violet-500/10 text-violet-500" spark={meetingSpark} delay={0} />
                <StatCard icon={Clock} label="Hours recorded" value={`${totalHours}h`}
                  sub={avgDur !== null ? `avg ${fmtDuration(avgDur)}` : undefined}
                  accent="bg-sky-500/10 text-sky-500" delay={0.04} />
                <StatCard icon={Zap} label="Action items" value={totalActions}
                  sub={totalMeetings > 0 ? `${(totalActions / totalMeetings).toFixed(1)} / meeting` : undefined}
                  accent="bg-amber-500/10 text-amber-500" spark={actionSpark} delay={0.08} />
                <StatCard icon={CheckCircle2} label="Decisions recorded" value={totalDecisions}
                  sub={totalMeetings > 0 ? `${(totalDecisions / totalMeetings).toFixed(1)} / meeting` : undefined}
                  accent="bg-emerald-500/10 text-emerald-500" delay={0.12} />
              </div>

              {/* ── Charts row: meetings + actions side by side ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <Panel title="Meetings over time" icon={TrendingUp} accent="text-violet-500" delay={0.1}>
                  {meetingSeries.every((d: any) => d.value === 0)
                    ? <p className="text-sm py-8 text-center" style={{ color: 'var(--text-3)' }}>No completed meetings yet.</p>
                    : <AreaChart series={meetingSeries} color="var(--brand-700)" height={110} />}
                </Panel>

                <Panel title="Action items over time" icon={Zap} accent="text-amber-500" delay={0.13}>
                  {actionSeries.every((d: any) => d.value === 0)
                    ? <p className="text-xs text-center py-8" style={{ color: 'var(--text-3)' }}>No action items yet.</p>
                    : <AreaChart series={actionSeries} color="#f59e0b" height={110} />}
                  <div className="mt-3 pt-3 border-t flex gap-6" style={{ borderColor: 'var(--divider)' }}>
                    {[
                      { label: 'Total',        value: totalActions },
                      { label: 'No-action mtgs', value: noActions  },
                    ].map(s => (
                      <div key={s.label}>
                        <p className="text-base font-black leading-none" style={{ color: 'var(--text-1)' }}>{s.value}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </Panel>

              </div>

              {/* ── Bottom row: busiest days + source & tasks ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <Panel title="Busiest days" icon={CalendarDays} accent="text-sky-500" delay={0.16}>
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
                    <div className="flex-1 flex items-center justify-center py-6">
                      <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
                        Days data will appear once meetings are recorded.
                      </p>
                    </div>
                  )}
                </Panel>

                <Panel title="Source & tasks" icon={Radio} accent="text-indigo-500" delay={0.19}>
                  {hasSource ? (
                    <div className="flex items-center gap-4 mb-4">
                      <Donut segments={[
                        { label: 'Bot',    value: botCount,    color: 'var(--brand-700)' },
                        { label: 'Upload', value: uploadCount, color: '#06b6d4' },
                      ]} />
                      <div className="space-y-2">
                        {[
                          { label: 'Bot recorded',  value: botCount,    dot: 'bg-violet-500' },
                          { label: 'Manual upload', value: uploadCount, dot: 'bg-cyan-400'   },
                        ].map(s => (
                          <div key={s.label} className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
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
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Task completion</span>
                        <span className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{completionRate}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                          style={{ width: `${completionRate}%` }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs mt-auto" style={{ color: 'var(--text-3)' }}>No task data yet.</p>
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

            </div>
          )}
        </div>
      </main>
    </div>
  )
}
