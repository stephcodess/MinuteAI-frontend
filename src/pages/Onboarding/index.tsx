import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, Loader2, Mic, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'

interface Option {
  label: string
  value: string
}

const ROLES: Option[] = [
  { value: 'sales', label: 'Sales' },
  { value: 'product_design', label: 'Product / Design' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'recruiting_hr', label: 'Recruiting / HR' },
  { value: 'customer_success', label: 'Customer Success / Support' },
  { value: 'finance', label: 'Finance' },
  { value: 'executive', label: 'Executive' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'student', label: 'Student' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'other', label: 'Other' },
]

const LANGUAGES: Option[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ru', label: 'Russian' },
  { value: 'tr', label: 'Turkish' },
  { value: 'pl', label: 'Polish' },
  { value: 'sv', label: 'Swedish' },
  { value: 'yo', label: 'Yoruba' },
  { value: 'ig', label: 'Igbo' },
  { value: 'ha', label: 'Hausa' },
]

const JOIN_RULES: { value: string; label: string; desc: string }[] = [
  { value: 'all',       label: 'All meetings',             desc: 'Join and record every meeting on your calendar' },
  { value: 'own',       label: 'Meetings I organise',      desc: 'Only meetings where you are the host or organiser' },
  { value: 'teammates', label: 'Meetings with my team',    desc: 'Meetings that include at least one teammate' },
  { value: 'invite',    label: 'Manual only',              desc: 'I will invite the bot manually each time' },
]

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

function SelectDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Option[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div className="relative">
      <label className="block text-slate-300 text-sm font-medium mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-white/10 bg-white/[0.06] text-white text-sm font-medium hover:border-white/20 transition-all"
      >
        <span className={selected ? 'text-white' : 'text-slate-500'}>{selected?.label ?? 'Select...'}</span>
        <ChevronDown size={15} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
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
    </div>
  )
}

function parseEmails(value: string) {
  return Array.from(new Set(
    value
      .split(/[\s,;]+/)
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)
  ))
}

const TOTAL_STEPS = 3

