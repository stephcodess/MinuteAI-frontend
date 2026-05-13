import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight, Zap, Crown, HelpCircle, SlidersHorizontal, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

function fmtPlanPrice(cents, currency) {
  const sym = { gbp: '£', usd: '$', eur: '€' }[currency?.toLowerCase()] || '$'
  if (!cents) return 'Free'
  const val = cents / 100
  return `${sym}${val % 1 === 0 ? val : val.toFixed(2)}`
}

function normalizePricingPlan(p, billing, isSignedIn, recommended) {
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

function recommendPlan(rawPlans, { meetings, teamSize }) {
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

function PricingEstimator({ billing, meetings, setMeetings, teamSize, setTeamSize, recommended }) {
  const estimatedHours = Math.max(1, Math.round(meetings * 0.75))
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-white border border-gray-200 rounded-3xl p-6 mb-8 shadow-sm"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="max-w-sm">
          <div className="inline-flex items-center gap-2 text-violet-700 bg-violet-50 px-3 py-1.5 rounded-full text-xs font-bold mb-4">
            <SlidersHorizontal size={13} />
            Find your plan
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Make pricing match your workflow</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Adjust your monthly usage and team size to see which plan fits best.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 flex-1">
          <label className="block">
            <span className="flex items-center justify-between text-sm font-semibold text-gray-800 mb-3">
              Meetings per month
              <span className="text-violet-600">{meetings}</span>
            </span>
            <input
              type="range"
              min="1"
              max="60"
              value={meetings}
              onChange={(event) => setMeetings(Number(event.target.value))}
              className="w-full accent-violet-600"
            />
          </label>
          <label className="block">
            <span className="flex items-center justify-between text-sm font-semibold text-gray-800 mb-3">
              Team members
              <span className="text-violet-600">{teamSize}</span>
            </span>
            <input
              type="range"
              min="1"
              max="20"
              value={teamSize}
              onChange={(event) => setTeamSize(Number(event.target.value))}
              className="w-full accent-violet-600"
            />
          </label>
        </div>
      </div>

      <div className="mt-6 grid sm:grid-cols-3 gap-3">
        {[
          ['Recommended', recommended],
          ['Billing mode', billing === 'annual' ? 'Annual' : 'Monthly'],
          ['Estimated time saved', `${estimatedHours}h/mo`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function PlanCard({ plan, billing, index }) {
  const isPro = plan.highlight
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.09 }}
      className={`relative flex flex-col rounded-3xl border p-8 transition-shadow hover:shadow-xl ${
        isPro
          ? 'border-violet-500 bg-gradient-to-b from-violet-600 to-indigo-700 text-white shadow-2xl shadow-violet-200/60'
          : 'border-gray-200 bg-white shadow-sm'
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
          <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isPro ? 'text-violet-200' : 'text-violet-600'}`}>
            {plan.name}
          </p>
          <div className="flex items-end gap-1">
            <span className={`text-4xl font-bold tracking-tight ${isPro ? 'text-white' : 'text-gray-900'}`}>
              {plan.price}
            </span>
            {plan.period && (
              <span className={`text-sm mb-1.5 ${isPro ? 'text-violet-200' : 'text-gray-400'}`}>{plan.period}</span>
            )}
          </div>
          {plan.yearlyNote && (
            <p className={`text-xs mt-1 ${isPro ? 'text-violet-200' : 'text-gray-400'}`}>{plan.yearlyNote}</p>
          )}
        </div>
        {plan.icon && (
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isPro ? 'bg-white/15' : 'bg-violet-50'}`}>
            <plan.icon size={20} className={isPro ? 'text-white' : 'text-violet-600'} />
          </div>
        )}
      </div>

      <p className={`text-sm mb-6 ${isPro ? 'text-violet-200' : 'text-gray-500'}`}>{plan.desc}</p>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <CheckCircle size={15} className={`shrink-0 mt-0.5 ${isPro ? 'text-violet-300' : 'text-violet-500'}`} />
            <span className={isPro ? 'text-white' : 'text-gray-700'}>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        to={plan.ctaTo}
        className={`flex items-center justify-center gap-2 py-3 px-5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] ${
          isPro
            ? 'bg-white text-violet-700 hover:bg-violet-50 shadow-sm'
            : 'bg-violet-600 text-white hover:bg-violet-700'
        }`}
      >
        {plan.cta}
        <ArrowRight size={14} />
      </Link>
    </motion.div>
  )
}

function FaqItem({ q, a, index }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.4 + index * 0.07 }}
      className="border-b border-gray-100 last:border-0"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-semibold text-gray-900">{q}</span>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <HelpCircle size={16} className={open ? 'text-violet-600' : 'text-gray-300'} />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <p className="text-sm text-gray-500 pb-5 leading-relaxed">{a}</p>
      </motion.div>
    </motion.div>
  )
}

export default function Pricing() {
  const [billing, setBilling] = useState('monthly')
  const [meetings, setMeetings] = useState(6)
  const [teamSize, setTeamSize] = useState(1)
  const [rawPlans, setRawPlans] = useState(null)
  const { isSignedIn } = useAuth()

  useEffect(() => {
    api.get('/billing/plans')
      .then(data => setRawPlans(Array.isArray(data) ? data : []))
      .catch(() => setRawPlans([]))
  }, [])

  const recommended = useMemo(
    () => recommendPlan(rawPlans, { meetings, teamSize }),
    [rawPlans, meetings, teamSize],
  )

  const plans = useMemo(() => {
    if (!rawPlans) return null
    return rawPlans.map(p => normalizePricingPlan(p, billing, isSignedIn, recommended))
  }, [rawPlans, billing, isSignedIn, recommended])

  const payAsYouGoTo = isSignedIn ? '/upload' : '/signup'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <Zap size={12} />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">
            Start free.<br className="sm:hidden" />
            <span className="text-violet-600"> Scale when you need.</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            No contracts. No hidden fees. Cancel anytime.
          </p>
        </motion.div>

        {/* billing toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-center gap-3 mb-12"
        >
          <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${billing === 'annual' ? 'bg-violet-600' : 'bg-gray-200'}`}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
              style={{ left: billing === 'annual' ? '26px' : '2px' }}
            />
          </button>
          <span className={`text-sm font-medium ${billing === 'annual' ? 'text-gray-900' : 'text-gray-400'}`}>
            Annual
          </span>
          <motion.span
            animate={{ opacity: billing === 'annual' ? 1 : 0, x: billing === 'annual' ? 0 : -8 }}
            className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"
          >
            Save 20%
          </motion.span>
        </motion.div>

        <PricingEstimator
          billing={billing}
          meetings={meetings}
          setMeetings={setMeetings}
          teamSize={teamSize}
          setTeamSize={setTeamSize}
          recommended={recommended}
        />

        {/* plans */}
        {plans === null ? (
          <div className="flex items-center justify-center py-20 mb-14">
            <Loader2 size={28} className="text-violet-400 animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 mb-14 text-gray-400 text-sm">No plans available. Check back soon.</div>
        ) : (
          <div className={`grid grid-cols-1 gap-6 mb-14 ${plans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            {plans.map((plan, i) => (
              <PlanCard key={plan.name} plan={plan} billing={billing} index={i} />
            ))}
          </div>
        )}

        {/* pay-as-you-go strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white border border-gray-200 rounded-2xl px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-14 shadow-sm"
        >
          <div>
            <p className="font-bold text-gray-900 mb-0.5">Occasional user?</p>
            <p className="text-sm text-gray-500">Pay per document — no subscription needed.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-gray-900">£3 <span className="text-base font-normal text-gray-400">/ document</span></span>
            <Link
              to={payAsYouGoTo}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold transition-colors"
            >
              {isSignedIn ? 'Try it now' : 'Create account'} <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently asked questions</h2>
          <div className="bg-white border border-gray-200 rounded-2xl px-8 shadow-sm max-w-2xl mx-auto">
            {FAQS.map((faq, i) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </motion.div>

        {/* enterprise */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="mt-14 bg-gradient-to-r from-violet-950 to-indigo-900 rounded-3xl p-10 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #7c3aed 0%, transparent 50%), radial-gradient(circle at 80% 50%, #4f46e5 0%, transparent 50%)' }} />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-2">Need an enterprise plan?</h2>
            <p className="text-violet-300 mb-8 max-w-md mx-auto">
              Custom pricing, unlimited users, SLA guarantees, and bespoke templates for large teams.
            </p>
            <a
              href="mailto:hello@minuteai.com"
              className="inline-flex items-center gap-2 bg-white text-violet-700 hover:bg-violet-50 px-6 py-3 rounded-2xl font-semibold text-sm transition-colors shadow-lg"
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
