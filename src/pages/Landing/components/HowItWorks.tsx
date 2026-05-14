import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Upload, Mic, Sparkles, Download } from 'lucide-react'

const steps = [
  {
    n: '01',
    icon: Upload,
    label: 'Upload',
    desc: 'Drop your audio or video file — MP3, MP4, WAV, M4A up to 2 hours.',
    gradient: 'from-violet-500 to-violet-700',
    glow: 'shadow-violet-500/30',
  },
  {
    n: '02',
    icon: Mic,
    label: 'Transcribe',
    desc: 'OpenAI Whisper converts your recording to a high-accuracy transcript.',
    gradient: 'from-indigo-500 to-indigo-700',
    glow: 'shadow-indigo-500/30',
  },
  {
    n: '03',
    icon: Sparkles,
    label: 'Format',
    desc: 'Claude AI structures the transcript into polished, professional meeting minutes.',
    gradient: 'from-purple-500 to-purple-700',
    glow: 'shadow-purple-500/30',
  },
  {
    n: '04',
    icon: Download,
    label: 'Download',
    desc: 'Receive a polished .docx and PDF — ready to share in seconds.',
    gradient: 'from-fuchsia-500 to-fuchsia-700',
    glow: 'shadow-fuchsia-500/30',
  },
]

function StepCard({ step, index }: { step: typeof steps[0]; index: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const Icon = step.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ duration: 0.25 }}
        className="relative rounded-3xl border border-white/8 bg-white/[0.04] p-6 backdrop-blur-sm"
      >
        {/* Step number — top right */}
        <span className="absolute top-5 right-5 text-xs font-bold tracking-widest text-white/15">
          {step.n}
        </span>

        {/* Icon */}
        <div
          className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} shadow-lg ${step.glow}`}
        >
          <Icon className="text-white" size={22} />
        </div>

        <p className="mb-2 text-base font-bold text-white">{step.label}</p>
        <p className="text-sm leading-relaxed text-slate-400">{step.desc}</p>

        {/* Connector arrow — not on last */}
        {index < steps.length - 1 && (
          <div className="absolute -right-3 top-10 z-10 hidden lg:block">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#0c101c] text-white/30">
              →
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function HowItWorks() {
  const headingRef = useRef(null)
  const headingInView = useInView(headingRef, { once: true })

  return (
    <section id="how-it-works" className="scroll-mt-24 bg-[#0a0d18] py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Heading */}
        <motion.div
          ref={headingRef}
          initial={{ opacity: 0, y: 24 }}
          animate={headingInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
            How it works
          </span>
          <h2 className="mb-4 text-3xl font-black text-white sm:text-4xl">
            From recording to ready-to-send
          </h2>
          <p className="mx-auto max-w-xl text-slate-400">
            Four steps. No terminal. No API keys. No manual work.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((step, i) => (
            <StepCard key={step.label} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
