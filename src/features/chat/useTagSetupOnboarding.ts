// 관심사 태그 온보딩 모달의 상태와 노출 조건.
//
// 관심사 태그가 비어 있으면 태그 설정 모달을 띄운다. 태그는 이 서비스의 핵심(겹치는 관심사
// 매칭·AI 아이스브레이커)인데 예전엔 프로필 모달을 직접 열어야만 설정할 수 있어 빈 채로
// 쓰는 사람이 많았다. 서버마다 한 번만 권하고, "나중에 하기"를 누르면 그 서버에선 다시
// 묻지 않는다(localStorage).
import { useEffect, useState } from 'react'
import { getMembers } from '../servers/api'

// "나중에 하기"를 기억하는 localStorage 키.
// 반드시 userId까지 넣어야 한다 — 예전엔 서버 id만 썼더니 같은 브라우저에서 계정을 바꿔가며
// 쓸 때(데모·테스트에서 늘 하는 일) A가 한 번 미룬 서버는 B에게도 영영 안 떴다.
// B는 태그가 하나도 없는 첫 방문자인데 온보딩을 통째로 건너뛰는 셈이라 치명적이었다.
function tagSetupSkipKey(userId: number, serverId: number) {
  return `tag_setup_skipped_${userId}_${serverId}`
}

export function useTagSetupOnboarding(sid: number, userId: number | null) {
  // 관심사 태그 모달. null이면 닫힘.
  // 'onboarding' = 태그가 빈 사람에게 입장 시 자동으로 뜬 것 → 닫으면 "다시 묻지 말라"로 기록.
  // 'browse'     = 멤버 패널에서 직접 연 것 → 닫아도 아무것도 기록하지 않는다.
  // 예전엔 boolean 하나였는데, 직접 연 모달을 닫는 것까지 "미뤘음"으로 남아
  // 정작 온보딩이 필요한 순간에 안 뜨게 될 여지가 있었다.
  const [mode, setMode] = useState<'onboarding' | 'browse' | null>(null)

  useEffect(() => {
    if (!Number.isFinite(sid) || userId == null) return
    if (localStorage.getItem(tagSetupSkipKey(userId, sid)) === '1') return
    let active = true
    getMembers(sid)
      .then((ms) => {
        const mine = ms.find((m) => m.user_id === userId)
        const hasTags = (mine?.tags ?? []).some((t) => t && t.trim().length > 0)
        if (active && mine && !hasTags) setMode('onboarding')
      })
      .catch(() => {
        // 목록을 못 받으면 조용히 넘어간다 — 프로필 모달로 언제든 설정할 수 있다
      })
    return () => {
      active = false
    }
  }, [sid, userId])

  // 멤버 패널의 "태그 보기/설정" 버튼 — 언제든 직접 열 수 있다
  function openBrowse() {
    setMode('browse')
  }

  // "나중에 하기" — 미뤘다는 사실은 자동으로 뜬 경우에만 남긴다. 직접 열어본 모달을
  // 닫은 것까지 "미뤘음"으로 기록하면, 정작 온보딩이 필요한 순간에 그 기록 때문에
  // 안 뜨게 된다. 저장하고 닫은 경우엔 여기 오지 않는다(close가 받는다).
  function dismiss() {
    if (mode === 'onboarding' && userId != null) {
      localStorage.setItem(tagSetupSkipKey(userId, sid), '1')
    }
    setMode(null)
  }

  // 저장하고 닫을 때 — 기록 없이 그냥 닫는다
  function close() {
    setMode(null)
  }

  return { mode, openBrowse, dismiss, close }
}
