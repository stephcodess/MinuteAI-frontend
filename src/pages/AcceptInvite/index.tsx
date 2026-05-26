import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mic, Crown, Shield, Eye, ArrowRight, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'

function Orb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />
}

function GridBg() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="ai-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M 56 0 L 0 0 0 56" fill="none" stroke="white" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ai-grid)" />
    </svg>
  )
}

const ROLE_META: Record<string, { icon: any; color: string; label: string }> = {
  admin:  { icon: Crown,  color: 'text-violet-300 bg-violet-500/20 border-violet-400/20', label: 'Admin'  },
  member: { icon: Shield, color: 'text-blue-300 bg-blue-500/20 border-blue-400/20',       label: 'Member' },
  viewer: { icon: Eye,    color: 'text-slate-300 bg-white/10 border-white/15',            label: 'Viewer' },
}

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function AcceptInvite() {
  const [params]  = useSearchParams()
  const token     = params.get('token')
  const { user }  = useAuth()
  const { switchWorkspace, refetch } = useWorkspace()
  const navigate  = useNavigate()

  const [invite,  setInvite]  = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setError('No invite token found.'); setLoading(false); return }
    fetch(`${BASE}/workspaces/invite/${token}`)
      .then(r => r.ok ? r.json() : r.json().then((d: any) => Promise.reject(d.detail || 'Invalid invite.')))
      .then(setInvite)
      .catch((err: any) => setError(typeof err === 'string' ? err : 'This invite link is invalid or has expired.'))
      .finally(() => setLoading(false))
  }, [token])

  async function goToWorkspace() {
    if (invite?.workspace_id) {
      await refetch()
      switchWorkspace(invite.workspace_id)
    }
    navigate('/team')
  }

  const role     = invite ? (ROLE_META[invite.role] || ROLE_META.member) : null
  const RoleIcon = role?.icon

  const inviterInitials = invite?.inviter_name
    ? invite.inviter_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const emailParam = invite ? `?email=${encodeURIComponent(invite.invited_email)}` : ''

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      {/* ── Background ── */}
      <GridBg />
      <Orb className="top-[-15%] left-[-5%] w-[600px] h-[600px] bg-violet-700/18" />
      <Orb className="bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-700/14" />
      <Orb className="top-[40%] left-[50%] w-[350px] h-[350px] bg-fuchsia-700/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(124,58,237,0.07)_0%,transparent_70%)] pointer-events-none" />

      {/* ── Logo ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-2.5 mb-8 relative z-10"
      >
        <Link to="/" className="flex items-center gap-2.5 text-white font-bold text-xl">
          <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center backdrop-blur">
            <Mic size={17} className="text-violet-300" />
          </div>
          MinuteAI
        </Link>
      </motion.div>

      {/* ── Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="w-full max-w-md bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/[0.08] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.4)] relative z-10"
      >
        {/* Header */}
        <div className="relative overflow-hidden px-8 pt-8 pb-10 text-center bg-gradient-to-br from-violet-600/80 to-indigo-700/80 border-b border-white/[0.08]">
          <div className="pointer-events-none absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-8 -left-4 w-40 h-40 rounded-full bg-white/5" />
          <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-3 relative">
            <Users size={28} className="text-white" />
          </div>
          <h1 className="text-white font-bold text-xl relative">You've been invited</h1>
          <p className="text-white/70 text-sm mt-1 relative">
            {invite?.workspace_name ? `to join "${invite.workspace_name}"` : 'to join a MinuteAI workspace'}
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-8">
          {loading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 size={24} className="text-violet-400 animate-spin" />
              <p className="text-sm text-slate-500">Loading invite details…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center py-6 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Invite not found</p>
                <p className="text-sm text-slate-500">{error}</p>
              </div>
              <Link to="/" className="text-sm text-violet-400 hover:text-violet-300 font-medium">
                Go to MinuteAI →
              </Link>
            </div>
          )}

          {invite && !loading && (
            <>
              {/* Inviter info */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg mb-3 shadow-md shadow-violet-500/20">
                  {inviterInitials}
                </div>
                <p className="text-white font-semibold text-base">{invite.inviter_name}</p>
                <p className="text-slate-500 text-sm">{invite.inviter_email}</p>
              </div>

              {/* Invite details */}
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">Invited as</span>
                  {role && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${role.color}`}>
                      <RoleIcon size={11} />{role.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">Email</span>
                  <span className="text-xs font-semibold text-slate-300">{invite.invited_email}</span>
                </div>
                {invite.status === 'active' && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">Status</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400">
                      <CheckCircle size={11} /> Already active
                    </span>
                  </div>
                )}
              </div>

              {/* Already logged in as right user */}
              {user && user.email === invite.invited_email && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 p-3.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <CheckCircle size={16} className="text-green-400 shrink-0" />
                    <p className="text-sm text-green-300 font-medium">You're already a member of this workspace.</p>
                  </div>
                  <button
                    onClick={goToWorkspace}
                    className="group relative flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-bold transition-all shadow-[0_4px_24px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_32px_rgba(124,58,237,0.55)] overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                    <span className="relative flex items-center gap-2">Open workspace <ArrowRight size={15} /></span>
                  </button>
                </div>
              )}

              {/* New user — needs to sign up */}
              {(!user || user.email !== invite.invited_email) && !invite.has_account && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500 text-center mb-4">
                    Create a free account to accept this invitation.
                  </p>
                  <Link
                    to={`/signup${emailParam}`}
                    className="group relative flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-bold transition-all shadow-[0_4px_24px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_32px_rgba(124,58,237,0.55)] overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                    <span className="relative flex items-center gap-2">Create your account <ArrowRight size={15} /></span>
                  </Link>
                  <Link
                    to={`/login${emailParam}`}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full border border-white/10 bg-white/[0.05] hover:border-white/20 hover:bg-white/10 text-slate-300 text-sm font-semibold transition-all"
                  >
                    I already have an account
                  </Link>
                </div>
              )}

              {/* Existing user — needs to sign in */}
              {(!user || user.email !== invite.invited_email) && invite.has_account && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500 text-center mb-4">
                    Sign in to access your workspace.
                  </p>
                  <Link
                    to={`/login${emailParam}`}
                    className="group relative flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-bold transition-all shadow-[0_4px_24px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_32px_rgba(124,58,237,0.55)] overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                    <span className="relative flex items-center gap-2">Sign in to MinuteAI <ArrowRight size={15} /></span>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-xs text-slate-700 text-center relative z-10"
      >
        MinuteAI turns meeting recordings into minutes automatically.{' '}
        <Link to="/" className="text-violet-400 hover:text-violet-300">Learn more</Link>
      </motion.p>
    </div>
  )
}
