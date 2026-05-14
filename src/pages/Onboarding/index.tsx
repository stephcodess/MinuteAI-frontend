import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, ArrowLeft, ArrowRight, Check, ChevronDown } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Prefs {
  meetingJoin: string
  recapTo: string
  role: string
  title: string
  tools: string[]
  inviteEmails: string
  source: string
  language: string
}

const TOTAL_STEPS = 8

// ── Role/title data ───────────────────────────────────────────────────────────

const ROLES = [
  'Sales',
  'Product / Design',
  'Engineering',
  'Marketing',
  'Recruiting / HR',
  'Customer Success / Support',
  'Finance',
  'Executive',
  'Healthcare',
  'Student',
  'Freelancer',
  'Other',
]

const TITLES_BY_ROLE: Record<string, string[]> = {
  Sales: ['Account Executive', 'Sales Manager', 'VP of Sales', 'Sales Development Rep', 'Other'],
  'Product / Design': ['Product Manager', 'UX Designer', 'Product Designer', 'Director of Product', 'Other'],
  Engineering: ['Software Engineer / Developer', 'Engineering Manager', 'Technical Lead', 'Head of Engineering / CTO', 'Other'],
  Marketing: ['Marketing Manager', 'Content Marketer', 'CMO', 'Growth Marketer', 'Other'],
  'Recruiting / HR': ['Recruiter', 'HR Manager', 'Head of People', 'Talent Acquisition', 'Other'],
  'Customer Success / Support': ['Customer Success Manager', 'Support Agent', 'Head of CS', 'Other'],
  Finance: ['Analyst', 'Finance Manager', 'CFO', 'Accountant', 'Other'],
  Executive: ['CEO', 'COO', 'CTO', 'President', 'Other'],
  Healthcare: ['Physician', 'Nurse', 'Administrator', 'Therapist', 'Other'],
  Student: ['Undergraduate', 'Graduate / PhD', 'MBA', 'Other'],
  Freelancer: ['Consultant', 'Contractor', 'Coach', 'Other'],
  Other: ['Individual Contributor', 'Manager', 'Director', 'VP', 'Other'],
}

const TOOLS = [
  'Jira Projects',
  'Linear App',
  'Confluence',
  'Notion',
  'Slack',
  'Asana',
  'Zapier',
  'Google Drive',
  'Other',
]

const SOURCES = [
  'Social Media',
  'AI Search',
  'Blog / Article',
  'Google Search',
  'Billboard',
  'Podcast',
  'Newsletter',
  'In a meeting',
  'Coworker / Friend',
  'Other',
]

const LANGUAGES = [
  'English (Global)',
  'English (US)',
  'English (UK)',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Italian',
  'Dutch',
  'Japanese',
  'Korean',
  'Chinese (Simplified)',
  'Chinese (Traditional)',
  'Arabic',
  'Hindi',
  'Russian',
  'Turkish',
  'Polish',
  'Swedish',
  'Norwegian',
]

// ── Background ────────────────────────────────────────────────────────────────

function Orb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />
}

function GridBg() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="ob-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M 56 0 L 0 0 0 56" fill="none" stroke="white" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ob-grid)" />
    </svg>
  )
}

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === step ? 24 : 8,
            backgroundColor: i < step ? '#7c3aed' : i === step ? '#a78bfa' : 'rgba(255,255,255,0.15)',
          }}
          transition={{ duration: 0.25 }}
          className="h-2 rounded-full"
        />
      ))}
    </div>
  )
}

// ── SelectDropdown ────────────────────────────────────────────────────────────

