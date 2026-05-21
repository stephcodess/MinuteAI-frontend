import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, CreditCard, Calendar, CheckCircle, AlertCircle,
  Loader2, ExternalLink, Receipt, FileText, Crown, Zap,
  RefreshCw, XCircle, Shield, ChevronRight, Clock, Plus, X,
} from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import StripeCardForm from '../../components/StripeCardForm'
import { api, attachPaymentMethod } from '../../lib/api'

function fmtDate(unix) {
  if (!unix) return '—'
  return new Date(unix * 1000).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtPrice(amount, currency) {
  const symbols = { gbp: '£', usd: '$', eur: '€' }
  const sym = symbols[(currency || 'gbp').toLowerCase()] || currency?.toUpperCase()
  const val = (amount || 0) / 100
  return `${sym}${val === Math.floor(val) ? val : val.toFixed(2)}`
}

const STATUS_STYLE = {
  active:             { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/30',  label: 'Active' },
  trialing:           { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30',   label: 'Trial' },
  past_due:           { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/30',  label: 'Past due' },
  canceled:           { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30',    label: 'Cancelled' },
  unpaid:             { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30',    label: 'Unpaid' },
  incomplete:         { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/30',  label: 'Incomplete' },
  incomplete_expired: { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30',    label: 'Expired' },
}

export default function Subscription() {
  const navigate  = useNavigate()
  const [sub,      setSub]      = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [invoices, setInvoices] = useState([])
  const [loadingInv, setLoadingInv] = useState(false)
  const [portalBusy, setPortalBusy] = useState<string | boolean>(false)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    api.get('/billing/subscription')
      .then(setSub)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
    setLoadingInv(true)
    api.get('/billing/invoices')
      .then(setInvoices)
      .catch(() => {})
      .finally(() => setLoadingInv(false))
  }, [])

  async function openPortal(action = '') {
    setPortalBusy(action || true)
    try {
      const { url } = await api.post('/billing/portal', { origin: window.location.origin })
      window.location.href = url
    } catch (e) {
      alert(e.message || 'Failed to open billing portal.')
      setPortalBusy(false)
    }
  }

  const isFree      = !sub || sub.status === 'free'
  const isCanceling = sub?.cancel_at_period_end
  const statusMeta  = STATUS_STYLE[sub?.status] || STATUS_STYLE.active

  return (
    <div className="flex h-screen app-bg app-grid overflow-hidden">
      <Sidebar active="billing" />

      <main className="min-w-0 flex-1 overflow-y-auto page-content">
        {/* sticky top bar */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4 pl-16 sm:px-6 lg:px-8 glass-card border-b">
          <Link to="/billing" className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--nav-hover-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}>
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Manage subscription</h1>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>View and manage your plan, payment, and billing history</p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 size={24} className="text-violet-400 animate-spin" />
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Loading subscription…</p>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:p-6">
              <AlertCircle size={18} className="text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : isFree ? (
            <FreePlanView onUpgrade={() => navigate('/billing')} />
          ) : (
            <ActiveSubView
              sub={sub}
              invoices={invoices}
              loadingInv={loadingInv}
              portalBusy={portalBusy}
              isCanceling={isCanceling}
              statusMeta={statusMeta}
              onPortal={openPortal}
              onChangePlan={() => navigate('/billing')}
              onCardUpdated={async () => {
                const updated = await api.get('/billing/subscription').catch(() => null)
                if (updated) setSub(updated)
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function FreePlanView({ onUpgrade }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col items-center glass-card border rounded-2xl p-6 text-center sm:p-10">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
          <Crown size={28} className="text-violet-400" />
        </div>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-1)' }}>You're on the Free plan</h2>
        <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-3)' }}>
          Upgrade to unlock more meetings, longer recordings, and priority processing.
        </p>
        <button onClick={onUpgrade}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)] transition-all sm:w-auto">
          <Zap size={14} /> View upgrade options
        </button>
      </div>
    </motion.div>
  )
}

function ActiveSubView({ sub, invoices, loadingInv, portalBusy, isCanceling, statusMeta, onPortal, onChangePlan, onCardUpdated }) {
  const [showCardForm, setShowCardForm] = useState(false)
  const isTrialing = sub.status === 'trialing'

  async function handleCardSubmit(pmId: string) {
    await attachPaymentMethod(pmId)
  }

  async function handleCardComplete() {
    setShowCardForm(false)
    await onCardUpdated()
  }

  return (
    <div className="space-y-5">

      {/* canceling banner */}
      <AnimatePresence>
        {isCanceling && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 text-amber-400 sm:flex-row sm:items-center sm:px-5"
          >
            <AlertCircle size={16} className="shrink-0" />
            <p className="flex-1 text-sm font-medium">
              Your subscription will end on <strong>{fmtDate(sub.cancel_at || sub.current_period_end)}</strong> — you keep access until then.
            </p>
            <button onClick={() => onPortal('renew')} disabled={!!portalBusy}
              className="flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-full border border-amber-500/30 px-3 py-2 text-xs font-semibold transition hover:bg-amber-500/10 sm:w-auto">
              {portalBusy === 'renew' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Renew
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* plan card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="glass-card border rounded-2xl overflow-hidden">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-5 sm:flex-row sm:items-center sm:px-6">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Crown size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-white text-lg">{sub.plan_name}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
                {statusMeta.label}
              </span>
            </div>
            <p className="text-violet-200 text-sm mt-0.5">
              {fmtPrice(sub.amount, sub.currency)}/{sub.interval || 'month'} ·{' '}
              {isCanceling
                ? `Ends ${fmtDate(sub.cancel_at || sub.current_period_end)}`
                : isTrialing
                  ? `Trial ends ${fmtDate(sub.trial_end || sub.current_period_end)}`
                  : `Renews ${fmtDate(sub.current_period_end)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:px-6">
          <button onClick={() => onPortal('manage')} disabled={!!portalBusy}
            className="flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-2)' }}>
            {portalBusy === 'manage' ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
            Manage in Stripe
          </button>
          <button onClick={onChangePlan}
            className="flex items-center justify-center gap-2 rounded-full bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-400 transition-all hover:bg-violet-500/20">
            <Zap size={13} /> Change plan
          </button>
        </div>
      </motion.div>

      {/* two-col: payment + billing dates */}
      <div className="grid gap-5 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.07 }}
          className="flex flex-col glass-card border rounded-2xl p-4 sm:p-5">
          <p className="text-sm font-bold mb-4" style={{ color: 'var(--text-1)' }}>Payment method</p>
          <div className="flex flex-1 items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <CreditCard size={16} className="text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                {sub.card?.last4 ? `•••• •••• •••• ${sub.card.last4}` : 'No card on file'}
              </p>
              {sub.card?.brand && (
                <p className="text-xs capitalize" style={{ color: 'var(--text-3)' }}>
                  {sub.card.brand} · expires {sub.card.exp_month}/{sub.card.exp_year}
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--divider)' }}>
            {showCardForm ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>New card details</p>
                  <button onClick={() => setShowCardForm(false)} className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
                    <X size={12} /> Cancel
                  </button>
                </div>
                <StripeCardForm
                  onSubmit={handleCardSubmit}
                  onComplete={handleCardComplete}
                  buttonLabel="Update card"
                />
              </div>
            ) : (
              <button
                onClick={() => setShowCardForm(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 transition-colors hover:text-violet-300"
              >
                <Plus size={11} /> Update payment method
              </button>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}
          className="glass-card border rounded-2xl p-4 sm:p-5">
          <p className="text-sm font-bold mb-4" style={{ color: 'var(--text-1)' }}>Billing dates</p>
          <div className="space-y-3">
            {[
              { icon: Calendar, label: 'Current period start', value: fmtDate(sub.current_period_start) },
              { icon: Clock,    label: isCanceling ? 'Access ends' : isTrialing ? 'Trial ends' : 'Next renewal', value: fmtDate(sub.trial_end || sub.current_period_end) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* invoice history */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.18 }}
        className="glass-card border rounded-2xl overflow-hidden">
        <div className="px-4 py-4 sm:px-6" style={{ borderBottom: '1px solid var(--divider)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Invoice history</p>
        </div>
        {loadingInv ? (
          <div className="flex items-center justify-center py-10 gap-2">
            <Loader2 size={16} className="animate-spin text-violet-400" />
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Loading invoices…</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2">
            <Receipt size={22} style={{ color: 'var(--text-3)' }} />
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>No invoices yet</p>
          </div>
        ) : (
          invoices.map((inv, i) => (
            <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
              className="flex flex-col gap-3 px-4 py-4 transition-colors last:border-0 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-3.5"
              style={{ borderBottom: '1px solid var(--divider)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--nav-hover-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <Receipt size={13} className="text-violet-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{inv.desc}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{fmtDate(inv.date)}</p>
              </div>
              <span className="text-sm font-bold sm:ml-auto" style={{ color: 'var(--text-1)' }}>{inv.amount}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                inv.status === 'paid' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {inv.status === 'paid' ? 'Paid' : inv.status}
              </span>
              {inv.pdf && (
                <a href={inv.pdf} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300">
                  <FileText size={12} /> PDF
                </a>
              )}
            </motion.div>
          ))
        )}
      </motion.div>

      {/* cancel zone */}
      {!isCanceling && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.24 }}
          className="glass-card border border-red-500/20 rounded-2xl p-4 sm:p-6">
          <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-1)' }}>Cancel subscription</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
            You'll keep access until {fmtDate(sub.current_period_end)}. After that your account moves to the free tier.
          </p>
          <button onClick={() => onPortal('cancel')} disabled={!!portalBusy}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-60 sm:w-auto">
            {portalBusy === 'cancel' ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
            Cancel subscription
          </button>
        </motion.div>
      )}
    </div>
  )
}
