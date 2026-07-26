/**
 * AI 아이스브레이커 팝오버의 상태 — 멤버 선택 → 관심사 선택 → 질문 후보 선택의 3단계를 관리한다.
 * 입력창과의 유일한 접점은 onQuestionPicked 콜백 하나뿐이라(타자기 효과로 채워넣는 일은
 * useComposer 쪽 책임), 이 훅은 입력창을 전혀 알지 못한다.
 */
import { useState } from 'react'
import { getMembers, type Member } from '../../servers/api'
import { getIcebreaker } from '../api'

export function useIcebreaker({
  serverId,
  userId,
  onQuestionPicked,
  setError,
}: {
  serverId: number
  userId: number | null
  onQuestionPicked: (question: string) => void
  setError: (message: string) => void
}) {
  const [ibOpen, setIbOpen] = useState(false)
  const [ibMembers, setIbMembers] = useState<Member[] | null>(null)
  const [ibBusy, setIbBusy] = useState(false)
  // 아이스브레이커 3단계 상태: 멤버 선택 → 관심사 선택 → 질문 후보 중 선택
  const [ibTarget, setIbTarget] = useState<Member | null>(null)
  const [ibSelTags, setIbSelTags] = useState<string[]>([])
  const [ibQuestions, setIbQuestions] = useState<string[] | null>(null)

  async function toggleIbPicker() {
    if (ibOpen) {
      setIbOpen(false)
      return
    }
    setIbOpen(true)
    setIbMembers(null)
    setIbTarget(null)
    setIbQuestions(null)
    try {
      setIbMembers(await getMembers(serverId))
    } catch {
      setIbMembers([])
    }
  }

  // 멤버를 고르면 바로 질문을 만들지 않고, 어떤 관심사로 물을지 먼저 고르게 한다
  function onPickIbTarget(m: Member) {
    const realTags = m.tags.filter((t) => t && t.trim().length > 0)
    setIbTarget(m)
    setIbSelTags([]) // 기본은 미선택 — 물어보고 싶은 관심사만 직접 고르게 한다
    setIbQuestions(null)
    // 관심사 태그가 없는 멤버는 고를 게 없으니 바로 일반 질문을 뽑는다
    if (realTags.length === 0) void generateIbQuestions(m, null)
  }

  function toggleIbTag(tag: string) {
    setIbSelTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  // 고른 관심사로 AI 질문 후보(최대 3개)를 받아온다. 같은 관심사 조합은
  // 백엔드가 캐시해 두므로 두 번째부터는 LLM 호출 없이 바로 온다.
  async function generateIbQuestions(target: Member, tags: string[] | null) {
    setIbBusy(true)
    try {
      const r = await getIcebreaker(serverId, target.user_id, tags ?? undefined)
      setIbQuestions(r.questions)
    } catch {
      setError('아이스브레이커 생성에 실패했습니다')
    } finally {
      setIbBusy(false)
    }
  }

  // 후보 중 하나를 고르면 팝오버를 닫고, 입력창에 채워넣는 일은 onQuestionPicked에 맡긴다
  // (이게 입력창↔아이스브레이커의 유일한 접점 — 여기서 더 알 필요가 없다)
  function onPickIbQuestion(question: string) {
    setIbOpen(false)
    onQuestionPicked(question)
  }

  const ibTargets = ibMembers?.filter((m) => m.user_id !== userId) ?? []
  const ibTargetTags = ibTarget?.tags.filter((t) => t && t.trim().length > 0) ?? []

  return {
    ibOpen,
    ibMembers,
    ibBusy,
    ibTarget,
    ibSelTags,
    ibQuestions,
    ibTargets,
    ibTargetTags,
    toggleIbPicker,
    onPickIbTarget,
    toggleIbTag,
    generateIbQuestions,
    onPickIbQuestion,
    backToMembers: () => setIbTarget(null),
    backToTags: () => setIbQuestions(null),
  }
}
