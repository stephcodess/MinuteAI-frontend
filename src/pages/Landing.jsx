import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useAnimation, animate } from 'framer-motion'
import {
  Upload, Zap, FileText, Download, CheckCircle, ArrowRight,
  Mic, Sparkles, Clock, Users, Shield, Star
} from 'lucide-react'

/* ── Reusable fade-up wrapper ── */
function FadeUp({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* ── Animated stat counter ── */
function Counter({ to, suffix = '' }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    const ctrl = animate(0, to, {
      duration: 1.6,
      ease: 'easeOut',
      onUpdate: v => setVal(Math.round(v)),
    })
    return ctrl.stop
  }, [inView, to])
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

/* ── Audio waveform bars ── */
function Waveform() {
  const bars = [4, 7, 5, 9, 6, 11, 8, 13, 10, 8, 12, 7, 5, 9, 6, 11, 8, 5, 7, 4]
  return (
    <div className="flex items-end gap-0.5 h-10">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-violet-400/60"
          style={{ height: `${h * 3}px` }}
          animate={{ scaleY: [1, 0.4, 1.2, 0.6, 1] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.07,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/* ── Data ── */
const steps = [
  {
    n: '01', icon: Upload, label: 'Upload',
    desc: 'Drop your audio file — MP3, MP4, WAV, M4A, up to 2 hours.',
    color: 'from-violet-500 to-violet-600',
  },
  {
    n: '02', icon: Mic, label: 'Transcribe',
    desc: 'OpenAI Whisper converts your recording to an accurate transcript.',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    n: '03', icon: Sparkles, label: 'Format',
    desc: 'Claude AI structures the transcript into professional meeting minutes.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    n: '04', icon: Download, label: 'Download',
    desc: 'Receive a polished .docx and PDF — ready to share immediately.',
    color: 'from-fuchsia-500 to-fuchsia-600',
  },
]

const features = [
  { icon: FileText, title: 'Action items table', desc: 'Every task extracted with owner and deadline.' },
  { icon: Users, title: 'Speaker identification', desc: 'Each participant\'s contributions labelled separately.' },
  { icon: Zap, title: 'Agenda-structured sections', desc: 'Organised by agenda item, not a wall of text.' },
  { icon: CheckCircle, title: 'Key decisions captured', desc: 'Decisions and rationale preserved verbatim.' },
  { icon: Download, title: '.docx and PDF export', desc: 'Two formats, ready to email or print.' },
  { icon: Shield, title: 'Secure processing', desc: 'Files deleted after 24 hours. Never stored long-term.' },
]

const testimonials = [
  {
    name: 'Dr. Amara Nwosu',
    role: 'Research Supervisor, UCL',
    quote: 'I used to spend 45 minutes writing up our group meetings. MinuteAI does it in 90 seconds. The structure is better than what I wrote manually.',
    stars: 5,
  },
  {
    name: 'James Farrell',
    role: 'Project Manager, Deloitte',
    quote: 'Our whole team adopted it within a week. The action items table alone saves us hours of follow-up confusion every month.',
    stars: 5,
  },
  {
    name: 'Sofia Martins',
    role: 'Operations Lead, Techstars',
    quote: 'Tried Otter, Fireflies, and a few others. MinuteAI is the only one that actually gives me a document I can send without editing.',
    stars: 5,
  },
]

/* ── Main component ── */
export default function Landing() {
  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 overflow-hidden">
        {/* background grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px),
                              linear-gradient(to bottom, #fff 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        {/* glow orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl translate-y-1/2" />

        <div className="relative max-w-5xl mx-auto px-6 py-28 text-center">
          {/* badge */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-violet-200 text-sm font-medium px-4 py-1.5 rounded-full mb-8"
          >
            <motion.span
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Zap size={13} />
            </motion.span>
            Audio → professional minutes in under 2 minutes
          </motion.div>

          {/* headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-6"
          >
            Your meeting recording,<br />
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              turned into minutes
            </span>
          </motion.h1>

          {/* sub */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            MinuteAI transcribes with Whisper and formats with Claude — giving you a structured,
            downloadable Word document with zero manual effort.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center gap-4 mb-14"
          >
            <Link
              to="/upload"
              className="group flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-7 py-3.5 rounded-xl font-semibold text-base shadow-lg shadow-violet-900/40 transition-all hover:shadow-violet-700/50 hover:-translate-y-0.5"
            >
              Upload a recording
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/pricing"
              className="text-slate-300 hover:text-white font-medium text-base transition-colors"
            >
              See pricing →
            </Link>
          </motion.div>

          {/* waveform card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-lg mx-auto bg-white/5 backdrop-blur border border-white/10 rounded-2xl px-8 py-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-500/30 flex items-center justify-center">
                <Mic size={15} className="text-violet-300" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">Q2_Planning_Meeting.m4a</p>
                <p className="text-xs text-slate-500">42 min · 48 MB</p>
              </div>
              <div className="ml-auto">
                <Waveform />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <motion.div
                className="w-2 h-2 rounded-full bg-violet-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              Transcribing… 78% complete
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-3 gap-8 text-center">
          {[
            { value: 12000, suffix: '+', label: 'Meetings processed' },
            { value: 40, suffix: '%', label: 'Of time saved per week' },
            { value: 4.9, suffix: '/5', label: 'Average user rating' },
          ].map(({ value, suffix, label }) => (
            <FadeUp key={label}>
              <p className="text-4xl font-bold text-gray-900 tabular-nums">
                <Counter to={value} suffix={suffix} />
              </p>
              <p className="text-sm text-gray-400 mt-1">{label}</p>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <FadeUp className="text-center mb-16">
            <p className="text-sm font-semibold text-violet-600 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl font-bold text-gray-900">From recording to ready-to-send</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Four steps. No terminal. No API keys. No manual work.</p>
          </FadeUp>

          <div className="relative grid grid-cols-4 gap-6">
            {/* connector line */}
            <FadeUp className="absolute top-8 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] hidden md:block" delay={0.4}>
              <div className="h-px bg-gradient-to-r from-violet-300 via-purple-300 to-fuchsia-300" />
            </FadeUp>

            {steps.map(({ n, icon: Icon, label, desc, color }, i) => (
              <FadeUp key={label} delay={i * 0.12}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: '0 16px 40px -12px rgba(124,58,237,0.18)' }}
                  className="bg-white rounded-2xl border border-gray-200 p-5 text-center cursor-default transition-shadow"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <Icon className="text-white" size={22} />
                  </div>
                  <span className="text-xs font-bold text-gray-300 tracking-widest">{n}</span>
                  <p className="font-semibold text-gray-900 mt-1 mb-2">{label}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES + SAMPLE OUTPUT ── */}
      <section className="bg-white py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 gap-16 items-start">
            {/* left: feature list */}
            <FadeUp>
              <p className="text-sm font-semibold text-violet-600 uppercase tracking-widest mb-3">What you get</p>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                A complete document,<br />not a raw transcript
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                MinuteAI doesn't just dump text — it understands your meeting and builds a structured document you can send immediately.
              </p>
              <ul className="space-y-4">
                {features.map(({ icon: Icon, title, desc }, i) => (
                  <motion.li
                    key={title}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={15} className="text-violet-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{title}</p>
                      <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </FadeUp>

            {/* right: sample output card */}
            <FadeUp delay={0.15}>
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-100 overflow-hidden"
              >
                {/* card header */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-white/30" />
                    <span className="w-3 h-3 rounded-full bg-white/30" />
                    <span className="w-3 h-3 rounded-full bg-white/30" />
                  </div>
                  <span className="text-white/80 text-xs font-medium ml-2">Q2_Planning_Meeting_Minutes.docx</span>
                </div>

                <div className="p-6 space-y-5 text-sm">
                  {/* metadata */}
                  <div className="pb-4 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Meeting Details</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                      <span className="text-gray-400">Date</span><span>5 May 2026</span>
                      <span className="text-gray-400">Duration</span><span>42 minutes</span>
                      <span className="text-gray-400">Chair</span><span>Alex Chen</span>
                      <span className="text-gray-400">Attendees</span><span>Sarah, James, Priya</span>
                    </div>
                  </div>

                  {/* section */}
                  <div className="pb-4 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 mb-1.5">1. Q2 Roadmap Review</p>
                    <p className="text-gray-500 leading-relaxed text-xs">
                      Alex presented the updated Q2 roadmap. The team agreed to prioritise the mobile
                      release ahead of the API launch. Sarah raised timeline concerns regarding the
                      design review cycle…
                    </p>
                  </div>

                  {/* action items */}
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Action Items</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-100">
                          <th className="text-left py-1 font-medium">Task</th>
                          <th className="text-left py-1 font-medium">Owner</th>
                          <th className="text-left py-1 font-medium">Due</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-700">
                        {[
                          ['Update roadmap doc', 'Alex', '12 May'],
                          ['Review mobile specs', 'Sarah', '9 May'],
                          ['Schedule design review', 'Priya', '14 May'],
                        ].map(([task, owner, due]) => (
                          <tr key={task} className="border-b border-gray-50">
                            <td className="py-1.5">{task}</td>
                            <td className="py-1.5 text-gray-500">{owner}</td>
                            <td className="py-1.5 text-violet-600 font-medium">{due}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* download bar */}
                <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex items-center gap-3">
                  <button className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg font-medium">
                    <Download size={12} /> Download .docx
                  </button>
                  <button className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg">
                    <FileText size={12} /> PDF
                  </button>
                </div>
              </motion.div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <FadeUp className="text-center mb-14">
            <p className="text-sm font-semibold text-violet-600 uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-3xl font-bold text-gray-900">What our users say</h2>
          </FadeUp>
          <div className="grid grid-cols-3 gap-6">
            {testimonials.map(({ name, role, quote, stars }, i) => (
              <FadeUp key={name} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
                >
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: stars }).map((_, j) => (
                      <Star key={j} size={14} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-5">"{quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{name}</p>
                      <p className="text-xs text-gray-400">{role}</p>
                    </div>
                  </div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-700 py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <FadeUp className="relative max-w-2xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/25 text-violet-100 text-sm px-4 py-1.5 rounded-full mb-8">
            <Clock size={13} />
            3 free meetings per month — no credit card
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Stop taking notes manually.
          </h2>
          <p className="text-violet-200 text-lg mb-10">
            Upload your first recording now and see the difference in minutes.
          </p>
          <Link
            to="/upload"
            className="group inline-flex items-center gap-2 bg-white text-violet-700 hover:bg-violet-50 px-8 py-4 rounded-xl font-bold text-base shadow-xl shadow-violet-900/30 transition-all hover:-translate-y-0.5"
          >
            Upload a recording — it's free
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </FadeUp>
      </section>

    </div>
  )
}
