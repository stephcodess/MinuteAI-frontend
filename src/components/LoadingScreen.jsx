import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white">
      <motion.div
        animate={{ scale: [1, 1.18, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="flex flex-col items-center gap-5"
      >
        {/* logo mark */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-300/40">
          <Mic size={30} className="text-white" />
        </div>

        {/* wordmark */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-xl font-bold text-gray-900 tracking-tight"
        >
          MinuteAI
        </motion.span>
      </motion.div>

      {/* subtle pulsing dots */}
      <div className="absolute bottom-16 flex gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-violet-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  )
}
