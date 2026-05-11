import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const ACCESS_KEY  = 'minuteai_access'
const REFRESH_KEY = 'minuteai_refresh'
const USER_KEY    = 'minuteai_user'

async function apiFetch(path, options = {}) {
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

  // Listen for forced logout triggered by lib/api.js when refresh fails mid-session
  useEffect(() => {
    const handler = () => _clear()
    window.addEventListener('minuteai:logout', handler)
    return () => window.removeEventListener('minuteai:logout', handler)
  }, [])

  // On mount: verify stored access token is still valid
  useEffect(() => {
    const stored = localStorage.getItem(ACCESS_KEY)
    if (!stored) { setReady(true); return }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)

    async function boot() {
      try {
        const u = await apiFetch('/auth/me', {
          headers: { Authorization: `Bearer ${stored}` },
          signal: controller.signal,
        })
        setUser(u)
      } catch {
        // Access token invalid/expired — try refresh
        const rt = localStorage.getItem(REFRESH_KEY)
        if (!rt) { _clear(); return }
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
      getAccessToken,
      updateUser,
      googleSignIn,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
