import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, LayoutDashboard, LogOut, ChevronDown, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isSignedIn, user, signOut } = useAuth()
  const isHome = pathname === '/'
  const isDashboard = ['/dashboard', '/billing', '/settings', '/team', '/upload', '/processing', '/results', '/subscription', '/tasks', '/meeting-bots'].some(p => pathname.startsWith(p))
  const isAuth = pathname === '/login' || pathname === '/signup' || pathname === '/verify-email' || pathname === '/forgot-password'
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (isDashboard || isAuth || !isHome) { setScrolled(false); return }
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome, isDashboard, isAuth])

  if (isDashboard || isAuth) return null

  const dark = isHome && !scrolled

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <>
      <nav className={`z-50 px-6 py-4 transition-all duration-300 ${
        isHome ? 'fixed top-0 left-0 right-0' : 'sticky top-0'
      } ${
        dark ? 'bg-transparent' : 'bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm'
      }`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className={`flex items-center gap-2 font-semibold text-lg transition-colors ${dark ? 'text-white' : 'text-gray-900'}`}>
            <Mic className={dark ? 'text-violet-400' : 'text-violet-600'} size={22} />
            MinuteAI
          </Link>

          <div className="flex items-center gap-6 text-sm">
            <a href="/#how-it-works" className={`font-medium transition-colors ${dark ? 'text-slate-300 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              How it works
            </a>
            <a href="/#features" className={`font-medium transition-colors ${dark ? 'text-slate-300 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              Features
            </a>
            <Link to="/pricing" className={`font-medium transition-colors ${pathname === '/pricing' ? 'text-violet-600' : dark ? 'text-slate-300 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              Pricing
            </Link>

            {isSignedIn ? (
              /* signed-in: avatar dropdown */
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border transition-all ${
                    dark ? 'border-white/20 hover:bg-white/10' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                    {user?.avatar_url
                      ? <img src={`${BASE}${user.avatar_url}`} alt="" className="w-full h-full object-cover" />
                      : initials}
                  </div>
                  <span className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-700'}`}>
                    {user?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown size={14} className={`${dark ? 'text-white/60' : 'text-gray-400'} transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.12 }}
                      onMouseLeave={() => setMenuOpen(false)}
                      className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <LayoutDashboard size={15} className="text-gray-400" />
                          Dashboard
                        </Link>
                        <Link to="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <User size={15} className="text-gray-400" />
                          Account settings
                        </Link>
                      </div>
                      <div className="py-1 border-t border-gray-100">
                        <button
                          onClick={() => { signOut(); setMenuOpen(false); navigate('/') }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
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
              /* signed-out: login + CTA */
              <div className="flex items-center gap-3">
                <Link to="/login" className={`font-medium transition-colors ${dark ? 'text-slate-300 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                  Sign in
                </Link>
                <Link to="/signup" className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dark
                    ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur'
                    : 'bg-violet-600 hover:bg-violet-700 text-white'
                }`}>
                  Get started free
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      {!isHome && <div className="h-0" />}
    </>
  )
}
