import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, LayoutDashboard, LogOut, ChevronDown, User, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isSignedIn, user, signOut } = useAuth()
  const isHome = pathname === '/'
  const isDashboard = ['/dashboard', '/billing', '/settings', '/team', '/upload', '/processing', '/results', '/subscription', '/tasks', '/meeting-bots', '/translator'].some(p => pathname.startsWith(p))
  const isAuth = ['/login', '/signup', '/verify-email', '/forgot-password', '/onboarding'].includes(pathname)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (isDashboard || isAuth || !isHome) { setScrolled(false); return }
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome, isDashboard, isAuth])

  if (isDashboard || isAuth) return null

  // transparent only on the home hero before scroll; dark glass everywhere else
  const transparent = isHome && !scrolled

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <>
      <nav className={`z-50 px-6 py-4 transition-all duration-300 ${
        isHome ? 'fixed top-0 left-0 right-0' : 'sticky top-0'
      } ${
        transparent
          ? 'bg-transparent'
          : 'bg-[#080b14]/90 backdrop-blur border-b border-white/[0.07] shadow-[0_1px_0_rgba(255,255,255,0.04)]'
      }`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg text-white transition-opacity hover:opacity-80">
            <Mic className="text-violet-400" size={22} />
            MinuteAI
          </Link>

          <div className="hidden items-center gap-6 text-sm md:flex">
            <a href="/#how-it-works" className="font-medium text-slate-400 hover:text-white transition-colors">
              How it works
            </a>
            <a href="/#features" className="font-medium text-slate-400 hover:text-white transition-colors">
              Features
            </a>
            <Link to="/pricing" className={`font-medium transition-colors ${pathname === '/pricing' ? 'text-violet-400' : 'text-slate-400 hover:text-white'}`}>
              Pricing
            </Link>

            {isSignedIn ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-white/15 hover:bg-white/[0.07] transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                    {user?.avatar_url
                      ? <img src={`${BASE}${user.avatar_url}`} alt="" className="w-full h-full object-cover" />
                      : initials}
                  </div>
                  <span className="text-sm font-medium text-slate-200">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.12 }}
                      onMouseLeave={() => setMenuOpen(false)}
                      className="absolute right-0 top-full mt-2 w-52 bg-[#111827] rounded-2xl shadow-xl border border-white/10 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-white/[0.07]">
                        <p className="text-sm font-semibold text-white">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors">
                          <LayoutDashboard size={15} className="text-slate-500" />
                          Dashboard
                        </Link>
                        <Link to="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors">
                          <User size={15} className="text-slate-500" />
                          Account settings
                        </Link>
                      </div>
                      <div className="py-1 border-t border-white/[0.07]">
                        <button
                          onClick={() => { signOut(); setMenuOpen(false); navigate('/') }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut size={15} />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="font-medium text-slate-400 hover:text-white transition-colors">
                  Sign in
                </Link>
                <Link to="/signup" className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  transparent
                    ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur'
                    : 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_16px_rgba(124,58,237,0.35)]'
                }`}>
                  Get started free
                </Link>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-white transition hover:bg-white/[0.1] md:hidden"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm md:hidden"
              aria-label="Close navigation backdrop"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 right-0 z-[100] flex w-80 max-w-[86vw] flex-col bg-[#0d1117] border-l border-white/[0.07] shadow-2xl md:hidden"
            >
              <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-500/20 border border-violet-400/30">
                  <Mic size={17} className="text-violet-300" />
                </div>
                <span className="text-base font-bold text-white">MinuteAI</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="ml-auto flex h-9 w-9 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Close navigation"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex flex-1 flex-col px-4 py-5">
                <div className="space-y-1">
                  {[
                    { label: 'How it works', to: '/#how-it-works' },
                    { label: 'Features', to: '/#features' },
                    { label: 'Pricing', to: '/pricing' },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-2xl px-4 py-3 text-sm font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="mt-auto border-t border-white/[0.07] pt-5">
                  {isSignedIn ? (
                    <>
                      <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white/[0.05] border border-white/[0.07] px-4 py-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-white shrink-0">
                          {user?.avatar_url
                            ? <img src={`${BASE}${user.avatar_url}`} alt="" className="h-full w-full object-cover" />
                            : initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                          <p className="truncate text-xs text-slate-500">{user?.email}</p>
                        </div>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
                      >
                        <LayoutDashboard size={16} className="text-slate-500" />
                        Dashboard
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
                      >
                        <User size={16} className="text-slate-500" />
                        Account settings
                      </Link>
                      <button
                        onClick={() => { signOut(); setMobileOpen(false); navigate('/') }}
                        className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
                      >
                        <LogOut size={16} />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <div className="grid gap-3">
                      <Link
                        to="/login"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-full border border-white/15 px-4 py-3 text-center text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        Sign in
                      </Link>
                      <Link
                        to="/signup"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-full bg-violet-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-violet-500"
                      >
                        Get started free
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      {!isHome && <div className="h-0" />}
    </>
  )
}
