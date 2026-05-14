import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Video, MessageSquare, Calendar, FileText, Mail, Mic } from 'lucide-react'

const integrations = [
  { name: 'Zoom', icon: Video, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/15', desc: 'Record & transcribe' },
  { name: 'Google Meet', icon: Video, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', desc: 'Auto-join & capture' },
  { name: 'MS Teams', icon: MessageSquare, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/15', desc: 'Full integration' },
  { name: 'Slack', icon: MessageSquare, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/15', desc: 'Share minutes instantly' },
  { name: 'Google Calendar', icon: Calendar, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/15', desc: 'Auto-schedule bots' },
  { name: 'Notion', icon: FileText, color: 'text-slate-300', bg: 'bg-white/5', border: 'border-white/10', desc: 'Export directly' },
  { name: 'Gmail', icon: Mail, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/15', desc: 'Email summaries' },
  { name: 'Webex', icon: Mic, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/15', desc: 'Live transcription' },
]

export default function Integrations() {
  const headingRef = useRef(null)
  const headingInView = useInView(headingRef, { once: true })

  return (
    <section id="integrations" className="relative bg-[#080b14] py-20 sm:py-28">
      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_60%,rgba(124,58,237,0.06)_0%,transparent_70%)]" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Heading */}
        <motion.div
          ref={headingRef}
          initial={{ opacity: 0, y: 24 }}
          animate={headingInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65 }}
          className="mb-14 text-center"
        >
          <span className="mb-4 inline-block rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
            Integrations
          </span>
          <h2 className="mb-4 text-3xl font-black text-white sm:text-4xl">
            Works with your{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              existing tools
            </span>
          </h2>
          <p className="mx-auto max-w-xl text-slate-400">
            MinuteAI plugs into the platforms your team already uses — no switching required.
          </p>
        </motion.div>

        {/* Integration grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {integrations.map(({ name, icon: Icon, color, bg, border, desc }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col items-center gap-3 rounded-2xl border ${border} ${bg} p-5 text-center backdrop-blur-sm`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/8`}>
                  <Icon size={22} className={color} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{name}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 text-center text-sm text-slate-600"
        >
          + More integrations coming soon via Zapier & native API
        </motion.p>
      </div>
    </section>
  )
}
