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
