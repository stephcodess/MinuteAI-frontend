import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center transition-colors duration-300"
      style={{ backgroundColor: 'var(--loading-bg)' }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_50%,var(--primary-soft)_0%,transparent_70%)]" />

      <motion.div
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative flex flex-col items-center gap-5"
      >
        <div
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center"
          style={{ boxShadow: '0 0 40px var(--primary-glow)' }}
        >
          <Mic size={30} className="text-white" />
        </div>

        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-xl font-bold tracking-tight"
          style={{ color: 'var(--loading-text)' }}
        >
          MinuteAI
        </motion.span>
      </motion.div>

      <div className="absolute bottom-16 flex gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--loading-dot)' }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  )
}
