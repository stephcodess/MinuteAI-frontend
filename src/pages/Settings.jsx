import { useState, useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Lock, Bell, Trash2, CheckCircle, Eye, EyeOff,
  AlertTriangle, Save, Zap, Globe, Moon, Sun, Monitor,
  Download, Shield, Camera, Loader2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { api, formRequest } from '../lib/api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Floating label input ───────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, right, disabled, hint }) {
  const [focused, setFocused] = useState(false)
  const raised = focused || (value && value.length > 0)
  const id = useId()
  return (
    <div>
      <div className={`relative border-2 rounded-xl transition-all duration-200 ${
        disabled
          ? 'border-gray-100 bg-gray-50'
          : focused
          ? 'border-violet-400 shadow-[0_0_0_3px_rgba(139,92,246,0.08)] bg-white'
          : 'border-gray-200 hover:border-gray-300 bg-white'
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
          className="w-full pt-6 pb-2.5 px-4 bg-transparent text-sm text-gray-900 focus:outline-none rounded-xl disabled:text-gray-400 disabled:cursor-not-allowed"
        />
        <label
          htmlFor={id}
          className={`absolute left-4 pointer-events-none font-medium transition-all duration-200 ${
            raised ? 'top-2 text-[10px] text-violet-500' : 'top-1/2 -translate-y-1/2 text-sm text-gray-400'
          } ${disabled ? '!text-gray-400' : ''}`}
        >
          {label}
        </label>
        {right && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1.5 pl-1">{hint}</p>}
    </div>
  )
}

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-violet-600' : 'bg-gray-200'}`}
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
function Section({ icon: Icon, title, desc, children, index, danger }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${danger ? 'border-red-200' : 'border-gray-100'}`}
    >
      <div className={`px-6 py-4 border-b flex items-center gap-3 ${danger ? 'border-red-100' : 'border-gray-50'}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-50' : 'bg-violet-50'}`}>
          <Icon size={17} className={danger ? 'text-red-500' : 'text-violet-600'} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </motion.div>
  )
}

// ── Save button with inline confirmation ──────────────────────────────────────
function SaveBtn({ saved, onClick, label = 'Save changes', icon: Icon = Save }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <motion.button
        type="submit"
        onClick={onClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
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
            className="flex items-center gap-1.5 text-green-600 text-sm font-medium"
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

  // notifications
  const [notifs, setNotifs] = useState({
    minutesReady: true,
    weeklyDigest: false,
    productUpdates: true,
    errorAlerts: true,
  })

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
    <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-400 hover:text-gray-600 transition p-1">
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar active="settings" />

      <main className="min-w-0 flex-1 overflow-y-auto pt-16 md:pt-0">
        {/* top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-8 py-4">
          <h1 className="text-lg font-bold text-gray-900">Account settings</h1>
          <p className="text-xs text-gray-400">Manage your profile and preferences</p>
        </div>

        {/* ── Two-column layout ── */}
        <div className="px-8 py-8 flex gap-6 items-start">

          {/* ── Left column — forms ── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Profile */}
            <Section icon={User} title="Profile" desc="Your name and contact info" index={0}>
              <form onSubmit={saveProfile} className="space-y-4">
                {/* Avatar */}
                <div className="flex items-center gap-4 pb-2">
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
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG or WebP · max 5 MB</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
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
                      className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-4 py-2.5"
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
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    </div>
                    <Toggle checked={notifs[key]} onChange={v => setNotifs(n => ({ ...n, [key]: v }))} />
                  </div>
                ))}
              </div>
            </Section>

            {/* Preferences */}
            <Section icon={Globe} title="Preferences" desc="Language, timezone, and appearance" index={3}>
              <form onSubmit={savePrefs} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Language</label>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-gray-300 focus:border-violet-400 focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)] text-sm text-gray-900 bg-white transition-all"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Timezone</label>
                    <select
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-gray-300 focus:border-violet-400 focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)] text-sm text-gray-900 bg-white transition-all"
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
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Theme</label>
                  <div className="flex gap-2">
                    {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTheme(key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          theme === key
                            ? 'border-violet-400 bg-violet-50 text-violet-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
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

            {/* Danger zone */}
            <Section icon={AlertTriangle} title="Danger zone" desc="Irreversible actions — proceed with caution" index={4} danger>
              {!showDelete ? (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Delete account</p>
                    <p className="text-xs text-gray-400 mt-0.5">Permanently delete your account and all data. This cannot be undone.</p>
                  </div>
                  <button
                    onClick={() => setShowDelete(true)}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete account
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-sm text-gray-700 mb-3">
                    Type <span className="font-mono font-bold text-red-600">delete my account</span> to confirm.
                  </p>
                  <input
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder="delete my account"
                    className="w-full px-4 py-2.5 rounded-xl border border-red-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 mb-3"
                  />
                  <div className="flex gap-3">
                    <button
                      disabled={deleteConfirm !== 'delete my account'}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                    >
                      <Trash2 size={14} />
                      Permanently delete
                    </button>
                    <button
                      onClick={() => { setShowDelete(false); setDeleteConfirm('') }}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </Section>
          </div>

          {/* ── Right column — summary panel ── */}
          <div className="w-72 shrink-0 space-y-4">

            {/* Plan widget */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-900">Your plan</p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Active</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mb-0.5">Starter <span className="text-gray-400 font-normal text-sm">— Free</span></p>
              <p className="text-xs text-gray-400 mb-4">2 of 3 monthly meetings used</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '66%' }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                />
              </div>
              <Link
                to="/billing"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Zap size={13} />
                Upgrade to Pro
              </Link>
            </motion.div>

            {/* Security */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.22 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield size={15} className="text-violet-600" />
                <p className="text-sm font-bold text-gray-900">Security</p>
              </div>
              <div className="space-y-2.5 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <span>Password</span>
                  <span className="text-green-600 font-semibold flex items-center gap-1"><CheckCircle size={11} />Set</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Two-factor auth</span>
                  <span className="text-gray-400">Not enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last sign-in</span>
                  <span className="text-gray-700">Today</span>
                </div>
              </div>
            </motion.div>

            {/* Data export */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <Download size={15} className="text-violet-600" />
                <p className="text-sm font-bold text-gray-900">Export your data</p>
              </div>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Download all your meeting minutes as a ZIP archive.
              </p>
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-gray-200 hover:border-violet-300 hover:text-violet-700 text-gray-600 text-sm font-semibold transition-all">
                <Download size={13} />
                Export all minutes
              </button>
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  )
}
