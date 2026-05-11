import { useState, useId } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Eye, EyeOff, ArrowRight, CheckCircle, Shield, Zap, Clock } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'

// ── Floating-label input ───────────────────────────────────────────────────────
function FloatingInput({ label, type = 'text', value, onChange, right = null, autoComplete }) {
  const [focused, setFocused] = useState(false)
  const raised = focused || value.length > 0
  const id = useId()

  return (
    <div className={`relative border-2 rounded-2xl transition-all duration-200 bg-white ${
      focused
        ? 'border-violet-400 shadow-[0_0_0_4px_rgba(139,92,246,0.10)]'
        : 'border-gray-200 hover:border-violet-200'
    }`}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        placeholder=""
        className="w-full pt-7 pb-3 px-5 bg-transparent text-sm text-gray-900 focus:outline-none rounded-2xl"
      />
      <label
        htmlFor={id}
        className={`absolute left-5 pointer-events-none font-medium transition-all duration-200 ${
          raised ? 'top-2.5 text-[10px] text-violet-500' : 'top-1/2 -translate-y-1/2 text-sm text-gray-400'
        }`}
      >
        {label}
      </label>
      {right && <div className="absolute right-4 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  )
}

// ── Password strength ─────────────────────────────────────────────────────────
function PasswordStrength({ password }) {
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

// ── Success overlay ────────────────────────────────────────────────────────────
function SuccessState() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: [0, 1.15, 1] }}
        transition={{ duration: 0.5, times: [0, 0.7, 1], ease: 'easeOut' }}
        className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6"
      >
        <svg viewBox="0 0 80 80" width="80" height="80">
          <motion.circle cx="40" cy="40" r="36" fill="none" stroke="#bbf7d0" strokeWidth="3"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.1 }} />
          <motion.path d="M 24 40 L 35 51 L 56 28" stroke="#16a34a" strokeWidth="4" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.3 }} />
        </svg>
      </motion.div>
      <motion.h3 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="text-2xl font-bold text-gray-900 mb-2">Account created!</motion.h3>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
        className="text-gray-400">Taking you to your dashboard…</motion.p>
    </motion.div>
  )
}

const TRUST = [
  { icon: Shield, text: 'End-to-end encrypted' },
  { icon: Zap,    text: 'Free to start' },
  { icon: Clock,  text: '2 min setup' },
]

