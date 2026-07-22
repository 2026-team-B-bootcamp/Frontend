// 로그인 화면. 폼 제출 시 AuthContext의 login()을 호출해서
// authApi.login -> apiFetch -> 백엔드 순으로 요청이 나가고, 성공하면 토큰이 저장된다.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './authContext'
import { ApiError } from '../../shared/api/client'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email, password)
      navigate('/servers')
    } catch (err) {
      // ApiError는 client.ts의 apiFetch가 서버 응답을 해석해서 던지는 에러 타입
      setError(err instanceof ApiError ? err.message : '로그인에 실패했습니다')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center-screen">
      {/* 장식용 떠다니는 태그 필 — 크기·회전·간격을 흩뜨려 의도적으로 비대칭 배치 */}
      <span className="auth-pill lg" style={{ left: '6%', top: '21%', rotate: '-7deg' }}>커피</span>
      <span className="auth-pill sm" style={{ left: '19%', top: '8%', rotate: '4deg' }}>축구</span>
      <span className="auth-pill lime" style={{ right: '26%', top: '11%', rotate: '-4deg' }}>등산</span>
      <span className="auth-pill sm sky" style={{ right: '5%', top: '31%', rotate: '6deg' }}>재즈</span>
      <span className="auth-pill coral" style={{ left: '14%', bottom: '36%', rotate: '5deg' }}>보드게임</span>
      <span className="auth-pill lg" style={{ right: '11%', bottom: '22%', rotate: '-5deg' }}>여행</span>
      <span className="auth-pill sm" style={{ left: '30%', bottom: '8%', rotate: '3deg' }}>캠핑</span>
      <div className="card auth-box">
        <h1>로그인</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          관심사 태그로 라포를 형성하세요
        </p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? '로그인 중…' : '로그인'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 16, textAlign: 'center' }}>
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </p>
      </div>
    </div>
  )
}
