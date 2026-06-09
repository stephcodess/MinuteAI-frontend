import { useState, useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Lock, Bell, Trash2, CheckCircle, Eye, EyeOff,
  AlertTriangle, Save, Zap, Globe, Moon, Sun, Monitor,
  Download, Shield, Camera, Loader2, Link2, Settings as SettingsIcon,
  ArrowRight, Bot, Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import Sidebar from '../../components/Sidebar'
import { api, formRequest } from '../../lib/api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Floating label input ───────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange = () => {}, right = null, disabled = false, hint = null }: any) {
  const [focused, setFocused] = useState(false)
  const raised = focused || (value && value.length > 0)
  const id = useId()
  return (
    <div>
      <div className={`relative border rounded-xl transition-all duration-200 ${
        disabled
          ? 'border-white/[0.06] bg-white/[0.03]'
          : focused
          ? 'border-violet-500/60 shadow-[0_0_0_3px_rgba(var(--brand-rgb),0.12)] bg-white/[0.07]'
          : 'border-white/10 hover:border-white/20 bg-white/[0.05]'
      }`}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder=""
          className="w-full pt-6 pb-2.5 px-4 bg-transparent text-sm focus:outline-none rounded-xl disabled:cursor-not-allowed"
          style={{ color: disabled ? 'var(--text-3)' : 'var(--text-1)' }}
        />
        <label
          htmlFor={id}
          className={`absolute left-4 pointer-events-none font-medium transition-all duration-200 ${
            raised ? 'top-2 text-[10px] text-violet-400' : 'top-1/2 -translate-y-1/2 text-sm'
          }`}
          style={{ color: raised ? undefined : 'var(--text-3)' }}
        >
          {label}
        </label>
        {right && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {hint && <p className="text-xs mt-1.5 pl-1" style={{ color: 'var(--text-3)' }}>{hint}</p>}
    </div>
  )
}

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-violet-600' : 'bg-white/10'}`}
      style={{ width: 40, height: 22 }}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-0.5 bg-white rounded-full shadow-sm"
        style={{ width: 18, height: 18, left: checked ? 20 : 2 }}
      />
    </button>
  )
}

// ── Card section ───────────────────────────────────────────────────────────────
function Section({ icon: Icon, title, desc, children, index, danger = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className={`glass-card border rounded-2xl overflow-hidden ${danger ? 'border-red-500/30' : ''}`}
    >
      <div className={`flex items-start gap-3 border-b px-4 py-4 sm:items-center sm:px-6 ${danger ? 'border-red-500/20' : ''}`} style={{ borderColor: danger ? undefined : 'var(--divider)' }}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-500/10' : 'bg-violet-500/10'}`}>
          <Icon size={17} className={danger ? 'text-red-400' : 'text-violet-400'} />
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{title}</h2>
          {desc && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{desc}</p>}
        </div>
      </div>
      <div className="px-4 py-5 sm:px-6">{children}</div>
    </motion.div>
  )
}

