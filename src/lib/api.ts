const BASE       = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const CHUNK_SIZE = 5 * 1024 * 1024  // 5 MB

const ACCESS_KEY  = 'minuteai_access'
const REFRESH_KEY = 'minuteai_refresh'
const USER_KEY    = 'minuteai_user'

function token() {
  return localStorage.getItem(ACCESS_KEY)
}

function authHeaders() {
  return token() ? { Authorization: `Bearer ${token()}` } : {}
}

// ── Token refresh ─────────────────────────────────────────────────────────────
// Singleton promise — prevents multiple concurrent refresh calls when several
// requests 401 at the same time.
let _refreshPromise: Promise<string> | null = null

async function _doRefresh() {
  const rt = localStorage.getItem(REFRESH_KEY)
  if (!rt) throw new Error('no_refresh_token')

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
  })

  if (!res.ok) {
    // Wipe auth state and notify the app
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
    window.dispatchEvent(new CustomEvent('minuteai:logout'))
    throw new Error('refresh_failed')
  }

  const { access_token, refresh_token } = await res.json()
  localStorage.setItem(ACCESS_KEY, access_token)
  if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token)
  return access_token
}

function refreshOnce() {
  if (!_refreshPromise) {
    _refreshPromise = _doRefresh().finally(() => { _refreshPromise = null })
  }
  return _refreshPromise
}

// ── JSON requests ─────────────────────────────────────────────────────────────

export async function apiFetch(path, options: RequestInit = {}) {
  const { headers: extraHeaders, ...rest } = options
  const makeHeaders = (tok) => ({
    'Content-Type': 'application/json',
    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
    ...extraHeaders,
  })

  let res = await fetch(`${BASE}${path}`, { headers: makeHeaders(token()), ...rest })

  // Transparent token refresh + single retry
  if (res.status === 401) {
    try {
      const newToken = await refreshOnce()
      res = await fetch(`${BASE}${path}`, { headers: makeHeaders(newToken), ...rest })
    } catch {
      throw new Error('Session expired. Please sign in again.')
    }
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'Request failed.')
  return data
}

export const api = {
  get:    (path)       => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: 'POST',  body: JSON.stringify(body) }),
  patch:  (path, body) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path)       => apiFetch(path, { method: 'DELETE' }),
}

// ── FormData requests (auth header injected, no Content-Type override) ────────

