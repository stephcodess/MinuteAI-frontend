import { useRef, useEffect, useState } from 'react'
import { motion, useInView, animate } from 'framer-motion'

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    const ctrl = animate(0, to, {
      duration: 1.8,
      ease: 'easeOut',
      onUpdate: (v) => setVal(Math.round(v * 10) / 10),
    })
    return ctrl.stop
  }, [inView, to])

  return (
    <span ref={ref}>
      {to < 10 ? val.toFixed(1) : val.toLocaleString()}
      {suffix}
    </span>
  )
}

const stats = [
  { value: 12000, suffix: '+', label: 'Meetings processed', decimals: false },
  { value: 40, suffix: '%', label: 'Time saved per week', decimals: false },
  { value: 4.9, suffix: '/5', label: 'Average user rating', decimals: true },
]

export default function StatsStrip() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  return (
    <section className="relative border-y border-white/8 bg-[#0a0d18]">
      {/* Subtle glow line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto grid max-w-5xl grid-cols-1 gap-0 divide-y divide-white/8 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6"
      >
        {stats.map(({ value, suffix, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className="flex flex-col items-center py-10 text-center"
          >
            <p className="mb-1 text-4xl font-black tabular-nums text-white sm:text-5xl">
              <Counter to={value} suffix={suffix} />
            </p>
            <p className="text-sm font-medium text-slate-500">{label}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
    </section>
  )
}