function SelectDropdown({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-white/10 bg-white/[0.06] text-white text-sm font-medium hover:border-white/20 transition-all"
      >
        <span className={selected ? 'text-white' : 'text-slate-500'}>{selected?.label ?? 'Select…'}</span>
        <ChevronDown size={15} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-20 mt-1.5 w-full rounded-2xl border border-white/10 bg-[#111827] shadow-xl overflow-hidden max-h-60 overflow-y-auto"
          >
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${
                  value === o.value ? 'bg-violet-600/20 text-violet-300' : 'text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                {o.label}
                {value === o.value && <Check size={13} className="text-violet-400" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Pill button ───────────────────────────────────────────────────────────────

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
        selected
          ? 'border-violet-500 bg-violet-500/20 text-violet-300'
          : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-slate-300'
      }`}
    >
      {label}
    </motion.button>
  )
}

// ── Continue button ───────────────────────────────────────────────────────────

function ContinueBtn({ onClick, loading = false, label = 'Continue' }: { onClick: () => void; loading?: boolean; label?: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading}
      whileHover={{ scale: 1.01, boxShadow: '0 10px 28px rgba(124,58,237,0.45)' }}
      whileTap={{ scale: 0.99 }}
      className="group relative w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 text-white font-bold text-sm shadow-[0_4px_24px_rgba(124,58,237,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 overflow-hidden"
    >
      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
      <span className="relative flex items-center gap-2">
        {loading
          ? <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
          : <>{label} <ArrowRight size={15} /></>
        }
      </span>
    </motion.button>
  )
}

// ── Step components ───────────────────────────────────────────────────────────

function StepMeetingJoin({ prefs, setPrefs }: { prefs: Prefs; setPrefs: any }) {
  const options = [
    { value: 'all', label: 'All meetings with a web-conf link' },
    { value: 'own', label: 'Only meetings that I own' },
    { value: 'teammates', label: 'Only meetings with teammates' },
    { value: 'invite', label: 'Only when I invite bot@minuteai.io' },
  ]
  return (
    <div>
      <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest mb-4">Meeting settings</p>
      <h2 className="text-2xl font-bold text-white mb-2">Let's set up your preferences</h2>
      <p className="text-slate-500 text-sm mb-6">Control which meetings MinuteAI will join and transcribe for you.</p>
      <label className="block text-slate-300 text-sm font-medium mb-2">Meetings MinuteAI will join:</label>
      <SelectDropdown
        options={options}
        value={prefs.meetingJoin}
        onChange={v => setPrefs(p => ({ ...p, meetingJoin: v }))}
      />
    </div>
  )
}

function StepRecapTo({ prefs, setPrefs }: { prefs: Prefs; setPrefs: any }) {
  const options = [
    { value: 'everyone', label: 'Everyone on the invite' },
    { value: 'team', label: 'Only me and participants from my team' },
    { value: 'me', label: 'Only me' },
  ]
  return (
    <div>
      <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest mb-4">Meeting settings</p>
      <h2 className="text-2xl font-bold text-white mb-2">Let's set up your preferences</h2>
      <p className="text-slate-500 text-sm mb-6">Decide who receives the meeting minutes after each session.</p>
      <label className="block text-slate-300 text-sm font-medium mb-2">Send meeting minutes to:</label>
      <SelectDropdown
        options={options}
        value={prefs.recapTo}
        onChange={v => setPrefs(p => ({ ...p, recapTo: v }))}
      />
    </div>
  )
}

function StepRole({ prefs, setPrefs }: { prefs: Prefs; setPrefs: any }) {
  const options = ROLES.map(r => ({ value: r, label: r }))
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Let's customize your experience</h2>
      <p className="text-slate-500 text-sm mb-6">MinuteAI tailors your meeting minutes to your role.</p>
      <label className="block text-slate-300 text-sm font-medium mb-2">What's your role?</label>
      <SelectDropdown
        options={options}
        value={prefs.role}
        onChange={v => setPrefs(p => ({ ...p, role: v, title: '' }))}
      />
    </div>
  )
}

function StepTitle({ prefs, setPrefs }: { prefs: Prefs; setPrefs: any }) {
  const titles = TITLES_BY_ROLE[prefs.role] ?? TITLES_BY_ROLE['Other']
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Let's customize your experience</h2>
      <p className="text-slate-500 text-sm mb-2">What's your role?</p>
      <div className="px-4 py-3 mb-5 rounded-2xl border border-white/10 bg-white/[0.06] text-white text-sm font-medium">
        {prefs.role || '—'}
      </div>
      <p className="text-slate-300 text-sm font-medium mb-3">What's your title?</p>
      <div className="flex flex-wrap gap-2">
        {titles.map(t => (
          <Pill key={t} label={t} selected={prefs.title === t} onClick={() => setPrefs(p => ({ ...p, title: t }))} />
        ))}
      </div>
    </div>
  )
}

function StepTools({ prefs, setPrefs }: { prefs: Prefs; setPrefs: any }) {
  const [custom, setCustom] = useState('')

  function toggle(tool: string) {
    setPrefs(p => ({
      ...p,
      tools: p.tools.includes(tool) ? p.tools.filter(t => t !== tool) : [...p.tools, tool],
    }))
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Let's customize your experience</h2>
      <p className="text-slate-500 text-sm mb-5">Which tools do you use? MinuteAI can sync your minutes automatically.</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {TOOLS.map(t => (
          <Pill key={t} label={t} selected={prefs.tools.includes(t)} onClick={() => toggle(t)} />
        ))}
      </div>
      <input
        type="text"
        placeholder="E.g. Salesforce"
        value={custom}
        onChange={e => setCustom(e.target.value)}
        onBlur={() => {
          const v = custom.trim()
          if (v && !prefs.tools.includes(v)) setPrefs(p => ({ ...p, tools: [...p.tools, v] }))
          setCustom('')
        }}
        className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.06] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-400/50"
      />
    </div>
  )
}

function StepInvite({ prefs, setPrefs }: { prefs: Prefs; setPrefs: any }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Invite coworkers to your workspace</h2>
      <p className="text-slate-500 text-sm mb-6">Collaborate with your team and easily share meetings and minutes.</p>
      <textarea
        placeholder="Emails, separated with comma, tab or enter"
        value={prefs.inviteEmails}
        onChange={e => setPrefs(p => ({ ...p, inviteEmails: e.target.value }))}
        rows={3}
        className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.06] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-400/50 resize-none"
      />
    </div>
  )
}

function StepSource({ prefs, setPrefs }: { prefs: Prefs; setPrefs: any }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-5">How did you hear about MinuteAI?</h2>
      <div className="flex flex-wrap gap-2">
        {SOURCES.map(s => (
          <Pill key={s} label={s} selected={prefs.source === s} onClick={() => setPrefs(p => ({ ...p, source: s }))} />
        ))}
      </div>
    </div>
  )
}

function StepLanguage({ prefs, setPrefs }: { prefs: Prefs; setPrefs: any }) {
  const options = LANGUAGES.map(l => ({ value: l, label: l }))
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Choose your meeting language</h2>
      <p className="text-slate-500 text-sm mb-6">Transcribe meetings in your language. MinuteAI supports 100+ languages.</p>
      <label className="block text-slate-300 text-sm font-medium mb-2">Language</label>
      <SelectDropdown
        options={options}
        value={prefs.language}
        onChange={v => setPrefs(p => ({ ...p, language: v }))}
      />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const slide = {
  initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  animate: { opacity: 1, x: 0 },
  exit:    (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  transition: { duration: 0.22 },
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const [step, setStep]   = useState(0)
  const [dir, setDir]     = useState(1)
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>({
    meetingJoin: 'own',
    recapTo: 'everyone',
    role: '',
    title: '',
    tools: [],
    inviteEmails: '',
    source: '',
    language: 'English (Global)',
  })

  function canContinue() {
    switch (step) {
      case 0: return !!prefs.meetingJoin
      case 1: return !!prefs.recapTo
      case 2: return !!prefs.role
      case 3: return !!prefs.title
      case 4: return true  // tools optional
      case 5: return true  // invites optional
      case 6: return !!prefs.source
      case 7: return !!prefs.language
      default: return true
    }
  }

  function goBack() {
    if (step === 0) return
    setDir(-1)
    setStep(s => s - 1)
  }

  async function goNext() {
    if (step < TOTAL_STEPS - 1) {
      setDir(1)
      setStep(s => s + 1)
      return
    }
    // Last step — save and go to dashboard
    setSaving(true)
    try {
      await api.post('/users/me/onboarding', prefs)
      updateUser({ onboarding_completed: true })
    } catch { /* best-effort — AppRoutes guard will retry if needed */ }
    navigate('/dashboard')
  }

  async function skip() {
    try {
      await api.post('/users/me/onboarding', prefs)
      updateUser({ onboarding_completed: true })
    } catch { /* best-effort */ }
    navigate('/dashboard')
  }

  const steps = [
    <StepMeetingJoin prefs={prefs} setPrefs={setPrefs} />,
    <StepRecapTo     prefs={prefs} setPrefs={setPrefs} />,
    <StepRole        prefs={prefs} setPrefs={setPrefs} />,
    <StepTitle       prefs={prefs} setPrefs={setPrefs} />,
    <StepTools       prefs={prefs} setPrefs={setPrefs} />,
    <StepInvite      prefs={prefs} setPrefs={setPrefs} />,
    <StepSource      prefs={prefs} setPrefs={setPrefs} />,
    <StepLanguage    prefs={prefs} setPrefs={setPrefs} />,
  ]

  const isLast = step === TOTAL_STEPS - 1

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#080b14] px-4 py-12">
      <GridBg />
      <Orb className="top-[-10%] right-[-5%] w-[600px] h-[600px] bg-violet-700/14" />
      <Orb className="bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-700/12" />
      <Orb className="top-[40%] left-[50%] w-[350px] h-[350px] bg-fuchsia-700/8" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5 text-white font-bold text-xl">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
              <Mic size={16} className="text-violet-300" />
            </div>
            MinuteAI
          </div>
          <button
            type="button"
            onClick={skip}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Skip setup
          </button>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
          {/* Back button */}
          <div className="flex items-center gap-3 mb-1">
            {step > 0 && (
              <motion.button
                type="button"
                onClick={goBack}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all"
              >
                <ArrowLeft size={14} />
              </motion.button>
            )}
          </div>

          {/* Progress dots */}
          <ProgressDots step={step} />

          {/* Step content */}
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slide}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={slide.transition}
            >
              {steps[step]}
            </motion.div>
          </AnimatePresence>

          {/* CTA */}
          <div className="mt-8">
            <ContinueBtn
              onClick={goNext}
              loading={saving}
              label={
                isLast
                  ? 'Go to dashboard'
                  : step === 5
                  ? prefs.inviteEmails.trim() ? 'Invite & continue' : 'Not now'
                  : 'Continue'
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
