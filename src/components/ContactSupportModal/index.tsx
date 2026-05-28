import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, HeadphonesIcon, Send, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'

interface Props {
  open: boolean
  onClose: () => void
}

type Stage = 'form' | 'success'

export default function ContactSupportModal({ open, onClose }: Props) {
  const { user } = useAuth()
  const [stage, setStage] = useState<Stage>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const subjectRef = useRef<HTMLInputElement>(null)

  // Pre-fill from auth user; reset stage when reopened
  useEffect(() => {
    if (open) {
      setStage('form')
      setError('')
      setForm(f => ({
        ...f,
        name: user?.name || '',
        email: user?.email || '',
      }))
      setTimeout(() => subjectRef.current?.focus(), 80)
    }
  }, [open, user])

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/support/contact', form)
      setStage('success')
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-24 right-6 z-[91] flex flex-col overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] border"
          style={{ background: 'var(--modal-bg)', borderColor: 'var(--modal-border)' }}
          style={{ width: 360, maxWidth: 'calc(100vw - 3rem)', height: stage === 'success' ? 'auto' : 520 }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-teal-500 to-cyan-600 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
              <HeadphonesIcon size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight text-white">Contact Support</p>
              <p className="text-[11px] text-white/70">We usually reply within 24 hours</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-white/70 transition hover:bg-white/15 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          {stage === 'success' ? (
            <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/10 text-teal-400">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <p className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Message sent!</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>
                  We've received your message and will get back to you at{' '}
                  <span className="font-medium" style={{ color: 'var(--text-2)' }}>{form.email}</span>.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 rounded-full bg-teal-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-teal-600"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-3 px-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Name</label>
                    <input
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Your name"
                      className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-400"
                      style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-400"
                      style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Subject</label>
                  <input
                    ref={subjectRef}
                    value={form.subject}
                    onChange={set('subject')}
                    placeholder="What's this about?"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-400"
                    style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Message</label>
                  <textarea
                    value={form.message}
                    onChange={set('message')}
                    placeholder="Describe your issue or question…"
                    rows={6}
                    className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-400"
                    style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }}
                  />
                </div>

                {error && (
                  <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">{error}</p>
                )}
              </div>

              <div className="shrink-0 border-t px-4 py-3" style={{ borderColor: 'var(--divider)' }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-teal-500 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Send size={14} />
                  )}
                  {loading ? 'Sending…' : 'Send message'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
