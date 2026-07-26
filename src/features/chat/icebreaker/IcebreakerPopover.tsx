/**
 * 입력창 위에 뜨는 AI 아이스브레이커 팝오버 — 멤버 선택 → 관심사 선택 → 질문 후보 선택 3단계 UI.
 * 상태와 API 호출은 useIcebreaker가 갖고 있고, 이 컴포넌트는 그것을 그리기만 한다.
 */
import { AnimatePresence, motion } from 'motion/react'
import type { Member } from '../../servers/api'
import { TagPills } from '../../users/TagPills'
import { avatarColor } from '../../../shared/lib/colors'

export function IcebreakerPopover({
  ibOpen,
  ibMembers,
  ibBusy,
  ibTarget,
  ibSelTags,
  ibQuestions,
  ibTargets,
  ibTargetTags,
  onPickIbTarget,
  toggleIbTag,
  generateIbQuestions,
  onPickIbQuestion,
  backToMembers,
  backToTags,
}: {
  ibOpen: boolean
  ibMembers: Member[] | null
  ibBusy: boolean
  ibTarget: Member | null
  ibSelTags: string[]
  ibQuestions: string[] | null
  ibTargets: Member[]
  ibTargetTags: string[]
  onPickIbTarget: (m: Member) => void
  toggleIbTag: (tag: string) => void
  generateIbQuestions: (target: Member, tags: string[] | null) => void
  onPickIbQuestion: (question: string) => void
  backToMembers: () => void
  backToTags: () => void
}) {
  return (
    <AnimatePresence>
      {ibOpen && (
        <motion.div
          className="ib-popover"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {ibTarget === null ? (
            /* 1단계: 누구에게 말을 걸지 멤버 선택 */
            <>
              <div className="ib-popover-title">
                누구에게 말을 걸까요? AI가 첫 질문을 만들어드려요
              </div>
              {ibMembers === null ? (
                <p className="muted" style={{ padding: '4px 8px' }}>
                  멤버 불러오는 중…
                </p>
              ) : ibTargets.length === 0 ? (
                <p className="muted" style={{ padding: '4px 8px' }}>
                  아직 다른 멤버가 없습니다
                </p>
              ) : (
                ibTargets.map((m) => (
                  <button
                    key={m.user_id}
                    type="button"
                    className="ib-target"
                    disabled={ibBusy}
                    onClick={() => onPickIbTarget(m)}
                  >
                    <span
                      className="chat-avatar"
                      style={{ background: avatarColor(m.user_id) }}
                    >
                      {m.display_name.charAt(0)}
                    </span>
                    <span className="ib-target-name">{m.display_name}</span>
                    {/* common_with_me: 나와 겹치는 태그 — TagPills가 강조 표시해줌 */}
                    <TagPills tags={m.tags} common={m.common_with_me} />
                  </button>
                ))
              )}
            </>
          ) : ibQuestions === null ? (
            /* 2단계: 어떤 관심사에 대해 질문할지 선택 (기본 전체 선택) */
            <>
              <div className="ib-popover-title">
                {ibTarget.display_name}님의 어떤 관심사로 말을 걸까요?
              </div>
              {ibTargetTags.length === 0 ? (
                <p className="muted" style={{ padding: '4px 8px' }}>
                  아직 관심사가 없는 멤버예요 — 일반 질문을 만드는 중…
                </p>
              ) : (
                <div className="ib-tag-select">
                  {ibTargetTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`ib-tag-choice${ibSelTags.includes(tag) ? ' selected' : ''}`}
                      onClick={() => toggleIbTag(tag)}
                      disabled={ibBusy}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
              <div className="ib-actions">
                <button
                  type="button"
                  className="ib-back"
                  disabled={ibBusy}
                  onClick={backToMembers}
                >
                  ← 멤버 다시 고르기
                </button>
                {ibTargetTags.length > 0 && (
                  <button
                    type="button"
                    className="btn ib-generate"
                    disabled={ibBusy || ibSelTags.length === 0}
                    onClick={() => generateIbQuestions(ibTarget, ibSelTags)}
                  >
                    {ibBusy ? '질문 만드는 중…' : '질문 만들기'}
                  </button>
                )}
              </div>
            </>
          ) : (
            /* 3단계: AI가 만든 질문 후보 중 하나 선택 */
            <>
              <div className="ib-popover-title">마음에 드는 질문을 골라 보내보세요</div>
              {/* AI가 만든 질문은 위에서부터 차례로 스며들듯 나타난다 — "지금 막 생성됐다"는 느낌 */}
              {ibQuestions.map((q, i) => (
                <motion.button
                  key={q}
                  type="button"
                  className="ib-question"
                  onClick={() => onPickIbQuestion(q)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: i * 0.09, ease: 'easeOut' }}
                >
                  {q}
                </motion.button>
              ))}
              <div className="ib-actions">
                <button type="button" className="ib-back" onClick={backToTags}>
                  ← 관심사 다시 고르기
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
