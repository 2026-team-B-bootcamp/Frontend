/**
 * 프로필 편집 모달 — 닉네임/이메일/아바타는 users/api.ts, 관심사 태그 3개는
 * "이 서버 안에서의 내 태그"로 servers/api.ts(upsertTags)에 저장한다.
 * 저장 성공 시 onSaved로 부모(ChatPage)에게 알려 멤버 패널을 새로고침시킨다.
 */
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../auth/authContext'
import { getMembers } from '../servers/api'
import { getMe, updateMe, uploadAvatar, upsertTags } from './api'
import { ApiError, BASE_URL } from '../../shared/api/client'
import { avatarColor } from '../../shared/lib/colors'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function resolveAvatarUrl(url: string | null) {
  if (!url) return null
  return url.startsWith('http') ? url : `${BASE_URL}${url}`
}

function CameraIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8.5c0-.83.67-1.5 1.5-1.5h2l1-2h7l1 2h2c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

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
  const { userId, displayName, setProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [email, setEmail] = useState('')
  const [name, setName] = useState(displayName ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [tags, setTags] = useState<[string, string, string]>(['', '', ''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 내 프로필(users/api.ts)과, 이 서버에서의 내 태그(servers/api.ts의 멤버 목록에서 찾음)를
  // 각각 불러와 폼 초기값으로 채운다
  useEffect(() => {
    let active = true
    getMe()
      .then((me) => {
        if (!active) return
        setEmail(me.email)
        setName(me.display_name)
        setAvatarUrl(me.avatar_url)
      })
      .catch(() => {
        // 토큰 만료 등 — 폼은 그대로 두고 저장 시점에 에러 처리
      })
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

  async function onPickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('jpg, png, webp 이미지만 업로드할 수 있어요')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('이미지 용량은 5MB 이하여야 해요')
      return
    }
    setError(null)
    setAvatarUploading(true)
    try {
      // 파일을 백엔드로 업로드하고 반환된 이미지 url을 프로필에 반영
      const updated = await uploadAvatar(file)
      setAvatarUrl(updated.avatar_url)
      setProfile(name.trim() || updated.display_name, updated.avatar_url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '사진 업로드에 실패했습니다')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const [t1, t2, t3] = tags.map((t) => t.trim())
    if (!trimmedName) {
      setError('닉네임을 입력해주세요')
      return
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError('올바른 이메일 형식이 아니에요')
      return
    }
    if (!t1 || !t2 || !t3) {
      setError('태그 3개를 모두 입력해주세요')
      return
    }
    setSaving(true)
    setError(null)
    try {
      // 두 요청을 순서대로: 계정 정보(닉네임/이메일)와 서버별 관심사 태그는 별도 엔드포인트
      const updated = await updateMe(trimmedName, trimmedEmail)
      await upsertTags(serverId, t1, t2, t3)
      setEmail(updated.email)
      setProfile(updated.display_name, updated.avatar_url)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const resolvedAvatar = resolveAvatarUrl(avatarUrl)
  const initial = (name || displayName || '?').trim().charAt(0).toUpperCase()

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
        className="modal profile-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <h2>프로필 편집</h2>
        <p className="muted" style={{ marginBottom: 18 }}>
          {serverName ?? '서버'} 에서 다른 사람에게 보여질 정보예요
        </p>

        <div className="avatar-edit">
          <button
            type="button"
            className="avatar-edit-photo"
            style={!resolvedAvatar ? { background: avatarColor(userId ?? 0) } : undefined}
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            aria-label="프로필 사진 변경"
          >
            <span className="avatar-edit-photo-inner">
              {resolvedAvatar ? (
                <img src={resolvedAvatar} alt="" />
              ) : (
                <span className="avatar-edit-initial">{initial}</span>
              )}
              {avatarUploading && <span className="avatar-edit-spinner" aria-hidden="true" />}
            </span>
            <span className="avatar-edit-badge">
              <CameraIcon />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={onPickAvatar}
          />
          <button
            type="button"
            className="avatar-edit-link"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
          >
            {avatarUploading ? '업로드 중…' : '사진 바꾸기'}
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={onSave}>
          <div className="field">
            <label htmlFor="profile-name">닉네임</label>
            <input
              id="profile-name"
              className="input"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-email">이메일</label>
            <input
              id="profile-email"
              className="input"
              type="email"
              value={email}
              maxLength={255}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="profile-divider" />

          <span className="profile-section-label">관심사 태그 3개</span>
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
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn ghost" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn" disabled={saving || avatarUploading}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