export async function formRequest(path, options: RequestInit = {}) {
  const { headers: extraHeaders, ...rest } = options
  const makeHeaders = (tok) => ({
    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
    ...extraHeaders,
  })

  let res = await fetch(`${BASE}${path}`, { headers: makeHeaders(token()), ...rest })

  if (res.status === 401) {
    try {
      const newToken = await refreshOnce()
      res = await fetch(`${BASE}${path}`, { headers: makeHeaders(newToken), ...rest })
    } catch {
      throw new Error('Session expired. Please sign in again.')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

// ── Chunked resumable upload ──────────────────────────────────────────────────

function uploadKey(file) {
  return `minuteai_upload_${file.name}_${file.size}`
}

export async function uploadAudio(file, email, onProgress, workspaceId) {
  const key         = uploadKey(file)
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

  let jobId      = null
  let startChunk = 0

  const saved = JSON.parse(localStorage.getItem(key) || 'null')
  if (saved?.jobId && saved?.chunksCompleted < totalChunks) {
    try {
      const status = await getJobStatus(saved.jobId)
      if (status.status === 'uploading') {
        jobId      = saved.jobId
        startChunk = saved.chunksCompleted ?? 0
      }
    } catch { /* job gone — start fresh */ }
  }

  if (!jobId) {
    const form = new FormData()
    form.append('filename', file.name)
    form.append('filesize', String(file.size))
    if (email) form.append('email', email)
    if (workspaceId) form.append('workspace_id', workspaceId)
    const result = await formRequest('/upload/init', { method: 'POST', body: form })
    jobId      = result.jobId
    startChunk = 0
    localStorage.setItem(key, JSON.stringify({ jobId, chunksCompleted: 0, totalChunks }))
  }

  if (startChunk > 0) onProgress?.(startChunk / totalChunks)

  for (let i = startChunk; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const blob  = file.slice(start, Math.min(start + CHUNK_SIZE, file.size))
    const form  = new FormData()
    form.append('index', String(i))
    form.append('total', String(totalChunks))
    form.append('chunk', blob, 'chunk')
    await formRequest(`/upload/chunk/${jobId}`, { method: 'POST', body: form })
    localStorage.setItem(key, JSON.stringify({ jobId, chunksCompleted: i + 1, totalChunks }))
    onProgress?.((i + 1) / totalChunks)
  }

  const completeForm = new FormData()
  completeForm.append('filename', file.name)
  await formRequest(`/upload/complete/${jobId}`, { method: 'POST', body: completeForm })
  localStorage.removeItem(key)
  return { jobId }
}

// ── Status / results / downloads ──────────────────────────────────────────────

export function getJobStatus(jobId)          { return apiFetch(`/status/${jobId}`) }
export function getResults(jobId)            { return apiFetch(`/results/${jobId}`) }
export function retryJob(jobId)              { return apiFetch(`/retry/${jobId}`, { method: 'POST' }) }
export function getDownloadUrl(jobId, fmt, template?: string) {
  const base = `${BASE}/download/${jobId}/${fmt}`
  return template ? `${base}?template=${encodeURIComponent(template)}` : base
}
export function getMeetingBotCalendarUrl(sessionId) { return `${BASE}/meeting-bots/${sessionId}/calendar.ics` }

export async function downloadMeetingBotCalendar(sessionId) {
  let res = await fetch(getMeetingBotCalendarUrl(sessionId), { headers: authHeaders() })
  if (res.status === 401) {
    const newToken = await refreshOnce()
    res = await fetch(getMeetingBotCalendarUrl(sessionId), { headers: { Authorization: `Bearer ${newToken}` } })
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Could not download calendar event.')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `minuteai-${sessionId}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function createMeetingBotSession(payload) {
  return api.post('/meeting-bots', payload)
}

export function listMeetingBotSessions(workspaceId) {
  const query = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : ''
  return api.get(`/meeting-bots${query}`)
}

export function listUpcomingMeetingBotSessions(workspaceId, limit = 5) {
  return api.get(`/meeting-bots/upcoming?workspace_id=${encodeURIComponent(workspaceId)}&limit=${limit}`)
}

export function getWorkspaceBotAccount(workspaceId) {
  return api.get(`/workspaces/${workspaceId}/bot-account`)
}

export function getMeetingBotSession(sessionId) {
  return api.get(`/meeting-bots/${sessionId}`)
}

export function cancelMeetingBotSession(sessionId) {
  return api.post(`/meeting-bots/${sessionId}/cancel`, {})
}

export function endMeetingBotSession(sessionId) {
  return api.post(`/meeting-bots/${sessionId}/end`, {})
}

export function getIntegrations() {
  return api.get('/integrations')
}

export function getIntegrationConnectUrl(provider: string) {
  const origin = encodeURIComponent(window.location.origin)
  return api.get(`/integrations/connect/${provider}?origin=${origin}`)
}

export function disconnectIntegration(provider: string) {
  return api.delete(`/integrations/${provider}`)
}

export function updateIntegration(provider: string, settings: { auto_join?: boolean }) {
  return api.patch(`/integrations/${provider}`, settings)
}

export function getUpcomingCalendarEvents(days = 7) {
  return api.get(`/integrations/calendar/upcoming?days=${days}`)
}

export function getUpcomingZoomMeetings() {
  return api.get('/integrations/zoom/upcoming')
}

export function updateIntegrationSettings(provider: string, settings: Record<string, string>) {
  return api.patch(`/integrations/${provider}/settings`, settings)
}

export function getIntegrationResources(provider: string) {
  return api.get(`/integrations/${provider}/resources`)
}

export function connectWebhook(url: string) {
  return api.post('/integrations/webhook/connect', { url })
}

export function attachPaymentMethod(paymentMethodId: string) {
  return api.post('/billing/attach-payment-method', { payment_method_id: paymentMethodId })
}

export function subscribeToPlan(paymentMethodId: string | null | undefined, plan: string, interval: string, promoCode?: string) {
  return api.post('/billing/subscribe', {
    payment_method_id: paymentMethodId || undefined,
    plan,
    interval,
    promo_code: promoCode || undefined,
  })
}