// ── Save button with inline confirmation ──────────────────────────────────────
function SaveBtn({ saved, onClick = undefined, label = 'Save changes', icon: Icon = Save }) {
  return (
    <div className="flex flex-col items-start gap-3 pt-1 sm:flex-row sm:items-center">
      <motion.button
        type="submit"
        onClick={onClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(var(--brand-rgb),0.35)] transition-all hover:shadow-[0_6px_20px_rgba(var(--brand-rgb),0.45)] sm:w-auto"
      >
        <Icon size={14} />
        {label}
      </motion.button>
      <AnimatePresence>
        {saved && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-green-400 text-sm font-medium"
          >
            <CheckCircle size={15} />
            Saved!
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Settings() {
  const { user, updateUser, signOut } = useAuth()
  const { activeWorkspace } = useWorkspace()

  // avatar
  const fileInputRef = useRef(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const data = await formRequest('/users/me/avatar', { method: 'POST', body: form })
      updateUser({ avatar_url: data.avatar_url })
    } catch {
      // silent — could add toast here
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  // profile
  const [name, setName]   = useState(user?.name  || '')
  const [email, setEmail] = useState(user?.email || '')
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState(null)

  // password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [pwError, setPwError]     = useState(null)
  const [pwSaved, setPwSaved]     = useState(false)

  // two-factor authentication
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(!!user?.two_factor_enabled)
  const [twoFactorPw, setTwoFactorPw]           = useState('')
  const [twoFactorCode, setTwoFactorCode]       = useState('')
  const [twoFactorPending, setTwoFactorPending] = useState(false)
  const [twoFactorLoading, setTwoFactorLoading] = useState(false)
  const [twoFactorError, setTwoFactorError]     = useState(null)
  const [twoFactorSaved, setTwoFactorSaved]     = useState(false)

  // notifications — persisted in localStorage
  const [notifs, setNotifs] = useState(() => {
    try {
      const saved = localStorage.getItem('minuteai_notif_prefs')
      if (saved) return JSON.parse(saved)
    } catch {}
    return { minutesReady: true, weeklyDigest: false, productUpdates: true, errorAlerts: true }
  })

  function setNotif(key: string, value: boolean) {
    setNotifs(prev => {
      const next = { ...prev, [key]: value }
      try { localStorage.setItem('minuteai_notif_prefs', JSON.stringify(next)) } catch {}
      return next
    })
  }

  // usage / plan
  const [usage, setUsage] = useState<{ plan: string; meetings_used: number; meetings_limit: number } | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    api.get('/users/me/usage').then(setUsage).catch(() => {})
  }, [])

  useEffect(() => {
    setTwoFactorEnabled(!!user?.two_factor_enabled)
  }, [user?.two_factor_enabled])

  async function handleExport() {
    setExporting(true)
    try {
      const token = localStorage.getItem('minuteai_access')
      const res = await fetch(`${BASE}/users/me/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = Object.assign(document.createElement('a'), { href: url, download: 'minuteai_export.zip' })
      document.body.appendChild(a); a.click()
      setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 1000)
    } catch {
      // silent — could add a toast
    } finally {
      setExporting(false)
    }
  }

  // preferences
  const [timezone, setTimezone]       = useState('UTC')
  const [language, setLanguage]       = useState('en')
  const [theme, setTheme]             = useState('system')
  const [prefSaved, setPrefSaved]     = useState(false)
  const [meetingJoin, setMeetingJoin] = useState<string | null>(null)
  const [recapTo, setRecapTo]         = useState<string | null>(null)

  // steph / bot settings (workspace-level)
  const [botName, setBotName]                   = useState('Steph')
  const [botPersonality, setBotPersonality]     = useState('balanced')
  const [botTriggerAccess, setBotTriggerAccess] = useState('host')
  const [botSaved, setBotSaved]                 = useState(false)

  // danger zone
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDelete, setShowDelete]       = useState(false)
  const [deleting, setDeleting]           = useState(false)

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await api.delete('/users/me')
      signOut()
    } catch {
      setDeleting(false)
    }
  }

  useEffect(() => {
    api.get('/users/me/preferences').then(p => {
      setTimezone(p.timezone || 'UTC')
      setLanguage(p.language || 'en')
      setTheme(p.theme || 'system')
      if (p.meeting_join) setMeetingJoin(p.meeting_join)
      if (p.recap_to) setRecapTo(p.recap_to)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeWorkspace?.id) return
    api.get(`/workspaces/${activeWorkspace.id}/bot-settings`).then(s => {
      setBotName(s.bot_name || 'Steph')
      setBotPersonality(s.bot_personality || 'balanced')
      setBotTriggerAccess(s.bot_trigger_access || 'host')
    }).catch(() => {})
  }, [activeWorkspace?.id])

  async function saveBotSettings(e) {
    e.preventDefault()
    if (!activeWorkspace?.id) return
    try {
      await api.patch(`/workspaces/${activeWorkspace.id}/bot-settings`, {
        bot_name: botName.trim() || 'Steph',
        bot_personality: botPersonality,
        bot_trigger_access: botTriggerAccess,
      })
      setBotSaved(true)
      setTimeout(() => setBotSaved(false), 2500)
    } catch {}
  }

  async function saveProfile(e) {
    e.preventDefault()
    setProfileError(null)
    try {
      await api.patch('/users/me', { name, email })
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch (err) {
      setProfileError(err.message)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    setPwError(null)
    if (!currentPw || !newPw || !confirmPw) { setPwError('Please fill in all password fields.'); return }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return }
    try {
      await api.post('/users/me/password', { current_password: currentPw, new_password: newPw })
      setPwSaved(true)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setTimeout(() => setPwSaved(false), 2500)
    } catch (err) {
      setPwError(err.message)
    }
  }

  async function startTwoFactor() {
    setTwoFactorError(null)
    const isGoogle = user?.source === 'google'
    if (!isGoogle && !twoFactorPw) { setTwoFactorError('Enter your current password first.'); return }
    setTwoFactorLoading(true)
    try {
      await api.post('/auth/2fa/start', isGoogle ? {} : { current_password: twoFactorPw })
      setTwoFactorPending(true)
    } catch (err) {
      setTwoFactorError(err.message)
    } finally {
      setTwoFactorLoading(false)
    }
  }

  async function confirmTwoFactor() {
    setTwoFactorError(null)
    if (twoFactorCode.length !== 6) { setTwoFactorError('Enter the 6-digit code from your email.'); return }
    setTwoFactorLoading(true)
    try {
      const data = await api.post('/auth/2fa/confirm', { code: twoFactorCode })
      setTwoFactorEnabled(!!data.two_factor_enabled)
      updateUser({ two_factor_enabled: !!data.two_factor_enabled })
      setTwoFactorPending(false)
      setTwoFactorPw('')
      setTwoFactorCode('')
      setTwoFactorSaved(true)
      setTimeout(() => setTwoFactorSaved(false), 2500)
    } catch (err) {
      setTwoFactorError(err.message)
    } finally {
      setTwoFactorLoading(false)
    }
  }

  async function disableTwoFactor() {
    setTwoFactorError(null)
    const isGoogle = user?.source === 'google'
    if (!isGoogle && !twoFactorPw) { setTwoFactorError('Enter your current password first.'); return }
    setTwoFactorLoading(true)
    try {
      const data = await api.post('/auth/2fa/disable', isGoogle ? {} : { current_password: twoFactorPw })
      setTwoFactorEnabled(!!data.two_factor_enabled)
      updateUser({ two_factor_enabled: !!data.two_factor_enabled })
      setTwoFactorPw('')
      setTwoFactorCode('')
      setTwoFactorPending(false)
      setTwoFactorSaved(true)
      setTimeout(() => setTwoFactorSaved(false), 2500)
    } catch (err) {
      setTwoFactorError(err.message)
    } finally {
      setTwoFactorLoading(false)
    }
  }

  async function savePrefs(e) {
    e.preventDefault()
    try {
      await api.patch('/users/me/preferences', { timezone, language, theme, meeting_join: meetingJoin, recap_to: recapTo })
      setPrefSaved(true)
      setTimeout(() => setPrefSaved(false), 2500)
    } catch (err) {}
  }

  const eyeBtn = (
    <button type="button" onClick={() => setShowPw(v => !v)} className="text-slate-500 hover:text-slate-400 transition p-1">
      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  )

  const NOTIF_OPTIONS = [
    { key: 'minutesReady',   label: 'Minutes ready',    desc: 'Email when your meeting minutes are generated' },
    { key: 'errorAlerts',    label: 'Processing errors', desc: 'Email if a meeting fails to process' },
    { key: 'weeklyDigest',   label: 'Weekly digest',    desc: 'A summary of your meetings every Monday' },
    { key: 'productUpdates', label: 'Product updates',  desc: 'New features and improvements to MinuteAI' },
  ]

  const THEME_OPTIONS = [
    { key: 'light',  label: 'Light',  icon: Sun },
    { key: 'dark',   label: 'Dark',   icon: Moon },
    { key: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="flex h-screen app-bg app-grid overflow-hidden">
      <Sidebar active="settings" />

      <main className="min-w-0 flex-1 overflow-y-auto page-content">
        {/* ── Hero banner ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[var(--brand-900)] via-[var(--brand-700)] to-[var(--brand-700)] px-6 py-6 pl-16 sm:px-8">
          <div className="pointer-events-none absolute -top-6 -right-6 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 w-28 h-28 rounded-full bg-fuchsia-400/10 blur-xl" />
          <div className="relative flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}
              className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0"
            >
              <SettingsIcon size={20} className="text-white" />
            </motion.div>
            <div>
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="text-[10px] font-bold uppercase tracking-widest text-violet-200/80 mb-0.5"
              >Account</motion.p>
              <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-xl font-black text-white tracking-tight"
              >Settings</motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
                className="text-sm text-violet-200/80 mt-0.5"
              >Manage your profile, notifications, and preferences</motion.p>
            </div>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="flex flex-col items-stretch gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:flex-row xl:items-start">

          {/* ── Left column — forms ── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Profile */}
            <Section icon={User} title="Profile" desc="Your name and contact info" index={0}>
              <form onSubmit={saveProfile} className="space-y-4">
                {/* Avatar */}
                <div className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-center">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
                      {user?.avatar_url ? (
                        <img src={`${BASE}${user.avatar_url}`} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-xl">
                          {user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {avatarUploading
                        ? <Loader2 size={18} className="text-white animate-spin" />
                        : <Camera size={18} className="text-white" />}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold t1">{user?.name}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                    <p className="text-xs text-slate-500 mt-1">JPG, PNG or WebP · max 5 MB</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" value={name} onChange={e => setName(e.target.value)} />
                  <Field label="Email address" type="email" value={email} disabled hint="Email cannot be changed yet." />
                </div>
                <SaveBtn saved={profileSaved} label="Save profile" />
                {profileError && <p className="text-xs text-red-500 mt-2">{profileError}</p>}
              </form>
            </Section>

            {/* Password */}
            <Section icon={Lock} title="Password" desc="Change your account password" index={1}>
              <form onSubmit={savePassword} className="space-y-4">
                <Field
                  label="Current password"
                  type={showPw ? 'text' : 'password'}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  right={eyeBtn}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="New password"
                    type={showPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    hint="Minimum 8 characters."
                  />
                  <Field
                    label="Confirm new password"
                    type={showPw ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                  />
                </div>
                <AnimatePresence>
                  {pwError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-red-500 text-xs bg-red-500/10 border border-red-100 rounded-xl px-4 py-2.5"
                    >
                      {pwError}
                    </motion.p>
                  )}
                </AnimatePresence>
                <SaveBtn saved={pwSaved} label="Update password" icon={Lock} />
              </form>
            </Section>

            {/* Two-factor authentication */}
            <Section icon={Shield} title="Two-factor authentication" desc="Require a security code when signing in" index={2}>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div>
                    <p className="text-sm font-semibold t1">Email security code</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {twoFactorEnabled
                        ? 'Enabled. Sign-ins require a code sent to your email.'
                        : user?.source === 'google'
                          ? 'Add a second step to your Google sign-ins.'
                          : 'Add a second step to password sign-ins.'}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    twoFactorEnabled
                      ? 'border-green-500/20 bg-green-500/10 text-green-400'
                      : 'border-white/10 bg-white/[0.04] text-slate-500'
                  }`}>
                    {twoFactorEnabled ? 'Enabled' : 'Off'}
                  </span>
                </div>

                {user?.source === 'google' ? (
                  <p className="text-xs text-slate-400 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    You signed in with Google — no password needed to manage 2FA.
                  </p>
                ) : (
                  <Field
                    label="Current password"
                    type={showPw ? 'text' : 'password'}
                    value={twoFactorPw}
                    onChange={e => setTwoFactorPw(e.target.value)}
                    right={eyeBtn}
                  />
                )}

                {twoFactorPending && (
                  <Field
                    label="Security code"
                    value={twoFactorCode}
                    onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    hint="Check your email for a 6-digit code."
                  />
                )}

                <AnimatePresence>
                  {twoFactorError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-red-500 text-xs bg-red-500/10 border border-red-100 rounded-xl px-4 py-2.5"
                    >
                      {twoFactorError}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  {!twoFactorEnabled && !twoFactorPending && (
                    <button
                      type="button"
                      onClick={startTwoFactor}
                      disabled={twoFactorLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(var(--brand-rgb),0.35)] transition-all disabled:opacity-60 sm:w-auto"
                    >
                      {twoFactorLoading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                      Send code
                    </button>
                  )}
                  {!twoFactorEnabled && twoFactorPending && (
                    <button
                      type="button"
                      onClick={confirmTwoFactor}
                      disabled={twoFactorLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(var(--brand-rgb),0.35)] transition-all disabled:opacity-60 sm:w-auto"
                    >
                      {twoFactorLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      Enable 2FA
                    </button>
                  )}
                  {twoFactorEnabled && (
                    <button
                      type="button"
                      onClick={disableTwoFactor}
                      disabled={twoFactorLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-red-500/30 px-6 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-60 sm:w-auto"
                    >
                      {twoFactorLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                      Disable 2FA
                    </button>
                  )}
                  <AnimatePresence>
                    {twoFactorSaved && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 text-green-400 text-sm font-medium"
                      >
                        <CheckCircle size={15} />
                        Updated!
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </Section>

            {/* Notifications */}
            <Section icon={Bell} title="Notifications" desc="Choose which emails you receive" index={3}>
              <div className="space-y-5">
                {NOTIF_OPTIONS.map(({ key, label, desc }) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold t1">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    <Toggle checked={notifs[key]} onChange={v => setNotif(key, v)} />
                  </div>
                ))}
              </div>
            </Section>

            {/* Preferences */}
            <Section icon={Globe} title="Preferences" desc="Language, timezone, and appearance" index={4}>
              <form onSubmit={savePrefs} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Language</label>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="glass-input w-full px-4 py-2.5 rounded-xl border hover:border-gray-300 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20 text-sm transition-all"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Timezone</label>
                    <select
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      className="glass-input w-full px-4 py-2.5 rounded-xl border hover:border-gray-300 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20 text-sm transition-all"
                    >
                      <option value="Europe/London">London (GMT+0)</option>
                      <option value="Europe/Paris">Paris (GMT+1)</option>
                      <option value="America/New_York">New York (GMT-5)</option>
                      <option value="America/Los_Angeles">Los Angeles (GMT-8)</option>
                      <option value="Asia/Lagos">Lagos (GMT+1)</option>
                      <option value="Asia/Dubai">Dubai (GMT+4)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Theme</label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTheme(key)}
                        className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                          theme === key
                            ? 'border-violet-400 bg-violet-50 text-violet-300'
                            : 'border-gray-200 text-slate-500 hover:border-gray-300 hover:text-slate-300'
                        }`}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <SaveBtn saved={prefSaved} label="Save preferences" />
              </form>
            </Section>

            {/* Meeting preferences */}
            <Section icon={Bot} title="Meeting preferences" desc="Control how the bot joins meetings and who gets the recap" index={5}>
              <form onSubmit={savePrefs} className="space-y-6">
                <div>
                  <p className="text-sm font-semibold t1 mb-3">When should the bot join?</p>
                  <div className="space-y-2">
                    {[
                      { value: 'all',       label: 'All meetings',          desc: 'Join every meeting on my calendar' },
                      { value: 'own',       label: 'Meetings I organise',   desc: 'Only meetings where I am the host' },
                      { value: 'teammates', label: 'Meetings with my team', desc: 'Meetings that include a teammate' },
                      { value: 'invite',    label: 'Manual only',           desc: 'I will invite the bot each time' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMeetingJoin(opt.value)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          meetingJoin === opt.value
                            ? 'border-violet-400/60 bg-violet-500/10'
                            : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold t1">{opt.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                          </div>
                          {meetingJoin === opt.value && (
                            <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                              <CheckCircle size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold t1 mb-3">Who gets the recap?</p>
                  <div className="space-y-2">
                    {[
                      { value: 'everyone', label: 'All attendees', desc: 'Send notes to everyone in the invite' },
                      { value: 'team',     label: 'My team only',  desc: 'Send only to teammates in your workspace' },
                      { value: 'me',       label: 'Just me',       desc: 'Keep notes private' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRecapTo(opt.value)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          recapTo === opt.value
                            ? 'border-violet-400/60 bg-violet-500/10'
                            : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold t1">{opt.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                          </div>
                          {recapTo === opt.value && (
                            <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                              <CheckCircle size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <SaveBtn saved={prefSaved} label="Save preferences" />
              </form>
            </Section>

            {/* Steph / Bot personalisation */}
            <Section icon={Sparkles} title="Steph settings" desc="Personalise your AI meeting assistant for this workspace" index={6}>
              <form onSubmit={saveBotSettings} className="space-y-6">
                {/* Bot name */}
                <div>
                  <p className="text-sm font-semibold t1 mb-2">Bot name</p>
                  <input
                    value={botName}
                    onChange={e => setBotName(e.target.value)}
                    placeholder="Steph"
                    maxLength={32}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                    style={{ borderColor: 'var(--input-border)', color: 'var(--text-1)' }}
                  />
                  <p className="text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>
                    This is the name Steph will respond to during live sessions.
                  </p>
                </div>

                {/* Personality */}
                <div>
                  <p className="text-sm font-semibold t1 mb-3">Personality</p>
                  <div className="space-y-2">
                    {[
                      { value: 'balanced', label: 'Balanced', desc: 'Professional but approachable — the default' },
                      { value: 'direct',   label: 'Direct & Concise', desc: 'Short answers, no filler, straight to the point' },
                      { value: 'warm',     label: 'Warm & Conversational', desc: 'Friendly tone, more context, conversational flow' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setBotPersonality(opt.value)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          botPersonality === opt.value
                            ? 'border-violet-400/60 bg-violet-500/10'
                            : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold t1">{opt.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                          </div>
                          {botPersonality === opt.value && (
                            <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                              <CheckCircle size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trigger access */}
                <div>
                  <p className="text-sm font-semibold t1 mb-3">Who can trigger Steph?</p>
                  <div className="space-y-2">
                    {[
                      { value: 'host', label: 'Host only', desc: 'Only the session host can call Steph by name' },
                      { value: 'all',  label: 'All participants', desc: 'Any participant can say the wake word' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setBotTriggerAccess(opt.value)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          botTriggerAccess === opt.value
                            ? 'border-violet-400/60 bg-violet-500/10'
                            : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold t1">{opt.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                          </div>
                          {botTriggerAccess === opt.value && (
                            <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                              <CheckCircle size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <SaveBtn saved={botSaved} label="Save Steph settings" />
              </form>
            </Section>

            {/* Integrations */}
            <Section icon={Link2} title="Integrations" desc="Connect your tools — notes auto-sync after every meeting" index={7}>
              <Link to="/integrations"
                className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.04] px-5 py-4 hover:bg-violet-500/5 hover:border-violet-500/20 transition-all group">
                <div>
                  <p className="text-sm font-semibold t1">Manage integrations</p>
                  <p className="text-xs text-slate-500 mt-0.5">Google Calendar, Slack, Notion, Linear, HubSpot, Zapier and more</p>
                </div>
                <ArrowRight size={16} className="text-slate-500 group-hover:text-violet-400 transition-colors shrink-0" />
              </Link>
            </Section>

            {/* Privacy & data */}
            <Section icon={Shield} title="Privacy & data" desc="How your recordings and transcripts are processed" index={8}>
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold t1 mb-2">Third-party AI processors</p>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">
                    Your audio and transcripts are sent to these services to generate your minutes. MinuteAI does not train any AI models on your data.
                  </p>
                  <div className="space-y-2">
                    {[
                      { name: 'AssemblyAI / Groq Whisper', desc: 'Receives your audio file for speech-to-text transcription.' },
                      { name: 'Anthropic Claude', desc: 'Receives your transcript text to generate structured meeting minutes.' },
                    ].map(p => (
                      <div key={p.name} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <Shield size={14} className="mt-0.5 shrink-0 text-violet-400" />
                        <div>
                          <p className="text-xs font-semibold t1">{p.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold t1 mb-2">Data retention</p>
                  <ul className="text-xs text-slate-500 leading-relaxed space-y-1.5">
                    <li>• Audio and video recordings are kept so you can re-download them anytime.</li>
                    <li>• Transcripts and minutes are kept until you delete your account.</li>
                    <li>• All data is permanently deleted when you close your account.</li>
                    <li>• Consent audit logs are retained for legal compliance (NDPA / UK GDPR).</li>
                  </ul>
                </div>
              </div>
            </Section>

            {/* Danger zone */}
            <Section icon={AlertTriangle} title="Danger zone" desc="Irreversible actions — proceed with caution" index={9} danger>
              {!showDelete ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold t1">Delete account</p>
                    <p className="text-xs text-slate-500 mt-0.5">Permanently delete your account and all data. This cannot be undone.</p>
                  </div>
                  <button
                    onClick={() => setShowDelete(true)}
                    className="flex w-full shrink-0 items-center justify-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10 sm:w-auto"
                  >
                    <Trash2 size={14} />
                    Delete account
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-sm t2 mb-3">
                    Type <span className="font-mono font-bold text-red-400">delete my account</span> to confirm.
                  </p>
                  <input
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder="delete my account"
                    className="glass-input w-full px-4 py-2.5 rounded-xl border border-red-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 mb-3"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirm !== 'delete my account' || deleting}
                      className="flex items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      {deleting ? 'Deleting…' : 'Permanently delete'}
                    </button>
                    <button
                      onClick={() => { setShowDelete(false); setDeleteConfirm('') }}
                      className="px-4 py-2 rounded-full border border-gray-200 text-slate-400 hover:bg-[var(--nav-hover-bg)] text-sm font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </Section>
          </div>

          {/* ── Right column — summary panel ── */}
          <div className="w-full shrink-0 space-y-4 xl:w-72">

            {/* Plan widget */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="glass-card border rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold t1">Your plan</p>
                {usage && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/100/10 text-green-700 border border-green-500/20">Active</span>
                )}
              </div>
              {usage ? (
                <>
                  <p className="text-xl font-bold t1 mb-0.5 capitalize">
                    {usage.plan === 'free' ? 'Starter' : usage.plan}
                    {usage.plan === 'free' && <span className="text-slate-500 font-normal text-sm"> — Free</span>}
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    {usage.meetings_used} of {usage.meetings_limit} meetings used this period
                  </p>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, usage.meetings_limit > 0 ? (usage.meetings_used / usage.meetings_limit) * 100 : 0)}%` }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className={`h-full rounded-full ${
                        usage.meetings_used >= usage.meetings_limit
                          ? 'bg-gradient-to-r from-red-400 to-orange-400'
                          : 'bg-gradient-to-r from-violet-500 to-indigo-500'
                      }`}
                    />
                  </div>
                  {usage.plan === 'free' && (
                    <Link
                      to="/billing"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(var(--brand-rgb),0.3)] hover:shadow-[0_6px_20px_rgba(var(--brand-rgb),0.4)] hover:from-violet-500 hover:to-indigo-500 transition-all"
                    >
                      <Zap size={13} />
                      Upgrade to Pro
                    </Link>
                  )}
                  {usage.plan !== 'free' && (
                    <Link
                      to="/billing"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full border border-white/10 bg-white/[0.06] hover:border-violet-300 text-slate-400 hover:text-violet-300 text-sm font-semibold transition-all"
                    >
                      Manage billing
                    </Link>
                  )}
                </>
              ) : (
                <div className="space-y-2 animate-pulse">
                  <div className="h-6 bg-white/[0.06] rounded w-2/3" />
                  <div className="h-3 bg-white/[0.06] rounded w-1/2 mt-1" />
                  <div className="h-1.5 bg-white/[0.06] rounded-full mt-4 mb-4" />
                  <div className="h-9 bg-white/[0.06] rounded-xl" />
                </div>
              )}
            </motion.div>

            {/* Security */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.22 }}
              className="glass-card border rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield size={15} className="text-violet-600" />
                <p className="text-sm font-bold t1">Security</p>
              </div>
              <div className="space-y-2.5 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Password</span>
                  <span className="text-green-400 font-semibold flex items-center gap-1"><CheckCircle size={11} />Set</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Two-factor auth</span>
                  <span className={twoFactorEnabled ? 'text-green-400 font-semibold flex items-center gap-1' : 'text-slate-500'}>
                    {twoFactorEnabled ? <><CheckCircle size={11} />Enabled</> : 'Not enabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last sign-in</span>
                  <span className="t2">
                    {user?.last_login_at
                      ? (() => {
                          const d = new Date(user.last_login_at)
                          const now = new Date()
                          const diffMs = now.getTime() - d.getTime()
                          const diffDays = Math.floor(diffMs / 86400000)
                          if (diffDays === 0) return 'Today'
                          if (diffDays === 1) return 'Yesterday'
                          if (diffDays < 7)  return `${diffDays} days ago`
                          return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                        })()
                      : '—'}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Data export */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="glass-card border rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <Download size={15} className="text-violet-600" />
                <p className="text-sm font-bold t1">Export your data</p>
              </div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Download all your meeting minutes as a ZIP archive.
              </p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-white/10 bg-white/[0.06] hover:border-violet-300 hover:text-violet-300 text-slate-400 text-sm font-semibold transition-all disabled:opacity-50"
              >
                {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                {exporting ? 'Preparing…' : 'Export all minutes'}
              </button>
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  )
}



