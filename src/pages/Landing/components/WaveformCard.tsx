import { motion } from 'framer-motion'
import { Mic, Download } from 'lucide-react'

/* Animated waveform bars */
function Waveform() {
  const bars = [4, 7, 5, 9, 6, 11, 8, 13, 10, 8, 12, 7, 5, 9, 6, 11, 8, 5, 7, 4]
  return (
    <div className="flex h-10 items-end gap-[3px]">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            height: `${h * 3}px`,
            background: `hsl(${260 + i * 2}, 70%, 75%)`,
          }}
          animate={{ scaleY: [1, 0.4, 1.2, 0.6, 1] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.06,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/* Pulsing status dot */
function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
        animate={{ scale: [1, 2, 1], opacity: [0.75, 0, 0.75] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
      />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  )
}

export default function WaveformCard() {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 40px 80px -20px rgba(124,58,237,0.3)' }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] text-left shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur-xl"
    >
      {/* Card header */}
      <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 ring-1 ring-violet-400/20">
          <Mic size={16} className="text-violet-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">Q2_Planning_Meeting.m4a</p>
          <p className="text-xs text-slate-500">42 min · 48 MB</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
          <LiveDot />
          Live
        </span>
      </div>

      {/* Waveform area */}
      <div className="px-5 pt-5 pb-4">
        <div className="mb-5 flex items-center justify-center rounded-2xl bg-black/20 px-4 py-5 ring-1 ring-white/5">
          <Waveform />
        </div>

        {/* Progress */}
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 font-medium text-violet-200">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-violet-300"
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            Transcribing
          </span>
          <span className="font-bold text-white">78%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '78%' }}
            transition={{ duration: 1.4, delay: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-300 shadow-[0_0_12px_rgba(167,139,250,0.5)]"
          />
        </div>
      </div>

      {/* Footer steps */}
      <div className="flex items-center gap-2 border-t border-white/8 bg-black/10 px-5 py-3">
        {['Uploaded', 'Transcribing', 'Formatting', 'Ready'].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                i < 2 ? 'bg-violet-500 text-white' : 'bg-white/10 text-slate-500'
              }`}
            >
              {i < 1 ? '✓' : i + 1}
            </div>
            <span className={`hidden text-[11px] font-medium sm:inline ${i < 2 ? 'text-violet-200' : 'text-slate-600'}`}>
              {step}
            </span>
            {i < 3 && <div className={`h-px w-3 ${i < 1 ? 'bg-violet-400' : 'bg-white/10'}`} />}
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-600">
          <Download size={11} />
          <span>Ready soon</span>
        </div>
      </div>
    </motion.div>
  )
}
