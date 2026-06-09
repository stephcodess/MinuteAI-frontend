import { useState, useId } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Eye, EyeOff, ArrowRight, Zap } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../../context/AuthContext'

/* ── Shared background (same as Landing Hero) ─────────────────────────── */
function Orb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />
}

function GridBg() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="login-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M 56 0 L 0 0 0 56" fill="none" stroke="white" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#login-grid)" />
    </svg>
  )
}

/* ── Labeled input (light variant) ───────────────────────────────────── */
function FormInput({ label, type = 'text', value, onChange, placeholder = '', right = null, autoComplete }: any) {
  const [focused, setFocused] = useState(false)
  const id = useId()

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className={`relative flex items-center border rounded-lg bg-white transition-all duration-200 ${
        focused ? 'border-violet-500 ring-2 ring-violet-500/15' : 'border-gray-200 hover:border-gray-300'
      }`}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full py-3 px-4 bg-transparent text-sm text-gray-900 focus:outline-none placeholder:text-gray-400"
        />
        {right && <div className="pr-3 shrink-0">{right}</div>}
      </div>
    </div>
  )
}

/* ── Success overlay ───────────────────────────────────────────────────── */
function SuccessState({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.15, 1] }}
        transition={{ duration: 0.5, times: [0, 0.7, 1], ease: 'easeOut' }}
        className="w-24 h-24 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-6"
      >
        <svg viewBox="0 0 80 80" width="80" height="80">
          <motion.circle cx="40" cy="40" r="36" fill="none" stroke="rgba(74,222,128,0.4)" strokeWidth="3"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.1 }} />
          <motion.path d="M 24 40 L 35 51 L 56 28" stroke="#4ade80" strokeWidth="4" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.3 }} />
        </svg>
      </motion.div>
      <motion.h3 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="text-2xl font-bold text-white mb-2">
        Welcome back{name ? `, ${name}` : ''}!
      </motion.h3>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
        className="text-slate-400">Taking you to your dashboard…</motion.p>
    </motion.div>
  )
}

const PERKS = [
  'AI-generated minutes in under 5 minutes',
  'Live transcript as your meeting processes',
  'Download as .docx or PDF instantly',
  'Email delivery when your minutes are ready',
]

const STATS = [
  { value: '2 min', label: 'Avg. processing' },
  { value: '98%',   label: 'Accuracy rate' },
  { value: '12k+',  label: 'Meetings done' },
]

