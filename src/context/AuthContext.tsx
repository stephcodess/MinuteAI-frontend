import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const ACCESS_KEY  = 'minuteai_access'
const REFRESH_KEY = 'minuteai_refresh'
const USER_KEY    = 'minuteai_user'

function parseJwtExp(token: string): number | null {
  try {
    return JSON.parse(atob(token.split('.')[1])).exp * 1000
  } catch {
    return null
  }
}

async function apiFetch(path, options: RequestInit = {}) {
  const { headers: extraHeaders, ...rest } = options
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    ...rest,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'Something went wrong.')
  return data
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  })
  const [ready, setReady] = useState(false)

  // When api.ts fails a token refresh mid-request, clear auth and signal for redirect
  useEffect(() => {
    const handler = () => {
      _clear()
      window.dispatchEvent(new CustomEvent('minuteai:session-expired'))
    }
    window.addEventListener('minuteai:logout', handler)
    return () => window.removeEventListener('minuteai:logout', handler)
  }, [])

  // Proactively refresh the access token ~5 min before it expires
  useEffect(() => {
    if (!user) return
    const id = setInterval(async () => {
      const token = localStorage.getItem(ACCESS_KEY)
      const rt    = localStorage.getItem(REFRESH_KEY)
      if (!token || !rt) return
      const exp = parseJwtExp(token)
      if (!exp || exp - Date.now() > 5 * 60 * 1000) return  // plenty of time left
      try {
        const data = await apiFetch('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: rt }),
        })
        localStorage.setItem(ACCESS_KEY, data.access_token)
        if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token)
      } catch {
        _clear()
        window.dispatchEvent(new CustomEvent('minuteai:session-expired'))
      }
    }, 60_000) // check every minute
    return () => clearInterval(id)
  }, [user])

  // On mount: verify stored access token is still valid
  useEffect(() => {
    const stored = localStorage.getItem(ACCESS_KEY)
    if (!stored) { setReady(true); return }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)

    async function boot() {
      try {
        const u = await apiFetch('/auth/me', {
          headers: { Authorization: `Bearer ${stored}` },
          signal: controller.signal,
        })
        setUser(u)
      } catch (err: any) {
        // Network failure / timeout — keep cached user, don't force logout
        if (err?.name === 'AbortError' || err?.message?.includes('fetch')) {
          setReady(true)
          clearTimeout(timer)
          return
        }
        // Token rejected (401) — try refresh
        const rt = localStorage.getItem(REFRESH_KEY)
        if (!rt) { _clear(); setReady(true); return }
        try {
          const { access_token } = await apiFetch('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refresh_token: rt }),
          })
          localStorage.setItem(ACCESS_KEY, access_token)
          const u = await apiFetch('/auth/me', { headers: { Authorization: `Bearer ${access_token}` } })
          setUser(u)
        } catch {
          _clear()
        }
      } finally {
        clearTimeout(timer)
        setReady(true)
      }
    }

    boot()
  }, [])

  function _persist(data) {
    localStorage.setItem(ACCESS_KEY, data.access_token)
    if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    setUser(data.user)
  }

  function _clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  function updateUser(updates) {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, ...updates }
      localStorage.setItem(USER_KEY, JSON.stringify(next))
      return next
    })
  }

  async function signUp(name, email, password) {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
    return data  // { message, user_id }
  }

  async function verifyEmail(userId, code) {
    const data = await apiFetch('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, code }),
    })
    _persist(data)
    return data
  }

  async function resendOTP(userId, type = 'verify_email') {
    return apiFetch('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, type }),
    })
  }

  async function signIn(email, password) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (data.requires_2fa) return data
    _persist(data)
    return data
  }

  async function verifySignIn2FA(userId, code) {
    const data = await apiFetch('/auth/login/2fa', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, code }),
    })
    _persist(data)
    return data
  }

  async function googleSignIn(accessToken) {
    const data = await apiFetch('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken }),
    })
    _persist(data)
    return data
  }

  function signOut() {
    _clear()
  }

  async function forgotPassword(email) {
    return apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async function resetPassword(userId, code, newPassword) {
    const data = await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, code, new_password: newPassword }),
    })
    _persist(data)
    return data
  }

  function getAccessToken() {
    return localStorage.getItem(ACCESS_KEY)
  }

  async function refreshUser() {
    const token = localStorage.getItem(ACCESS_KEY)
    if (!token) return
    try {
      const u = await apiFetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      setUser(u)
      localStorage.setItem(USER_KEY, JSON.stringify(u))
    } catch {}
  }

  return (
    <AuthContext.Provider value={{
      user,
      isSignedIn: !!user,
      ready,
      signUp,
      verifyEmail,
      resendOTP,
      signIn,
      signOut,
      forgotPassword,
      resetPassword,
      verifySignIn2FA,
      getAccessToken,
      updateUser,
      googleSignIn,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
