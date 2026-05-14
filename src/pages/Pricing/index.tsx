import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight, Zap, Crown, HelpCircle, SlidersHorizontal, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'

/* ── Shared background elements ──────────────────────────────────────── */
function Orb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />
}

function GridBg() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.025] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="pricing-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M 56 0 L 0 0 0 56" fill="none" stroke="white" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#pricing-grid)" />
    </svg>
  )
}

/* ── Utilities ───────────────────────────────────────────────────────── */
function fmtPlanPrice(cents: number, currency: string) {
  const sym = { gbp: '£', usd: '$', eur: '€' }[currency?.toLowerCase()] || '$'
  if (!cents) return 'Free'
  const val = cents / 100
  return `${sym}${val % 1 === 0 ? val : val.toFixed(2)}`
}

function normalizePricingPlan(p: any, billing: string, isSignedIn: boolean, recommended: string) {
  const isFree = !p.price_monthly
  const monthlyAmt = p.price_monthly || 0
  const annualMonthly = Math.round(monthlyAmt * 0.8)
  const displayAmt = billing === 'annual' && !isFree ? annualMonthly : monthlyAmt
  const sym = { gbp: '£', usd: '$', eur: '€' }[p.currency?.toLowerCase()] || '$'
  const isRec = p.display_name === recommended

  return {
    name: p.display_name || p.name,
    planKey: p.name,
    price: fmtPlanPrice(displayAmt, p.currency),
    period: isFree ? '' : '/month',
    yearlyNote: billing === 'annual' && !isFree
      ? `Billed as ${sym}${((annualMonthly * 12) / 100).toFixed(0)}/year`
      : undefined,
    desc: p.description || '',
    features: Array.isArray(p.features) ? p.features : [],
    cta: isSignedIn
      ? (isFree ? 'Continue free' : `Choose ${p.display_name}`)
      : (isFree ? 'Get started free' : `Start ${p.display_name}`),
    ctaTo: isSignedIn ? (isFree ? '/upload' : '/billing') : '/signup',
    highlight: isRec || Boolean(p.is_popular),
    badge: isRec ? (billing === 'annual' ? 'Best value' : 'Recommended') : (p.is_popular ? 'Most popular' : undefined),
    icon: isRec || p.is_popular ? Crown : null,
    meetings_per_month: p.meetings_per_month,
    price_monthly: p.price_monthly,
  }
}

function recommendPlan(rawPlans: any[], { meetings, teamSize }: { meetings: number; teamSize: number }) {
  if (!rawPlans?.length) return ''
  if (teamSize > 1) {
    const paid = rawPlans.filter(p => p.price_monthly > 0)
    return paid.length > 0 ? paid[paid.length - 1].display_name : ''
  }
  const freePlan = rawPlans.find(p => !p.price_monthly || p.name === 'free')
  const freeLimit = freePlan?.meetings_per_month ?? 3
  if (meetings > freeLimit) {
    const paid = rawPlans.filter(p => p.price_monthly > 0)
    return paid.length > 0 ? paid[0].display_name : ''
  }
  return freePlan?.display_name || rawPlans[0]?.display_name || ''
}

const FAQS = [
  {
    q: 'What counts as a "meeting"?',
    a: 'Each audio or video file you upload counts as one meeting. There are no limits on the number of action items, speakers, or length of the generated minutes document.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes — cancel from your billing settings at any time. You keep access until the end of your billing period, with no hidden fees.',
  },
  {
    q: 'What audio formats are supported?',
    a: 'We support MP3, MP4, M4A, WAV, and WebM. Files up to 500 MB are accepted.',
  },
  {
    q: 'Is my audio data kept private?',
    a: 'Absolutely. Audio files are encrypted in transit and at rest, processed only to generate your minutes, and deleted from our servers within 24 hours.',
  },
]

