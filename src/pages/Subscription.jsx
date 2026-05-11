import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, CreditCard, Calendar, CheckCircle, AlertCircle,
  Loader2, ExternalLink, Receipt, FileText, Crown, Zap,
  RefreshCw, XCircle, Shield, ChevronRight, Clock,
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { api } from '../lib/api'

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

function cardBrandIcon(brand) {
  const icons = { visa: '💳', mastercard: '💳', amex: '💳', discover: '💳' }
  return icons[brand?.toLowerCase()] || '💳'
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

const STATUS_STYLE = {
  active:             { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  label: 'Active' },
  trialing:           { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'Trial' },
  past_due:           { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  label: 'Past due' },
  canceled:           { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    label: 'Cancelled' },
  unpaid:             { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    label: 'Unpaid' },
  incomplete:         { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  label: 'Incomplete' },
  incomplete_expired: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    label: 'Expired' },
}

export default function Subscription() {
  const navigate  = useNavigate()
  const [sub,      setSub]      = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [invoices, setInvoices] = useState([])
  const [loadingInv, setLoadingInv] = useState(false)
  const [portalBusy, setPortalBusy] = useState(false)
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar active="billing" />

      <main className="flex-1 overflow-y-auto">
        {/* top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-8 py-4 flex items-center gap-3">
          <Link to="/billing" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Manage subscription</h1>
            <p className="text-xs text-gray-400">View and manage your plan, payment, and billing history</p>
          </div>
        </div>

        <div className="px-8 py-8 max-w-3xl">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 size={24} className="text-violet-400 animate-spin" />
              <p className="text-sm text-gray-400">Loading subscription…</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
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
            />
          )}
        </div>
      </main>
    </div>
  )
}

// ── Free plan state ───────────────────────────────────────────────────────────

function FreePlanView({ onUpgrade }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
          <Crown size={28} className="text-violet-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">You're on the Free plan</h2>
        <p className="text-sm text-gray-400 mb-6 max-w-xs">
          Upgrade to unlock more meetings, longer recordings, and priority processing.
        </p>
        <button
          onClick={onUpgrade}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
        >
          <Zap size={14} /> View upgrade options
        </button>
      </div>
    </motion.div>
  )
}

// ── Active subscription view ──────────────────────────────────────────────────

function ActiveSubView({ sub, invoices, loadingInv, portalBusy, isCanceling, statusMeta, onPortal, onChangePlan }) {
  return (
    <div className="space-y-5">

      {/* canceling banner */}
      <AnimatePresence>
        {isCanceling && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800"
          >
            <AlertCircle size={16} className="shrink-0 text-amber-500" />
            <p className="text-sm font-medium flex-1">
              Your subscription will end on <strong>{fmtDate(sub.cancel_at || sub.current_period_end)}</strong> — you keep access until then.
            </p>
            <button
              onClick={() => onPortal('renew')}
              disabled={!!portalBusy}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 whitespace-nowrap"
            >
              {portalBusy === 'renew' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Renew
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* plan card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Crown size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-white text-lg">{sub.plan_name}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
                {statusMeta.label}
              </span>
            </div>
            <p className="text-violet-200 text-sm mt-0.5">
              {fmtPrice(sub.amount, sub.currency)}/{sub.interval || 'month'} ·{' '}
              {isCanceling
                ? `Ends ${fmtDate(sub.cancel_at || sub.current_period_end)}`
                : `Renews ${fmtDate(sub.current_period_end)}`}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 flex flex-wrap gap-3">
          <button
            onClick={() => onPortal('manage')}
            disabled={!!portalBusy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-violet-300 text-gray-700 text-sm font-semibold transition-all disabled:opacity-60"
          >
            {portalBusy === 'manage' ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
            Manage in Stripe
          </button>
          <button
            onClick={onChangePlan}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-semibold transition-all"
          >
            <Zap size={13} /> Change plan
          </button>
        </div>
      </motion.div>

      {/* two-col row: payment + billing dates */}
      <div className="grid grid-cols-2 gap-5">

        {/* payment method */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.07 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col"
        >
          <p className="text-sm font-bold text-gray-900 mb-4">Payment method</p>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <CreditCard size={16} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {sub.card?.last4 ? `•••• •••• •••• ${sub.card.last4}` : 'Managed by Stripe'}
              </p>
              <p className="text-xs text-gray-400">Payment details are stored securely on Stripe</p>
            </div>
          </div>
          <button
            onClick={() => onPortal('payment')}
            disabled={!!portalBusy}
            className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-semibold disabled:opacity-50 transition-colors"
          >
            {portalBusy === 'payment' ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
            Update payment method in Stripe
          </button>
        </motion.div>

        {/* billing dates */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
        >
          <p className="text-sm font-bold text-gray-900 mb-4">Billing dates</p>
          <div className="space-y-3">
            {[
              { icon: Calendar, label: 'Current period start', value: fmtDate(sub.current_period_start) },
              { icon: Clock,    label: isCanceling ? 'Access ends' : 'Next renewal', value: fmtDate(sub.current_period_end) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-900">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* invoice history */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.18 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-50">
          <p className="text-sm font-bold text-gray-900">Invoice history</p>
        </div>

        {loadingInv ? (
          <div className="flex items-center justify-center py-10 gap-2">
            <Loader2 size={16} className="animate-spin text-violet-400" />
            <p className="text-sm text-gray-400">Loading invoices…</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2">
            <Receipt size={22} className="text-gray-300" />
            <p className="text-sm text-gray-400">No invoices yet</p>
          </div>
        ) : (
          invoices.map((inv, i) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 px-6 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <Receipt size={13} className="text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{inv.desc}</p>
                <p className="text-xs text-gray-400">{fmtDate(inv.date)}</p>
              </div>
              <span className="text-sm font-bold text-gray-900">{inv.amount}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                inv.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {inv.status === 'paid' ? 'Paid' : inv.status}
              </span>
              {inv.pdf && (
                <a
                  href={inv.pdf}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-semibold"
                >
                  <FileText size={12} /> PDF
                </a>
              )}
            </motion.div>
          ))
        )}
      </motion.div>

      {/* danger zone */}
      {!isCanceling && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.24 }}
          className="bg-white rounded-2xl border border-red-100 shadow-sm p-6"
        >
          <p className="text-sm font-bold text-gray-900 mb-1">Cancel subscription</p>
          <p className="text-xs text-gray-400 mb-4">
            You'll keep access to your current plan until {fmtDate(sub.current_period_end)}.
            After that your account moves to the free tier.
          </p>
          <button
            onClick={() => onPortal('cancel')}
            disabled={!!portalBusy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-all disabled:opacity-60"
          >
            {portalBusy === 'cancel'
              ? <Loader2 size={13} className="animate-spin" />
              : <XCircle size={13} />}
            Cancel subscription
          </button>
        </motion.div>
      )}
    </div>
  )
}
