/**
 * 관심사 태그 설정 모달 — 서버에 처음 들어와 태그가 비어 있는 사람에게 자동으로 뜬다.
 *
 * 그냥 빈 칸 3개를 내밀면 뭘 적어야 할지 막막하다. 그래서 먼저 "이 모임엔 이런 관심사를
 * 가진 사람들이 있어요"를 보여준다: 상위 태그 분포(막대 + 인원수), AI가 만든 한줄 요약,
 * 그리고 눌러서 바로 채울 수 있는 추천 태그. 데이터는 users/api.ts의 getTagStats로 받고,
 * 백엔드가 AI 요약을 Redis에 캐시하므로 모달을 여러 번 열어도 LLM을 다시 부르지 않는다.
 *
 * 저장은 ProfileModal과 같은 upsertTags를 쓴다 — 태그의 소유는 "유저 × 서버"다.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { getTagStats, upsertTags, type TagStats } from './api'
import { SparkIcon } from '../../shared/ui/icons'
import { ApiError } from '../../shared/api/client'

const TAG_COLORS = ['#c7e86b', '#ff8b6a', '#8fc9f0']

// TagPills와 같은 규칙으로 색을 정한다 — 같은 태그는 화면 어디서든 같은 색으로 보여야 한다
function colorFor(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0
  return TAG_COLORS[h % TAG_COLORS.length]
}

export function TagSetupModal({
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
  const [stats, setStats] = useState<TagStats | null>(null)
  const [tags, setTags] = useState<[string, string, string]>(['', '', ''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getTagStats(serverId)
      .then((s) => {
        if (!active) return
        setStats(s)
        // 이미 등록해둔 태그가 있으면(프로필에서 다시 열었을 때) 초기값으로 채운다
        if (s.my_tags.length > 0) {
          setTags([s.my_tags[0] ?? '', s.my_tags[1] ?? '', s.my_tags[2] ?? ''])
        }
      })
      .catch(() => {
        // 통계를 못 받아도 태그 입력 자체는 되어야 한다 — 빈 상태로 진행한다
        if (active) setStats(null)
      })
    return () => {
      active = false
    }
  }, [serverId])

  // 추천 태그를 누르면 비어 있는 첫 칸에 넣는다. 이미 들어 있는 태그면 도로 뺀다(토글).
  function applySuggestion(tag: string) {
    setTags((prev) => {
      const next = [...prev] as [string, string, string]
      const at = next.findIndex((t) => t.trim() === tag)
      if (at >= 0) {
        next[at] = ''
        return next
      }
      const empty = next.findIndex((t) => !t.trim())
      if (empty < 0) return prev
      next[empty] = tag
      return next
    })
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    const [t1, t2, t3] = tags.map((t) => t.trim())
    if (!t1 || !t2 || !t3) {
      setError('관심사 3개를 모두 채워주세요')
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

  // 막대 길이는 1등 태그를 100%로 둔 상대값이다 — 인원이 적어도 분포가 눈에 들어온다
  const maxCount = stats?.top_tags[0]?.count ?? 0
  const chosen = new Set(tags.map((t) => t.trim()).filter(Boolean))

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <motion.div
        className="modal tag-setup-modal"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <h2>관심사 3개만 알려주세요</h2>
        <p className="muted tag-setup-lead">
          {serverName ?? '이 모임'} 에서 나를 소개할 관심사예요. 겹치는 사람이 있으면 이름 옆에
          반짝이며 표시돼요.
        </p>

        {/* ① 이 모임의 관심사 지형도 — 뭘 적을지 감을 잡는 자리 */}
        <div className="tag-stats">
          {stats === null ? (
            <div className="tag-stats-loading muted">모임 관심사를 살펴보는 중…</div>
          ) : (
            <>
              <div className="tag-stats-head">
                <span className="tag-stats-title">이 모임의 관심사</span>
                <span className="muted tag-stats-count">
                  {stats.total_members}명 중 {stats.tagged_members}명이 등록
                </span>
              </div>

              {stats.top_tags.length === 0 ? (
                <p className="muted tag-stats-empty">
                  아직 등록된 관심사가 없어요. 첫 번째 주인공이 되어보세요!
                </p>
              ) : (
                <ul className="tag-stats-list">
                  {stats.top_tags.map((row, i) => (
                    <motion.li
                      key={row.tag}
                      className="tag-stats-row"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.26, delay: i * 0.04, ease: 'easeOut' }}
                    >
                      <span className="tag-stats-name">{row.tag}</span>
                      <span className="tag-stats-bar">
                        <motion.span
                          className="tag-stats-fill"
                          style={{ background: colorFor(row.tag) }}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${maxCount > 0 ? (row.count / maxCount) * 100 : 0}%`,
                          }}
                          transition={{ duration: 0.5, delay: 0.1 + i * 0.04, ease: 'easeOut' }}
                        />
                      </span>
                      <span className="muted tag-stats-num">{row.count}</span>
                    </motion.li>
                  ))}
                </ul>
              )}

              {/* ② AI 한줄 요약 — 분포가 그대로면 Redis 캐시에서 바로 온다 */}
              {stats.summary && (
                <motion.p
                  className="tag-stats-summary"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: 0.12, ease: 'easeOut' }}
                >
                  <SparkIcon size={14} /> {stats.summary}
                </motion.p>
              )}

              {/* ③ 추천 태그 — 눌러서 아래 입력칸을 바로 채운다 */}
              {stats.suggestions.length > 0 && (
                <div className="tag-suggest">
                  <span className="tag-suggest-label">눌러서 담기</span>
                  <div className="tag-suggest-list">
                    {stats.suggestions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`tag-suggest-chip${chosen.has(tag) ? ' picked' : ''}`}
                        onClick={() => applySuggestion(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

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
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn ghost" onClick={onClose}>
              나중에 하기
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? '저장 중…' : '시작하기'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
