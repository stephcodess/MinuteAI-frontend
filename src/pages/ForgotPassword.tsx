import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, ArrowRight, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function FloatingInput({ label, type = 'text', value, onChange, right = null, autoComplete }) {
  const [focused, setFocused] = useState(false)
  const raised = focused || value.length > 0
  const id = `fi-${label}`
  return (
    <div className={`relative border-2 rounded-2xl transition-all duration-200 bg-white ${
      focused ? 'border-violet-400 shadow-[0_0_0_4px_rgba(139,92,246,0.08)]' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <input id={id} type={type} value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        autoComplete={autoComplete} placeholder=""
        className="w-full pt-6 pb-2.5 px-4 bg-transparent text-sm text-gray-900 focus:outline-none rounded-2xl" />
      <label htmlFor={id}
        className={`absolute left-4 pointer-events-none font-medium transition-all duration-200 ${
          raised ? 'top-2 text-[10px] text-violet-500' : 'top-1/2 -translate-y-1/2 text-sm text-gray-400'
        }`}>
        {label}
      </label>
      {right && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  )
}

function OTPInput({ value, onChange, onComplete, disabled }) {
  const inputs = useRef([])
  function handleKey(i, e) {
    if (e.key === 'Backspace') {
      if (value[i]) { const n = value.split(''); n[i] = ''; onChange(n.join('')) }
      else if (i > 0) { inputs.current[i - 1]?.focus(); const n = value.split(''); n[i - 1] = ''; onChange(n.join('')) }
    } else if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus()
    else if (e.key === 'ArrowRight' && i < 5) inputs.current[i + 1]?.focus()
  }
  function handleInput(i, e) {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const next = value.padEnd(6, '').split(''); next[i] = char
    const joined = next.join('').slice(0, 6)
    onChange(joined)
    if (char && i < 5) inputs.current[i + 1]?.focus()
    if (joined.replace(/\s/g, '').length === 6) onComplete?.(joined)
  }
  function handlePaste(e) {
    e.preventDefault()
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(p.padEnd(6, '').slice(0, 6))
    inputs.current[Math.min(p.length, 5)]?.focus()
    if (p.length === 6) onComplete?.(p)
  }
  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input key={i} ref={el => { inputs.current[i] = el }}
          type="text" inputMode="numeric" maxLength={1}
          value={value[i] || ''} onChange={e => handleInput(i, e)}
          onKeyDown={e => handleKey(i, e)} onPaste={handlePaste} disabled={disabled}
          className={`w-12 h-14 text-center text-xl font-bold rounded-2xl border-2 transition-all focus:outline-none disabled:opacity-50 ${
            value[i]
              ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-[0_0_0_4px_rgba(139,92,246,0.1)]'
              : 'border-gray-200 bg-white focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08)]'
          }`} />
      ))}
    </div>
  )
}

function SuccessState() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.15, 1] }}
        transition={{ duration: 0.5, times: [0, 0.7, 1] }}
        className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
        <svg viewBox="0 0 80 80" width="80" height="80">
          <motion.circle cx="40" cy="40" r="36" fill="none" stroke="#bbf7d0" strokeWidth="3"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.1 }} />
          <motion.path d="M 24 40 L 35 51 L 56 28" stroke="#16a34a" strokeWidth="4" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.3 }} />
        </svg>
      </motion.div>
      <motion.h3 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="text-xl font-bold text-gray-900 mb-1">Password updated!</motion.h3>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
        className="text-sm text-gray-400">Signing you in…</motion.p>
    </motion.div>
  )
}

const STEPS = ['email', 'code', 'password']

export default function ForgotPassword() {
  const navigate = useNavigate()
  const { forgotPassword, resetPassword } = useAuth()

  const [step, setStep] = useState('email')
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(0)

  function doShake(msg) {
    setError(msg); setShake(true); setTimeout(() => setShake(false), 500)
  }

  async function handleEmail(e) {
    e.preventDefault()
    if (!email) return doShake('Please enter your email address.')
    setLoading(true); setError(null)
    try {
      const data = await forgotPassword(email)
      if (data.user_id) setUserId(data.user_id)
      setCountdown(60)
      const t = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(t); return 0 } return c - 1 }), 1000)
      setStep('code')
    } catch (err) {
      doShake(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (countdown > 0) return
    setLoading(true); setError(null)
    try {
      const data = await forgotPassword(email)
      if (data.user_id) setUserId(data.user_id)
      setCode('')
      setCountdown(60)
      const t = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(t); return 0 } return c - 1 }), 1000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCode(submittedCode = code) {
    const c = submittedCode ?? code
    if (c.length < 6) return doShake('Please enter all 6 digits.')
    setStep('password')
    setError(null)
  }

  async function handlePassword(e) {
    e.preventDefault()
    if (newPassword.length < 8) return doShake('Password must be at least 8 characters.')
    if (newPassword !== confirmPassword) return doShake('Passwords do not match.')
    if (!userId) return doShake('Something went wrong. Please start again.')
    setLoading(true); setError(null)
    try {
      await resetPassword(userId, code, newPassword)
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 1600)
    } catch (err) {
      doShake(err.message)
      if (err.message.toLowerCase().includes('code')) setStep('code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[52%] bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-900 relative overflow-hidden p-12">
        {[
          { size: 'w-96 h-96', pos: '-top-24 -right-24', color: 'bg-violet-600/20', dur: 10 },
          { size: 'w-72 h-72', pos: '-bottom-12 -left-12', color: 'bg-indigo-600/25', dur: 13 },
          { size: 'w-48 h-48', pos: 'top-1/2 left-1/3',   color: 'bg-violet-400/10', dur: 8  },
        ].map((orb, i) => (
          <motion.div key={i} className={`absolute ${orb.size} ${orb.pos} ${orb.color} rounded-full blur-3xl`}
            animate={{ x: [0, 30, -20, 0], y: [0, -25, 20, 0] }}
            transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }} />
        ))}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5 text-white font-bold text-xl">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur">
              <Mic size={18} className="text-violet-300" />
            </div>
            MinuteAI
          </Link>
        </motion.div>
        <div className="mt-auto mb-auto relative z-10">
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-violet-300 text-sm font-semibold uppercase tracking-widest mb-4">Account recovery</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="text-4xl font-bold text-white leading-tight mb-4">
            Forgot your<br /><span className="text-violet-300">password?</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
            className="text-violet-200/80 text-base leading-relaxed max-w-sm">
            No problem. Enter your email and we'll send you a secure reset code to get back into your account.
          </motion.p>
        </div>
        {/* step indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="relative z-10 flex items-center gap-3">
          {['Enter email', 'Enter code', 'New password'].map((label, i) => {
            const idx = STEPS.indexOf(step)
            const done = i < idx
            const active = i === idx
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done ? 'bg-green-400 text-white' : active ? 'bg-white text-violet-700' : 'bg-white/20 text-white/50'
                }`}>{done ? '✓' : i + 1}</div>
                <span className={`text-xs font-medium ${active ? 'text-white' : done ? 'text-green-300' : 'text-white/40'}`}>{label}</span>
                {i < 2 && <div className={`w-6 h-px ${i < idx ? 'bg-green-400/60' : 'bg-white/20'}`} />}
              </div>
            )
          })}
        </motion.div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 py-12 bg-white">
        <Link to="/" className="flex lg:hidden items-center gap-2 text-gray-900 font-bold text-lg mb-10">
          <Mic size={20} className="text-violet-600" /> MinuteAI
        </Link>
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {success ? (
              <SuccessState key="success" />
            ) : step === 'email' ? (
              <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Reset your password</h2>
                  <p className="text-gray-400 text-sm mb-8">Enter your email and we'll send you a reset code.</p>
                </motion.div>
                <motion.form onSubmit={handleEmail}
                  animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}
                  className="space-y-4">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <FloatingInput label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                  </motion.div>
                  <AnimatePresence>
                    {error && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</motion.p>
                    )}
                  </AnimatePresence>
                  <motion.button type="submit" disabled={loading}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    whileHover={!loading ? { scale: 1.01, boxShadow: '0 8px 24px rgba(124,58,237,0.35)' } : {}}
                    whileTap={!loading ? { scale: 0.99 } : {}}
                    className="relative w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-violet-300/30 disabled:opacity-60 overflow-hidden flex items-center justify-center gap-2">
                    {!loading && (
                      <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                        animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }} />
                    )}
                    <span className="relative flex items-center gap-2">
                      {loading
                        ? <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                        : <>Send reset code <ArrowRight size={15} /></>}
                    </span>
                  </motion.button>
                </motion.form>
                <p className="text-center text-sm text-gray-500 mt-6">
                  Remember it? <Link to="/login" className="text-violet-600 hover:text-violet-700 font-semibold">Sign in</Link>
                </p>
              </motion.div>
            ) : step === 'code' ? (
              <motion.div key="code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Enter the code</h2>
                  <p className="text-gray-400 text-sm mb-8">
                    We sent a 6-digit code to <span className="font-medium text-gray-600">{email}</span>
                  </p>
                </motion.div>
                <motion.form onSubmit={e => { e.preventDefault(); handleCode() }}
                  animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}
                  className="space-y-6">
                  <OTPInput value={code} onChange={setCode} onComplete={handleCode} disabled={loading} />
                  <AnimatePresence>
                    {error && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-center">{error}</motion.p>
                    )}
                  </AnimatePresence>
                  <motion.button type="submit" disabled={loading || code.length < 6}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    whileHover={code.length === 6 ? { scale: 1.01, boxShadow: '0 8px 24px rgba(124,58,237,0.35)' } : {}}
                    className="relative w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden flex items-center justify-center gap-2">
                    <span className="relative flex items-center gap-2">Continue <ArrowRight size={15} /></span>
                  </motion.button>
                </motion.form>
                <div className="mt-5 text-center">
                  <button onClick={handleResend} disabled={countdown > 0 || loading}
                    className="text-sm text-gray-500 flex items-center gap-1.5 mx-auto disabled:cursor-not-allowed">
                    <RefreshCw size={13} />
                    {countdown > 0
                      ? <span>Resend in <span className="font-semibold text-violet-600">{countdown}s</span></span>
                      : <span className="text-violet-600 font-semibold">Resend code</span>}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Create new password</h2>
                  <p className="text-gray-400 text-sm mb-8">Choose a strong password for your account.</p>
                </motion.div>
                <motion.form onSubmit={handlePassword}
                  animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}
                  className="space-y-4">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <FloatingInput label="New password" type={showPw ? 'text' : 'password'} value={newPassword}
                      onChange={e => setNewPassword(e.target.value)} autoComplete="new-password"
                      right={<button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-400 hover:text-gray-600 p-1">
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>} />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
                    <FloatingInput label="Confirm new password" type={showPw ? 'text' : 'password'} value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                  </motion.div>
                  <AnimatePresence>
                    {error && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</motion.p>
                    )}
                  </AnimatePresence>
                  <motion.button type="submit" disabled={loading}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
                    whileHover={!loading ? { scale: 1.01, boxShadow: '0 8px 24px rgba(124,58,237,0.35)' } : {}}
                    whileTap={!loading ? { scale: 0.99 } : {}}
                    className="relative w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm shadow-lg disabled:opacity-60 overflow-hidden flex items-center justify-center gap-2">
                    {!loading && (
                      <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                        animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }} />
                    )}
                    <span className="relative flex items-center gap-2">
                      {loading
                        ? <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                        : <>Update password <ArrowRight size={15} /></>}
                    </span>
                  </motion.button>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
