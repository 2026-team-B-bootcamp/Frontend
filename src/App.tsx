// 라우팅 최상위 컴포넌트. 이 앱의 모든 화면(URL 경로)을 여기서 정의한다.
// 로그인이 필요한 경로는 RequireAuth로 감싸서, 토큰이 없으면 자동으로 /login으로 보낸다.
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './features/auth/RequireAuth'
import { LandingPage } from './features/landing/LandingPage'
import { LoginPage } from './features/auth/LoginPage'
import { SignupPage } from './features/auth/SignupPage'

// 로그인 후에만 쓰는 무거운 화면(채팅·게임·화이트보드·motion)은 lazy 로드로
// 초기 번들에서 떼어낸다. 첫 화면(랜딩/로그인)은 즉시 뜨고, 로그인 뒤 필요할 때
// 별도 청크로 받아온다.
const ServerListPage = lazy(() =>
  import('./features/servers/ServerListPage').then((m) => ({ default: m.ServerListPage })),
)
const ChatPage = lazy(() =>
  import('./features/chat/ChatPage').then((m) => ({ default: m.ChatPage })),
)
// 기능 하나만 화면 가득 보여주는 페이지(슬랙 링크의 목적지). 게임 패널을 전부
// 끌고 오므로 ChatPage와 마찬가지로 lazy로 뗀다.
const FeaturePage = lazy(() =>
  import('./features/play/FeaturePage').then((m) => ({ default: m.FeaturePage })),
)

// 서버 화면과 채널 화면이 같은 element를 공유한다 — 서버만 골라 들어온 경우
// ChatPage가 채널 목록을 불러와 첫 채널로 replace 이동하는데, 두 라우트가 같은
// 컴포넌트 트리라 React가 리마운트하지 않고 상태를 유지한다.
// (예전에는 /servers/:serverId 가 null을 렌더하는 별도 컴포넌트여서
//  서버 전환 때마다 화면 전체가 사라졌다 나타나는 플리커가 있었다)
const chatElement = (
  <RequireAuth>
    <ChatPage />
  </RequireAuth>
)

function App() {
  return (
    // lazy 청크를 받아오는 동안 화면 전체가 비지 않게 최소 폴백을 둔다.
    <Suspense fallback={<div className="route-loading" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        {/* 아래 경로들은 로그인해야만 볼 수 있어서 RequireAuth로 감싼다 (토큰 없으면 /login으로 리다이렉트) */}
        <Route
          path="/servers"
          element={
            <RequireAuth>
              <ServerListPage />
            </RequireAuth>
          }
        />
        <Route path="/servers/:serverId" element={chatElement} />
        <Route path="/servers/:serverId/channels/:channelId" element={chatElement} />
        {/* 기능 하나만 있는 전용 화면. 슬랙 봇이 발급하는 입장 링크가 여기로 온다 —
            "빙고 하자"로 들어온 사람에게 채팅방 위 작은 PIP를 주면 정작 하러 온 것이
            곁다리로 보이기 때문이다. 채널·실시간 연결은 채팅방과 같아 같은 판에서 만난다. */}
        <Route
          path="/servers/:serverId/channels/:channelId/play/:feature"
          element={
            <RequireAuth>
              <FeaturePage />
            </RequireAuth>
          }
        />
        {/* 예전 채널 경로는 서버 구조로 통합됨 */}
        <Route path="/channels/*" element={<Navigate to="/servers" replace />} />
        <Route path="*" element={<Navigate to="/servers" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
