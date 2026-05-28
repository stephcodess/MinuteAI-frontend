import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Send, X, ChevronDown, Sparkles, User,
  Radio, Eye, Sword, Scale, GitBranch, Volume2, VolumeX,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const WS_BASE = BASE.replace(/^http/, 'ws')

type Mode = 'public' | 'copilot' | 'advocate' | 'mediator'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  source?: 'wake' | 'manual'
  mode?: Mode
  spokeInMeeting?: boolean
}

const MODES: { id: Mode; label: string; icon: typeof Eye; color: string }[] = [
  { id: 'public',   label: 'Public',     icon: Radio,   color: 'text-emerald-400' },
  { id: 'copilot',  label: 'Co-Pilot',   icon: Eye,     color: 'text-sky-400'     },
  { id: 'advocate', label: "Devil's",    icon: Sword,   color: 'text-rose-400'    },
  { id: 'mediator', label: 'Mediator',   icon: Scale,   color: 'text-amber-400'   },
]

function playAudioB64(b64: string) {
  try {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => URL.revokeObjectURL(url)
    audio.play().catch(() => {})
  } catch {}
}

export default function HostControlPanel() {
  const { isSignedIn } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>('public')
  const [wsReady, setWsReady] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [crossThread, setCrossThread] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll for active session
  useEffect(() => {
    if (!isSignedIn) return
    const check = async () => {
      try {
        const data = await api.get('/steph/active-session')
        setSessionId(data.session_id || null)
      } catch {}
    }
    check()
    pollRef.current = setInterval(check, 30000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [isSignedIn])

  // Connect WebSocket when session active
  useEffect(() => {
    if (!sessionId) {
      wsRef.current?.close()
      wsRef.current = null
      setWsReady(false)
      return
    }
    const token = localStorage.getItem('minuteai_access') || ''
    const ws = new WebSocket(
      `${WS_BASE}/ws/control-panel?session_id=${sessionId}&token=${encodeURIComponent(token)}`
    )

    ws.onopen = () => setWsReady(true)
    ws.onclose = () => setWsReady(false)

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'steph_wake') {
          setThinking(true)
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'user',
            content: data.command,
            source: data.source === 'manual' ? 'manual' : 'wake',
          }])
          if (data.source !== 'manual') setOpen(true)
        } else if (data.type === 'steph_response') {
          setThinking(false)
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.reply,
            mode: data.mode,
            spokeInMeeting: !!data.spoke_in_meeting,
          }])
          if (voiceEnabled && data.audio_b64) {
            playAudioB64(data.audio_b64)
          }
        }
      } catch {}
    }

    wsRef.current = ws
    return () => { ws.close() }
  }, [sessionId])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const sendMessage = useCallback(() => {
    const msg = input.trim()
    if (!msg || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ action: 'ask', message: msg, mode, cross_thread: crossThread }))
    setInput('')
    setThinking(true)
  }, [input, mode, crossThread])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  if (!isSignedIn || !sessionId) return null

  return (
    <div className="fixed bottom-6 right-24 z-40 flex flex-col items-end gap-2">

      {/* Collapsed pill */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            Steph — Live
            {messages.length > 0 && (
              <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {messages.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="w-[360px] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              maxHeight: '540px',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300" />
                </span>
                <span className="text-sm font-bold text-white">Steph — Live Session</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Voice toggle */}
                <button
                  onClick={() => setVoiceEnabled(v => !v)}
                  className={`p-1.5 rounded-lg transition-colors ${voiceEnabled ? 'text-white/80 hover:text-white' : 'text-white/30 hover:text-white/60'}`}
                  title={voiceEnabled ? 'Mute Steph' : 'Unmute Steph'}
                >
                  {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
                {/* Cross-thread toggle */}
                <button
                  onClick={() => setCrossThread(v => !v)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                    crossThread ? 'bg-amber-500/30 text-amber-300' : 'text-white/40 hover:text-white/70'
                  }`}
                  title={crossThread ? 'Cross-thread recall ON — searching all meetings' : 'Cross-thread recall OFF — scoped to this thread'}
                >
                  <GitBranch size={11} />
                  {crossThread ? 'All threads' : 'This thread'}
                </button>
                <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white p-1 rounded-lg transition-colors">
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            {/* Mode tabs */}
            <div className="flex items-center gap-1 px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--divider)' }}>
              {MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    mode === m.id ? 'bg-violet-600/20 text-violet-300' : 'hover:bg-white/[0.04]'
                  }`}
                  style={{ color: mode === m.id ? undefined : 'var(--text-3)' }}
                  title={m.id === 'copilot' ? 'Responses visible only to you' : undefined}
                >
                  <m.icon size={11} className={mode === m.id ? 'text-violet-400' : ''} />
                  {m.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.length === 0 && !thinking && (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <Mic size={22} className="mb-2" style={{ color: 'var(--text-3)' }} />
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                    Listening for "Steph…"
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
                    Say the wake word or type below
                  </p>
                </div>
              )}

              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={10} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[260px] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'
                    }`}
                    style={
                      msg.role === 'user'
                        ? { background: 'rgba(124,58,237,0.15)', color: 'var(--text-1)' }
                        : { background: 'var(--input-bg)', color: 'var(--text-1)' }
                    }
                  >
                    {msg.source === 'wake' && (
                      <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider block mb-1">
                        ◉ Wake word
                      </span>
                    )}
                    {msg.role === 'assistant' && msg.spokeInMeeting && (
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                        <Radio size={8} />
                        Spoke in meeting
                      </span>
                    )}
                    {msg.role === 'assistant' && msg.mode && msg.mode !== 'public' && !msg.spokeInMeeting && (
                      <span className="text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-3)' }}>
                        {MODES.find(m => m.id === msg.mode)?.label}
                      </span>
                    )}
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={10} className="text-violet-400" />
                    </div>
                  )}
                </motion.div>
              ))}

              {thinking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 justify-start"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
                    <Sparkles size={10} className="text-white" />
                  </div>
                  <div
                    className="rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1"
                    style={{ background: 'var(--input-bg)' }}
                  >
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-violet-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              className="px-3 py-3 shrink-0 flex items-center gap-2"
              style={{ borderTop: '1px solid var(--divider)' }}
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Ask Steph (${MODES.find(m => m.id === mode)?.label})…`}
                className="flex-1 text-xs rounded-xl px-3 py-2 outline-none bg-transparent placeholder:text-[var(--text-3)]"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-1)',
                }}
              />
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={sendMessage}
                disabled={!input.trim() || !wsReady}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}
              >
                <Send size={13} className="text-white" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
