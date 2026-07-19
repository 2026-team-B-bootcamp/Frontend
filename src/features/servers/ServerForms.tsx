/**
 * 서버(모임) 만들기 / 초대코드로 참여하기 폼 — 온보딩 페이지와 서버 추가 모달에서 공용으로 쓰인다.
 * servers/api.ts의 createServer, joinServer가 실제 백엔드 요청을 보낸다.
 */
import { useState, type FormEvent } from 'react'
import { createServer, joinServer, type Server } from './api'
import { ApiError } from '../../shared/api/client'

/** 서버 만들기 + 초대코드 참여 폼 — 온보딩 페이지와 서버 추가 모달에서 공용 */
export function ServerForms({ onDone }: { onDone: (server: Server) => void }) {
  const [newName, setNewName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 새 서버 생성: api로 백엔드에 만들고 나면 onDone으로 부모에게 생성된 서버를 전달
  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      onDone(await createServer(newName.trim()))
      setNewName('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '서버 생성에 실패했습니다')
    } finally {
      setCreating(false)
    }
  }

  // 초대코드로 참여: 코드를 대문자로 맞춰 api에 보내고, 성공하면 참여한 서버를 전달
  async function onJoin(e: FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setJoining(true)
    setError(null)
    try {
      onDone(await joinServer(inviteCode.trim().toUpperCase()))
      setInviteCode('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '참여에 실패했습니다')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="server-forms">
      {error && <div className="error">{error}</div>}

      <form onSubmit={onCreate}>
        <div className="server-forms-label">새 서버 만들기</div>
        <div className="row">
          <input
            className="input"
            placeholder="서버 이름 (예: 부트캠프 3기)"
            value={newName}
            maxLength={100}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: 1, minWidth: 150 }}
          />
          <button className="btn" type="submit" disabled={creating}>
            {creating ? '생성 중…' : '만들기'}
          </button>
        </div>
      </form>

      <div className="server-forms-or">또는</div>

      <form onSubmit={onJoin}>
        <div className="server-forms-label">초대코드로 참여</div>
        <div className="row">
          <input
            className="input invite-input"
            placeholder="예: 7K2FQ9XL"
            value={inviteCode}
            maxLength={8}
            onChange={(e) => setInviteCode(e.target.value)}
            style={{ flex: 1, minWidth: 150 }}
          />
          <button className="btn secondary" type="submit" disabled={joining}>
            {joining ? '참여 중…' : '참여'}
          </button>
        </div>
      </form>
    </div>
  )
}