export default function Onboarding() {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const { activeWorkspace, refetch } = useWorkspace()
  const [step, setStep] = useState(1)

  // Step 1 — profile
  const [role, setRole] = useState('')
  const [language, setLanguage] = useState('en')
  const [inviteEmails, setInviteEmails] = useState('')

  // Step 2 — bot join rule
  const [joinRule, setJoinRule] = useState('all')

  // Step 3 — recap preferences
  const [recapTo, setRecapTo] = useState('me')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canNext1 = !!role && !!language

  async function sendInvites(emails: string[]) {
    if (!emails.length) return
    if (!activeWorkspace?.id) throw new Error('Your workspace is still loading. Try again in a moment.')
    await Promise.allSettled(
      emails.map(email => api.post(`/workspaces/${activeWorkspace.id}/invite`, { email, role: 'member' }))
    )
    await refetch?.()
  }

  async function finish() {
    setSaving(true)
    setError(null)
    try {
      const selectedRole = ROLES.find(item => item.value === role)?.label || role
      await api.post('/users/me/onboarding', {
        role: selectedRole,
        language,
        inviteEmails,
        meetingJoin: joinRule,
        recapTo,
      })
      await api.patch('/users/me/preferences', { meeting_join: joinRule, recap_to: recapTo })
      await sendInvites(parseEmails(inviteEmails))
      updateUser({ onboarding_completed: true, role: selectedRole, language })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Could not finish setup. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function skip() {
    setSaving(true)
    setError(null)
    try {
      await api.post('/users/me/onboarding', { role: 'Other', language })
      updateUser({ onboarding_completed: true, role: 'Other', language })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Could not skip setup. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#080b14] px-4 py-12">
      <GridBg />
      <Orb className="top-[-10%] right-[-5%] w-[600px] h-[600px] bg-violet-700/14" />
      <Orb className="bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-700/12" />
      <Orb className="top-[40%] left-[50%] w-[350px] h-[350px] bg-fuchsia-700/8" />

      <div className="relative z-10 w-full max-w-md">
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
            disabled={saving}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors disabled:opacity-50"
          >
            Skip setup
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < step ? 'bg-violet-500' : 'bg-white/10'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
          >
            {/* ── Step 1: Profile ── */}
            {step === 1 && (
              <>
                <div className="mb-7">
                  <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest mb-4">Step 1 of {TOTAL_STEPS}</p>
                  <h1 className="text-2xl font-bold text-white mb-2">About you</h1>
                  <p className="text-slate-500 text-sm">
                    Help us tailor your meeting notes to your role and language.
                  </p>
                </div>

                <div className="space-y-5">
                  <SelectDropdown label="Role or use case" options={ROLES} value={role} onChange={setRole} />
                  <SelectDropdown label="Preferred meeting/document language" options={LANGUAGES} value={language} onChange={setLanguage} />
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Invite teammates</label>
                    <div className="relative">
                      <Users size={15} className="absolute left-4 top-4 text-slate-500" />
                      <textarea
                        placeholder="name@example.com, teammate@company.com"
                        value={inviteEmails}
                        onChange={e => setInviteEmails(e.target.value)}
                        rows={3}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-white/10 bg-white/[0.06] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-400/50 resize-none"
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-2">Optional. Separate emails with commas, spaces, or new lines.</p>
                  </div>
                </div>

                {error && (
                  <p className="mt-5 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
                )}

                <motion.button
                  type="button"
                  onClick={() => { if (!canNext1) { setError('Choose your role and preferred language to continue.'); return }; setError(null); setStep(2) }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="group relative mt-8 w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 text-white font-bold text-sm shadow-[0_4px_24px_rgba(var(--brand-rgb),0.4)] transition-all flex items-center justify-center gap-2 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                  <span className="relative flex items-center gap-2">Continue <ArrowRight size={15} /></span>
                </motion.button>
              </>
            )}

            {/* ── Step 2: Bot join rule ── */}
            {step === 2 && (
              <>
                <div className="mb-7">
                  <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest mb-4">Step 2 of {TOTAL_STEPS}</p>
                  <h1 className="text-2xl font-bold text-white mb-2">When should the bot join?</h1>
                  <p className="text-slate-500 text-sm">
                    Choose which meetings MinuteAI should automatically join and record.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {JOIN_RULES.map(rule => (
                    <button
                      key={rule.value}
                      type="button"
                      onClick={() => setJoinRule(rule.value)}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all ${
                        joinRule === rule.value
                          ? 'border-violet-400/60 bg-violet-500/12'
                          : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{rule.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{rule.desc}</p>
                        </div>
                        {joinRule === rule.value && (
                          <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                            <Check size={11} className="text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3.5 rounded-full border border-white/10 text-slate-400 text-sm font-semibold hover:border-white/20 transition-all"
                  >
                    Back
                  </button>
                  <motion.button
                    type="button"
                    onClick={() => setStep(3)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="group relative flex-[2] py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 text-white font-bold text-sm shadow-[0_4px_24px_rgba(var(--brand-rgb),0.4)] transition-all flex items-center justify-center gap-2 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                    <span className="relative flex items-center gap-2">Continue <ArrowRight size={15} /></span>
                  </motion.button>
                </div>
              </>
            )}

            {/* ── Step 3: Recap sharing ── */}
            {step === 3 && (
              <>
                <div className="mb-7">
                  <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest mb-4">Step 3 of {TOTAL_STEPS}</p>
                  <h1 className="text-2xl font-bold text-white mb-2">Who gets the recap?</h1>
                  <p className="text-slate-500 text-sm">
                    After each meeting, who should receive the notes and summary?
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { value: 'everyone', label: 'All attendees',  desc: 'Send notes to everyone in the meeting invite' },
                    { value: 'team',     label: 'My team only',   desc: 'Send only to teammates in your workspace' },
                    { value: 'me',       label: 'Just me',        desc: 'Keep notes private — only you can see them' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRecapTo(opt.value)}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all ${
                        recapTo === opt.value
                          ? 'border-violet-400/60 bg-violet-500/12'
                          : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{opt.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                        </div>
                        {recapTo === opt.value && (
                          <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                            <Check size={11} className="text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="mt-5 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
                )}

                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-3.5 rounded-full border border-white/10 text-slate-400 text-sm font-semibold hover:border-white/20 transition-all"
                  >
                    Back
                  </button>
                  <motion.button
                    type="button"
                    onClick={finish}
                    disabled={saving}
                    whileHover={!saving ? { scale: 1.01 } : {}}
                    whileTap={!saving ? { scale: 0.99 } : {}}
                    className="group relative flex-[2] py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 text-white font-bold text-sm shadow-[0_4px_24px_rgba(var(--brand-rgb),0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                    <span className="relative flex items-center gap-2">
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <>Finish setup <Check size={15} /></>}
                    </span>
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
