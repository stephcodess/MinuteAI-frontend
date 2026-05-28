import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Search, Sparkles, Calendar, ArrowRight, ExternalLink, X, BookOpen } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import Sidebar from '../../components/Sidebar'

interface Source {
  job_id: string
  meeting_title: string
  meeting_date: string
  excerpt: string
  score: number
}

interface SearchResult {
  answer: string | null
  sources: Source[]
  query: string
}

const SUGGESTIONS = [
  'What did we decide about the product launch?',
  'Who is responsible for the Q3 budget review?',
  'What action items are still open from last month?',
  'When did we last discuss the hiring plan?',
  'What were the key risks raised in planning?',
]

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = score > 0.8 ? '#10b981' : score > 0.6 ? '#7c3aed' : '#6b7280'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-[10px] font-semibold w-7 text-right" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
}

function SourceCard({ source, index }: { source: Source; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-2xl p-4"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
            <Calendar size={13} className="text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
              {source.meeting_title}
            </p>
            {source.meeting_date && (
              <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{source.meeting_date}</p>
            )}
          </div>
        </div>
        <Link
          to={`/results/${source.job_id}`}
          className="flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors shrink-0"
        >
          View <ExternalLink size={11} />
        </Link>
      </div>

      <p className="text-xs leading-relaxed mb-3 line-clamp-3" style={{ color: 'var(--text-2)' }}>
        "{source.excerpt}"
      </p>

      <ScoreBar score={source.score} />
    </motion.div>
  )
}

export default function Memory() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function doSearch(q: string) {
    q = q.trim()
    if (!q || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await apiFetch('/memory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, n_results: 8 }),
      })
      setResult(data)
    } catch (e: any) {
      setError(e.message || 'Search failed.')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') doSearch(query)
  }

  function clear() {
    setQuery('')
    setResult(null)
    setError(null)
    inputRef.current?.focus()
  }

  const hasResults = result && result.sources.length > 0
  const isEmpty = result && result.sources.length === 0

  return (
    <div className="flex h-screen app-bg app-grid overflow-hidden">
      <Sidebar active="memory" />

      <main className="min-w-0 flex-1 flex flex-col overflow-hidden relative z-[1]">

        {/* Header */}
        <div className="shrink-0 px-4 sm:px-8 pt-6 sm:pt-7 pb-4 sm:pb-5" style={{ borderBottom: '1px solid var(--divider)' }}>
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>
              Institutional Memory
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
                <Brain size={17} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-1)' }}>
                  Memory Search
                </h1>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                  Ask anything about your past meetings
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* Search bar */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                style={{
                  background: 'var(--input-bg)',
                  border: '1.5px solid var(--input-border)',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
                }}
              >
                <Search size={18} style={{ color: 'var(--text-3)' }} className="shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask anything about your meetings…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-3)]"
                  style={{ color: 'var(--text-1)' }}
                  autoFocus
                />
                {query && (
                  <button onClick={clear} className="shrink-0 p-1 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--text-3)' }}>
                    <X size={14} />
                  </button>
                )}
                <motion.button
                  onClick={() => doSearch(query)}
                  disabled={!query.trim() || loading}
                  whileHover={query.trim() && !loading ? { scale: 1.04 } : {}}
                  whileTap={query.trim() && !loading ? { scale: 0.96 } : {}}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                    color: '#fff',
                  }}
                >
                  {loading ? (
                    <motion.div
                      className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                    />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  {loading ? 'Searching…' : 'Search'}
                </motion.button>
              </div>
            </motion.div>

            {/* Suggestions — shown only when no query + no results */}
            <AnimatePresence>
              {!result && !loading && !error && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Try asking…</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => { setQuery(s); doSearch(s) }}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:border-violet-500/40"
                        style={{
                          background: 'var(--input-bg)',
                          border: '1px solid var(--input-border)',
                          color: 'var(--text-2)',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Empty state illustration */}
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                      style={{ background: 'var(--input-bg)' }}>
                      <BookOpen size={26} style={{ color: 'var(--text-3)' }} />
                    </div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-2)' }}>
                      Your meetings, always searchable
                    </p>
                    <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
                      Every meeting you process is indexed automatically. Ask about decisions,
                      action items, or anything discussed — across all your calls.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm text-rose-400"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* No results */}
            <AnimatePresence>
              {isEmpty && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="w-14 h-14 rounded-3xl flex items-center justify-center mb-4"
                    style={{ background: 'var(--input-bg)' }}>
                    <Search size={22} style={{ color: 'var(--text-3)' }} />
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-2)' }}>
                    Nothing found for "{result.query}"
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    Try different keywords or process more meetings to grow your memory.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results */}
            <AnimatePresence>
              {hasResults && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  {/* AI answer */}
                  {result.answer && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl overflow-hidden"
                      style={{ border: '1px solid rgba(99,102,241,0.25)' }}
                    >
                      <div className="px-4 py-2.5 flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(79,70,229,0.1))' }}>
                        <Sparkles size={13} className="text-violet-400" />
                        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">AI Answer</span>
                      </div>
                      <div className="px-4 py-3" style={{ background: 'var(--card-bg)' }}>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>
                          {result.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Sources */}
                  <div>
                    <p className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
                      <span>Sources</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px]"
                        style={{ background: 'var(--input-bg)', color: 'var(--text-3)' }}>
                        {result.sources.length}
                      </span>
                    </p>
                    <div className="space-y-3">
                      {result.sources.map((s, i) => (
                        <SourceCard key={s.job_id} source={s} index={i} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </main>
    </div>
  )
}
