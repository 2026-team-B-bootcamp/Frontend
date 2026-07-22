// 회원가입 화면. 폼 제출 시 AuthContext의 signup()을 호출해서
// authApi.signup -> apiFetch -> 백엔드 순으로 요청이 나가고, 성공하면 바로 로그인 처리된다.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './authContext'
import { ApiError } from '../../shared/api/client'

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signup(email, password, displayName)
      navigate('/servers')
    } catch (err) {
      // ApiError는 client.ts의 apiFetch가 서버 응답을 해석해서 던지는 에러 타입
      setError(err instanceof ApiError ? err.message : '회원가입에 실패했습니다')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center-screen">
      {/* 장식용 떠다니는 태그 필 — 로그인과 같은 문법, 비대칭 배치 */}
      <span className="auth-pill sm" style={{ left: '8%', top: '10%', rotate: '5deg' }}>캠핑</span>
      <span className="auth-pill lg" style={{ left: '22%', top: '23%', rotate: '-4deg' }}>독서</span>
      <span className="auth-pill sky" style={{ right: '7%', top: '17%', rotate: '6deg' }}>러닝</span>
      <span className="auth-pill lime sm" style={{ right: '20%', top: '40%', rotate: '-6deg' }}>요리</span>
      <span className="auth-pill coral" style={{ left: '10%', bottom: '28%', rotate: '4deg' }}>사진</span>
      <span className="auth-pill lg" style={{ right: '13%', bottom: '11%', rotate: '-3deg' }}>헬스</span>
      <div className="card auth-box">
        <h1>회원가입</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          이름과 관심사로 첫 대화를 시작하세요
        </p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="name">이름</label>
            <input
              id="name"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
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
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? '가입 중…' : '회원가입'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 16, textAlign: 'center' }}>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  )
}