/* ── Estimator ───────────────────────────────────────────────────────── */
function PricingEstimator({
  billing,
  meetings,
  setMeetings,
  teamSize,
  setTeamSize,
  recommended,
}: {
  billing: string
  meetings: number
  setMeetings: (v: number) => void
  teamSize: number
  setTeamSize: (v: number) => void
  recommended: string
}) {
  const estimatedHours = Math.max(1, Math.round(meetings * 0.75))
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-white/[0.04] backdrop-blur border border-white/[0.08] rounded-3xl p-6 mb-10"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="max-w-sm">
          <div className="inline-flex items-center gap-2 text-violet-300 bg-violet-500/10 border border-violet-400/20 px-3 py-1.5 rounded-full text-xs font-bold mb-4">
            <SlidersHorizontal size={13} />
            Find your plan
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Make pricing match your workflow</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Adjust your monthly usage and team size to see which plan fits best.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 flex-1">
          <label className="block">
            <span className="flex items-center justify-between text-sm font-semibold text-slate-300 mb-3">
              Meetings per month
              <span className="text-violet-400">{meetings}</span>
            </span>
            <input type="range" min="1" max="60" value={meetings}
              onChange={e => setMeetings(Number(e.target.value))}
              className="w-full accent-violet-500" />
          </label>
          <label className="block">
            <span className="flex items-center justify-between text-sm font-semibold text-slate-300 mb-3">
              Team members
              <span className="text-violet-400">{teamSize}</span>
            </span>
            <input type="range" min="1" max="20" value={teamSize}
              onChange={e => setTeamSize(Number(e.target.value))}
              className="w-full accent-violet-500" />
          </label>
        </div>
      </div>

      <div className="mt-6 grid sm:grid-cols-3 gap-3">
        {[
          ['Recommended', recommended],
          ['Billing mode', billing === 'annual' ? 'Annual' : 'Monthly'],
          ['Estimated time saved', `${estimatedHours}h/mo`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</p>
            <p className="text-lg font-bold text-white mt-1">{value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ── Plan card ───────────────────────────────────────────────────────── */
function PlanCard({ plan, billing, index }: { plan: ReturnType<typeof normalizePricingPlan>; billing: string; index: number }) {
  const isPro = plan.highlight
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.09 }}
      className={`relative flex flex-col rounded-3xl border p-8 transition-all hover:-translate-y-1 ${
        isPro
          ? 'border-violet-500/60 bg-gradient-to-b from-violet-600/90 to-indigo-700/90 backdrop-blur shadow-[0_8px_40px_rgba(124,58,237,0.4)]'
          : 'border-white/[0.08] bg-white/[0.04] backdrop-blur hover:border-white/[0.14] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md ${
            billing === 'annual' ? 'bg-emerald-400 text-emerald-900' : 'bg-amber-400 text-amber-900'
          }`}>
            {billing === 'annual' ? <Zap size={10} /> : <Crown size={10} />}
            {plan.badge}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isPro ? 'text-violet-200' : 'text-violet-400'}`}>
            {plan.name}
          </p>
          <div className="flex items-end gap-1">
            <span className={`text-4xl font-bold tracking-tight ${isPro ? 'text-white' : 'text-white'}`}>
              {plan.price}
            </span>
            {plan.period && (
              <span className={`text-sm mb-1.5 ${isPro ? 'text-violet-200' : 'text-slate-500'}`}>{plan.period}</span>
            )}
          </div>
          {plan.yearlyNote && (
            <p className={`text-xs mt-1 ${isPro ? 'text-violet-200' : 'text-slate-500'}`}>{plan.yearlyNote}</p>
          )}
        </div>
        {plan.icon && (
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isPro ? 'bg-white/15' : 'bg-violet-500/10 border border-violet-400/20'}`}>
            <plan.icon size={20} className={isPro ? 'text-white' : 'text-violet-400'} />
          </div>
        )}
      </div>

      <p className={`text-sm mb-6 ${isPro ? 'text-violet-200' : 'text-slate-500'}`}>{plan.desc}</p>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((f: string) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <CheckCircle size={15} className={`shrink-0 mt-0.5 ${isPro ? 'text-violet-300' : 'text-violet-400'}`} />
            <span className={isPro ? 'text-white' : 'text-slate-300'}>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        to={plan.ctaTo}
        className={`group relative inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full font-bold text-sm transition-all overflow-hidden hover:-translate-y-0.5 active:translate-y-0 ${
          isPro
            ? 'bg-white text-violet-700 hover:bg-violet-50 shadow-sm'
            : 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-[0_4px_16px_rgba(124,58,237,0.35)] hover:shadow-[0_6px_24px_rgba(124,58,237,0.5)]'
        }`}
      >
        {!isPro && (
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
        )}
        <span className="relative flex items-center gap-2">
          {plan.cta}
          <ArrowRight size={14} />
        </span>
      </Link>
    </motion.div>
  )
}

