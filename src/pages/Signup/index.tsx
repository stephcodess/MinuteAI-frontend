import { useState, useId } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Eye, EyeOff } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../../context/AuthContext'
import disposableDomains from 'disposable-email-domains'

function Orb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />
}

function GridBg() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="signup-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M 56 0 L 0 0 0 56" fill="none" stroke="white" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#signup-grid)" />
    </svg>
  )
}

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

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ]
  if (!password) return null
  const score = checks.filter(c => c.ok).length
  const barColor = score === 1 ? 'bg-red-400' : score === 2 ? 'bg-amber-400' : 'bg-green-500'
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2.5 px-1">
      <div className="flex gap-1 mb-2">
        {[1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? barColor : 'bg-gray-200'}`} />
        ))}
      </div>
      <div className="flex gap-4">
        {checks.map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${ok ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className={ok ? 'text-green-600' : 'text-gray-400'}>{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function SuccessState() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: [0, 1.15, 1] }}
        transition={{ duration: 0.5, times: [0, 0.7, 1], ease: 'easeOut' }}
        className="w-24 h-24 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mb-6">
        <svg viewBox="0 0 80 80" width="80" height="80">
          <motion.circle cx="40" cy="40" r="36" fill="none" stroke="rgba(74,222,128,0.6)" strokeWidth="3"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.1 }} />
          <motion.path d="M 24 40 L 35 51 L 56 28" stroke="#22c55e" strokeWidth="4" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.3 }} />
        </svg>
      </motion.div>
      <motion.h3 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="text-2xl font-bold text-gray-900 mb-2">Account created!</motion.h3>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
        className="text-gray-500">Taking you to your dashboard…</motion.p>
    </motion.div>
  )
}

const TESTIMONIAL = {
  quote: '"MinuteAI saves our team 3 hours every week. The minutes come out better than anything we\'d write manually."',
  name: 'Sarah K.',
  role: 'Head of Product, Vercel',
  initials: 'SK',
}

export default function Signup() {
  const [searchParams]              = useSearchParams()
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState(searchParams.get('email') || '')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState(false)
  const [shake, setShake]           = useState(false)
  const { signUp, googleSignIn }    = useAuth()
  const navigate                    = useNavigate()

  const handleGoogle = useGoogleLogin({
    onSuccess: async ({ access_token }) => {
      setLoading(true); setError(null)
      try {
        await googleSignIn(access_token)
        setSuccess(true)
        setTimeout(() => navigate('/onboarding'), 1600)
      } catch (err: any) {
        setError(err.message || 'Google sign-in failed.')
      } finally { setLoading(false) }
    },
    onError: () => setError('Google sign-in was cancelled or failed.'),
    flow: 'implicit',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !password) {
      setError('Please fill in all fields.')
      setShake(true); setTimeout(() => setShake(false), 500); return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setShake(true); setTimeout(() => setShake(false), 500); return
    }
    const domain = email.split('@')[1]?.toLowerCase()
    if (!domain || (disposableDomains as string[]).includes(domain)) {
      setError('Disposable email addresses are not allowed. Please use a real email.')
      setShake(true); setTimeout(() => setShake(false), 500); return
    }
    setLoading(true); setError(null)
    try {
      const data = await signUp(name, email, password)
      setSuccess(true)
      setTimeout(() => navigate('/verify-email', { state: { userId: data.user_id, email } }), 1600)
    } catch (err: any) {
      setError(err.message || 'Sign up failed.')
      setShake(true); setTimeout(() => setShake(false), 500)
    } finally { setLoading(false) }
  }

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-[#080b14]">
      {/* ── Background ── */}
      <GridBg />
      <Orb className="top-[-10%] right-[-5%] w-[600px] h-[600px] bg-violet-700/18" />
      <Orb className="bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-700/14" />
      <Orb className="top-[35%] left-[45%] w-[400px] h-[400px] bg-fuchsia-700/10" />
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
            Free to get started
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="text-4xl font-black text-white leading-tight mb-4 tracking-tight">
            Stop spending hours<br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-400 bg-clip-text text-transparent">
              on meeting notes.
            </span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
            className="text-slate-400 text-base mb-10 leading-relaxed">
            Upload your recording and get structured, professional minutes ready to share — in minutes.
          </motion.p>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="bg-white/[0.05] backdrop-blur border border-white/[0.08] rounded-2xl p-5">
            <p className="text-slate-300 text-sm leading-relaxed mb-4">{TESTIMONIAL.quote}</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {TESTIMONIAL.initials}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{TESTIMONIAL.name}</p>
                <p className="text-violet-400 text-xs">{TESTIMONIAL.role}</p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <motion.svg key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.06 }} width="13" height="13" viewBox="0 0 24 24" fill="#fbbf24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </motion.svg>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Trusted by */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <p className="text-slate-700 text-xs text-center mb-3">Trusted by teams at</p>
          <div className="flex items-center justify-center gap-8 opacity-30">
            {['Stripe', 'Notion', 'Linear', 'Vercel'].map((co, i) => (
              <motion.span key={co} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + i * 0.07 }}
                className="text-white font-semibold text-sm tracking-tight">{co}</motion.span>
            ))}
          </div>
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
                <SuccessState key="success" />
              ) : (
                <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>

                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account 👋</h2>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      Join thousands of teams who save time on meeting notes.
                    </p>
                  </div>

                  <motion.form
                    onSubmit={handleSubmit}
                    animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="space-y-4"
                  >
                    <FormInput
                      label="Full name"
                      type="text"
                      value={name}
                      onChange={(e: any) => setName(e.target.value)}
                      placeholder="John Doe"
                      autoComplete="name"
                    />
                    <FormInput
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e: any) => setEmail(e.target.value)}
                      placeholder="Example@email.com"
                      autoComplete="email"
                    />
                    <div>
                      <FormInput
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e: any) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        right={
                          <button type="button" onClick={() => setShowPassword(v => !v)}
                            className="text-gray-400 hover:text-gray-600 transition p-1">
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        }
                      />
                      <PasswordStrength password={password} />
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
                        : 'Create account'
                      }
                    </motion.button>
                  </motion.form>

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
                    Sign up with Google
                  </motion.button>

                  <p className="text-center text-sm text-gray-500 mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-violet-600 hover:text-violet-700 font-semibold">Sign in</Link>
                  </p>

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
