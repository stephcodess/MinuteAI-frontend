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
          className="fixed bottom-24 right-6 z-[91] flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] ring-1 ring-slate-200"
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
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-500">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-800">Message sent!</p>
                <p className="mt-1 text-sm text-slate-500">
                  We've received your message and will get back to you at{' '}
                  <span className="font-medium text-slate-700">{form.email}</span>.
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
                    <label className="mb-1 block text-[11px] font-medium text-slate-500">Name</label>
                    <input
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Your name"
                      className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-500">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      placeholder="you@example.com"
                      className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">Subject</label>
                  <input
                    ref={subjectRef}
                    value={form.subject}
                    onChange={set('subject')}
                    placeholder="What's this about?"
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">Message</label>
                  <textarea
                    value={form.message}
                    onChange={set('message')}
                    placeholder="Describe your issue or question…"
                    rows={6}
                    className="w-full resize-none rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
                )}
              </div>

              <div className="shrink-0 border-t border-slate-200 px-4 py-3">
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
