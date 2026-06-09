import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, ArrowRight, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

function Orb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />
}

function GridBg() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="ve-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M 56 0 L 0 0 0 56" fill="none" stroke="white" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ve-grid)" />
    </svg>
  )
}

function OTPInput({ value, onChange, onComplete, disabled }: any) {
  const inputs = useRef<HTMLInputElement[]>([])

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (value[i]) {
        const next = value.split(''); next[i] = ''; onChange(next.join(''))
      } else if (i > 0) {
        inputs.current[i - 1]?.focus()
        const next = value.split(''); next[i - 1] = ''; onChange(next.join(''))
      }
    } else if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus()
    else if (e.key === 'ArrowRight' && i < 5) inputs.current[i + 1]?.focus()
  }

  function handleInput(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const next = value.padEnd(6, '').split('')
    next[i] = char
    const joined = next.join('').slice(0, 6)
    onChange(joined)
    if (char && i < 5) inputs.current[i + 1]?.focus()
    if (joined.replace(/\s/g, '').length === 6) onComplete?.(joined)
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted.padEnd(6, '').slice(0, 6))
    const focusIdx = Math.min(pasted.length, 5)
    inputs.current[focusIdx]?.focus()
    if (pasted.length === 6) onComplete?.(pasted)
  }

  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.input
          key={i}
          ref={el => { if (el) inputs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleInput(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 + i * 0.05 }}
          className={`w-12 h-14 text-center text-xl font-bold rounded-2xl border-2 transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            value[i]
              ? 'border-violet-500 bg-violet-500/20 text-violet-300 shadow-[0_0_0_3px_rgba(var(--brand-rgb),0.2)]'
              : 'border-white/10 bg-white/[0.06] text-white hover:border-white/20 focus:border-violet-400/70 focus:shadow-[0_0_0_3px_rgba(var(--brand-rgb),0.15)]'
          }`}
        />
      ))}
    </div>
  )
}

function SuccessState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.15, 1] }}
        transition={{ duration: 0.5, times: [0, 0.7, 1] }}
        className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-5"
      >
        <svg viewBox="0 0 80 80" width="80" height="80">
          <motion.circle cx="40" cy="40" r="36" fill="none" stroke="rgba(74,222,128,0.4)" strokeWidth="3"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.1 }} />
          <motion.path d="M 24 40 L 35 51 L 56 28" stroke="#4ade80" strokeWidth="4" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.3 }} />
        </svg>
      </motion.div>
      <motion.h3 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="text-xl font-bold text-white mb-1">Email verified!</motion.h3>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
        className="text-sm text-slate-400">Setting up your account…</motion.p>
    </motion.div>
  )
}

