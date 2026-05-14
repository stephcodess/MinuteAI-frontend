import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Shield, Lock, Eye, Trash2, Server, Key } from 'lucide-react'

const items = [
  {
    icon: Lock,
    title: 'End-to-end encryption',
    desc: 'All uploads and transcripts are encrypted in transit (TLS 1.3) and at rest (AES-256).',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/15',
  },
  {
    icon: Trash2,
    title: 'Auto-delete after 24 hours',
    desc: 'Your audio and video files are permanently deleted within 24 hours of processing. Zero long-term storage.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/15',
  },
  {
    icon: Eye,
    title: 'No human review',
    desc: 'Your recordings are never listened to, reviewed, or used to train AI models by any human.',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/15',
  },
  {
    icon: Shield,
    title: 'GDPR compliant',
    desc: 'Built to European data protection standards. You control your data, and we never sell it.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/15',
  },
  {
    icon: Server,
    title: 'EU & US data residency',
    desc: 'Choose where your data is processed and stored. Full control over your data region.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/15',
  },
  {
    icon: Key,
    title: 'Role-based access',
    desc: 'Team admins can control exactly who sees which meeting minutes with fine-grained permissions.',
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/15',
  },
]

export default function Security() {
  const headingRef = useRef(null)
  const headingInView = useInView(headingRef, { once: true })

  return (
    <section id="security" className="relative overflow-hidden bg-[#080b14] py-20 sm:py-28">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_50%,rgba(16,185,129,0.05)_0%,transparent_70%)]" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* Heading */}
        <motion.div
          ref={headingRef}
          initial={{ opacity: 0, y: 24 }}
          animate={headingInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65 }}
          className="mb-16 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16"
        >
          {/* Left: text */}
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-block self-start rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Security & Privacy
            </span>
            <h2 className="mb-5 text-3xl font-black text-white sm:text-4xl">
              Your meetings are{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
                yours alone
              </span>
            </h2>
            <p className="mb-8 text-slate-400 leading-relaxed">
              We built MinuteAI with privacy first — not as an afterthought. Your conversations stay confidential. Always.
            </p>

            {/* Stats row */}
            <div className="flex gap-8">
              {[
                { value: '0', label: 'Files stored long-term' },
                { value: '100%', label: 'Encrypted in transit' },
                { value: '24h', label: 'Auto-delete policy' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: mock security shield visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center justify-center"
          >
            {/* Outer ring pulse */}
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.3, 0.15] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute h-64 w-64 rounded-full bg-emerald-500/10"
            />
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
              className="absolute h-48 w-48 rounded-full bg-emerald-500/15"
            />

            {/* Shield icon center */}
            <div className="relative z-10 flex h-32 w-32 items-center justify-center rounded-3xl border border-emerald-500/25 bg-emerald-500/10 backdrop-blur-sm shadow-[0_0_60px_rgba(16,185,129,0.2)]">
              <Shield size={52} className="text-emerald-400" strokeWidth={1.5} />
            </div>

            {/* Floating badge chips */}
            {['TLS 1.3', 'AES-256', 'GDPR', 'SOC 2'].map((label, i) => {
              const positions = [
                'top-2 left-4',
                'top-2 right-4',
                'bottom-2 left-4',
                'bottom-2 right-4',
              ]
              return (
                <motion.span
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  className={`absolute ${positions[i]} rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-slate-300 backdrop-blur-sm`}
                >
                  {label}
                </motion.span>
              )
            })}
          </motion.div>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, desc, color, bg, border }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className={`flex h-full flex-col rounded-2xl border ${border} ${bg} p-5 backdrop-blur-sm`}
              >
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]`}>
                  <Icon size={18} className={color} />
                </div>
                <p className="mb-1.5 text-sm font-bold text-white">{title}</p>
                <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
