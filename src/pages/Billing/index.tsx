import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, CheckCircle, ArrowRight, CreditCard, Receipt,
  Shield, Crown, Sparkles, HelpCircle, FileText, Clock,
  ExternalLink, AlertCircle, Loader2, X, ChevronLeft, ChevronRight, TicketPercent,
} from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import { api } from '../../lib/api'

const INVOICES_PAGE_SIZE = 10

function Pagination({ page, totalPages, total, onPage }) {
  if (totalPages <= 1) return null
  const pages = []
  if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i) }
  else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }
  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <span className="text-xs t3">
        Page <span className="font-medium t1">{page}</span> of <span className="font-medium t1">{totalPages}</span>
        <span className="ml-1 t3">· {total} invoices</span>
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-white/[0.06] t3 transition-colors">
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} className="px-1 text-gray-400 text-xs">…</span>
            : <button key={p} onClick={() => onPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${page === p ? 'bg-violet-600 text-white shadow-sm' : 't3 hover:bg-white/[0.06]'}`}>
                {p}
              </button>
        )}
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-white/[0.06] t3 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

const FALLBACK_FREE = {
  key: 'free',
  name: 'Starter',
  price: 'Free',
  period: '',
  desc: 'Perfect for occasional use',
  features: ['3 meetings / month', 'Up to 30 min each', '.docx & PDF export', 'Action items extraction'],
  amount: 0,
  currency: 'gbp',
  interval: null,
  is_popular: false,
}

function normalizePlan(p) {
  const amt = p.price_monthly ?? 0
  const sym = { gbp: '£', usd: '$', eur: '€' }[p.currency?.toLowerCase()] || '$'
  const price = amt === 0 ? 'Free' : `${sym}${amt / 100 % 1 === 0 ? amt / 100 : (amt / 100).toFixed(2)}`
  return {
    key: p.name,
    name: p.display_name || p.name,
    price,
    period: p.interval ? `/${p.interval === 'month' ? 'mo' : p.interval}` : '',
    desc: p.description || `${p.display_name || p.name} plan`,
    features: Array.isArray(p.features) ? p.features : [],
    amount: amt,
    currency: p.currency || 'gbp',
    interval: p.interval,
    is_popular: Boolean(p.is_popular),
  }
}

function fmtDate(unix) {
  return new Date(unix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMoney(amount, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100)
}

function PlanCard({ plan, idx, currentPlan, onUpgrade, upgrading, promoCode, billing }) {
  const isCurrent   = plan.key === currentPlan
  const isHighlight = Boolean(plan.is_popular)
  const isDowngrade = plan.key === 'free' && currentPlan !== 'free'
  const busy        = upgrading === plan.key
  const isYearly    = billing === 'year'

  // Derive yearly price (20% off) if plan has a monthly amount
  const displayAmount = plan.amount && isYearly ? Math.round(plan.amount * 0.8) : plan.amount
  const sym = { gbp: '£', usd: '$', eur: '€' }[(plan.currency || 'gbp').toLowerCase()] || '$'
  const displayPrice = displayAmount === 0
    ? 'Free'
    : `${sym}${displayAmount / 100 % 1 === 0 ? displayAmount / 100 : (displayAmount / 100).toFixed(2)}`
  const period = plan.interval
    ? isYearly ? '/yr' : '/mo'
    : ''

  const promoPreview =
    promoCode && plan.amount
      ? promoCode.discount_type === 'percent'
        ? `${promoCode.discount_value}% off`
        : `${fmtMoney(Math.min(plan.amount, promoCode.discount_value), plan.currency)} off`
      : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: idx * 0.08 }}
      className={`relative flex flex-col rounded-2xl border p-5 transition-all sm:p-6 ${
        isHighlight
          ? 'border-violet-500 bg-gradient-to-b from-violet-600 to-indigo-700 text-white shadow-xl shadow-violet-500/25'
          : 'glass-card hover:shadow-lg hover:-translate-y-0.5'
      }`}
    >
      {isHighlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            <Crown size={10} /> Most popular
          </span>
        </div>
      )}
      {isCurrent && (
        <span className="absolute right-3 top-3 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400 sm:right-4 sm:top-4">
          Current
        </span>
      )}

      <p className={`mb-2 pr-20 text-xs font-bold uppercase tracking-widest ${isHighlight ? 'text-violet-200' : 'text-violet-400'}`}>{plan.name}</p>
      <div className="flex items-end gap-1 mb-1">
        <span className={`text-3xl font-bold ${isHighlight ? 'text-white' : 't1'}`}>{displayPrice}</span>
        {period && <span className={`text-sm mb-1 ${isHighlight ? 'text-violet-200' : 't3'}`}>{period}</span>}
      </div>
      {isYearly && plan.amount > 0 && (
        <div className="mb-1 flex items-center gap-2">
          <span className={`text-xs line-through ${isHighlight ? 'text-violet-300' : 't3'}`}>
            {sym}{plan.amount / 100}/mo
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isHighlight ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-400'}`}>
            Save 20%
          </span>
        </div>
      )}
      <p className={`text-xs mb-5 mt-1 ${isHighlight ? 'text-violet-200' : 't3'}`}>{plan.desc}</p>
      {promoPreview && !isCurrent && !isDowngrade && (
        <div className={`mb-4 inline-flex w-fit max-w-full items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
          isHighlight ? 'bg-white/15 text-white' : 'bg-emerald-500/10 text-emerald-400'
        }`}>
          <TicketPercent size={12} />
          <span className="truncate">{promoPreview} applied at checkout</span>
        </div>
      )}

      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <CheckCircle size={14} className={`shrink-0 ${isHighlight ? 'text-violet-300' : 'text-violet-400'}`} />
            <span className={isHighlight ? 'text-white' : 't2'}>{f}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <button disabled className={`w-full py-2.5 rounded-full text-sm font-semibold cursor-not-allowed ${
          isHighlight ? 'bg-white/10 text-white/60' : 'bg-white/[0.06] t3'
        }`}>
          Current plan
        </button>
      ) : isDowngrade ? (
        <button disabled className="w-full py-2.5 rounded-full text-sm font-semibold border border-white/10 t3 cursor-not-allowed">
          Downgrade via portal
        </button>
      ) : (
        <button
          onClick={() => onUpgrade(plan.key)}
          disabled={busy}
          className={`w-full py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-70 ${
            isHighlight
              ? 'bg-white text-violet-700 hover:bg-violet-50 shadow-lg'
              : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-500/30'
          }`}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          {busy ? 'Redirecting…' : `Upgrade to ${plan.name}`}
        </button>
      )}
    </motion.div>
  )
}

