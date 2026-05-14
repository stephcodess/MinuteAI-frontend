import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Smartphone, Monitor, Globe, ArrowRight, Mic, Zap, Bell } from 'lucide-react'

const apps = [
  {
    id: 'ios-android',
    icon: Smartphone,
    title: 'Mobile App',
    subtitle: 'iOS & Android',
    desc: 'Review, share and search your meeting minutes on the go. Get instant push notifications when your minutes are ready.',
    color: 'text-violet-400',
    bg: 'from-violet-600/20 to-violet-800/10',
    border: 'border-violet-500/20',
    glow: 'shadow-[0_0_60px_rgba(139,92,246,0.15)]',
    badge: 'Coming soon',
    badgeColor: 'bg-violet-500/15 text-violet-300 border-violet-400/20',
    perks: ['Push notifications', 'Offline access', 'Voice recording'],
    perkIcon: [Bell, Mic, Zap],
  },
  {
    id: 'desktop',
    icon: Monitor,
    title: 'Desktop App',
    subtitle: 'Windows & macOS',
    desc: 'Capture system audio directly from any meeting platform. MinuteAI runs quietly in the background and delivers minutes automatically.',
    color: 'text-fuchsia-400',
    bg: 'from-fuchsia-600/20 to-fuchsia-800/10',
    border: 'border-fuchsia-500/20',
    glow: 'shadow-[0_0_60px_rgba(217,70,239,0.12)]',
    badge: 'Coming soon',
    badgeColor: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/20',
    perks: ['System audio capture', 'Auto-detect meetings', 'Background processing'],
    perkIcon: [Mic, Zap, Bell],
  },
  {
    id: 'extension',
    icon: Globe,
    title: 'Chrome Extension',
    subtitle: 'Google Chrome',
    desc: 'One-click recording directly from your browser. Works seamlessly with Google Meet, Zoom Web, and any browser-based meeting.',
    color: 'text-sky-400',
    bg: 'from-sky-600/20 to-sky-800/10',
    border: 'border-sky-500/20',
    glow: 'shadow-[0_0_60px_rgba(56,189,248,0.12)]',
    badge: 'Coming soon',
    badgeColor: 'bg-sky-500/15 text-sky-300 border-sky-400/20',
    perks: ['One-click capture', 'Meet & Zoom support', 'Auto-upload'],
    perkIcon: [Zap, Mic, ArrowRight],
  },
]

export default function AppDownload() {
  const headingRef = useRef(null)
  const headingInView = useInView(headingRef, { once: true })

  return (
    <section id="apps" className="relative overflow-hidden bg-[#0a0d18] py-20 sm:py-28">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(124,58,237,0.07)_0%,transparent_70%)]" />

      {/* Grid pattern */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.025] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="app-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#app-grid)" />
      </svg>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* Heading */}
        <motion.div
          ref={headingRef}
          initial={{ opacity: 0, y: 24 }}
          animate={headingInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
            Available everywhere
          </span>
          <h2 className="mb-4 text-3xl font-black text-white sm:text-4xl">
            MinuteAI on every{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              device you own
            </span>
          </h2>
          <p className="mx-auto max-w-xl text-slate-400">
            Whether you're in the office, on the road, or joining from your phone — MinuteAI is always with you.
          </p>
        </motion.div>

        {/* App cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {apps.map(({ id, icon: Icon, title, subtitle, desc, color, bg, border, glow, badge, badgeColor, perks, perkIcon }, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.22 }}
                className={`relative flex h-full flex-col rounded-3xl border ${border} bg-gradient-to-b ${bg} p-6 backdrop-blur-sm ${glow}`}
              >
                {/* Badge */}
                <span className={`mb-5 self-start rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${badgeColor}`}>
                  {badge}
                </span>

                {/* Icon */}
                <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/8`}>
                  <Icon size={26} className={color} />
                </div>

                {/* Text */}
                <h3 className="mb-0.5 text-lg font-black text-white">{title}</h3>
                <p className={`mb-3 text-xs font-semibold uppercase tracking-widest ${color}`}>{subtitle}</p>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-slate-400">{desc}</p>

                {/* Perks */}
                <ul className="space-y-2">
                  {perks.map((perk, j) => {
                    const PerkIcon = perkIcon[j]
                    return (
                      <li key={perk} className="flex items-center gap-2 text-xs text-slate-500">
                        <PerkIcon size={12} className={color} />
                        {perk}
                      </li>
                    )
                  })}
                </ul>

                {/* Notify CTA */}
                <button
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl border ${border} bg-white/[0.04] py-2.5 text-xs font-semibold text-slate-300 transition-all duration-200 hover:bg-white/8 hover:text-white`}
                >
                  Notify me on launch
                  <ArrowRight size={13} />
                </button>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
