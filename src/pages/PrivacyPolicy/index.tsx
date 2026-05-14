import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Shield, ArrowLeft, ChevronRight } from 'lucide-react'

const sections = [
  {
    id: 'information-we-collect',
    title: '1. Information We Collect',
    content: [
      {
        subtitle: 'Account Information',
        text: 'When you register, we collect your name, email address, and password (stored as a secure hash). If you sign in with Google, we receive your name, email, and profile picture from Google OAuth.',
      },
      {
        subtitle: 'Meeting Recordings',
        text: 'When you upload audio or video files, we temporarily store them on our secure servers solely for the purpose of transcription and summarisation. These files are permanently deleted within 24 hours of processing.',
      },
      {
        subtitle: 'Usage Data',
        text: 'We collect anonymised usage data such as pages visited, features used, and session duration to help us improve the product. This data is never linked to identifiable personal information.',
      },
      {
        subtitle: 'Payment Information',
        text: 'Payments are processed by Stripe. We do not store your card number or billing details — only a Stripe customer ID and subscription status.',
      },
    ],
  },
  {
    id: 'how-we-use',
    title: '2. How We Use Your Information',
    content: [
      {
        subtitle: 'Service Delivery',
        text: 'We use your recordings exclusively to generate meeting transcripts and minutes. Your audio is sent to OpenAI Whisper for transcription and Claude AI for structuring — both operate under strict data processing agreements.',
      },
      {
        subtitle: 'Communications',
        text: 'We may email you transactional notifications (e.g. when your minutes are ready, billing receipts). You can opt out of marketing emails at any time from your account settings.',
      },
      {
        subtitle: 'Improvement',
        text: 'Aggregated, anonymised usage data helps us understand which features are most valuable. We never use your meeting content to train AI models.',
      },
    ],
  },
  {
    id: 'data-sharing',
    title: '3. Data Sharing & Third Parties',
    content: [
      {
        subtitle: 'We never sell your data',
        text: 'MinuteAI does not sell, rent, or trade your personal information to any third party, ever.',
      },
      {
        subtitle: 'Service Providers',
        text: 'We work with a limited set of trusted service providers: OpenAI (transcription & AI), Stripe (payments), and cloud infrastructure providers. Each is bound by strict data processing agreements.',
      },
      {
        subtitle: 'Legal Requirements',
        text: 'We may disclose data if required by law, court order, or to protect the rights and safety of MinuteAI or its users.',
      },
    ],
  },
  {
    id: 'data-retention',
    title: '4. Data Retention & Deletion',
    content: [
      {
        subtitle: 'Audio & Video Files',
        text: 'All uploaded recordings are permanently and automatically deleted within 24 hours of processing. No exceptions.',
      },
      {
        subtitle: 'Transcripts & Minutes',
        text: 'Generated minutes are stored in your account until you delete them, or until you close your account.',
      },
      {
        subtitle: 'Account Closure',
        text: 'When you delete your account, all associated data including meeting minutes, transcripts, and personal information is permanently erased within 30 days.',
      },
    ],
  },
  {
    id: 'your-rights',
    title: '5. Your Rights (GDPR)',
    content: [
      {
        subtitle: 'Access & Portability',
        text: 'You can request a full export of your personal data at any time by emailing privacy@minuteai.app.',
      },
      {
        subtitle: 'Rectification & Erasure',
        text: 'You can update your account information in Settings. To permanently delete your account and all data, go to Settings → Account → Delete Account.',
      },
      {
        subtitle: 'Objection & Restriction',
        text: 'You have the right to object to or restrict certain types of processing. Contact us at privacy@minuteai.app to exercise these rights.',
      },
    ],
  },
  {
    id: 'security',
    title: '6. Security',
    content: [
      {
        subtitle: 'Encryption',
        text: 'All data is encrypted in transit using TLS 1.3 and at rest using AES-256. Access to production systems is restricted to authorised personnel only.',
      },
      {
        subtitle: 'No Human Review',
        text: 'Your recordings are never listened to or reviewed by any MinuteAI employee. Processing is fully automated.',
      },
    ],
  },
  {
    id: 'cookies',
    title: '7. Cookies',
    content: [
      {
        subtitle: 'Essential Cookies',
        text: 'We use only essential cookies required for authentication and session management. We do not use advertising or tracking cookies.',
      },
    ],
  },
  {
    id: 'changes',
    title: '8. Changes to This Policy',
    content: [
      {
        subtitle: 'Notification',
        text: 'We will notify you by email at least 14 days before any material changes to this policy take effect. Continued use after that date constitutes acceptance.',
      },
    ],
  },
  {
    id: 'contact',
    title: '9. Contact',
    content: [
      {
        subtitle: 'Privacy Enquiries',
        text: 'For any privacy-related questions or to exercise your rights, contact us at privacy@minuteai.app or write to: MinuteAI Ltd, 123 Tech Lane, London, EC1A 1BB, United Kingdom.',
      },
    ],
  },
]

const tableOfContents = sections.map((s) => ({ id: s.id, title: s.title }))

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#080b14]">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(124,58,237,0.08)_0%,transparent_70%)]" />

      <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            to="/"
            className="mb-10 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-300"
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
          className="mb-16"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-400">
            <Shield size={13} />
            Last updated: 14 May 2026
          </div>
          <h1 className="mb-4 text-4xl font-black text-white sm:text-5xl">Privacy Policy</h1>
          <p className="max-w-2xl text-lg text-slate-400 leading-relaxed">
            Your privacy is fundamental to everything we build at MinuteAI. This policy explains what data we collect, how we use it, and the strong protections we put in place.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[260px_1fr]">
          {/* Table of contents — sticky sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="hidden lg:block"
          >
            <div className="sticky top-24 rounded-2xl border border-white/8 bg-white/[0.03] p-5 backdrop-blur-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-600">Contents</p>
              <ul className="space-y-2">
                {tableOfContents.map(({ id, title }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="group flex items-center gap-2 text-xs text-slate-500 transition-colors hover:text-violet-400"
                    >
                      <ChevronRight size={11} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </motion.aside>

          {/* Main content */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="space-y-12"
          >
            {sections.map(({ id, title, content }) => (
              <section key={id} id={id} className="scroll-mt-24">
                <h2 className="mb-6 text-xl font-black text-white">{title}</h2>
                <div className="space-y-5">
                  {content.map(({ subtitle, text }) => (
                    <div
                      key={subtitle}
                      className="rounded-xl border border-white/6 bg-white/[0.02] p-5"
                    >
                      <p className="mb-2 text-sm font-bold text-slate-200">{subtitle}</p>
                      <p className="text-sm leading-relaxed text-slate-400">{text}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Bottom note */}
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-6">
              <p className="text-sm text-slate-400 leading-relaxed">
                Questions? Email us at{' '}
                <a href="mailto:privacy@minuteai.app" className="font-semibold text-violet-400 hover:underline">
                  privacy@minuteai.app
                </a>{' '}
                — we aim to respond within 48 hours.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
