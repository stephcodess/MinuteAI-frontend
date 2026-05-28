import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { api } from '../../lib/api'

const DASHBOARD_PREFIXES = [
  '/dashboard',
  '/billing',
  '/settings',
  '/team',
  '/upload',
  '/subscription',
  '/tasks',
  '/meeting-bots',
  '/translator',
]

const WELCOME =
  "Hi! I'm Steph, your AI meeting assistant. Ask me about your past meetings, action items, decisions, or anything else I can help with."

type Message = { role: 'user' | 'assistant'; content: string }

export default function StephChat() {
  const { pathname } = useLocation()
  const { isSignedIn } = useAuth()
  const { activeWorkspace } = useWorkspace()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: WELCOME },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const shouldShow = useMemo(
    () => isSignedIn && DASHBOARD_PREFIXES.some((p) => pathname.startsWith(p)),
    [isSignedIn, pathname],
  )

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const history = messages.slice(-20)
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)

    try {
      const data = await api.post('/steph/chat', {
        message: text,
        conversation_history: history,
        workspace_id: activeWorkspace?.id ?? null,
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (!shouldShow) return null

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed bottom-[5.5rem] left-6 z-[90] flex w-[360px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
            style={{ background: 'var(--modal-bg)', borderColor: 'var(--modal-border)' }}
            style={{ height: 480 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                <Sparkles size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Steph</p>
                <p className="text-xs text-white/70">Your AI meeting assistant</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-white/70 transition hover:bg-white/15 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white'
                        : ''
                    }`}
                    style={msg.role === 'assistant' ? { background: 'var(--input-bg)', color: 'var(--text-1)' } : undefined}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-2xl px-4 py-3" style={{ background: 'var(--input-bg)' }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:240ms]" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 border-t px-3 py-3" style={{ borderColor: 'var(--divider)' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask Steph anything…"
                className="flex-1 rounded-full border px-4 py-2 text-sm outline-none glass-input"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white transition hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-6 z-[90] flex items-center gap-3 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,23,42,0.32)] transition hover:bg-slate-800"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-400/16 text-violet-300 ring-1 ring-violet-300/20">
          <Sparkles size={16} />
        </span>
        <span className="hidden sm:inline">Talk to Steph</span>
      </motion.button>
    </>
  )
}
