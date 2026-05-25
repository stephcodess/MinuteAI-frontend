import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Loader2 } from 'lucide-react'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

const ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#e2e8f0',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      fontSmoothing: 'antialiased',
      '::placeholder': { color: '#475569' },
      ':-webkit-autofill': {
        color: '#e2e8f0',
        transition: 'background-color 5000s ease-in-out 0s',
      },
    },
    invalid: { color: '#f87171', iconColor: '#f87171' },
  },
}

interface InnerProps {
  onSubmit: (pmId: string) => Promise<{ clientSecret?: string } | void>
  onComplete: () => void
  buttonLabel?: string
}

function CardFormInner({ onSubmit, onComplete, buttonLabel = 'Save card' }: InnerProps) {
  const stripe   = useStripe()
  const elements = useElements()
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  // Stripe.js hasn't finished loading yet — show a placeholder that
  // matches the form height so the modal doesn't shift when it appears.
  if (!stripe || !elements) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border px-4 py-4 flex items-center gap-2"
          style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', minHeight: 52 }}>
          <Loader2 size={14} className="animate-spin text-violet-400 shrink-0" />
          <span className="text-sm text-slate-500">Loading payment form…</span>
        </div>
        <div className="flex gap-3">
          {[0, 1].map(i => (
            <div key={i} className="flex-1 rounded-xl border px-4 py-4"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', minHeight: 52 }} />
          ))}
        </div>
        <button disabled
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold opacity-40 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
          {buttonLabel}
        </button>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)

    const card = elements.getElement(CardNumberElement)
    if (!card) { setBusy(false); return }

    const { error: pmErr, paymentMethod } = await stripe.createPaymentMethod({ type: 'card', card })
    if (pmErr) {
      setError(pmErr.message || 'Card error')
      setBusy(false)
      return
    }

    try {
      const result = (await onSubmit(paymentMethod!.id)) as any

      if (result?.clientSecret) {
        const { error: confirmErr } = await stripe.confirmCardPayment(result.clientSecret)
        if (confirmErr) {
          setError(confirmErr.message || 'Card authentication failed. Please try again.')
          setBusy(false)
          return
        }
      }

      onComplete()
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-3">
        <div
          className="rounded-xl border px-4 py-4"
          style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <CardNumberElement options={{ ...ELEMENT_OPTIONS, showIcon: true }} />
        </div>
        <div className="flex gap-3">
          <div
            className="flex-1 rounded-xl border px-4 py-4"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <CardExpiryElement options={ELEMENT_OPTIONS} />
          </div>
          <div
            className="flex-1 rounded-xl border px-4 py-4"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <CardCvcElement options={ELEMENT_OPTIONS} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 px-1">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-60 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25"
      >
        {busy
          ? <><Loader2 size={15} className="animate-spin" /> Processing…</>
          : buttonLabel}
      </button>
    </form>
  )
}

export default function StripeCardForm(props: InnerProps) {
  return (
    <Elements stripe={stripePromise}>
      <CardFormInner {...props} />
    </Elements>
  )
}
