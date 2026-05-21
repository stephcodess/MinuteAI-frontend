import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plug, Link2, CheckCircle2, Loader2, X, ChevronDown, ChevronUp,
  Calendar, MessageSquare, Database, FolderOpen, Zap, BarChart3,
} from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import { getIntegrations, getIntegrationConnectUrl, disconnectIntegration, updateIntegration, updateIntegrationSettings, connectWebhook } from '../../lib/api'

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-violet-600' : 'bg-white/10'}`}
      style={{ width: 36, height: 20 }}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-0.5 bg-white rounded-full shadow-sm"
        style={{ width: 16, height: 16, left: checked ? 18 : 2 }}
      />
    </button>
  )
}

// ── Provider config ───────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google Calendar', zoom: 'Zoom', outlook: 'Outlook Calendar',
  slack: 'Slack', hubspot: 'HubSpot', notion: 'Notion',
  linear: 'Linear', webhook: 'Webhook / Zapier',
  google_drive: 'Google Drive', salesforce: 'Salesforce',
  asana: 'Asana', jira: 'Jira', pipedrive: 'Pipedrive',
  trello: 'Trello', clickup: 'ClickUp', monday: 'Monday.com',
}

const GROUPS = [
  {
    label: 'Calendar & Video',
    icon: Calendar,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    items: [
      { provider: 'google',  icon: '🗓️', desc: 'Auto-join Google Meet calls from your calendar', autoJoin: true },
      { provider: 'zoom',    icon: '📹', desc: 'Auto-join Zoom meetings from your account', autoJoin: true },
      { provider: 'outlook', icon: '📅', desc: 'Auto-join Teams & Outlook meetings from your calendar', autoJoin: true },
    ],
  },
  {
    label: 'Communication',
    icon: MessageSquare,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    items: [
      { provider: 'slack', icon: '💬', desc: 'Post meeting recap to a Slack channel after each session' },
    ],
  },
  {
    label: 'CRM',
    icon: BarChart3,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    items: [
      { provider: 'hubspot',    icon: '🟠', desc: 'Log meeting notes to HubSpot contacts and deals' },
      { provider: 'salesforce', icon: '☁️', desc: 'Sync notes to Salesforce accounts and opportunities', comingSoon: true },
      { provider: 'pipedrive',  icon: '🔵', desc: 'Add meeting notes to Pipedrive deals', comingSoon: true },
    ],
  },
  {
    label: 'Project Management',
    icon: Database,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    items: [
      { provider: 'notion',  icon: '⬜', desc: 'Create a meeting notes page in your Notion database', config: { label: 'Notion Database ID', key: 'database_id', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' } },
      { provider: 'linear',  icon: '🔷', desc: 'Create Linear issues from action items after meetings', config: { label: 'Linear Team', key: 'team_id', placeholder: 'Auto-detected on connect' } },
      { provider: 'asana',   icon: '🌸', desc: 'Create Asana tasks from meeting action items', comingSoon: true },
      { provider: 'jira',    icon: '🔵', desc: 'Create Jira tickets from meeting action items', comingSoon: true },
      { provider: 'trello',  icon: '🟦', desc: 'Add meeting action items as Trello cards', comingSoon: true },
      { provider: 'clickup', icon: '🟣', desc: 'Create ClickUp tasks from action items', comingSoon: true },
      { provider: 'monday',  icon: '🟡', desc: 'Add items to Monday.com boards from meetings', comingSoon: true },
    ],
  },
  {
    label: 'Storage & Docs',
    icon: FolderOpen,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    items: [
      { provider: 'google_drive', icon: '📁', desc: 'Save meeting DOCX to a Google Drive folder', config: { label: 'Drive Folder ID (optional)', key: 'folder_id', placeholder: 'Leave blank for My Drive root' } },
    ],
  },
  {
    label: 'Automation',
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    items: [
      { provider: 'webhook', icon: '🔗', desc: 'POST meeting data to any URL — works with Zapier, Make, n8n' },
    ],
  },
]

// ── Integration card ──────────────────────────────────────────────────────────

function IntegrationCard({
  provider, icon, desc, autoJoin, comingSoon, config,
  info, connecting, disconnecting, configuring, configInputs, configSaving, webhookUrl,
  onConnect, onDisconnect, onToggleConfig, onSaveConfig, onConfigInput,
  onWebhookUrl, onConnectWebhook,
}: any) {
  const isConfiguring = configuring === provider && provider !== 'webhook'
  const isWebhookForm = configuring === 'webhook' && provider === 'webhook'
  const needsConfig   = config && info.connected && !info.settings?.[config.key]

  return (
    <motion.div
      layout
      className="rounded-2xl border transition-all"
      style={{
        background: info.connected ? 'rgba(139,92,246,0.05)' : 'var(--card-bg)',
        borderColor: info.connected ? 'rgba(139,92,246,0.25)' : 'var(--card-border)',
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Emoji icon */}
          <span className="text-2xl leading-none mt-0.5 shrink-0">{icon}</span>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                {PROVIDER_LABELS[provider] || provider}
              </p>
              {comingSoon && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: 'var(--input-bg)', color: 'var(--text-3)' }}>
                  Coming soon
                </span>
              )}
              {info.connected && (
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                  <CheckCircle2 size={9} /> Connected
                </span>
              )}
              {needsConfig && !isConfiguring && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-400">
                  Needs config
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{desc}</p>
            {info.connected && info.email && (
              <p className="text-xs font-medium text-violet-400 mt-1">{info.email}</p>
            )}
            {info.connected && config && info.settings?.[config.key] && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                {config.label}: <span style={{ color: 'var(--text-2)' }}>{info.settings[config.key]}</span>
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {!comingSoon && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {info.connected ? (
              <>
                {config && (
                  <button
                    onClick={() => onToggleConfig(isConfiguring ? null : provider)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}
                  >
                    {isConfiguring ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    Configure
                  </button>
                )}
                {autoJoin && (
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>Auto-join</span>
                    <Toggle checked={info.auto_join ?? true} onChange={v => onConnect(provider, v)} />
                  </div>
                )}
                <button
                  onClick={() => onDisconnect(provider)}
                  disabled={disconnecting === provider}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 ml-auto"
                >
                  {disconnecting === provider ? <Loader2 size={11} className="animate-spin" /> : null}
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => onConnect(provider)}
                disabled={!!connecting || comingSoon}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-sm"
              >
                {connecting === provider ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}
                Connect
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline config panel */}
      <AnimatePresence>
        {(isConfiguring || isWebhookForm) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-3 border-t" style={{ borderColor: 'var(--divider)' }}>
              <div className="pt-3">
                {isWebhookForm ? (
                  <>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Webhook / Zapier URL</p>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>
                      After each meeting MinuteAI will POST meeting data to this URL.
                    </p>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={e => onWebhookUrl(e.target.value)}
                      placeholder="https://hooks.zapier.com/hooks/catch/..."
                      className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
                      style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-1)' }}
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={onConnectWebhook} disabled={configSaving || !webhookUrl.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
                        {configSaving ? <Loader2 size={11} className="animate-spin" /> : null} Save
                      </button>
                      <button onClick={() => onToggleConfig(null)}
                        className="rounded-lg border px-3 py-1.5 text-xs transition-colors"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--text-3)' }}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : config ? (
                  <>
                    <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>{config.label}</p>
                    <input
                      type="text"
                      value={configInputs[config.key] || ''}
                      onChange={e => onConfigInput(config.key, e.target.value)}
                      placeholder={config.placeholder}
                      className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
                      style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-1)' }}
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => onSaveConfig(provider)} disabled={configSaving}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
                        {configSaving ? <Loader2 size={11} className="animate-spin" /> : null} Save
                      </button>
                      <button onClick={() => onToggleConfig(null)}
                        className="rounded-lg border px-3 py-1.5 text-xs transition-colors"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--text-3)' }}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Integrations() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [integrations, setIntegrations] = useState<Record<string, any>>({})
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [configuring, setConfiguring] = useState<string | null>(null)
  const [configInputs, setConfigInputs] = useState<Record<string, string>>({})
  const [configSaving, setConfigSaving] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadIntegrations() {
    try {
      const data = await getIntegrations()
      setIntegrations(data)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadIntegrations() }, [])

  // Handle OAuth callback query params
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
      setBanner({ type: 'success', msg })
      loadIntegrations()
      setSearchParams({}, { replace: true })
    } else if (error) {
      handledOAuthRef.current = true
      setBanner({ type: 'error', msg: 'Connection failed — please try again.' })
      setSearchParams({}, { replace: true })
    }
  }, [])

  async function handleConnect(provider: string, autoJoinValue?: boolean) {
    // Called from auto-join toggle too
    if (autoJoinValue !== undefined) {
      setIntegrations(prev => ({ ...prev, [provider]: { ...prev[provider], auto_join: autoJoinValue } }))
      try { await updateIntegration(provider, { auto_join: autoJoinValue }) }
      catch { await loadIntegrations() }
      return
    }
    if (provider === 'webhook') { setConfiguring('webhook'); return }
    setConnecting(provider)
    try {
      const { url } = await getIntegrationConnectUrl(provider)
      window.location.href = url
    } catch {
      setBanner({ type: 'error', msg: `Could not start ${PROVIDER_LABELS[provider] || provider} OAuth.` })
      setConnecting(null)
    }
  }

  async function handleDisconnect(provider: string) {
    setDisconnecting(provider)
    try {
      await disconnectIntegration(provider)
      await loadIntegrations()
    } finally {
      setDisconnecting(null)
    }
  }

  async function handleSaveConfig(provider: string) {
    setConfigSaving(true)
    try {
      await updateIntegrationSettings(provider, configInputs)
      setConfiguring(null)
      setConfigInputs({})
      await loadIntegrations()
    } catch {
      setBanner({ type: 'error', msg: 'Could not save configuration.' })
    } finally {
      setConfigSaving(false)
    }
  }

  async function handleConnectWebhook() {
    if (!webhookUrl.trim()) return
    setConfigSaving(true)
    try {
      await connectWebhook(webhookUrl.trim())
      setConfiguring(null)
      setWebhookUrl('')
      await loadIntegrations()
      setBanner({ type: 'success', msg: 'Webhook connected! Meeting notes will be POSTed after each session.' })
    } catch {
      setBanner({ type: 'error', msg: 'Invalid webhook URL.' })
    } finally {
      setConfigSaving(false)
    }
  }

  // Stats
  const allItems = GROUPS.flatMap(g => g.items)
  const connectedCount = allItems.filter(i => integrations[i.provider]?.connected).length
  const availableCount = allItems.filter(i => !i.comingSoon).length

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Sidebar active="integrations" />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Header */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#4f35d2] via-[#5b45e8] to-[#7c3aed] px-6 py-6 pl-16 sm:px-8">
          <div className="pointer-events-none absolute -top-6 -right-6 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 w-28 h-28 rounded-full bg-fuchsia-400/10 blur-xl" />
          <div className="relative flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}
              className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0"
            >
              <Plug size={20} className="text-white" />
            </motion.div>
            <div>
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="text-[10px] font-bold uppercase tracking-widest text-violet-200/80 mb-0.5">
                Workspace
              </motion.p>
              <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-xl font-black text-white tracking-tight">
                Integrations
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
                className="text-sm text-violet-200/80 mt-0.5">
                Connect your tools — notes sync automatically after every meeting
              </motion.p>
            </div>
            {/* Stats */}
            {!loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                className="ml-auto flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <p className="text-2xl font-black text-white leading-none">{connectedCount}</p>
                  <p className="text-[10px] font-semibold text-violet-200/70 uppercase tracking-wide mt-0.5">Connected</p>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center">
                  <p className="text-2xl font-black text-white leading-none">{availableCount}</p>
                  <p className="text-[10px] font-semibold text-violet-200/70 uppercase tracking-wide mt-0.5">Available</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="w-full px-6 py-8 space-y-8">

          {/* Banner */}
          <AnimatePresence>
            {banner && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3.5 text-sm ${
                  banner.type === 'success'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : 'border-red-500/20 bg-red-500/10 text-red-400'
                }`}
              >
                <span>{banner.msg}</span>
                <button onClick={() => setBanner(null)} className="shrink-0 mt-0.5 opacity-60 hover:opacity-100">
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Groups */}
          {GROUPS.map(({ label, icon: GroupIcon, color, bg, items }, gi) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.06 }}
            >
              {/* Group header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${bg}`}>
                  <GroupIcon size={15} className={color} />
                </div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{label}</h2>
                <div className="flex-1 h-px ml-1" style={{ background: 'var(--divider)' }} />
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {items.filter(i => integrations[i.provider]?.connected).length}/{items.filter(i => !i.comingSoon).length} connected
                </span>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item: any) => {
                  const info = integrations[item.provider] || { connected: false, auto_join: true, settings: {} }
                  return (
                    <IntegrationCard
                      key={item.provider}
                      {...item}
                      info={info}
                      connecting={connecting}
                      disconnecting={disconnecting}
                      configuring={configuring}
                      configInputs={configInputs}
                      configSaving={configSaving}
                      webhookUrl={webhookUrl}
                      onConnect={handleConnect}
                      onDisconnect={handleDisconnect}
                      onToggleConfig={(p: string | null) => {
                        setConfiguring(p)
                        if (p && p !== 'webhook') {
                          setConfigInputs(info.settings || {})
                        }
                      }}
                      onSaveConfig={handleSaveConfig}
                      onConfigInput={(key: string, val: string) => setConfigInputs(prev => ({ ...prev, [key]: val }))}
                      onWebhookUrl={setWebhookUrl}
                      onConnectWebhook={handleConnectWebhook}
                    />
                  )
                })}
              </div>
            </motion.div>
          ))}

          {/* Footer note */}
          <p className="text-xs text-center pb-4" style={{ color: 'var(--text-3)' }}>
            Need an integration that's not listed?{' '}
            <a href="mailto:support@minuteai.com" className="text-violet-400 hover:underline">Let us know</a>
          </p>
        </div>
      </div>
    </div>
  )
}