export default function Billing() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [tab,           setTab]           = useState('plan')
  const [usage,         setUsage]         = useState(null)
  const [plans,         setPlans]         = useState(null)
  const [invoices,      setInvoices]      = useState([])
  const [invoicesPage,  setInvoicesPage]  = useState(1)
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [upgrading, setUpgrading] = useState(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promoDraft, setPromoDraft] = useState(null)
  const [promoBusy, setPromoBusy] = useState(false)
  const [promoMessage, setPromoMessage] = useState('')
  const [promoError, setPromoError] = useState('')
  const [banner,    setBanner]    = useState(
    searchParams.get('success')  ? 'success'  :
    searchParams.get('canceled') ? 'canceled' : null
  )
  const [billing, setBilling] = useState<'month' | 'year'>('month')

  useEffect(() => {
    const isSuccess = searchParams.get('success') === '1'

    // After a successful checkout, sync the plan from Stripe before loading usage
    const loadUsage = isSuccess
      ? api.post('/billing/sync', {}).catch(() => {}).then(() => api.get('/users/me/usage'))
      : api.get('/users/me/usage')

    loadUsage.then(setUsage).catch(() => {})

    api.get('/billing/plans')
      .then(raw => {
        const normalized = (Array.isArray(raw) ? raw : []).map(normalizePlan)
        if (!normalized.some(p => p.key === 'free')) {
          normalized.unshift({ ...FALLBACK_FREE })
        }
        setPlans(normalized)
      })
      .catch(() => setPlans([{ ...FALLBACK_FREE }]))

    if (searchParams.get('success') || searchParams.get('canceled')) {
      setSearchParams({}, { replace: true })
    }
  }, [])

  useEffect(() => {
    if (tab !== 'invoices') return
    setInvoicesPage(1)
    setLoadingInvoices(true)
    api.get('/billing/invoices').then(setInvoices).catch(() => {}).finally(() => setLoadingInvoices(false))
  }, [tab])

  const invoicesTotalPages = Math.max(1, Math.ceil(invoices.length / INVOICES_PAGE_SIZE))
  const paginatedInvoices  = invoices.slice((invoicesPage - 1) * INVOICES_PAGE_SIZE, invoicesPage * INVOICES_PAGE_SIZE)

  async function handleUpgrade(planKey) {
    setUpgrading(planKey)
    try {
      const { url } = await api.post('/billing/checkout', {
        plan: planKey,
        interval: billing,
        origin: window.location.origin,
        promo_code: promoDraft?.code || undefined,
      })
      window.location.href = url
    } catch (err) {
      alert(err.message || 'Failed to open checkout.')
      setUpgrading(null)
    }
  }

  async function handlePortal() {
    setPortalBusy(true)
    try {
      const { url } = await api.post('/billing/portal', { origin: window.location.origin })
      window.location.href = url
    } catch (err) {
      alert(err.message || 'Failed to open billing portal.')
      setPortalBusy(false)
    }
  }

  async function applyPromoCode() {
    const code = promoInput.trim().toUpperCase()
    if (!code) {
      setPromoError('Enter a promo code to apply it.')
      setPromoMessage('')
      setPromoDraft(null)
      return
    }
    setPromoBusy(true)
    setPromoError('')
    setPromoMessage('')
    try {
      const promo = await api.post('/billing/promocode/validate', { code })
      setPromoDraft(promo)
      setPromoInput(promo.code)
      setPromoMessage(`${promo.code} is ready. The discount will be applied when you pick a paid plan.`)
    } catch (err) {
      setPromoDraft(null)
      setPromoError(err.message || 'Unable to validate promo code.')
    } finally {
      setPromoBusy(false)
    }
  }

  function clearPromoCode() {
    setPromoInput('')
    setPromoDraft(null)
    setPromoError('')
    setPromoMessage('')
  }

  const plan       = usage?.plan          ?? 'free'
  const used       = usage?.meetings_used ?? 0
  const limit      = usage?.meetings_limit ?? null  // null = unlimited
  const pct        = limit != null && limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const planLabel  = (plans ?? []).find(p => p.key === plan)?.name ?? (plan.charAt(0).toUpperCase() + plan.slice(1))
  const isPaid     = plan !== 'free'
  const remaining  = limit != null ? Math.max(limit - used, 0) : null
  const barColor   = pct >= 90 ? 'from-red-500 to-rose-500' : pct >= 60 ? 'from-amber-500 to-orange-500' : 'from-violet-500 to-indigo-500'

  return (
    <div className="flex h-screen app-bg app-grid overflow-hidden">
      <Sidebar active="billing" />

      <main className="min-w-0 flex-1 overflow-y-auto">
        {/* top bar */}
        <div className="sticky top-0 z-10 py-4 pl-16 pr-4 sm:px-6 lg:px-8 glass-card border-b">
          <h1 className="text-lg font-bold t1">Billing & subscription</h1>
          <p className="text-xs t3">Manage your plan and payment details</p>
        </div>

        <div className="flex flex-col items-stretch gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:flex-row xl:items-start">

          {/* ── Left column ── */}
          <div className="flex-1 min-w-0">

            {/* banners */}
            <AnimatePresence>
              {banner && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3.5 sm:px-5 ${
                    banner === 'success'
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}
                >
                  {banner === 'success'
                    ? <CheckCircle size={16} className="shrink-0 text-green-500" />
                    : <AlertCircle size={16} className="shrink-0 text-amber-500" />}
                  <p className="text-sm font-medium flex-1">
                    {banner === 'success'
                      ? 'Payment successful — your plan has been upgraded!'
                      : 'Checkout was cancelled. No charge was made.'}
                  </p>
                  <button onClick={() => setBanner(null)}>
                    <X size={15} className="opacity-50 hover:opacity-80 transition" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* current plan banner */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-6 flex flex-col gap-5 glass-card border rounded-2xl p-4 sm:flex-row sm:items-center sm:p-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <Sparkles size={22} className="text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                  <p className="font-bold t1">{planLabel} plan</p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">Active</span>
                </div>
                {usage ? (
                  <p className="text-sm text-gray-400">
                    {used}{limit != null ? ` of ${limit}` : ''} meetings used this month
                    {remaining !== null ? ` · ${remaining} remaining` : ' · unlimited'}
                  </p>
                ) : (
                  <div className="h-3 w-48 bg-white/[0.06] rounded animate-pulse mt-1" />
                )}
                <div className="mt-3 h-1.5 w-full max-w-64 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className={`h-full bg-gradient-to-r ${barColor} rounded-full`}
                  />
                </div>
              </div>
              {isPaid ? (
                <button
                  onClick={() => navigate('/subscription')}
                  className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all hover:border-violet-400/40 rounded-full sm:w-auto"
                >
                  <CreditCard size={14} />
                  Manage subscription
                </button>
              ) : (
                <button
                  onClick={() => setTab('plan')}
                  className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition-all hover:opacity-90 sm:w-auto"
                >
                  <Zap size={14} /> Upgrade
                </button>
              )}
            </motion.div>

            {/* tabs */}
            <div className="mb-6 grid w-full grid-cols-3 gap-1 rounded-xl bg-white/[0.06] p-1 sm:inline-grid sm:w-auto">
              {[['plan', 'Plans'], ['payment', 'Payment'], ['invoices', 'Invoices']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === key ? 'bg-white/10 text-white shadow-sm' : 't3 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Plans tab ── */}
            {tab === 'plan' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {/* Billing period toggle */}
              <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] p-1">
                  {(['month', 'year'] as const).map(b => (
                    <button key={b} onClick={() => setBilling(b)}
                      className={`relative px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        billing === b ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30' : 't3 hover:text-white'
                      }`}>
                      {b === 'month' ? 'Monthly' : 'Yearly'}
                      {b === 'year' && (
                        <span className="ml-1.5 inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                          −20%
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {billing === 'year' && (
                  <motion.p initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                    className="text-xs font-medium text-emerald-400">
                    💰 You save ~20% with yearly billing
                  </motion.p>
                )}
              </div>

              {plans === null ? (
                <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="glass-card border rounded-2xl h-80 animate-pulse" />
                  ))}
                </div>
              ) : (
              <div className={`mb-6 grid gap-5 ${plans.length === 1 ? 'grid-cols-1' : plans.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
                  {plans.map((p, i) => (
                    <PlanCard
                      key={p.key}
                      plan={p}
                      idx={i}
                      currentPlan={plan}
                      onUpgrade={handleUpgrade}
                      upgrading={upgrading}
                      promoCode={promoDraft}
                      billing={billing}
                    />
                  ))}
                </div>
                )}
                <div className="mb-6 glass-card border rounded-2xl p-4 sm:p-6">
                  <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold t1">Promo code</p>
                      <p className="mt-1 text-xs t3">Apply campaign discounts before starting checkout.</p>
                    </div>
                    {promoDraft ? (
                      <button
                        onClick={clearPromoCode}
                        className="w-full rounded-full border border-white/10 px-3 py-2 text-xs font-semibold t2 transition hover:bg-white/[0.05] sm:w-auto"
                      >
                        Remove code
                      </button>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                      <TicketPercent size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-violet-400" />
                      <input
                        value={promoInput}
                        onChange={(event) => {
                          setPromoInput(event.target.value.toUpperCase())
                          setPromoDraft(null)
                          setPromoError('')
                          setPromoMessage('')
                        }}
                        placeholder="Enter promo code"
                        className="w-full rounded-2xl glass-input border py-3 pl-11 pr-4 text-sm font-semibold uppercase tracking-[0.18em] outline-none transition focus:border-violet-500/50"
                      />
                    </div>
                    <button
                      onClick={applyPromoCode}
                      disabled={promoBusy}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:opacity-95 disabled:opacity-70 lg:w-auto"
                    >
                      {promoBusy ? <Loader2 size={15} className="animate-spin" /> : <TicketPercent size={15} />}
                      {promoBusy ? 'Checking…' : 'Apply promo'}
                    </button>
                  </div>

                  {promoError ? <p className="mt-3 text-sm font-medium text-red-500">{promoError}</p> : null}
                  {promoMessage ? <p className="mt-3 text-sm font-medium text-emerald-600">{promoMessage}</p> : null}

                  {promoDraft ? (
                    <div className="mt-5 grid gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 md:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400">Offer</p>
                        <p className="mt-1 text-sm font-semibold t1">{promoDraft.display_discount}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400">Code</p>
                        <p className="mt-1 text-sm font-semibold t1">{promoDraft.code}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400">Availability</p>
                        <p className="mt-1 text-sm font-semibold t1">
                          {promoDraft.remaining_uses === null ? 'Unlimited uses' : `${promoDraft.remaining_uses} uses left`}
                        </p>
                      </div>
                      {promoDraft.description ? (
                        <div className="md:col-span-3">
                          <p className="text-sm t2">{promoDraft.description}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="glass-card border rounded-2xl p-4 text-center sm:p-6">
                  <p className="text-sm font-semibold t1 mb-1">Need a custom enterprise plan?</p>
                  <p className="text-xs t3 mb-4">Unlimited users, SLA, custom templates, and dedicated support.</p>
                  <a href="mailto:hello@minuteai.com" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-400 hover:text-violet-300 transition">
                    Contact us <ArrowRight size={13} />
                  </a>
                </div>
              </motion.div>
            )}

            {/* ── Payment tab ── */}
            {tab === 'payment' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {isPaid ? (
                  <div className="flex flex-col items-center gap-5 glass-card border rounded-2xl p-6 text-center sm:p-8">
                    <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                      <CreditCard size={24} className="text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-bold t1 mb-1">Manage your payment method</h3>
                      <p className="text-sm t3 max-w-xs">
                        Update your card, billing address, or cancel your subscription via the Stripe customer portal.
                      </p>
                    </div>
                    <button
                      onClick={handlePortal}
                      disabled={portalBusy}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 sm:w-auto"
                    >
                      {portalBusy ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                      Open billing portal
                    </button>
                    <p className="flex items-center justify-center gap-1.5 text-xs t3">
                      <Shield size={11} className="t3" />
                      Secured by Stripe — we never store card details
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center glass-card border rounded-2xl p-6 text-center sm:p-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mb-4">
                      <CreditCard size={28} className="text-slate-500" />
                    </div>
                    <h3 className="font-bold t1 mb-1">No payment method on file</h3>
                    <p className="text-sm text-gray-400 mb-6 max-w-xs">
                      You're on the free plan — no card required. Add one when you're ready to upgrade.
                    </p>
                    <button
                      onClick={() => setTab('plan')}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:from-violet-500 hover:to-indigo-500 sm:w-auto"
                    >
                      <Zap size={14} /> View upgrade options
                    </button>
                    <p className="mt-4 flex items-center justify-center gap-1.5 text-xs t3">
                      <Shield size={11} className="t3" />
                      Payments processed securely via Stripe
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Invoices tab ── */}
            {tab === 'invoices' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {loadingInvoices ? (
                  <div className="flex flex-col items-center gap-3 glass-card border rounded-2xl p-8 sm:p-10">
                    <Loader2 size={22} className="text-violet-400 animate-spin" />
                    <p className="text-sm text-gray-400">Loading invoices…</p>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="flex flex-col items-center glass-card border rounded-2xl p-8 text-center sm:p-12">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center mb-4">
                      <Receipt size={24} className="text-gray-300" />
                    </div>
                    <h3 className="font-bold t1 mb-1">No invoices yet</h3>
                    <p className="text-sm text-gray-400">Invoices appear here once you upgrade to a paid plan.</p>
                  </div>
                ) : (
                  <div className="glass-card border rounded-2xl overflow-hidden">
                    <div className="divide-y divide-[var(--divider)]">
                      {paginatedInvoices.map((inv, i) => (
                        <motion.div
                          key={inv.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.04 }}
                          className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                        >
                          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                            <Receipt size={15} className="text-violet-400" />
                          </div>
                          <div className="min-w-0 flex-1 self-stretch sm:self-auto">
                            <p className="text-sm font-semibold t1 truncate">{inv.desc}</p>
                            <p className="text-xs t3 mt-0.5">{fmtDate(inv.date)}</p>
                          </div>
                          <span className="text-sm font-bold t1 sm:ml-auto">{inv.amount}</span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            inv.status === 'paid' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {inv.status === 'paid' ? 'Paid' : inv.status}
                          </span>
                          {inv.pdf && (
                            <a
                              href={inv.pdf}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs font-semibold text-violet-400 transition-colors hover:text-violet-300"
                            >
                              <FileText size={12} /> PDF
                            </a>
                          )}
                        </motion.div>
                      ))}
                    </div>
                    <Pagination page={invoicesPage} totalPages={invoicesTotalPages} total={invoices.length} onPage={setInvoicesPage} />
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="w-full shrink-0 space-y-4 xl:w-72">

            {/* usage summary */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="glass-card border rounded-2xl p-5"
            >
              <p className="text-sm font-bold t1 mb-4">This month</p>
              <div className="space-y-3">
                {[
                  { icon: FileText, label: 'Meetings processed', value: usage ? `${used} / ${limit ?? '∞'}` : '—', color: 'text-violet-600', bg: 'bg-violet-50' },
                  { icon: Clock,    label: 'Plan',               value: planLabel,                            color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                ].map(({ icon: Icon, label, value, color, bg }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                      <Icon size={14} className={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs t3">{label}</p>
                      <p className="text-sm font-bold t1">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="t3 font-medium">Usage</span>
                  <span className={`font-semibold ${pct >= 90 ? 'text-red-400' : 'text-violet-400'}`}>{Math.round(pct)}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className={`h-full bg-gradient-to-r ${barColor} rounded-full`}
                  />
                </div>
                {pct >= 90 && (
                  <p className="text-xs text-red-500 font-medium mt-2">Almost at your limit!</p>
                )}
              </div>
            </motion.div>

            {/* upgrade nudge (only for free/pro) */}
            {plan !== 'team' && plans && plans.length > 1 && (() => {
              const nextPlan = plans.find(p => p.key !== 'free' && p.key !== plan)
              if (!nextPlan) return null
              return (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.18 }}
                  className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Crown size={15} className="text-violet-200" />
                    <p className="text-sm font-bold">Upgrade to {nextPlan.name}</p>
                  </div>
                  <p className="text-xs text-violet-200 leading-relaxed mb-4">
                    {nextPlan.desc || `Unlock more with the ${nextPlan.name} plan.`}
                  </p>
                  <button
                    onClick={() => handleUpgrade(nextPlan.key)}
                    disabled={!!upgrading}
                    className="w-full py-2.5 rounded-full bg-white text-violet-700 text-sm font-bold hover:bg-violet-50 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    {upgrading ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                    {upgrading ? 'Redirecting…' : 'Upgrade now'}
                  </button>
                  {promoDraft ? <p className="mt-3 text-xs text-violet-200">{promoDraft.code} will be applied automatically.</p> : null}
                </motion.div>
              )
            })()}

            {/* help */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.26 }}
              className="glass-card border rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle size={15} className="text-violet-400" />
                <p className="text-sm font-bold t1">Billing help</p>
              </div>
              <div className="space-y-2 text-xs t3">
                <p>Questions about your plan or charges?</p>
                <a href="mailto:hello@minuteai.com" className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                  Contact support <ArrowRight size={11} />
                </a>
              </div>
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  )
}
