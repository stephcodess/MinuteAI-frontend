import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function LoadingScreen() {
  const { isDark } = useTheme()

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center transition-colors duration-300"
      style={{ backgroundColor: isDark ? '#080b14' : '#f8f9fc' }}
    >
      {/* Dark mode: subtle radial glow */}
      {isDark && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_50%,rgba(124,58,237,0.1)_0%,transparent_70%)]" />
      )}

      <motion.div
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative flex flex-col items-center gap-5"
      >
        {/* Logo mark */}
        <div
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center"
          style={{
            boxShadow: isDark
              ? '0 0 40px rgba(139,92,246,0.45)'
              : '0 8px 32px rgba(139,92,246,0.35)',
          }}
        >
          <Mic size={30} className="text-white" />
        </div>

        {/* Wordmark */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-xl font-bold tracking-tight"
          style={{ color: isDark ? '#ffffff' : '#0f0f1a' }}
        >
          MinuteAI
        </motion.span>
      </motion.div>

      {/* Pulsing dots */}
      <div className="absolute bottom-16 flex gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: isDark ? '#8b5cf6' : '#7c3aed' }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  )
}
