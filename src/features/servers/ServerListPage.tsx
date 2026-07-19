import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '../auth/authContext'
import { listServers, type Server } from './api'
import { ServerForms } from './ServerForms'

const LAST_SERVER_KEY = 'last_server_id'

/**
 * /servers 게이트:
 * - 참여한 서버가 있으면 → 마지막 방문 서버(없으면 첫 서버)의 채팅으로 즉시 이동
 * - 하나도 없으면 → 온보딩 (만들기 / 초대코드 참여)
 * 서버 전환은 채팅 화면의 레일에서 하므로 별도 목록 페이지는 두지 않는다.
 */
export function ServerListPage() {
  const { displayName, logout } = useAuth()
  const navigate = useNavigate()
  const [servers, setServers] = useState<Server[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listServers()
      .then((data) => {
        if (active) setServers(data)
      })
      .catch(() => {
        if (active) {
          setServers([])
          setError('서버 목록을 불러오지 못했어요. 아래에서 새로 시작할 수 있습니다.')
        }
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!servers || servers.length === 0) return
    const stored = localStorage.getItem(LAST_SERVER_KEY)
    const target = servers.find((s) => String(s.id) === stored) ?? servers[0]
    navigate(`/servers/${target.id}`, { replace: true })
  }, [servers, navigate])

  if (servers === null || servers.length > 0) {
    return (
      <div className="center-screen">
        <p className="muted">이동 중…</p>
      </div>
    )
  }

  return (
    <div className="center-screen">
      <motion.div
        className="card onboard-box"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <h1>환영해요{displayName ? `, ${displayName}님` : ''} 👋</h1>
        <p className="muted" style={{ margin: '6px 0 20px' }}>
          아직 참여한 서버가 없어요.
          <br />첫 모임 공간을 만들거나, 받은 초대코드로 들어가보세요.
        </p>
        {error && <div className="error">{error}</div>}
        <ServerForms onDone={(server) => navigate(`/servers/${server.id}`)} />
        <button
          className="onboard-logout"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          로그아웃
        </button>
      </motion.div>
    </div>
  )
}
