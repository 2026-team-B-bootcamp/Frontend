import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../auth/authContext'
import { getMembers } from '../servers/api'
import { upsertTags } from './api'
import { ApiError } from '../../shared/api/client'

export function ProfileModal({
  serverId,
  serverName,
  onClose,
  onSaved,
}: {
  serverId: number
  serverName?: string
  onClose: () => void
  onSaved: () => void
}) {
  const { userId, displayName } = useAuth()
  const [tags, setTags] = useState<[string, string, string]>(['', '', ''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getMembers(serverId)
      .then((ms) => {
        if (!active) return
        const mine = ms.find((m) => m.user_id === userId)
        if (mine && mine.tags.length === 3) {
          setTags([mine.tags[0], mine.tags[1], mine.tags[2]])
        }
      })
      .catch(() => {
        // 미설정 상태로 시작
      })
    return () => {
      active = false
    }
  }, [serverId, userId])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    const [t1, t2, t3] = tags.map((t) => t.trim())
    if (!t1 || !t2 || !t3) {
      setError('태그 3개를 모두 입력해주세요')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await upsertTags(serverId, t1, t2, t3)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      className="modal-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <motion.div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <h2>{displayName}님의 프로필</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          {serverName ?? '서버'} 에서 이름 옆에 붙는 관심사 태그 3개
        </p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={onSave}>
          {tags.map((t, i) => (
            <div className="field" key={i}>
              <input
                className="input"
                placeholder={`관심사 ${i + 1} (예: ${['축구', '포켓몬', '커피'][i]})`}
                value={t}
                maxLength={30}
                onChange={(e) =>
                  setTags((prev) => {
                    const next = [...prev] as [string, string, string]
                    next[i] = e.target.value
                    return next
                  })
                }
              />
            </div>
          ))}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn ghost" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
