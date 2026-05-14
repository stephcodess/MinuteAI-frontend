import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Radio } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import RecordMeetingModal from '../RecordMeetingModal'

const DASHBOARD_PREFIXES = [
  '/dashboard',
  '/billing',
  '/settings',
  '/team',
  '/upload',
  '/subscription',
  '/tasks',
  '/meeting-bots',
]

export default function RecordMeetingFab() {
  const { pathname } = useLocation()
  const { isSignedIn } = useAuth()
  const [open, setOpen] = useState(false)

  const shouldShow = useMemo(() => (
    isSignedIn && DASHBOARD_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ), [isSignedIn, pathname])

  if (!shouldShow) return null

  return (
    <>
      <AnimatePresence>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[90] flex items-center gap-3 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,23,42,0.32)] transition hover:bg-slate-800"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/16 text-emerald-300 ring-1 ring-emerald-300/20">
            <Radio size={16} />
          </span>
          <span className="hidden sm:inline">Record a meeting</span>
          <Bot size={16} className="sm:hidden" />
        </motion.button>
      </AnimatePresence>

      <RecordMeetingModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
