import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FileText, ArrowLeft, ChevronRight } from 'lucide-react'

const sections = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    items: [
      { sub: 'Agreement', text: 'By accessing or using MinuteAI you agree to these Terms. If you do not agree, you must not use the Service.' },
      { sub: 'Eligibility', text: 'You must be at least 16 years of age to use MinuteAI.' },
    ],
  },
  {
    id: 'service',
    title: '2. Service Description',
    items: [
      { sub: 'What We Provide', text: 'MinuteAI processes uploaded audio or video recordings using OpenAI Whisper (transcription) and Claude AI (structuring) to generate meeting minutes.' },
      { sub: 'Availability', text: 'We target high availability but do not guarantee uninterrupted access. Planned maintenance will be communicated in advance where possible.' },
    ],
  },
  {
    id: 'accounts',
    title: '3. User Accounts',
    items: [
      { sub: 'Responsibility', text: 'You are responsible for all activity under your account and for keeping your credentials confidential.' },
      { sub: 'Accurate Info', text: 'You agree to provide accurate information during registration and keep it updated.' },
      { sub: 'Termination', text: 'We may suspend or terminate accounts that violate these Terms or pose a risk to other users.' },
    ],
  },
  {
    id: 'acceptable-use',
    title: '4. Acceptable Use',
    items: [
      { sub: 'Permitted Use', text: 'Upload only recordings of meetings you participated in or for which you have the explicit consent of all participants.' },
      { sub: 'Prohibited', text: 'Do not use MinuteAI to record without consent, process illegal content, reverse-engineer the service, or violate applicable laws.' },
      { sub: 'Recording Laws', text: 'You are solely responsible for complying with consent and recording laws in your jurisdiction.' },
    ],
  },
  {
    id: 'ip',
    title: '5. Intellectual Property',
    items: [
      { sub: 'Your Content', text: 'You retain full ownership of your recordings and generated minutes. You grant MinuteAI a limited licence to process them solely to provide the Service.' },
      { sub: 'Our IP', text: 'The MinuteAI platform, brand, and software are the exclusive property of MinuteAI Ltd.' },
    ],
  },
  {
    id: 'billing',
    title: '6. Payment & Billing',
    items: [
      { sub: 'Free Tier', text: '3 meeting processings per month included at no charge. No credit card required.' },
      { sub: 'Paid Plans', text: 'Billed monthly or annually in advance. All fees are non-refundable except where required by law. Prices may change with 30 days\' notice.' },
      { sub: 'Cancellation', text: 'Cancel anytime from Billing settings. Access continues to end of current period.' },
    ],
  },
  {
    id: 'liability',
    title: '7. Disclaimers & Liability',
    items: [
      { sub: 'AI Accuracy', text: 'AI-generated minutes may contain errors. Always review output before using it for business decisions.' },
      { sub: 'No Warranty', text: 'The Service is provided "as is" without warranties of any kind.' },
      { sub: 'Limitation', text: 'MinuteAI\'s total liability shall not exceed fees paid by you in the 3 months preceding any claim.' },
    ],
  },
  {
    id: 'law',
    title: '8. Governing Law',
    items: [
      { sub: 'Jurisdiction', text: 'These Terms are governed by the laws of England and Wales. Disputes are subject to the exclusive jurisdiction of English courts.' },
    ],
  },
  {
    id: 'changes',
    title: '9. Changes',
    items: [
      { sub: 'Notification', text: 'We will give at least 14 days\' notice of material changes via email. Continued use after the effective date constitutes acceptance.' },
    ],
  },
  {
    id: 'contact-legal',
    title: '10. Contact',
    items: [
      { sub: 'Legal Enquiries', text: 'Email legal@minuteai.app or write to MinuteAI Ltd, 123 Tech Lane, London, EC1A 1BB, United Kingdom.' },
    ],
  },
]

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#080b14]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(99,102,241,0.08)_0%,transparent_70%)]" />

      <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-300">
            <ArrowLeft size={14} /> Back to home
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="mb-16">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-400">
            <FileText size={13} /> Last updated: 14 May 2026
          </div>
          <h1 className="mb-4 text-4xl font-black text-white sm:text-5xl">Terms of Service</h1>
          <p className="max-w-2xl text-lg text-slate-400 leading-relaxed">
            Please read these terms carefully before using MinuteAI. They outline your rights and responsibilities.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[260px_1fr]">
          <motion.aside initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-white/8 bg-white/[0.03] p-5 backdrop-blur-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-600">Contents</p>
              <ul className="space-y-2">
                {sections.map(({ id, title }) => (
                  <li key={id}>
                    <a href={`#${id}`} className="group flex items-center gap-2 text-xs text-slate-500 transition-colors hover:text-indigo-400">
                      <ChevronRight size={11} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </motion.aside>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.1 }} className="space-y-12">
            {sections.map(({ id, title, items }) => (
              <section key={id} id={id} className="scroll-mt-24">
                <h2 className="mb-6 text-xl font-black text-white">{title}</h2>
                <div className="space-y-4">
                  {items.map(({ sub, text }) => (
                    <div key={sub} className="rounded-xl border border-white/6 bg-white/[0.02] p-5">
                      <p className="mb-2 text-sm font-bold text-slate-200">{sub}</p>
                      <p className="text-sm leading-relaxed text-slate-400">{text}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-6">
              <p className="text-sm text-slate-400">
                Questions? Email{' '}
                <a href="mailto:legal@minuteai.app" className="font-semibold text-indigo-400 hover:underline">legal@minuteai.app</a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
