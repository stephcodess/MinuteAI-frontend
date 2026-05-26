import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, PlayCircle, X } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const STEPS = [
  { path: '/dashboard', selector: '[data-tour="new-meeting"]', title: 'Create your first meeting', body: 'Upload audio or video and let MinuteAI generate minutes, transcript, recording playback, and action items.' },
  { path: '/dashboard', selector: '[data-tour="stats"]', title: 'Understand your workspace', body: 'These cards summarize meetings processed, monthly activity, hours saved, and action items extracted.' },
  { path: '/dashboard', selector: '[data-tour="meetings"]', title: 'Review meeting results', body: 'Completed meetings appear here. Open one to see the Fireflies-style results page with transcript, minutes, tasks, and audio.' },
  { path: '/upload', selector: '[data-tour="nav-upload"]', title: 'Upload recordings', body: 'Use New meeting when you already have an audio or video file to process.' },
  { path: '/recordings', selector: '[data-tour="nav-recordings"]', title: 'Find recordings', body: 'Recordings keeps your processed and captured meeting audio in one place.' },
  { path: '/meeting-bots', selector: '[data-tour="nav-meeting-bots"]', title: 'Schedule meeting bots', body: 'Meeting Bots can join calls for you, record them, and turn them into useful meeting records.' },
  { path: '/tasks', selector: '[data-tour="nav-tasks"]', title: 'Track action items', body: 'Tasks collects follow-ups extracted from meetings so your team can assign and complete them.' },
  { path: '/team', selector: '[data-tour="nav-team"]', title: 'Invite your team', body: 'Team lets workspace members collaborate on meetings, tasks, and shared results.' },
  { path: '/integrations', selector: '[data-tour="nav-integrations"]', title: 'Connect your tools', body: 'Integrations help route meeting outputs into the tools your team already uses.' },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export default function ProductTour() {
  const { isSignedIn, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const storageKey = `minuteai_product_tour_done_${user?.id || 'anon'}`
  const [introVideoUrl, setIntroVideoUrl] = useState('')
  const [showIntro, setShowIntro] = useState(false)
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    api.get('/app-config').then((data) => setIntroVideoUrl(data?.intro_video_url || '')).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isSignedIn || !user?.onboarding_completed) return
    if (localStorage.getItem(storageKey)) return
    const id = window.setTimeout(() => setShowIntro(true), 900)
    return () => window.clearTimeout(id)
  }, [isSignedIn, user?.onboarding_completed, storageKey])

  useEffect(() => {
    const handler = () => {
      setShowIntro(false)
      setStepIndex(0)
      setActive(true)
      navigate(STEPS[0].path)
    }
    window.addEventListener('minuteai:start-dashboard-tour', handler)
    return () => window.removeEventListener('minuteai:start-dashboard-tour', handler)
  }, [navigate])

  useEffect(() => {
    if (!active) return
    const step = STEPS[stepIndex]
    if (location.pathname !== step.path) {
      navigate(step.path)
      return
    }

    let attempts = 0
    const timer = window.setInterval(() => {
      const el = document.querySelector(step.selector)
      setRect(el?.getBoundingClientRect() ?? null)
      attempts += 1
      if (el || attempts > 20) window.clearInterval(timer)
    }, 80)

    function updateRect() {
      const el = document.querySelector(step.selector)
      setRect(el?.getBoundingClientRect() ?? null)
    }
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [active, stepIndex, location.pathname, navigate])

  function startTour() {
    setShowIntro(false)
    setStepIndex(0)
    setActive(true)
    navigate(STEPS[0].path)
  }

  function finishTour() {
    localStorage.setItem(storageKey, 'true')
    setShowIntro(false)
    setActive(false)
  }

  function skipIntro() {
    localStorage.setItem(storageKey, 'true')
    setShowIntro(false)
  }

  function nextStep() {
    if (stepIndex >= STEPS.length - 1) finishTour()
    else setStepIndex(i => i + 1)
  }

  if (!isSignedIn) return null

  const step = STEPS[stepIndex]
  const left = rect ? clamp(rect.left, 16, window.innerWidth - 360) : 24
  const below = rect ? rect.bottom + 12 : 120
  const top = clamp(below, 16, window.innerHeight - 240)

  return (
    <AnimatePresence>
      {showIntro && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={skipIntro} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl border shadow-2xl"
            style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--card-border)' }}
          >
            <button onClick={skipIntro} className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-lg bg-black/35 text-white transition hover:bg-black/55">
              <X size={16} />
            </button>
            <div className="aspect-video bg-black">
              {introVideoUrl ? (
                <video src={introVideoUrl} controls autoPlay className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-violet-950 via-slate-950 to-indigo-950 px-8 text-center text-white">
                  <PlayCircle size={72} className="mb-5 text-violet-300" />
                  <p className="text-3xl font-black">Welcome to MinuteAI</p>
                  <p className="mt-3 max-w-xl text-sm text-white/65">An admin can add the intro video URL from App Settings.</p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4 px-7 py-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Start with the quick tour</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>We’ll walk through the main screens you need to use MinuteAI well.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={skipIntro} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Skip</button>
                <button onClick={startTour} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                  Start tour <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-[120] pointer-events-none">
          <div className="absolute inset-0 bg-black/55" />
          {rect && (
            <motion.div
              layout
              className="absolute rounded-2xl border-2 border-violet-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
              style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
            />
          )}
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-auto absolute w-[min(360px,calc(100vw-32px))] rounded-2xl border p-4 shadow-2xl backdrop-blur-none"
            style={{ left, top, background: 'var(--sidebar-bg)', borderColor: 'var(--card-border)' }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-violet-400">{stepIndex + 1} of {STEPS.length}</span>
              <button onClick={finishTour} className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-white/[0.06]" style={{ color: 'var(--text-3)' }}>
                <X size={13} />
              </button>
            </div>
            <p className="text-base font-bold" style={{ color: 'var(--text-1)' }}>{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-3)' }}>{step.body}</p>
            <div className="mt-4 flex items-center justify-between">
              <button onClick={finishTour} className="text-sm font-semibold" style={{ color: 'var(--text-3)' }}>Skip</button>
              <button onClick={nextStep} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                {stepIndex >= STEPS.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={13} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
