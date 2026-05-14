import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { FileText, Users, Zap, CheckCircle, Download, Shield } from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: 'Action items table',
    desc: 'Every task extracted with owner and deadline — zero effort required.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/15',
  },
  {
    icon: Users,
    title: 'Speaker identification',
    desc: "Each participant's contributions labelled clearly in the output.",
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/15',
  },
  {
    icon: Zap,
    title: 'Agenda-structured sections',
    desc: 'Organised by agenda item — never a wall of text again.',
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/15',
  },
  {
    icon: CheckCircle,
    title: 'Key decisions captured',
    desc: 'Decisions and rationale preserved verbatim from the recording.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/15',
  },
  {
    icon: Download,
    title: '.docx and PDF export',
    desc: 'Two polished formats, ready to email or print immediately.',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/15',
  },
  {
    icon: Shield,
    title: 'Secure processing',
    desc: 'Files deleted after 24 hours. Never stored long-term.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/15',
  },
]

function FeatureCard({ feat, index }: { feat: typeof features[0]; index: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const Icon = feat.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.22 }}
        className={`h-full rounded-2xl border ${feat.border} bg-white/[0.03] p-5 backdrop-blur-sm`}
      >
        <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${feat.bg}`}>
          <Icon size={18} className={feat.color} />
        </div>
        <p className="mb-1.5 text-sm font-bold text-white">{feat.title}</p>
        <p className="text-sm leading-relaxed text-slate-500">{feat.desc}</p>
      </motion.div>
    </motion.div>
  )
}

/* Sample output document card */
function SampleOutput() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-sm"
    >
      {/* Doc header */}
      <div className="flex items-center gap-3 border-b border-white/8 bg-gradient-to-r from-violet-600/80 to-indigo-600/80 px-5 py-4 backdrop-blur">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-white/25" />
          <span className="h-3 w-3 rounded-full bg-white/25" />
          <span className="h-3 w-3 rounded-full bg-white/25" />
        </div>
        <span className="ml-2 min-w-0 truncate text-xs font-medium text-white/75">
          Q2_Planning_Meeting_Minutes.docx
        </span>
      </div>

      <div className="space-y-5 p-5 text-sm">
        {/* Meeting meta */}
        <div className="rounded-xl bg-white/[0.04] p-4">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">Meeting Details</p>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            {[
              ['Date', '5 May 2026'],
              ['Duration', '42 minutes'],
              ['Chair', 'Alex Chen'],
              ['Attendees', 'Sarah, James, Priya'],
            ].map(([label, val]) => (
              <>
                <span key={`${label}-l`} className="text-slate-600">{label}</span>
                <span key={`${label}-v`} className="text-slate-300">{val}</span>
              </>
            ))}
          </div>
        </div>

        {/* Section */}
        <div className="border-b border-white/8 pb-4">
          <p className="mb-2 font-semibold text-white">1. Q2 Roadmap Review</p>
          <p className="text-xs leading-relaxed text-slate-500">
            Alex presented the updated Q2 roadmap. The team agreed to prioritise the mobile
            release ahead of the API launch. Sarah raised timeline concerns regarding the
            design review cycle…
          </p>
        </div>

        {/* Action items */}
        <div>
          <p className="mb-3 font-semibold text-white">Action Items</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[300px] text-xs">
              <thead>
                <tr className="border-b border-white/8 text-left text-slate-600">
                  <th className="pb-2 font-medium">Task</th>
                  <th className="pb-2 font-medium">Owner</th>
                  <th className="pb-2 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Update roadmap doc', 'Alex', '12 May'],
                  ['Review mobile specs', 'Sarah', '9 May'],
                  ['Schedule design review', 'Priya', '14 May'],
                ].map(([task, owner, due]) => (
                  <tr key={task} className="border-b border-white/5">
                    <td className="py-2 text-slate-300">{task}</td>
                    <td className="py-2 text-slate-500">{owner}</td>
                    <td className="py-2 font-semibold text-violet-400">{due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-white/8 bg-white/[0.02] px-5 py-3">
        <button className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-violet-500">
          <Download size={11} /> Download .docx
        </button>
        <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-slate-400 transition hover:border-white/20 hover:text-white">
          <FileText size={11} /> PDF
        </button>
      </div>
    </motion.div>
  )
}

export default function Features() {
  const headingRef = useRef(null)
  const headingInView = useInView(headingRef, { once: true })

  return (
    <section id="features" className="scroll-mt-24 bg-[#080b14] py-20 sm:py-28">
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
            What you get
          </span>
          <h2 className="mb-4 text-3xl font-black text-white sm:text-4xl">
            A complete document,{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              not a raw transcript
            </span>
          </h2>
          <p className="mx-auto max-w-xl text-slate-400">
            MinuteAI doesn't just dump text — it understands your meeting and builds a
            structured document you can send immediately.
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Feature grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {features.map((feat, i) => (
              <FeatureCard key={feat.title} feat={feat} index={i} />
            ))}
          </div>

          {/* Sample output */}
          <SampleOutput />
        </div>
      </div>
    </section>
  )
}