export default function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyEmail, resendOTP } = useAuth()

  const userId = location.state?.userId || ''
  const email  = location.state?.email  || ''

  const [code, setCode]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [shake, setShake]         = useState(false)
  const [success, setSuccess]     = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [resending, setResending] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  useEffect(() => {
    if (!userId) navigate('/signup')
  }, [userId, navigate])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function handleSubmit(submittedCode = code) {
    const c = submittedCode ?? code
    if (c.length < 6) {
      setError('Please enter all 6 digits.')
      setShake(true); setTimeout(() => setShake(false), 500)
      return
    }
    setLoading(true); setError(null)
    try {
      await verifyEmail(userId, c)
      setSuccess(true)
      setTimeout(() => navigate('/onboarding'), 1600)
    } catch (err: any) {
      setError(err.message)
      setShake(true); setTimeout(() => setShake(false), 500)
    } finally { setLoading(false) }
  }

  async function handleResend() {
    if (countdown > 0 || resending) return
    setResending(true); setError(null)
    try {
      await resendOTP(userId, 'verify_email')
      setCountdown(60)
      setResendDone(true)
      setTimeout(() => setResendDone(false), 3000)
      setCode('')
    } catch (err: any) {
      setError(err.message)
    } finally { setResending(false) }
  }

  const masked = email ? `${email[0]}***@${email.split('@')[1]}` : 'your email'

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-[#080b14]">
      {/* ── Background ── */}
      <GridBg />
      <Orb className="top-[-10%] left-[-5%] w-[600px] h-[600px] bg-violet-700/18" />
      <Orb className="bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-700/14" />
      <Orb className="top-[35%] left-[45%] w-[350px] h-[350px] bg-fuchsia-700/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(var(--brand-rgb),0.07)_0%,transparent_70%)] pointer-events-none" />

      {/* ── Left brand panel ──────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[44%] shrink-0 relative z-10 p-14 border-r border-white/[0.06]">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <Link to="/" className="flex items-center gap-2.5 text-white font-bold text-xl">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center backdrop-blur">
              <Mic size={18} className="text-violet-300" />
            </div>
            MinuteAI
          </Link>
        </motion.div>

        <div className="mt-auto mb-auto">
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-violet-400 text-xs font-semibold uppercase tracking-widest mb-5">
            One last step
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="text-4xl font-black text-white leading-tight mb-4 tracking-tight">
            Confirm your<br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-400 bg-clip-text text-transparent">
              email address
            </span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
            className="text-slate-400 text-base leading-relaxed max-w-sm mb-10">
            We sent a 6-digit code to verify your email. This keeps your account secure and ensures we can reach you when your minutes are ready.
          </motion.p>

          {/* Tip card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-violet-300 text-sm">✉</span>
              </div>
              <div>
                <p className="text-white font-semibold text-sm mb-0.5">Check your inbox</p>
                <p className="text-slate-500 text-xs leading-relaxed">The code expires in 15 minutes. Check spam if you don't see it.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">

        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <Link to="/" className="flex items-center gap-2.5 text-white font-bold text-xl">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
              <Mic size={18} className="text-violet-300" />
            </div>
            MinuteAI
          </Link>
        </div>

        <div className="w-full max-w-md">
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
            <AnimatePresence mode="wait">
              {success ? (
                <SuccessState key="success" />
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <h2 className="text-2xl font-bold text-white mb-1">Check your email</h2>
                    <p className="text-slate-500 text-sm mb-8">
                      We sent a 6-digit code to <span className="font-medium text-slate-300">{masked}</span>
                    </p>
                  </motion.div>

                  <motion.form
                    onSubmit={e => { e.preventDefault(); handleSubmit() }}
                    animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="space-y-5"
                  >
                    <OTPInput value={code} onChange={setCode} onComplete={handleSubmit} disabled={loading} />

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -6, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-center"
                        >
                          {error}
                        </motion.p>
                      )}
                      {resendDone && (
                        <motion.p
                          initial={{ opacity: 0, y: -6, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5 text-center"
                        >
                          A new code has been sent to your email.
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="submit"
                      disabled={loading || code.length < 6}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      whileHover={!loading && code.length === 6 ? { scale: 1.01, boxShadow: '0 8px 24px rgba(var(--brand-rgb),0.45)' } : {}}
                      whileTap={!loading && code.length === 6 ? { scale: 0.99 } : {}}
                      className="group relative w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 text-white font-bold text-sm shadow-[0_4px_24px_rgba(var(--brand-rgb),0.4)] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden flex items-center justify-center gap-2"
                    >
                      {!loading && (
                        <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                      )}
                      <span className="relative flex items-center gap-2">
                        {loading
                          ? <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                          : <>Verify email <ArrowRight size={15} /></>
                        }
                      </span>
                    </motion.button>
                  </motion.form>

                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                    className="mt-6 text-center">
                    <button
                      onClick={handleResend}
                      disabled={countdown > 0 || resending}
                      className="text-sm text-slate-500 disabled:cursor-not-allowed flex items-center gap-1.5 mx-auto"
                    >
                      <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                      {countdown > 0
                        ? <span>Resend code in <span className="font-semibold text-violet-400">{countdown}s</span></span>
                        : <span className="text-violet-400 hover:text-violet-300 font-semibold">Resend code</span>
                      }
                    </button>
                  </motion.div>

                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                    className="text-center text-xs text-slate-600 mt-4">
                    Wrong email?{' '}
                    <Link to="/signup" className="text-violet-400 hover:text-violet-300 font-medium">Go back</Link>
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
