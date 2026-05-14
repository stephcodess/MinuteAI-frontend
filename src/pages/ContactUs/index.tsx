import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, MessageSquare, Shield, Clock, Send, CheckCircle } from 'lucide-react'

const contactCards = [
  {
    icon: Mail,
    title: 'General Enquiries',
    desc: 'Questions about MinuteAI, features, or partnerships.',
    email: 'hello@minuteai.app',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    icon: Shield,
    title: 'Privacy & Legal',
    desc: 'Data requests, GDPR enquiries, or legal matters.',
    email: 'privacy@minuteai.app',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: MessageSquare,
    title: 'Technical Support',
    desc: 'Issues with transcription, exports, or your account.',
    email: 'support@minuteai.app',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
  },
]

const topics = [
  'General question',
  'Technical support',
  'Billing & subscription',
  'Privacy / data request',
  'Partnership / press',
  'Feature request',
  'Other',
]

export default function ContactUs() {
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-[#080b14]">
      {/* Glow background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(124,58,237,0.08)_0%,transparent_70%)]" />

      <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6">
        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-300">
            <ArrowLeft size={14} /> Back to home
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="mb-16 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-400">
            <Clock size={13} /> We reply within 24 hours
          </div>
          <h1 className="mb-4 text-4xl font-black text-white sm:text-5xl">Get in touch</h1>
          <p className="mx-auto max-w-xl text-lg text-slate-400 leading-relaxed">
            Have a question, found a bug, or want to explore a partnership? We'd love to hear from you.
          </p>
        </motion.div>

        {/* Contact cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-14 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {contactCards.map(({ icon: Icon, title, desc, email, color, bg, border }) => (
            <motion.a
              key={title}
              href={`mailto:${email}`}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={`flex flex-col gap-3 rounded-2xl border ${border} ${bg} p-5 backdrop-blur-sm`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="mb-0.5 text-sm font-bold text-white">{title}</p>
                <p className="mb-2 text-xs text-slate-500">{desc}</p>
                <p className={`text-xs font-semibold ${color}`}>{email}</p>
              </div>
            </motion.a>
          ))}
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2 }}
          className="rounded-3xl border border-white/8 bg-white/[0.03] p-8 backdrop-blur-sm sm:p-10"
        >
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/25"
              >
                <CheckCircle size={38} className="text-emerald-400" />
              </motion.div>
              <h2 className="text-2xl font-black text-white">Message sent!</h2>
              <p className="max-w-sm text-slate-400">Thanks for reaching out. We'll get back to you within 24 hours.</p>
              <button
                onClick={() => { setSubmitted(false); setForm({ name: '', email: '', topic: '', message: '' }) }}
                className="mt-4 rounded-full border border-white/12 bg-white/[0.06] px-6 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Send another message
              </button>
            </div>
          ) : (
            <>
              <h2 className="mb-8 text-2xl font-black text-white">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name + Email row */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">Your name</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Alex Chen"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">Email address</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="alex@company.com"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                    />
                  </div>
                </div>

                {/* Topic */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">Topic</label>
                  <select
                    name="topic"
                    required
                    value={form.topic}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/10 bg-[#0e1120] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                  >
                    <option value="" disabled>Select a topic…</option>
                    {topics.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">Message</label>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us how we can help…"
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                  />
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-7 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(124,58,237,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_45px_rgba(124,58,237,0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        Send message
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
