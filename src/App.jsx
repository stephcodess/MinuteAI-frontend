import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider, useAuth } from './context/AuthContext'
import { WorkspaceProvider } from './context/WorkspaceContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
import Navbar from './components/Navbar'
import LoadingScreen from './components/LoadingScreen'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Billing from './pages/Billing'
import Settings from './pages/Settings'
import Team from './pages/Team'
import Upload from './pages/Upload'
import Processing from './pages/Processing'
import Results from './pages/Results'
import Pricing from './pages/Pricing'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import AcceptInvite from './pages/AcceptInvite'
import Subscription from './pages/Subscription'
import Tasks from './pages/Tasks'
import MeetingBots from './pages/MeetingBots'
import MeetingBotDetail from './pages/MeetingBotDetail'
import RecordMeetingFab from './components/RecordMeetingFab'

function AppRoutes() {
  const { ready } = useAuth()

  if (!ready) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/team" element={<Team />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/processing/:jobId" element={<Processing />} />
          <Route path="/results/:jobId" element={<Results />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/meeting-bots" element={<MeetingBots />} />
          <Route path="/meeting-bots/:sessionId" element={<MeetingBotDetail />} />
        </Routes>
      </main>
      <RecordMeetingFab />
    </div>
  )
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <WorkspaceProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </WorkspaceProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
