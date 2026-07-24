// 앱 진입점(entry point). index.html의 #root에 React 트리를 처음 그려 넣는 곳.
// BrowserRouter(라우팅) → AuthProvider(로그인 상태 전역 제공) → MotionConfig(애니메이션 설정)
// 순서로 App을 감싸서, 하위 모든 컴포넌트가 라우팅/인증 상태에 접근할 수 있게 한다.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import './styles/index.css'
import App from './App.tsx'
import { AuthProvider } from './features/auth/AuthContext.tsx'
import { setToken } from './shared/api/client'

// 슬랙 봇이 발급한 개인 입장 링크(...?t=<JWT>&open=bingo)로 들어온 경우.
//
// ⚠️ 반드시 createRoot 이전에 실행해야 한다. AuthProvider는 초기 토큰을
// useState(() => getToken())으로 **첫 렌더에 한 번만** 읽으므로, Provider 안에서
// 처리하면 첫 렌더가 로그아웃 상태가 되고 RequireAuth가 /login으로 튕겨버린다.
//
// ?open= 은 지우지 않는다 — ChatPage가 어떤 패널을 열지 결정하는 데 쓴다.
function consumeSlackEntryToken(): void {
  try {
    const url = new URL(window.location.href)
    const token = url.searchParams.get('t')
    if (!token) return

    setToken(token)
    // 이 브라우저를 쓰던 다른 사람의 이름·사진이 잠깐 보이는 걸 막는다.
    // (AuthProvider가 곧 /users/me로 진짜 값을 채운다)
    localStorage.removeItem('display_name')
    localStorage.removeItem('avatar_url')

    // 토큰이 주소창·브라우저 기록·공유 링크에 남지 않게 즉시 지운다.
    url.searchParams.delete('t')
    window.history.replaceState({}, '', url.toString())
  } catch {
    // 시크릿 모드 등 localStorage가 막힌 환경 — 링크 입장만 실패하고 앱은 정상 동작한다
  }
}

consumeSlackEntryToken()

// 저장소 정리: 계정 구분이 없던 옛 태그 온보딩 기록(tag_setup_skipped_<서버id>)을 지운다.
// 지금은 tag_setup_skipped_<유저id>_<서버id>를 쓰므로 옛 키는 아무도 읽지 않는 찌꺼기다.
// 새 코드가 이미 무시하니 기능상 급하진 않지만, 팀원들 브라우저에 남아 헷갈리게 하느니
// 한 번 훑고 지운다. 정규식이 "숫자 하나짜리" 옛 형식만 잡으므로 새 키는 건드리지 않는다.
try {
  Object.keys(localStorage)
    .filter((k) => /^tag_setup_skipped_\d+$/.test(k))
    .forEach((k) => localStorage.removeItem(k))
} catch {
  // 시크릿 모드 등 localStorage가 막힌 환경 — 정리는 부가 작업이라 조용히 넘어간다
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {/* AuthProvider가 토큰/로그인 함수를 전역 Context로 뿌려서, 어느 화면에서든 useAuth()로 꺼내 쓸 수 있다 */}
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