export default function Login() {
  const [searchParams] = useSearchParams()
  const location                        = useLocation()
  const sessionExpired                  = !!(location.state as any)?.expired
  const [email, setEmail]               = useState(searchParams.get('email') || '')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [success, setSuccess]           = useState(false)
  const [shake, setShake]               = useState(false)
  const [twoFactor, setTwoFactor]       = useState<{ userId: string; email: string } | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const { signIn, googleSignIn, verifySignIn2FA, resendOTP } = useAuth()
  const navigate                        = useNavigate()

  const handleGoogle = useGoogleLogin({
    onSuccess: async ({ access_token }) => {
      setLoading(true); setError(null)
      try {
        const data = await googleSignIn(access_token)
        setSuccess(true)
        const dest = data?.user?.onboarding_completed ? '/dashboard' : '/onboarding'
        setTimeout(() => navigate(dest), 1600)
      } catch (err: any) {
        setError(err.message || 'Google sign-in failed.')
      } finally { setLoading(false) }
    },
    onError: () => setError('Google sign-in was cancelled or failed.'),
    flow: 'implicit',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields.')
      setShake(true); setTimeout(() => setShake(false), 500); return
    }
    setLoading(true); setError(null)
    try {
      const data = await signIn(email, password)
      if (data?.requires_2fa) {
        setTwoFactor({ userId: data.user_id, email: data.email || email })
        setTwoFactorCode('')
        return
      }
      setSuccess(true)
      const dest = data?.user?.onboarding_completed ? '/dashboard' : '/onboarding'
      setTimeout(() => navigate(dest), 1600)
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('verify')) {
        navigate('/verify-email', { state: { email } }); return
      }
      setError(err.message || 'Sign in failed.')
      setShake(true); setTimeout(() => setShake(false), 500)
    } finally { setLoading(false) }
  }

  async function handleTwoFactorSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!twoFactorCode || twoFactorCode.length !== 6 || !twoFactor) {
      setError('Enter the 6-digit code from your email.')
      setShake(true); setTimeout(() => setShake(false), 500); return
    }
    setLoading(true); setError(null)
    try {
      const data = await verifySignIn2FA(twoFactor.userId, twoFactorCode)
      setSuccess(true)
      const dest = data?.user?.onboarding_completed ? '/dashboard' : '/onboarding'
      setTimeout(() => navigate(dest), 1600)
    } catch (err: any) {
      setError(err.message || 'Could not verify that code.')
      setShake(true); setTimeout(() => setShake(false), 500)
    } finally { setLoading(false) }
  }

  async function resendTwoFactorCode() {
    if (!twoFactor) return
    setLoading(true); setError(null)
    try {
      await resendOTP(twoFactor.userId, 'login_2fa')
      setError('A new code has been sent to your email.')
    } catch (err: any) {
      setError(err.message || 'Could not send a new code.')
    } finally { setLoading(false) }
  }

  const userName = email
    ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : ''

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-[#080b14]">
      {/* ── Background ── */}
      <GridBg />
      <Orb className="top-[-10%] left-[-5%] w-[600px] h-[600px] bg-violet-700/20" />
      <Orb className="bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-700/15" />
      <Orb className="top-[40%] left-[40%] w-[400px] h-[400px] bg-fuchsia-700/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(var(--brand-rgb),0.07)_0%,transparent_70%)] pointer-events-none" />

      {/* ── Left brand panel ──────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[44%] shrink-0 relative z-10 p-14 border-r border-white/[0.06]">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <Link to="/" className="flex items-center gap-2.5 text-white font-bold text-xl">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center backdrop-blur">
              <Mic size={18} className="text-violet-300" />
            </div>
            MinuteAI
          </Link>
        </motion.div>

        {/* Headline content */}
        <div className="mt-auto mb-auto">
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-violet-400 text-xs font-semibold uppercase tracking-widest mb-5">
            Meeting minutes, automated
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="text-4xl font-black text-white leading-tight mb-6 tracking-tight">
            Turn recordings into<br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-400 bg-clip-text text-transparent">
              professional minutes
            </span><br />
            in minutes.
          </motion.h1>

          <div className="space-y-3 mb-10">
            {PERKS.map((p, i) => (
              <motion.div key={p} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.28 + i * 0.09 }}
                className="flex items-center gap-3 text-slate-400 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                {p}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="grid grid-cols-3 gap-3">
          {STATS.map(({ value, label }) => (
            <div key={label} className="bg-white/[0.05] backdrop-blur border border-white/[0.08] rounded-2xl p-4">
              <p className="text-white font-bold text-xl tabular-nums">{value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white relative z-10">

        {/* Mobile logo */}
        <div className="lg:hidden flex justify-center pt-10">
          <Link to="/" className="flex items-center gap-2.5 text-gray-900 font-bold text-xl">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <Mic size={18} className="text-violet-600" />
            </div>
            MinuteAI
          </Link>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-[380px]">
            <AnimatePresence mode="wait">
              {success ? (
                <SuccessState key="success" name={userName} />
              ) : (
                <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>

                  {/* Session expired banner */}
                  <AnimatePresence>
                    {sessionExpired && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        className="mb-5 flex items-center gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3"
                      >
                        <span className="text-amber-500 text-base leading-none">⏱</span>
                        <p className="text-amber-700 text-xs font-medium">
                          Your session expired. Please sign in again.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {twoFactor ? 'Check your email 📬' : 'Welcome Back 👋'}
                    </h2>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {twoFactor
                        ? `Enter the security code sent to ${twoFactor.email}`
                        : "Today is a new day. It's your day. You shape it. Sign in to start managing your projects."}
                    </p>
                  </div>

                  {/* Form */}
                  <motion.form
                    onSubmit={twoFactor ? handleTwoFactorSubmit : handleSubmit}
                    animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="space-y-4"
                  >
                    {twoFactor ? (
                      <FormInput
                        label="Security code"
                        type="text"
                        value={twoFactorCode}
                        onChange={(e: any) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit code"
                        autoComplete="one-time-code"
                      />
                    ) : (
                      <>
                        <FormInput
                          label="Email"
                          type="email"
                          value={email}
                          onChange={(e: any) => setEmail(e.target.value)}
                          placeholder="Example@email.com"
                          autoComplete="email"
                        />
                        <FormInput
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e: any) => setPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          autoComplete="current-password"
                          right={
                            <button type="button" onClick={() => setShowPassword(v => !v)}
                              className="text-gray-400 hover:text-gray-600 transition p-1">
                              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          }
                        />
                      </>
                    )}

                    <div className="flex justify-end">
                      {twoFactor ? (
                        <button type="button" onClick={resendTwoFactorCode}
                          className="text-xs text-violet-600 hover:text-violet-700 font-semibold">
                          Send a new code
                        </button>
                      ) : (
                        <Link to="/forgot-password"
                          className="text-xs text-violet-600 hover:text-violet-700 font-semibold">
                          Forgot Password?
                        </Link>
                      )}
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -6, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -6, height: 0 }}
                          className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-4 py-3"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileTap={!loading ? { scale: 0.99 } : {}}
                      className="w-full py-3 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {loading
                        ? <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                        : twoFactor ? 'Verify code' : 'Sign in'
                      }
                    </motion.button>
                  </motion.form>

                  {!twoFactor && (
                    <>
                      {/* Divider */}
                      <div className="relative flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 font-medium">Or</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>

                      {/* Google */}
                      <motion.button
                        onClick={() => handleGoogle()}
                        disabled={loading}
                        whileTap={{ scale: 0.99 }}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors disabled:opacity-60"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18">
                          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
                        </svg>
                        Sign in with Google
                      </motion.button>
                    </>
                  )}

                  {twoFactor ? (
                    <button
                      type="button"
                      onClick={() => { setTwoFactor(null); setTwoFactorCode(''); setPassword(''); setError(null) }}
                      className="mt-5 w-full text-center text-sm text-gray-500 hover:text-gray-700"
                    >
                      Use a different account
                    </button>
                  ) : (
                    <p className="text-center text-sm text-gray-500 mt-6">
                      Don't you have an account?{' '}
                      <Link to="/signup" className="text-violet-600 hover:text-violet-700 font-semibold">Sign up</Link>
                    </p>
                  )}

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-gray-400 py-5 tracking-wide uppercase">
          © {new Date().getFullYear()} All rights reserved
        </p>
      </div>
    </div>
  )
}