export default function Signup() {
  const [searchParams]              = useSearchParams()
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState(searchParams.get('email') || '')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
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
        setTimeout(() => navigate('/dashboard'), 1600)
      } catch (err) {
        setError(err.message || 'Google sign-in failed.')
      } finally { setLoading(false) }
    },
    onError: () => setError('Google sign-in was cancelled or failed.'),
    flow: 'implicit',
  })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name || !email || !password) {
      setError('Please fill in all fields.')
      setShake(true); setTimeout(() => setShake(false), 500); return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setShake(true); setTimeout(() => setShake(false), 500); return
    }
    setLoading(true); setError(null)
    try {
      const data = await signUp(name, email, password)
      setSuccess(true)
      setTimeout(() => navigate('/verify-email', { state: { userId: data.user_id, email } }), 1600)
    } catch (err) {
      setError(err.message || 'Sign up failed.')
      setShake(true); setTimeout(() => setShake(false), 500)
    } finally { setLoading(false) }
  }

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Left panel ───────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[42%] shrink-0 bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-900 relative overflow-hidden p-12">

        {/* orbs */}
        {[
          { size: 'w-96 h-96', pos: '-top-24 -right-24', color: 'bg-violet-600/20', dur: 11, x: [0,35,-20,0], y: [0,-25,20,0] },
          { size: 'w-72 h-72', pos: '-bottom-12 -left-12', color: 'bg-indigo-600/25', dur: 14, x: [0,-30,25,0], y: [0,20,-15,0] },
          { size: 'w-56 h-56', pos: 'top-1/2 left-1/3', color: 'bg-violet-400/10', dur: 9, x: [0,22,-28,0], y: [0,-18,14,0] },
        ].map((orb, i) => (
          <motion.div key={i}
            className={`absolute ${orb.size} ${orb.pos} ${orb.color} rounded-full blur-3xl`}
            animate={{ x: orb.x, y: orb.y }}
            transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* logo */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5 text-white font-bold text-xl">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur">
              <Mic size={18} className="text-violet-300" />
            </div>
            MinuteAI
          </Link>
        </motion.div>

        {/* content */}
        <div className="mt-auto mb-auto relative z-10">
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-violet-300 text-sm font-semibold uppercase tracking-widest mb-4">
            Free to get started
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="text-4xl font-bold text-white leading-tight mb-3">
            Stop spending hours<br />on meeting notes.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
            className="text-violet-300/80 text-base mb-8 leading-relaxed">
            Upload your recording and get structured, professional minutes ready to share — in minutes.
          </motion.p>

          {/* testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-5"
          >
            <p className="text-white/90 text-sm leading-relaxed mb-4">
              "MinuteAI saves our team 3 hours every week. The minutes come out better than anything we'd write manually."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 flex items-center justify-center text-white font-bold text-sm shrink-0">SK</div>
              <div>
                <p className="text-white text-sm font-semibold">Sarah K.</p>
                <p className="text-violet-300 text-xs">Head of Product, Vercel</p>
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

        {/* logos */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="relative z-10">
          <p className="text-violet-400/70 text-xs text-center mb-3">Trusted by teams at</p>
          <div className="flex items-center justify-center gap-8 opacity-40">
            {['Stripe', 'Notion', 'Linear', 'Vercel'].map((co, i) => (
              <motion.span key={co} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + i * 0.07 }}
                className="text-white font-semibold text-sm tracking-tight">{co}</motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#f9f8ff] overflow-y-auto relative">

        {/* background decoration */}
        <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-violet-100/40 to-transparent rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-indigo-100/30 to-transparent rounded-full blur-3xl" />

        {/* mobile logo */}
        <div className="lg:hidden px-8 pt-8">
          <Link to="/" className="flex items-center gap-2 text-gray-900 font-bold text-lg">
            <Mic size={20} className="text-violet-600" />
            MinuteAI
          </Link>
        </div>

        {/* centred form */}
        <div className="flex-1 flex items-center justify-center px-8 py-12 relative z-10">
          <div className="w-full max-w-lg">
            <AnimatePresence mode="wait">
              {success ? (
                <SuccessState key="success" />
              ) : (
                <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>

                  {/* free badge + heading */}
                  <div className="mb-8">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-violet-100"
                    >
                      <CheckCircle size={12} />
                      3 free meetings per month — no card required
                    </motion.div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h2>
                    <p className="text-gray-400">Start generating professional minutes today</p>
                  </div>

                  {/* Google */}
                  <motion.button
                    type="button"
                    onClick={() => handleGoogle()}
                    disabled={loading}
                    whileHover={{ y: -1, boxShadow: '0 6px 20px rgba(0,0,0,0.10)' }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex items-center justify-center gap-3 py-4 px-5 rounded-2xl border-2 border-gray-200 bg-white text-gray-700 font-semibold text-sm transition-all mb-6 shadow-sm hover:border-gray-300 disabled:opacity-60"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    Continue with Google
                  </motion.button>

                  <div className="relative flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium px-1">or continue with email</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* form */}
                  <motion.form
                    onSubmit={handleSubmit}
                    animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="space-y-4"
                  >
                    <FloatingInput label="Full name" type="text" value={name}
                      onChange={e => setName(e.target.value)} autoComplete="name" />
                    <FloatingInput label="Work email" type="email" value={email}
                      onChange={e => setEmail(e.target.value)} autoComplete="email" />
                    <div>
                      <FloatingInput
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
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
                          className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-4 py-3"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={!loading ? { scale: 1.01, boxShadow: '0 10px 28px rgba(124,58,237,0.35)' } : {}}
                      whileTap={!loading ? { scale: 0.99 } : {}}
                      className="relative w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-violet-300/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 overflow-hidden"
                    >
                      {!loading && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                        />
                      )}
                      <span className="relative flex items-center gap-2">
                        {loading
                          ? <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                              animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                          : <>Create account <ArrowRight size={15} /></>
                        }
                      </span>
                    </motion.button>
                  </motion.form>

                  <p className="text-center text-xs text-gray-400 mt-4">
                    By signing up you agree to our{' '}
                    <Link to="/terms" className="underline hover:text-gray-600">Terms</Link>
                    {' & '}
                    <Link to="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>
                  </p>
                  <p className="text-center text-sm text-gray-500 mt-3">
                    Already have an account?{' '}
                    <Link to="/login" className="text-violet-600 hover:text-violet-700 font-semibold">Sign in</Link>
                  </p>

                  {/* trust strip */}
                  <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-center gap-6">
                    {TRUST.map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Icon size={12} className="text-gray-300" />
                        {text}
                      </div>
                    ))}
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
