import { motion } from 'framer-motion'
import { CreditCard, ShieldCheck, LogOut, Sparkles, Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { attachPaymentMethod } from '../../lib/api'
import StripeCardForm from '../../components/StripeCardForm'
import { useNavigate } from 'react-router-dom'

const TRUST_BULLETS = [
  { icon: ShieldCheck, text: 'Your first month is free', color: 'text-emerald-400' },
  { icon: Lock,        text: 'Card verified by Stripe, never stored by us', color: 'text-violet-400'  },
  { icon: Sparkles,    text: 'We email you before your trial converts', color: 'text-sky-400'  },
]

export default function ConnectCard() {
  const { refreshUser, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(paymentMethodId: string) {
    await attachPaymentMethod(paymentMethodId)
  }

  async function handleComplete() {
    await refreshUser()
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#07090f] px-4 py-10">

      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-violet-900/8 blur-[80px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(139,92,246,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.6) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[420px]"
      >
        {/* Brand mark */}
        <div className="flex justify-center mb-8">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-2xl bg-violet-500/30 blur-xl scale-110" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/40">
              <CreditCard size={28} className="text-white" strokeWidth={1.75} />
            </div>
          </motion.div>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl border overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.035)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.08) inset',
          }}
        >
          {/* Top accent line */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

          <div className="px-8 pt-7 pb-8">
            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <h1 className="text-[1.6rem] font-black text-white leading-tight tracking-tight mb-2">
                One last step
              </h1>
              <p className="text-slate-400 text-[0.9rem] leading-relaxed">
                Connect a card to start your free month.{' '}
                <span className="text-slate-300 font-medium">You won't be charged today</span>
                {' '}and we'll email you at least three days before billing starts.
              </p>
            </motion.div>

            {/* Trust bullets */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.4 }}
              className="mt-6 mb-7 space-y-3"
            >
              {TRUST_BULLETS.map(({ icon: Icon, text, color }, i) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.07, duration: 0.35 }}
                  className="flex items-center gap-3"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.04] border border-white/[0.06]`}>
                    <Icon size={13} className={color} />
                  </div>
                  <span className="text-sm text-slate-400">{text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Divider */}
            <div className="h-px w-full mb-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }} />

            {/* Card form */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.4 }}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Card details</p>
              <StripeCardForm
                onSubmit={handleSubmit}
                onComplete={handleComplete}
                buttonLabel="Start free month"
              />
            </motion.div>

            {/* Stripe badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-5 flex items-center justify-center gap-2"
            >
              <div className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                <Lock size={9} className="text-slate-600" />
                <span className="text-[10px] text-slate-600">Secured by</span>
                <span className="text-[10px] font-bold text-slate-500">Stripe</span>
                <span className="text-[10px] text-slate-600">· 256-bit TLS</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Sign out */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          onClick={() => { signOut(); navigate('/login', { replace: true }) }}
          className="mt-5 w-full flex items-center justify-center gap-1.5 text-xs text-slate-700 hover:text-slate-500 transition-colors py-2"
        >
          <LogOut size={11} /> Sign out of MinuteAI
        </motion.button>
      </motion.div>
    </div>
  )
}

