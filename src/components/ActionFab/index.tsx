import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Radio, Send, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { api } from '../../lib/api'
import RecordMeetingModal from '../RecordMeetingModal'

const DASHBOARD_PREFIXES = [
  '/dashboard', '/billing', '/settings', '/team', '/upload',
  '/subscription', '/tasks', '/meeting-bots', '/translator',
]

const WELCOME =
  "Hi! I'm Steph, your AI meeting assistant. Ask me about your past meetings, action items, decisions, or anything else I can help with."

type Message = { role: 'user' | 'assistant'; content: string }

// ── Steph chat panel (fixed, independent of FAB position) ─────────────────────
function StephPanel({ onClose }: { onClose: () => void }) {
  const { activeWorkspace } = useWorkspace()
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: WELCOME }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const history = messages.slice(-20)
    setMessages(p => [...p, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    try {
      const data = await api.post('/steph/chat', {
        message: text,
        conversation_history: history,
        workspace_id: activeWorkspace?.id ?? null,
      })
      setMessages(p => [...p, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(p => [...p, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      // Fixed position independent of the FAB button
      className="fixed bottom-24 right-6 z-[91] flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] ring-1 ring-slate-200"
      style={{ width: 360, maxWidth: 'calc(100vw - 3rem)', height: 480 }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
          <Sparkles size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-white">Steph</p>
          <p className="text-[11px] text-white/70">AI meeting assistant</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-white/70 transition hover:bg-white/15 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 text-slate-800'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-3">
              {[0, 120, 240].map(d => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 px-3 py-3">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask Steph anything…"
          className="flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm outline-none placeholder:text-slate-400"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </div>
    </motion.div>
  )
}

// ── Speed-dial item ───────────────────────────────────────────────────────────
function DialItem({
  icon, label, accent, onClick, index,
}: {
  icon: React.ReactNode; label: string; accent: string
  onClick: () => void; index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.92 }}
      transition={{ duration: 0.2, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-end gap-3"
    >
      <span className="whitespace-nowrap rounded-full bg-slate-950/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
        {label}
      </span>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        className={`flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full shadow-lg ${accent}`}
      >
        {icon}
      </motion.button>
    </motion.div>
  )
}

// ── Main FAB ──────────────────────────────────────────────────────────────────
export default function ActionFab() {
  const { pathname } = useLocation()
  const { isSignedIn } = useAuth()

  const [menuOpen, setMenuOpen]     = useState(false)
  const [stephOpen, setStephOpen]   = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)

  const shouldShow = useMemo(
    () => isSignedIn && DASHBOARD_PREFIXES.some(p => pathname.startsWith(p)),
    [isSignedIn, pathname],
  )

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) {
      const el = document.getElementById('action-fab-btn')
      const dial = document.getElementById('action-fab-dial')
      if (
        el && !el.contains(e.target as Node) &&
        dial && !dial.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  function handleFabClick() {
    if (stephOpen) { setStephOpen(false); setMenuOpen(false); return }
    setMenuOpen(v => !v)
  }

  if (!shouldShow) return null

  const isOpen = menuOpen || stephOpen

  return (
    <>
      {/* ── Steph chat panel ── */}
      <AnimatePresence>
        {stephOpen && <StephPanel onClose={() => setStephOpen(false)} />}
      </AnimatePresence>

      {/* ── Speed-dial items (fixed, stacked above FAB) ── */}
      <AnimatePresence>
        {menuOpen && !stephOpen && (
          <div
            id="action-fab-dial"
            className="fixed bottom-24 right-6 z-[91] flex flex-col items-end gap-3"
          >
            <DialItem
              index={1}
              icon={<Sparkles size={18} className="text-white" />}
              label="Talk to Steph"
              accent="bg-gradient-to-br from-violet-600 to-indigo-600"
              onClick={() => { setMenuOpen(false); setStephOpen(true) }}
            />
            <DialItem
              index={0}
              icon={<Radio size={18} className="text-white" />}
              label="Record a call"
              accent="bg-gradient-to-br from-emerald-500 to-teal-600"
              onClick={() => { setMenuOpen(false); setRecordOpen(true) }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* ── Main FAB button (fixed, always at bottom-right) ── */}
      <div className="fixed bottom-6 right-6 z-[90]">
        <motion.button
          id="action-fab-btn"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          onClick={handleFabClick}
          className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.35)] ring-1 ring-white/10 hover:bg-slate-800"
        >
          <motion.span
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center"
          >
            <Plus size={22} className="text-white" />
          </motion.span>
        </motion.button>
      </div>

      <RecordMeetingModal open={recordOpen} onClose={() => setRecordOpen(false)} />
    </>
  )
}
