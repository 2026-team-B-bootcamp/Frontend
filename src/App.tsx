import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { RequireAuth } from './features/auth/RequireAuth'
import { LandingPage } from './features/landing/LandingPage'
import { LoginPage } from './features/auth/LoginPage'
import { SignupPage } from './features/auth/SignupPage'
import { ServerListPage } from './features/servers/ServerListPage'
import { ChatPage } from './features/chat/ChatPage'
import { listChannels } from './features/servers/api'

/** /servers/:serverId 로 들어오면 첫 채널로 보낸다 */
function ServerEntry() {
  const { serverId } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    const id = Number(serverId)
    if (!Number.isFinite(id)) {
      navigate('/servers', { replace: true })
      return
    }
    let active = true
    listChannels(id)
      .then((channels) => {
        if (!active) return
        if (channels.length > 0) {
          navigate(`/servers/${id}/channels/${channels[0].id}`, { replace: true })
        } else {
          navigate('/servers', { replace: true })
        }
      })
      .catch(() => {
        if (active) navigate('/servers', { replace: true })
      })
    return () => {
      active = false
    }
  }, [serverId, navigate])

  return null
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/servers"
        element={
          <RequireAuth>
            <ServerListPage />
          </RequireAuth>
        }
      />
      <Route
        path="/servers/:serverId"
        element={
          <RequireAuth>
            <ServerEntry />
          </RequireAuth>
        }
      />
      <Route
        path="/servers/:serverId/channels/:channelId"
        element={
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        }
      />
      {/* 예전 채널 경로는 서버 구조로 통합됨 */}
      <Route path="/channels/*" element={<Navigate to="/servers" replace />} />
      <Route path="*" element={<Navigate to="/servers" replace />} />
    </Routes>
  )
}

export default App
