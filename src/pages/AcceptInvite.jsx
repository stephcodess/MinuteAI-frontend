import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mic, Crown, Shield, Eye, ArrowRight, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

const ROLE_META = {
  admin:  { icon: Crown,  bg: 'bg-violet-100', text: 'text-violet-700', label: 'Admin'  },
  member: { icon: Shield, bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Member' },
  viewer: { icon: Eye,    bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Viewer' },
}

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function AcceptInvite() {
  const [params]  = useSearchParams()
  const token     = params.get('token')
  const { user }  = useAuth()
  const { switchWorkspace, refetch } = useWorkspace()
  const navigate  = useNavigate()

  const [invite,  setInvite]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!token) { setError('No invite token found.'); setLoading(false); return }
    fetch(`${BASE}/workspaces/invite/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.detail || 'Invalid invite.')))
      .then(setInvite)
      .catch(err => setError(typeof err === 'string' ? err : 'This invite link is invalid or has expired.'))
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
    ? invite.inviter_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const emailParam = invite ? `?email=${encodeURIComponent(invite.invited_email)}` : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex flex-col items-center justify-center p-4">

      {/* logo */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-2.5 mb-8"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-300/30">
          <Mic size={17} className="text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900">MinuteAI</span>
      </motion.div>

      {/* card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 overflow-hidden"
      >

        {/* header gradient */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-8 pt-8 pb-10 text-center relative overflow-hidden">
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

        {/* body */}
        <div className="px-8 py-8">

          {loading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 size={24} className="text-violet-500 animate-spin" />
              <p className="text-sm text-gray-400">Loading invite details…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center py-6 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Invite not found</p>
                <p className="text-sm text-gray-400">{error}</p>
              </div>
              <Link to="/" className="text-sm text-violet-600 hover:underline font-medium">
                Go to MinuteAI →
              </Link>
            </div>
          )}

          {invite && !loading && (
            <>
              {/* inviter info */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg mb-3 shadow-md shadow-violet-300/30">
                  {inviterInitials}
                </div>
                <p className="text-gray-900 font-semibold text-base">{invite.inviter_name}</p>
                <p className="text-gray-400 text-sm">{invite.inviter_email}</p>
              </div>

              {/* invite details */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Invited as</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${role.bg} ${role.text}`}>
                    <RoleIcon size={11} />{role.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Email</span>
                  <span className="text-xs font-semibold text-gray-700">{invite.invited_email}</span>
                </div>
                {invite.status === 'active' && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Status</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                      <CheckCircle size={11} /> Already active
                    </span>
                  </div>
                )}
              </div>

              {/* already logged in as the right user */}
              {user && user.email === invite.invited_email && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 p-3.5 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle size={16} className="text-green-500 shrink-0" />
                    <p className="text-sm text-green-800 font-medium">You're already a member of this workspace.</p>
                  </div>
                  <button
                    onClick={goToWorkspace}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
                  >
                    Open workspace <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {/* new user — needs to sign up */}
              {(!user || user.email !== invite.invited_email) && !invite.has_account && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 text-center mb-4">
                    Create a free account to accept this invitation.
                  </p>
                  <Link
                    to={`/signup${emailParam}`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white text-sm font-semibold transition-all shadow-md shadow-violet-300/30"
                  >
                    Create your account <ArrowRight size={15} />
                  </Link>
                  <Link
                    to={`/login${emailParam}`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-gray-200 hover:border-violet-300 text-gray-700 text-sm font-semibold transition-all"
                  >
                    I already have an account
                  </Link>
                </div>
              )}

              {/* existing user — needs to sign in */}
              {(!user || user.email !== invite.invited_email) && invite.has_account && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 text-center mb-4">
                    Sign in to access your workspace.
                  </p>
                  <Link
                    to={`/login${emailParam}`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white text-sm font-semibold transition-all shadow-md shadow-violet-300/30"
                  >
                    Sign in to MinuteAI <ArrowRight size={15} />
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
        className="mt-6 text-xs text-gray-400 text-center"
      >
        MinuteAI turns meeting recordings into minutes automatically.{' '}
        <Link to="/" className="text-violet-500 hover:underline">Learn more</Link>
      </motion.p>
    </div>
  )
}
