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
