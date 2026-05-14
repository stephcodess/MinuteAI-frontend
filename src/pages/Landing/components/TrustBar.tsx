import { motion } from 'framer-motion'
import { Shield, Lock, Star } from 'lucide-react'

const badges = [
  { label: 'GDPR Compliant', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { label: 'SOC 2 Ready', icon: Lock, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  { label: 'End-to-End Encrypted', icon: Lock, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
]

const ratings = [
  { platform: 'G2', score: '4.8', stars: 5 },
  { platform: 'Trustpilot', score: '4.9', stars: 5 },
  { platform: 'Capterra', score: '4.7', stars: 5 },
]

export default function TrustBar() {
  return (
    <section className="relative border-y border-white/5 bg-[#080b14] py-8">
      {/* Subtle gradient top edge */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">

          {/* Left: Compliance badges */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {badges.map(({ label, icon: Icon, color, bg, border }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-2 rounded-full border ${border} ${bg} px-4 py-2 text-xs font-semibold ${color} backdrop-blur-sm`}
              >
                <Icon size={12} />
                {label}
              </span>
            ))}
          </motion.div>

          {/* Divider */}
          <div className="hidden h-10 w-px bg-white/8 md:block" />

          {/* Right: Rating platforms */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex items-center gap-6"
          >
            {ratings.map(({ platform, score, stars }) => (
              <div key={platform} className="flex flex-col items-center gap-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-sm font-black text-white">{score}</span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-slate-600">{platform}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </section>
  )
}
