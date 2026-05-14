import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Mic, Zap, ChevronDown, Sparkles } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import WaveformCard from './WaveformCard'

/* Floating particle orb */
function Orb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />
}

/* Animated noise/grid SVG background */
function GridBg() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M 56 0 L 0 0 0 56" fill="none" stroke="white" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  )
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.11, delayChildren: 0.1 },
  },
}
const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
}

export default function Hero() {
  const { isSignedIn } = useAuth()
  const primaryCta = isSignedIn ? '/upload' : '/signup'

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#080b14]">
      {/* ── Background ── */}
      <GridBg />
      <Orb className="top-[-15%] left-[-5%] w-[700px] h-[700px] bg-violet-700/18" />
      <Orb className="bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-700/14" />
      <Orb className="top-[35%] left-[55%] w-[450px] h-[450px] bg-fuchsia-700/10" />

      {/* Centered radial spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(124,58,237,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#080b14_95%)] pointer-events-none" />

      {/* ── Content ── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto max-w-4xl px-5 sm:px-8 pt-32 pb-20 text-center"
      >

        {/* ── Badge pill ── */}
        <motion.div variants={item} className="mb-7 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/8 px-4 py-1.5 text-xs font-semibold tracking-wide text-violet-300 backdrop-blur-md ring-1 ring-inset ring-violet-400/10 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
            <motion.span
              animate={{ rotate: [0, 18, -18, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 5 }}
            >
              <Zap size={11} className="text-violet-400" fill="currentColor" />
            </motion.span>
            Powered by OpenAI Whisper &amp; Claude AI
          </span>
        </motion.div>

        {/* ── Main headline ── */}
        <motion.h1
          variants={item}
          className="mb-5 text-[2.75rem] font-black leading-[1.06] tracking-[-0.02em] text-white sm:text-6xl md:text-[4.5rem]"
        >
          Turn any meeting
          <br />
          <span className="relative inline-block mt-1">
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              into polished minutes
            </span>
            {/* Glow underline */}
            <motion.span
              className="absolute -bottom-1.5 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-fuchsia-400/50 to-transparent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1.4, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
        </motion.h1>

        {/* ── Sub-copy ── */}
        <motion.p
          variants={item}
          className="mx-auto mb-10 max-w-[34rem] text-[1.05rem] leading-relaxed text-slate-400 sm:text-lg"
        >
          Upload your audio or video. Whisper transcribes it. Claude formats it into a
          structured, shareable&nbsp;Word doc — in under 2 minutes, zero effort.
        </motion.p>

        {/* ── CTA buttons ── */}
        <motion.div
          variants={item}
          className="mb-5 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          {/* Primary */}
          <Link
            to={primaryCta}
            id="hero-cta-primary"
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-3.5 text-[0.95rem] font-bold text-white shadow-[0_4px_24px_rgba(124,58,237,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_36px_rgba(124,58,237,0.6)] active:translate-y-0"
          >
            {/* Shimmer */}
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            <Mic size={16} className="shrink-0" />
            {isSignedIn ? 'Upload a recording' : 'Get started — it\'s free'}
            <ArrowRight size={15} className="shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>

          {/* Secondary */}
          <Link
            to="/pricing"
            id="hero-cta-pricing"
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-7 py-3.5 text-sm font-semibold text-slate-300 backdrop-blur-sm transition-all duration-200 hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            <Sparkles size={14} className="text-violet-400" />
            See how it works
          </Link>
        </motion.div>

        {/* ── Trust micro-bar ── */}
        <motion.div variants={item} className="mb-16 flex items-center justify-center gap-2 text-[11px] font-medium text-slate-600">
          <span>No credit card required</span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span>3 free meetings / month</span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span>Secure &amp; private</span>
        </motion.div>

        {/* ── Waveform demo card ── */}
        <motion.div variants={item} className="relative">
          {/* Glow under the card */}
          <div className="absolute inset-x-16 -bottom-4 h-16 bg-violet-600/20 blur-2xl rounded-full pointer-events-none" />
          <WaveformCard />
        </motion.div>
      </motion.div>

      {/* ── Scroll indicator ── */}
      <motion.div
        className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
      >
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
          <ChevronDown size={20} />
        </motion.div>
      </motion.div>
    </section>
  )
}
