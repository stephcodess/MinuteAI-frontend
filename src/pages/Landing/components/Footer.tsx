import { Link } from 'react-router-dom'
import { Mic, ExternalLink } from 'lucide-react'

const links = {
  Product: [
    { label: 'How it works', to: '/#how-it-works' },
    { label: 'Features', to: '/#features' },
    { label: 'Pricing', to: '/pricing' },
  ],
  Company: [
    { label: 'About', to: '/' },
    { label: 'Blog', to: '/' },
    { label: 'Careers', to: '/' },
  ],
  Legal: [
    { label: 'Privacy policy', to: '/' },
    { label: 'Terms of service', to: '/' },
    { label: 'Security', to: '/' },
  ],
}

const socials = [
  { icon: ExternalLink, label: 'Twitter', href: '#' },
  { icon: ExternalLink, label: 'LinkedIn', href: '#' },
  { icon: ExternalLink, label: 'GitHub', href: '#' },
]

export default function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#080b14] px-4 pt-16 pb-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Top */}
        <div className="mb-12 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="mb-4 flex items-center gap-2 text-base font-bold text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
                <Mic size={15} className="text-white" />
              </div>
              MinuteAI
            </Link>
            <p className="text-sm leading-relaxed text-slate-500">
              Professional meeting minutes in under 2 minutes.
            </p>
            {/* Socials */}
            <div className="mt-5 flex gap-3">
              {socials.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-500 transition hover:border-white/20 hover:text-white"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-600">
                {group}
              </p>
              <ul className="space-y-3">
                {items.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="text-sm text-slate-500 transition-colors hover:text-slate-200"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/8 pt-8 sm:flex-row">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} MinuteAI. All rights reserved.
          </p>
          <p className="text-xs text-slate-700">
            Built with ♥ and OpenAI Whisper + Claude
          </p>
        </div>
      </div>
    </footer>
  )
}
