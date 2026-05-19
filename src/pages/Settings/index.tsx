import { useState, useEffect, useId, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Lock, Bell, Trash2, CheckCircle, Eye, EyeOff,
  AlertTriangle, Save, Zap, Globe, Moon, Sun, Monitor,
  Download, Shield, Camera, Loader2, Link2, X, Settings as SettingsIcon,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../../components/Sidebar'
import { api, formRequest, getIntegrations, getIntegrationConnectUrl, disconnectIntegration, updateIntegration, updateIntegrationSettings, getIntegrationResources, connectWebhook } from '../../lib/api'

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
          ? 'border-violet-500/60 shadow-[0_0_0_3px_rgba(139,92,246,0.12)] bg-white/[0.07]'
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
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)] transition-all hover:shadow-[0_6px_20px_rgba(124,58,237,0.45)] sm:w-auto"
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
  const { user, updateUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // integrations
  const [integrations, setIntegrations] = useState<Record<string, any>>({})
  const [integrationBanner, setIntegrationBanner] = useState<{ type: 'success' | 'error', msg: string } | null>(null)
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null)
  const [configuringProvider, setConfiguringProvider] = useState<string | null>(null)
  const [configInputs, setConfigInputs] = useState<Record<string, string>>({})
  const [configSaving, setConfigSaving] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')

  const PROVIDER_LABELS: Record<string, string> = {
    google: 'Google Calendar', zoom: 'Zoom', outlook: 'Outlook Calendar',
    slack: 'Slack', hubspot: 'HubSpot', notion: 'Notion',
    linear: 'Linear', webhook: 'Webhook / Zapier',
    google_drive: 'Google Drive', salesforce: 'Salesforce',
    asana: 'Asana', jira: 'Jira', pipedrive: 'Pipedrive',
    trello: 'Trello', clickup: 'ClickUp', monday: 'Monday.com',
  }

  async function loadIntegrations() {
    try {
      const data = await getIntegrations()
      setIntegrations(data)
    } catch {}
  }

  useEffect(() => { loadIntegrations() }, [])

  const handledOAuthRef = useRef(false)
  useEffect(() => {
    if (handledOAuthRef.current) return
    const connected = searchParams.get('connected')
    const error     = searchParams.get('error')
    if (connected) {
      handledOAuthRef.current = true
      const label = PROVIDER_LABELS[connected] || connected
      const calendarProviders = ['google', 'zoom', 'outlook']
      const msg = calendarProviders.includes(connected)
        ? `${label} connected! Upcoming meetings will be recorded automatically.`
        : `${label} connected! Meeting notes will be sent after each session.`
      setIntegrationBanner({ type: 'success', msg })
      loadIntegrations()
      setSearchParams({}, { replace: true })
    } else if (error) {
      handledOAuthRef.current = true
      setIntegrationBanner({ type: 'error', msg: 'Connection failed — please try again.' })
      setSearchParams({}, { replace: true })
    }
  }, [])

  async function handleConnect(provider: string) {
    if (provider === 'webhook') {
      setConfiguringProvider('webhook')
      return
    }
    setConnectingProvider(provider)
    try {
      const { url } = await getIntegrationConnectUrl(provider)
      window.location.href = url
    } catch {
      setIntegrationBanner({ type: 'error', msg: `Could not start ${PROVIDER_LABELS[provider] || provider} OAuth.` })
      setConnectingProvider(null)
    }
  }

  async function handleDisconnect(provider: string) {
    setDisconnectingProvider(provider)
    try {
      await disconnectIntegration(provider)
      await loadIntegrations()
    } finally {
      setDisconnectingProvider(null)
    }
  }

  async function handleSaveConfig(provider: string) {
    setConfigSaving(true)
    try {
      await updateIntegrationSettings(provider, configInputs)
      setConfiguringProvider(null)
      setConfigInputs({})
      await loadIntegrations()
    } catch {
      setIntegrationBanner({ type: 'error', msg: 'Could not save configuration.' })
    } finally {
      setConfigSaving(false)
    }
  }

  async function handleConnectWebhook() {
    if (!webhookUrl.trim()) return
    setConfigSaving(true)
    try {
      await connectWebhook(webhookUrl.trim())
      setConfiguringProvider(null)
      setWebhookUrl('')
      await loadIntegrations()
      setIntegrationBanner({ type: 'success', msg: 'Webhook connected! Meeting notes will be POSTed after each session.' })
    } catch {
      setIntegrationBanner({ type: 'error', msg: 'Invalid webhook URL.' })
    } finally {
      setConfigSaving(false)
    }
  }

  async function handleAutoJoinToggle(provider: string, value: boolean) {
    setIntegrations(prev => ({ ...prev, [provider]: { ...prev[provider], auto_join: value } }))
    try {
      await updateIntegration(provider, { auto_join: value })
    } catch {
      await loadIntegrations()
    }
  }

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
  const [timezone, setTimezone]   = useState('UTC')
  const [language, setLanguage]   = useState('en')
  const [theme, setTheme]         = useState('system')
  const [prefSaved, setPrefSaved] = useState(false)

  // danger zone
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDelete, setShowDelete]       = useState(false)

  useEffect(() => {
    api.get('/users/me/preferences').then(p => {
      setTimezone(p.timezone || 'UTC')
      setLanguage(p.language || 'en')
      setTheme(p.theme || 'system')
    }).catch(() => {})
  }, [])

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

  async function savePrefs(e) {
    e.preventDefault()
    try {
      await api.patch('/users/me/preferences', { timezone, language, theme })
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
        <div className="relative overflow-hidden bg-gradient-to-br from-[#4f35d2] via-[#5b45e8] to-[#7c3aed] px-6 py-6 pl-16 sm:px-8">
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
                    <p className="text-sm font-semibold text-white">{user?.name}</p>
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

            {/* Notifications */}
            <Section icon={Bell} title="Notifications" desc="Choose which emails you receive" index={2}>
              <div className="space-y-5">
                {NOTIF_OPTIONS.map(({ key, label, desc }) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    <Toggle checked={notifs[key]} onChange={v => setNotif(key, v)} />
                  </div>
                ))}
              </div>
            </Section>

            {/* Preferences */}
            <Section icon={Globe} title="Preferences" desc="Language, timezone, and appearance" index={3}>
              <form onSubmit={savePrefs} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Language</label>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.06] hover:border-gray-300 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20 text-sm text-white bg-white transition-all"
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
                      className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.06] hover:border-gray-300 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20 text-sm text-white bg-white transition-all"
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

            {/* Integrations */}
            <Section icon={Link2} title="Integrations" desc="Connect your tools — notes auto-sync after every meeting" index={4}>
              <AnimatePresence>
                {integrationBanner && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                      integrationBanner.type === 'success'
                        ? 'border-green-200 bg-green-50/10 text-green-400'
                        : 'border-red-200 bg-red-500/10 text-red-400'
                    }`}
                  >
                    <span>{integrationBanner.msg}</span>
                    <button onClick={() => setIntegrationBanner(null)} className="shrink-0 mt-0.5"><X size={14} /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Webhook connect inline form */}
              <AnimatePresence>
                {configuringProvider === 'webhook' && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
                    <p className="text-xs font-semibold text-white">Webhook / Zapier URL</p>
                    <p className="text-xs text-slate-500">After each meeting MinuteAI will POST meeting data to this URL. Works with Zapier, Make, n8n, or any custom endpoint.</p>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={e => setWebhookUrl(e.target.value)}
                      placeholder="https://hooks.zapier.com/hooks/catch/..."
                      className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-violet-500/60 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleConnectWebhook} disabled={configSaving || !webhookUrl.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
                        {configSaving ? <Loader2 size={12} className="animate-spin" /> : null} Save
                      </button>
                      <button onClick={() => { setConfiguringProvider(null); setWebhookUrl('') }}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5">Cancel</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {[
                {
                  group: 'Calendar & Video',
                  items: [
                    { provider: 'google',  icon: '🗓️', desc: 'Auto-join Google Meet calls from your calendar', autoJoin: true },
                    { provider: 'zoom',    icon: '📹', desc: 'Auto-join Zoom meetings from your account', autoJoin: true },
                    { provider: 'outlook', icon: '📅', desc: 'Auto-join Teams & Outlook meetings from your calendar', autoJoin: true },
                  ]
                },
                {
                  group: 'Communication',
                  items: [
                    { provider: 'slack', icon: '💬', desc: 'Post meeting recap to a Slack channel after each session' },
                  ]
                },
                {
                  group: 'CRM',
                  items: [
                    { provider: 'hubspot',    icon: '🟠', desc: 'Log meeting notes to HubSpot contacts and deals' },
                    { provider: 'salesforce', icon: '☁️', desc: 'Sync notes to Salesforce accounts and opportunities', comingSoon: true },
                    { provider: 'pipedrive',  icon: '🔵', desc: 'Add meeting notes to Pipedrive deals', comingSoon: true },
                  ]
                },
                {
                  group: 'Project Management',
                  items: [
                    { provider: 'notion',  icon: '⬜', desc: 'Create a meeting notes page in your Notion database', config: { label: 'Notion Database ID', key: 'database_id', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' } },
                    { provider: 'linear',  icon: '🔷', desc: 'Create Linear issues from action items after meetings', config: { label: 'Linear Team', key: 'team_id', placeholder: 'Auto-detected on connect' } },
                    { provider: 'asana',   icon: '🌸', desc: 'Create Asana tasks from meeting action items', comingSoon: true },
                    { provider: 'jira',    icon: '🔵', desc: 'Create Jira tickets from meeting action items', comingSoon: true },
                    { provider: 'trello',  icon: '🟦', desc: 'Add meeting action items as Trello cards', comingSoon: true },
                    { provider: 'clickup', icon: '🟣', desc: 'Create ClickUp tasks from action items', comingSoon: true },
                    { provider: 'monday',  icon: '🟡', desc: 'Add items to Monday.com boards from meetings', comingSoon: true },
                  ]
                },
                {
                  group: 'Storage & Docs',
                  items: [
                    { provider: 'google_drive', icon: '📁', desc: 'Save meeting DOCX to a Google Drive folder', config: { label: 'Drive Folder ID (optional)', key: 'folder_id', placeholder: 'Leave blank for My Drive root' } },
                  ]
                },
                {
                  group: 'Automation',
                  items: [
                    { provider: 'webhook', icon: '🔗', desc: 'POST meeting data to any URL — works with Zapier, Make, n8n' },
                  ]
                },
              ].map(({ group, items }) => (
                <div key={group} className="mb-6 last:mb-0">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group}</p>
                  <div className="space-y-2">
                    {items.map(({ provider, icon, desc, autoJoin, comingSoon, config }: any) => {
                      const info = integrations[provider] || { connected: false, email: null, auto_join: true, settings: {} }
                      const isConfiguring = configuringProvider === provider && provider !== 'webhook'
                      const needsConfig = config && info.connected && !info.settings?.[config.key]
                      return (
                        <div key={provider} className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                              <span className="text-xl leading-none mt-0.5">{icon}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-white">{PROVIDER_LABELS[provider] || provider}</p>
                                  {comingSoon && <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-400">Coming soon</span>}
                                  {needsConfig && !isConfiguring && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">Configure</span>}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                                {info.connected && info.email && <p className="text-xs text-violet-500 mt-1 font-medium">{info.email}</p>}
                                {info.connected && info.settings?.[config?.key] && (
                                  <p className="text-xs text-slate-500 mt-0.5">{config.label}: <span className="text-slate-400">{info.settings[config.key]}</span></p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-start gap-2 sm:items-end sm:shrink-0">
                              {comingSoon ? null : info.connected ? (
                                <div className="flex items-center gap-3">
                                  {config && (
                                    <button onClick={() => { setConfiguringProvider(isConfiguring ? null : provider); setConfigInputs(info.settings || {}) }}
                                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                                      {isConfiguring ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Config
                                    </button>
                                  )}
                                  {autoJoin && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                      <span>Auto-join</span>
                                      <Toggle checked={info.auto_join} onChange={v => handleAutoJoinToggle(provider, v)} />
                                    </div>
                                  )}
                                  <button onClick={() => handleDisconnect(provider)} disabled={disconnectingProvider === provider}
                                    className="text-xs font-semibold text-red-500 hover:text-red-400 disabled:opacity-50 flex items-center gap-1">
                                    {disconnectingProvider === provider && <Loader2 size={11} className="animate-spin" />}
                                    Disconnect
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => handleConnect(provider)} disabled={!!connectingProvider || comingSoon}
                                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:shadow-[0_4px_12px_rgba(124,58,237,0.35)] disabled:opacity-50 transition-all">
                                  {connectingProvider === provider ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                                  Connect
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Inline config form */}
                          <AnimatePresence>
                            {isConfiguring && config && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="mt-3 overflow-hidden border-t border-white/[0.06] pt-3 space-y-2">
                                <label className="text-xs font-medium text-slate-400">{config.label}</label>
                                <input type="text" value={configInputs[config.key] || ''}
                                  onChange={e => setConfigInputs(prev => ({ ...prev, [config.key]: e.target.value }))}
                                  placeholder={config.placeholder}
                                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-violet-500/60 focus:outline-none"
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => handleSaveConfig(provider)} disabled={configSaving}
                                    className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
                                    {configSaving ? <Loader2 size={12} className="animate-spin" /> : null} Save
                                  </button>
                                  <button onClick={() => { setConfiguringProvider(null); setConfigInputs({}) }}
                                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5">Cancel</button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </Section>

            {/* Danger zone */}
            <Section icon={AlertTriangle} title="Danger zone" desc="Irreversible actions — proceed with caution" index={5} danger>
              {!showDelete ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Delete account</p>
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
                  <p className="text-sm text-slate-300 mb-3">
                    Type <span className="font-mono font-bold text-red-400">delete my account</span> to confirm.
                  </p>
                  <input
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder="delete my account"
                    className="w-full px-4 py-2.5 rounded-xl border border-red-500/30 text-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 mb-3"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      disabled={deleteConfirm !== 'delete my account'}
                      className="flex items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                      Permanently delete
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
                <p className="text-sm font-bold text-white">Your plan</p>
                {usage && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/100/10 text-green-700 border border-green-500/20">Active</span>
                )}
              </div>
              {usage ? (
                <>
                  <p className="text-xl font-bold text-white mb-0.5 capitalize">
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
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:from-violet-500 hover:to-indigo-500 transition-all"
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
                <p className="text-sm font-bold text-white">Security</p>
              </div>
              <div className="space-y-2.5 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Password</span>
                  <span className="text-green-400 font-semibold flex items-center gap-1"><CheckCircle size={11} />Set</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Two-factor auth</span>
                  <span className="text-slate-500">Not enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last sign-in</span>
                  <span className="text-slate-300">
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
                <p className="text-sm font-bold text-white">Export your data</p>
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