/* ── FAQ item ────────────────────────────────────────────────────────── */
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.4 + index * 0.07 }}
      className="border-b border-white/[0.07] last:border-0"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-semibold text-slate-200">{q}</span>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <HelpCircle size={16} className={open ? 'text-violet-400' : 'text-slate-600'} />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <p className="text-sm text-slate-500 pb-5 leading-relaxed">{a}</p>
      </motion.div>
    </motion.div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function Pricing() {
  const [billing, setBilling]     = useState('monthly')
  const [meetings, setMeetings]   = useState(6)
  const [teamSize, setTeamSize]   = useState(1)
  const [rawPlans, setRawPlans]   = useState<any[] | null>(null)
  const { isSignedIn }            = useAuth()

  useEffect(() => {
    api.get('/billing/plans')
      .then(data => setRawPlans(Array.isArray(data) ? data : []))
      .catch(() => setRawPlans([]))
  }, [])

  const recommended = useMemo(
    () => recommendPlan(rawPlans ?? [], { meetings, teamSize }),
    [rawPlans, meetings, teamSize],
  )

  const plans = useMemo(() => {
    if (!rawPlans) return null
    return rawPlans.map(p => normalizePricingPlan(p, billing, isSignedIn, recommended))
  }, [rawPlans, billing, isSignedIn, recommended])

  const payAsYouGoTo = isSignedIn ? '/upload' : '/signup'

  return (
    <div className="relative min-h-screen bg-[#080b14] overflow-x-hidden">
      {/* ── Background ── */}
      <GridBg />
      <Orb className="top-[-10%] left-[-5%] w-[700px] h-[700px] bg-violet-700/15" />
      <Orb className="top-[30%] right-[-5%] w-[500px] h-[500px] bg-indigo-700/12" />
      <Orb className="bottom-[10%] left-[30%] w-[400px] h-[400px] bg-fuchsia-700/08" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(124,58,237,0.08)_0%,transparent_60%)] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 border border-violet-400/20 bg-violet-500/10 text-violet-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            <Zap size={11} fill="currentColor" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 leading-[1.08]">
            Start free.{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-400 bg-clip-text text-transparent">
              Scale when you need.
            </span>
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            No contracts. No hidden fees. Cancel anytime.
          </p>
        </motion.div>

        {/* ── Billing toggle ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-center gap-3 mb-12"
        >
          <span className={`text-sm font-medium transition-colors ${billing === 'monthly' ? 'text-white' : 'text-slate-600'}`}>Monthly</span>
          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${billing === 'annual' ? 'bg-violet-600' : 'bg-white/10'}`}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
              style={{ left: billing === 'annual' ? '26px' : '2px' }}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${billing === 'annual' ? 'text-white' : 'text-slate-600'}`}>
            Annual
          </span>
          <motion.span
            animate={{ opacity: billing === 'annual' ? 1 : 0, x: billing === 'annual' ? 0 : -8 }}
            className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"
          >
            Save 20%
          </motion.span>
        </motion.div>

        {/* ── Estimator ── */}
        <PricingEstimator
          billing={billing}
          meetings={meetings}
          setMeetings={setMeetings}
          teamSize={teamSize}
          setTeamSize={setTeamSize}
          recommended={recommended}
        />

        {/* ── Plans ── */}
        {plans === null ? (
          <div className="flex items-center justify-center py-20 mb-14">
            <Loader2 size={28} className="text-violet-400 animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 mb-14 text-slate-600 text-sm">No plans available. Check back soon.</div>
        ) : (
          <div className={`grid grid-cols-1 gap-6 mb-14 ${plans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            {plans.map((plan, i) => (
              <PlanCard key={plan.name} plan={plan} billing={billing} index={i} />
            ))}
          </div>
        )}

        {/* ── Pay-as-you-go strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white/[0.04] border border-white/[0.08] backdrop-blur rounded-2xl px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-14"
        >
          <div>
            <p className="font-bold text-white mb-0.5">Occasional user?</p>
            <p className="text-sm text-slate-500">Pay per document — no subscription needed.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-white">£3 <span className="text-base font-normal text-slate-500">/ document</span></span>
            <Link
              to={payAsYouGoTo}
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.12] hover:border-white/[0.2] text-white text-sm font-semibold transition-all overflow-hidden"
            >
              {isSignedIn ? 'Try it now' : 'Create account'} <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>

        {/* ── FAQ ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently asked questions</h2>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl px-8 max-w-2xl mx-auto">
            {FAQS.map((faq, i) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </motion.div>

        {/* ── Enterprise ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="mt-14 relative overflow-hidden rounded-3xl border border-violet-500/30 p-10 text-center"
        >
          {/* Layered bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950/80 via-violet-900/60 to-indigo-900/80" />
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #7c3aed 0%, transparent 50%), radial-gradient(circle at 80% 50%, #4f46e5 0%, transparent 50%)' }} />
          <div className="absolute inset-0 bg-[#080b14]/30" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 border border-violet-400/20 bg-violet-500/10 text-violet-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <Crown size={11} />
              Enterprise
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Need an enterprise plan?</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Custom pricing, unlimited users, SLA guarantees, and bespoke templates for large teams.
            </p>
            <a
              href="mailto:hello@minuteai.com"
              className="group relative inline-flex items-center gap-2 bg-white text-violet-700 hover:bg-violet-50 px-6 py-3 rounded-full font-bold text-sm transition-colors shadow-lg"
            >
              Contact us
              <ArrowRight size={14} />
            </a>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
