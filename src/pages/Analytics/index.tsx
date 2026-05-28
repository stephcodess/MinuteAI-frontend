import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart2, Zap, CheckCircle2, TrendingUp, CalendarDays } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import { useWorkspace } from '../../context/WorkspaceContext'
import { getMeetingAnalytics } from '../../lib/api'

const RANGE_OPTIONS = [
  { label: '4 weeks', days: 28 },
  { label: '12 weeks', days: 84 },
  { label: '6 months', days: 180 },
  { label: '1 year', days: 365 },
]

// ── Inline SVG bar chart ──────────────────────────────────────────────────────

function BarChart({ series, colorClass }: { series: { label: string; value: number }[]; colorClass: string }) {
  const max = Math.max(...series.map(d => d.value), 1)
  const H = 120
  const barW = Math.max(6, Math.floor(560 / series.length) - 4)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${Math.max(series.length * (barW + 4), 200)} ${H + 28}`} className="w-full" style={{ minWidth: 200 }}>
        {series.map((d, i) => {
          const barH = d.value === 0 ? 2 : Math.max(4, (d.value / max) * H)
          const x = i * (barW + 4)
          const y = H - barH
          const isLast = i === series.length - 1
          return (
            <g key={d.label}>
              <rect
                x={x} y={y} width={barW} height={barH}
                rx={3}
                className={`${colorClass} opacity-80 hover:opacity-100 transition-opacity`}
              />
              {(i % Math.ceil(series.length / 8) === 0 || isLast) && (
                <text x={x + barW / 2} y={H + 16} textAnchor="middle" fontSize={7} fill="currentColor" className="text-[var(--text-3)]">
                  {d.label.replace(/^\d{4}-W/, 'W')}
                </text>
              )}
              {d.value > 0 && (
                <title>{d.label}: {d.value}</title>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub = null, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-5 flex items-start gap-4"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>{value}</p>
        <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-2)' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</p>}
      </div>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { activeWorkspace } = useWorkspace()
  const [range, setRange] = useState(84)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspace) return
    setLoading(true)
    getMeetingAnalytics(range, activeWorkspace.id)
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [range, activeWorkspace?.id])

  const meetingSeries = (data?.weekly_series || []).map(w => ({ label: w.week, value: w.meetings }))
  const actionSeries = (data?.weekly_series || []).map(w => ({ label: w.week, value: w.actions }))

  const processingCount = data?.by_status?.processing ?? 0
  const errorCount = data?.by_status?.error ?? 0

  return (
    <div className="flex h-screen app-bg app-grid overflow-hidden">
      <Sidebar active="analytics" />

      <main className="min-w-0 flex-1 overflow-y-auto page-content">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6">

          {/* Header */}
          <div className="flex flex-col gap-1 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-black" style={{ color: 'var(--text-1)' }}>Meeting Analytics</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Activity across {activeWorkspace?.name || 'your workspace'}</p>
            </div>
            {/* Range picker */}
            <div className="flex items-center gap-1 rounded-full p-1 self-start sm:self-auto" style={{ background: 'var(--input-bg)' }}>
              {RANGE_OPTIONS.map(o => (
                <button
                  key={o.days}
                  onClick={() => setRange(o.days)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${range === o.days ? 'bg-violet-600 text-white shadow-sm' : ''}`}
                  style={{ color: range === o.days ? undefined : 'var(--text-3)' }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-2xl border h-24 animate-pulse" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }} />
              ))}
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <StatCard
                  icon={CalendarDays}
                  label="Meetings completed"
                  value={data?.total_meetings ?? 0}
                  color="bg-violet-500/15 text-violet-400"
                />
                <StatCard
                  icon={Zap}
                  label="Action items captured"
                  value={data?.total_actions ?? 0}
                  color="bg-amber-500/15 text-amber-400"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Avg actions / meeting"
                  value={data?.total_meetings ? (data.total_actions / data.total_meetings).toFixed(1) : '—'}
                  color="bg-emerald-500/15 text-emerald-400"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Processing / failed"
                  value={`${processingCount} / ${errorCount}`}
                  sub="in the period"
                  color="bg-sky-500/15 text-sky-400"
                />
              </div>

              {/* Meetings per week */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl border p-5 mb-4"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 size={15} className="text-violet-400" />
                  <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Meetings completed per week</p>
                </div>
                {meetingSeries.every(d => d.value === 0) ? (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>No completed meetings in this period.</p>
                ) : (
                  <BarChart series={meetingSeries} colorClass="fill-violet-500" />
                )}
              </motion.div>

              {/* Action items per week */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border p-5"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={15} className="text-amber-400" />
                  <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Action items captured per week</p>
                </div>
                {actionSeries.every(d => d.value === 0) ? (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>No action items in this period.</p>
                ) : (
                  <BarChart series={actionSeries} colorClass="fill-amber-400" />
                )}
              </motion.div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
