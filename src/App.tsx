import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider, useAuth } from './context/AuthContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { ThemeProvider } from './context/ThemeContext'
import LoadingScreen from './components/LoadingScreen'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Billing from './pages/Billing'
import Settings from './pages/Settings'
import Team from './pages/Team'
import Upload from './pages/Upload'
import Processing from './pages/Processing'
import Results from './pages/Results'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import AcceptInvite from './pages/AcceptInvite'
import Subscription from './pages/Subscription'
import Tasks from './pages/Tasks'
import MeetingBots from './pages/MeetingBots'
import MeetingBotDetail from './pages/MeetingBotDetail'
import LiveSession from './pages/LiveSession'
import LiveTranslator from './pages/LiveTranslator'
import Onboarding from './pages/Onboarding'
import Recordings from './pages/Recordings'
import Integrations from './pages/Integrations'
import PdfToAudio from './pages/PdfToAudio'
import ConnectCard from './pages/ConnectCard'
import Threads from './pages/Threads'
import ActionFab from './components/ActionFab'
import UpdateNotifier from './components/UpdateNotifier'
import ProductTour from './components/ProductTour'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// Use HashRouter in Electron (file:// protocol doesn't support HTML5 history).
// window.electronAPI is injected by the preload script before React renders.
const Router = typeof window !== 'undefined' && window.electronAPI
  ? HashRouter
  : BrowserRouter

function RequireAuth({ children }) {
  const { isSignedIn } = useAuth()
  if (!isSignedIn) return <Navigate to="/login" replace />
  return children
}

const AUTH_PATHS = ['/login', '/signup', '/verify-email', '/forgot-password', '/accept-invite', '/onboarding', '/connect-card']

function AppRoutes() {
  const { ready, isSignedIn, user } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  // Redirect to /login when a background token expiry is detected
  useEffect(() => {
    const onExpired = () =>
      navigate('/login', { replace: true, state: { expired: true } })
    window.addEventListener('minuteai:session-expired', onExpired)
    return () => window.removeEventListener('minuteai:session-expired', onExpired)
  }, [navigate])

  // Gate 1: onboarding
  useEffect(() => {
    if (
      ready &&
      isSignedIn &&
      !user?.onboarding_completed &&
      !AUTH_PATHS.includes(location.pathname)
    ) {
      navigate('/onboarding', { replace: true })
    }
  }, [ready, isSignedIn, user?.onboarding_completed, location.pathname, navigate])

  // Gate 2: payment card
  useEffect(() => {
    if (
      ready &&
      isSignedIn &&
      user?.onboarding_completed &&
      user?.has_payment_method === false &&
      !AUTH_PATHS.includes(location.pathname)
    ) {
      navigate('/connect-card', { replace: true })
    }
  }, [ready, isSignedIn, user?.onboarding_completed, user?.has_payment_method, location.pathname, navigate])

  if (!ready) return <LoadingScreen />
  return (
    <div className="min-h-screen flex flex-col">
      <Routes>
          <Route path="/" element={isSignedIn ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/team" element={<Team />} />
          <Route path="/upload" element={<RequireAuth><Upload /></RequireAuth>} />
          <Route path="/processing/:jobId" element={<Processing />} />
          <Route path="/results/:jobId" element={<Results />} />
          <Route path="/pricing" element={<Navigate to="/login" replace />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/threads" element={<RequireAuth><Threads /></RequireAuth>} />
          <Route path="/meeting-bots" element={<MeetingBots />} />
          <Route path="/meeting-bots/:sessionId" element={<MeetingBotDetail />} />
          <Route path="/live/:shareToken" element={<LiveSession />} />
          <Route path="/translator" element={<RequireAuth><LiveTranslator /></RequireAuth>} />
          <Route path="/recordings" element={<RequireAuth><Recordings /></RequireAuth>} />
          <Route path="/integrations" element={<RequireAuth><Integrations /></RequireAuth>} />
          <Route path="/pdf-to-audio" element={<RequireAuth><PdfToAudio /></RequireAuth>} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/connect-card" element={<ConnectCard />} />
          <Route path="/privacy" element={<Navigate to="/login" replace />} />
          <Route path="/terms" element={<Navigate to="/login" replace />} />
          <Route path="/contact" element={<Navigate to="/login" replace />} />
        </Routes>
      <ActionFab />
      <ProductTour />
      <UpdateNotifier />
    </div>
  )
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <Router>
              <AppRoutes />
            </Router>
          </WorkspaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  )
}
