import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, CheckCircle } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'

const perks = [
  '3 free meetings per month',
  'No credit card required',
  'Cancel anytime',
  'Secure & private',
]

export default function CallToAction() {
  const { isSignedIn } = useAuth()
  const primaryCta = isSignedIn ? '/upload' : '/signup'

  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="relative overflow-hidden bg-[#080b14] py-20 sm:py-28">
      {/* Glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-fuchsia-600/15 blur-2xl" />
      </div>

      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-3xl px-4 text-center sm:px-6"
      >
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
          <Clock size={13} />
          Under 2 minutes from upload to document
        </div>

        {/* Headline */}
        <h2 className="mb-5 text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
          Stop taking notes
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">
            manually.
          </span>
        </h2>

        <p className="mb-10 text-base text-slate-400 sm:text-lg">
          Upload your first recording and see the difference in minutes. Free to start.
        </p>

        {/* CTA button */}
        <Link
          to={primaryCta}
          id="cta-bottom-primary"
          className="group mb-10 inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-4 text-base font-bold text-white shadow-[0_0_40px_rgba(124,58,237,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(124,58,237,0.55)]"
        >
          {isSignedIn ? 'Upload a recording' : 'Create your free account'}
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>

        {/* Perks row */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {perks.map((perk) => (
            <span key={perk} className="flex items-center gap-1.5 text-sm text-slate-500">
              <CheckCircle size={13} className="text-emerald-500" />
              {perk}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
