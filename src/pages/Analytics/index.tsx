import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays, Clock, Zap, CheckCircle2,
  Users, Bot, Upload, Target, TrendingUp, AlertCircle,
} from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import { useWorkspace } from '../../context/WorkspaceContext'
import { getMeetingAnalytics } from '../../lib/api'

const RANGE_OPTIONS = [
  { label: '4 weeks',  days: 28  },
  { label: '12 weeks', days: 84  },
  { label: '6 months', days: 180 },
  { label: '1 year',   days: 365 },
]

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(mins: number | null): string {
  if (mins === null || mins === undefined) return '—'
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// ── SVG area chart ────────────────────────────────────────────────────────────

function AreaChart({ series, color = '#7c3aed' }: {
  series: { label: string; value: number }[]
  color?: string
}) {
  if (!series.length) return null
  const W = 560, H = 130
  const max = Math.max(...series.map(d => d.value), 1)
  const pad = 2
  const pts = series.map((d, i) => ({
    x: pad + (i / Math.max(series.length - 1, 1)) * (W - pad * 2),
    y: H - (d.value / max) * H * 0.85,
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
  const area = `${line} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`
  const id = `grad-${color.replace('#', '')}`

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" style={{ minWidth: 260 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map(t => (
          <line key={t}
            x1={0} y1={H - t * H * 0.85}
            x2={W} y2={H - t * H * 0.85}
            stroke="currentColor" strokeWidth={0.5} opacity={0.08}
          />
        ))}
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={1.8} />
        {pts.map((p, i) => series[i].value > 0 && (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color}>
            <title>{series[i].label}: {series[i].value}</title>
          </circle>
        ))}
        {series.map((d, i) => {
          if (i % Math.ceil(series.length / 7) !== 0 && i !== series.length - 1) return null
          return (
            <text key={i} x={pts[i].x} y={H + 15}
              textAnchor="middle" fontSize={7.5}
              fill="currentColor" opacity={0.45}>
              {d.label.replace(/^\d{4}-W/, 'W')}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ── Day-of-week bars ──────────────────────────────────────────────────────────

function DayBars({ series }: { series: { day: string; count: number }[] }) {
  const max = Math.max(...series.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-1.5 h-28 mt-2">
      {series.map(({ day, count }) => {
        const pct = count / max
        const weekend = day === 'Sat' || day === 'Sun'
        return (
          <div key={day} className="flex flex-1 flex-col items-center gap-1">
            {count > 0 && (
              <span className="text-[9px] font-semibold tabular-nums" style={{ color: 'var(--text-3)' }}>{count}</span>
            )}
            <div
              className="w-full rounded-sm transition-all duration-500"
              style={{
                height: `${Math.max(pct * 80, count > 0 ? 4 : 2)}px`,
                background: weekend ? 'var(--card-border)' : '#7c3aed',
                opacity: weekend ? 0.5 : 0.5 + pct * 0.5,
              }}
            />
            <span className="text-[9px] font-medium" style={{ color: 'var(--text-3)' }}>{day}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Donut ─────────────────────────────────────────────────────────────────────

function Donut({ segments, size = 88 }: {
  segments: { label: string; value: number; color: string }[]
  size?: number
}) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1
  const R = 28, cx = 40, cy = 40, sw = 11
  const circ = 2 * Math.PI * R
  let cum = 0
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx={cx} cy={cy} r={R} fill="none"
        stroke="currentColor" strokeWidth={sw} opacity={0.07} />
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const pct = seg.value / total
        const da = `${pct * circ} ${circ}`
        const off = -(cum * circ)
        cum += pct
        return (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none"
            stroke={seg.color} strokeWidth={sw}
            strokeDasharray={da} strokeDashoffset={off}
            strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '40px 40px' }}>
            <title>{seg.label}: {seg.value}</title>
          </circle>
        )
      })}
    </svg>
  )
}

// ── Stat hero card ────────────────────────────────────────────────────────────

function HeroCard({ icon: Icon, label, value, sub, color, delay = 0 }: {
  icon: any; label: string; value: string | number
  sub?: string; color: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border p-5 flex flex-col gap-3"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-2xl font-black leading-none" style={{ color: 'var(--text-1)' }}>{value}</p>
        <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-2)' }}>{label}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</p>}
      </div>
    </motion.div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────

function Card({ title, icon: Icon, iconColor, children, delay = 0, className = '' }: {
  title: string; icon: any; iconColor: string
  children: React.ReactNode; delay?: number; className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-2xl border p-5 ${className}`}
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon size={14} className={iconColor} />
        <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{title}</p>
      </div>
      {children}
    </motion.div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl ${className}`}
      style={{ background: 'var(--card-border)' }} />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { activeWorkspace } = useWorkspace()
  const [range, setRange] = useState(84)
  const [data, setData]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspace) return
    setLoading(true)
    getMeetingAnalytics(range, activeWorkspace.id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [range, activeWorkspace?.id])

  const meetingSeries = (data?.weekly_series || []).map((w: any) => ({ label: w.week, value: w.meetings }))
  const actionSeries  = (data?.weekly_series || []).map((w: any) => ({ label: w.week, value: w.actions  }))

  const totalMeetings  = data?.total_meetings  ?? 0
  const totalActions   = data?.total_actions   ?? 0
  const totalDecisions = data?.total_decisions ?? 0
  const totalHours     = data?.total_hours     ?? 0
  const avgDur         = data?.avg_duration_min ?? null
  const botCount       = data?.bot_count       ?? 0
  const uploadCount    = data?.upload_count    ?? 0
  const completionRate = data?.completion_rate ?? null
  const noActions      = data?.meetings_no_actions ?? 0
  const participants   = data?.top_participants ?? []
  const daysSeries     = data?.busiest_day_series ?? []
  const processingCount = data?.by_status?.processing ?? 0
  const errorCount      = data?.by_status?.error      ?? 0

  return (
    <div className="flex h-screen app-bg app-grid overflow-hidden">
      <Sidebar active="analytics" />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-7 sm:px-6 lg:px-8">

          {/* ── Header ── */}
          <div className="flex flex-col gap-3 mb-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-black" style={{ color: 'var(--text-1)' }}>Meeting Analytics</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
                Activity across {activeWorkspace?.name || 'your workspace'}
              </p>
            </div>
            {/* Range tabs — underline style */}
            <div className="flex border-b self-start sm:self-auto" style={{ borderColor: 'var(--divider)' }}>
              {RANGE_OPTIONS.map(o => (
                <button
                  key={o.days}
                  onClick={() => setRange(o.days)}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                    range === o.days ? 'border-violet-500 text-violet-500' : 'border-transparent'
                  }`}
                  style={{ color: range === o.days ? undefined : 'var(--text-3)', borderRadius: 0 }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Skeleton className="lg:col-span-2 h-52" />
                <Skeleton className="h-52" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Skeleton className="lg:col-span-2 h-52" />
                <Skeleton className="h-52" />
              </div>
            </div>
          ) : (
            <>
              {/* ── Hero stats ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <HeroCard
                  icon={CalendarDays} delay={0}
                  label="Meetings completed"
                  value={totalMeetings}
                  sub={processingCount > 0 ? `${processingCount} still processing` : undefined}
                  color="bg-violet-500/15 text-violet-400"
                />
                <HeroCard
                  icon={Clock} delay={0.04}
                  label="Hours recorded"
                  value={`${totalHours}h`}
                  sub={avgDur !== null ? `avg ${fmtDuration(avgDur)} / meeting` : undefined}
                  color="bg-sky-500/15 text-sky-400"
                />
                <HeroCard
                  icon={Zap} delay={0.08}
                  label="Action items captured"
                  value={totalActions}
                  sub={totalMeetings > 0 ? `${(totalActions / totalMeetings).toFixed(1)} per meeting` : undefined}
                  color="bg-amber-500/15 text-amber-400"
                />
                <HeroCard
                  icon={CheckCircle2} delay={0.12}
                  label="Decisions recorded"
                  value={totalDecisions}
                  sub={totalMeetings > 0 ? `${(totalDecisions / totalMeetings).toFixed(1)} per meeting` : undefined}
                  color="bg-emerald-500/15 text-emerald-400"
                />
              </div>

              {/* ── Charts row 1 ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <Card title="Meetings over time" icon={TrendingUp} iconColor="text-violet-400"
                  delay={0.1} className="lg:col-span-2">
                  {meetingSeries.every((d: any) => d.value === 0)
                    ? <p className="text-sm py-10 text-center" style={{ color: 'var(--text-3)' }}>No meetings in this period.</p>
                    : <AreaChart series={meetingSeries} color="#7c3aed" />}
                </Card>

                <Card title="Busiest days" icon={CalendarDays} iconColor="text-sky-400" delay={0.14}>
                  {daysSeries.every((d: any) => d.count === 0)
                    ? <p className="text-sm py-6 text-center" style={{ color: 'var(--text-3)' }}>No data yet.</p>
                    : <DayBars series={daysSeries} />}
                  {daysSeries.length > 0 && (() => {
                    const busiest = [...daysSeries].sort((a: any, b: any) => b.count - a.count)[0]
                    return busiest.count > 0
                      ? <p className="mt-3 text-xs" style={{ color: 'var(--text-3)' }}>
                          Most active on <span className="font-semibold" style={{ color: 'var(--text-2)' }}>{busiest.day}</span>
                        </p>
                      : null
                  })()}
                </Card>
              </div>

              {/* ── Charts row 2 ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <Card title="Action items over time" icon={Zap} iconColor="text-amber-400"
                  delay={0.18} className="lg:col-span-2">
                  {actionSeries.every((d: any) => d.value === 0)
                    ? <p className="text-sm py-10 text-center" style={{ color: 'var(--text-3)' }}>No action items in this period.</p>
                    : <AreaChart series={actionSeries} color="#f59e0b" />}
                </Card>

                <Card title="Source breakdown" icon={Bot} iconColor="text-indigo-400" delay={0.22}>
                  <div className="flex items-center gap-4">
                    <Donut
                      segments={[
                        { label: 'Bot',    value: botCount,    color: '#7c3aed' },
                        { label: 'Upload', value: uploadCount, color: '#06b6d4' },
                      ]}
                    />
                    <div className="space-y-2.5">
                      {[
                        { label: 'Bot recorded',  value: botCount,    color: 'bg-violet-500' },
                        { label: 'Manual upload', value: uploadCount, color: 'bg-cyan-500'   },
                      ].map(s => (
                        <div key={s.label} className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${s.color}`} />
                          <div>
                            <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{s.value}</p>
                            <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {completionRate !== null && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--divider)' }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Task completion</span>
                        <span className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{completionRate}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {noActions > 0 && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <AlertCircle size={12} className="text-amber-400 shrink-0" />
                      <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                        <span className="font-semibold" style={{ color: 'var(--text-2)' }}>{noActions}</span> meetings with no action items
                      </p>
                    </div>
                  )}
                </Card>
              </div>

              {/* ── Top participants ── */}
              {participants.length > 0 && (
                <Card title="Top participants" icon={Users} iconColor="text-violet-400" delay={0.26}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    {participants.map((p: any, i: number) => {
                      const max = participants[0].count
                      return (
                        <div key={p.name} className="flex items-center gap-3">
                          <span className="w-5 text-[11px] font-bold tabular-nums shrink-0 text-right"
                            style={{ color: 'var(--text-3)' }}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-sm truncate font-medium" style={{ color: 'var(--text-1)' }}>{p.name}</span>
                              <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--text-3)' }}>{p.count}</span>
                            </div>
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                              <div
                                className="h-full rounded-full bg-violet-500 transition-all duration-700"
                                style={{ width: `${(p.count / max) * 100}%`, opacity: 0.6 + (p.count / max) * 0.4 }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}

              {/* ── Health strip ── */}
              {(processingCount > 0 || errorCount > 0) && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="mt-4 rounded-2xl border px-5 py-4 flex flex-wrap gap-6"
                  style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                >
                  {processingCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-sm" style={{ color: 'var(--text-2)' }}>
                        <strong>{processingCount}</strong> still processing
                      </span>
                    </div>
                  )}
                  {errorCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span className="text-sm" style={{ color: 'var(--text-2)' }}>
                        <strong>{errorCount}</strong> failed in this period
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
