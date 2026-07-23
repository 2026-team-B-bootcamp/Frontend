/**
 * 떠다니는 PIP 창(미니게임·함께보기·그림판)의 드래그 범위를 정하는 훅.
 *
 * 기준면은 채팅 본문이 아니라 "브라우저 창 전체"다 — 예전엔 채팅 본문 안에 가둬서
 * 왼쪽 채널 사이드바 위로는 옮길 수 없었는데, 떠 있는 창을 원하는 자리에 두지 못하면
 * 오히려 대화를 가린다. 지금은 창 안이라면 사이드바 위로도 자유롭게 옮길 수 있고,
 * 가장자리 밖으로도 상당 부분 밀어낼 수 있다(앱 셸이 overflow:hidden이라 삐져나온 만큼은
 * 잘려 보인다 = "화면 밖으로 치워둔" 모양). 대신 MIN_VISIBLE 만큼은 반드시 남겨서
 * 창을 통째로 잃어버려 다시 잡을 수 없게 되는 일은 막는다.
 *
 * motion의 dragConstraints에 ref를 그대로 넘기지 않는 이유: motion은 경계를 "드래그를
 * 시작하는 순간"에 한 번만 재기 때문에 창을 리사이즈하거나 브라우저 창이 작아지면
 * 이미 밖으로 나간 위치가 그대로 남는다. 여기서는 숫자로 직접 계산해 넘기고,
 * 크기·뷰포트가 바뀔 때마다 현재 위치(x/y)를 새 경계 안으로 즉시 되돌린다.
 *
 * 측정에 getBoundingClientRect 대신 offsetLeft·offsetWidth 류를 쓰는 이유는
 * 등장 애니메이션(scale 0.9)의 transform이 섞이지 않는 레이아웃 값이라야 정확해서다.
 * 다만 이 값은 offsetParent(= 채팅 본문) 기준이므로, 뷰포트 기준으로 바꾸려면
 * 기준면의 화면상 위치를 한 번 더해 준다.
 */
import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { useMotionValue } from 'motion/react'

// 화면 안에 최소한 남겨둘 PIP의 크기(px) — 이만큼은 항상 보이므로 다시 끌어올 수 있다
const MIN_VISIBLE = 76

export interface PipBounds {
  top: number
  left: number
  right: number
  bottom: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

export function usePipDrag(
  pipRef: RefObject<HTMLElement | null>,
  // PIP가 position:absolute로 얹혀 있는 기준면(채팅 본문). 경계 계산의 원점을 잡는 데만 쓴다 —
  // 이 면 안으로 가두지는 않는다.
  containerRef: RefObject<HTMLElement | null>,
  // 모바일에선 PIP가 하단 시트라 드래그 자체가 없다 — 측정도 하지 않는다
  enabled: boolean,
) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const [bounds, setBounds] = useState<PipBounds>({ top: 0, left: 0, right: 0, bottom: 0 })

  const measure = useCallback(() => {
    const pip = pipRef.current
    const container = containerRef.current
    if (!pip || !container) return
    const doc = document.documentElement
    const vw = doc.clientWidth
    const vh = doc.clientHeight
    // 기준면 자체에는 transform이 없어 rect를 그대로 써도 안전하다
    const base = container.getBoundingClientRect()
    // transform 이전의 "CSS가 정한 자리"를 뷰포트 좌표로 환산한 값
    const left0 = base.left + pip.offsetLeft
    const top0 = base.top + pip.offsetTop
    const w = pip.offsetWidth

    // 가로: 좌우 어느 쪽으로든 MIN_VISIBLE만 남기고 밀어낼 수 있다
    const minX = MIN_VISIBLE - w - left0
    const maxX = vw - MIN_VISIBLE - left0
    // 세로: 위로는 헤더(잡는 손잡이)가 잘리면 다시 못 잡으므로 화면 위 끝에서 멈추고,
    //       아래로는 MIN_VISIBLE만 남기고 내려둘 수 있다
    const minY = -top0
    const maxY = Math.max(minY, vh - MIN_VISIBLE - top0)
    // 창이 뷰포트보다 클 때 min > max가 되는 경우를 방지 (좌상단 우선)
    setBounds({
      left: minX,
      right: Math.max(minX, maxX),
      top: minY,
      bottom: maxY,
    })

    // 이미 밖에 있던 위치는 즉시 안으로 되돌린다 (motion은 다음 드래그 전까지 스스로 보정하지 않는다)
    x.set(clamp(x.get(), minX, Math.max(minX, maxX)))
    y.set(clamp(y.get(), minY, maxY))
  }, [pipRef, containerRef, x, y])

  useLayoutEffect(() => {
    if (!enabled) {
      // 하단 시트로 바뀔 땐 남아 있던 드래그 오프셋을 지운다 — 안 그러면 시트가 비뚤게 뜬다
      x.set(0)
      y.set(0)
      return
    }
    measure()
  }, [enabled, measure, x, y])

  // 창 크기 변경(리사이즈 핸들·게임 전환)과 뷰포트 변화 모두를 잡는다
  useEffect(() => {
    if (!enabled) return
    const pip = pipRef.current
    const container = containerRef.current
    if (!pip || !container) return
    const ro = new ResizeObserver(measure)
    ro.observe(pip)
    ro.observe(container)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [enabled, measure, pipRef, containerRef])

  return { x, y, dragConstraints: bounds }
}
