/**
 * 공유 그림판 PIP — 채널의 모두가 같은 캔버스에 실시간으로 그린다.
 * 내가 그린 획은 그리는 즉시 로컬 캔버스에 나타나고, pointerup 시점에 백엔드(draw API)로
 * 보내면 서버가 저장하고 채널 전체에 방송한다. 반대로 draw.stroke 이벤트를 받으면
 * 그 획을 캔버스에 덧그린다. 좌표는 캔버스 크기와 무관하게 0..1로 정규화해 주고받으므로
 * 접속자마다 창 크기가 달라도 같은 지점에 그려진다.
 */
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { motion, useDragControls } from 'motion/react'
import { clearDraw, getDraw, sendStroke, type Stroke } from './api'
import { CloseIcon } from '../../shared/ui/icons'
import { useIsMobile } from '../../shared/lib/useMediaQuery'
import { usePipDrag } from '../../shared/lib/usePipDrag'
import type { Subscribe } from '../../shared/realtime/useChannelSocket'

// 팔레트: 이리데센트 3색 파스텔 + 기본 잉크 + 화이트(지우개 대용)
const COLORS = ['#2a2a33', '#ff8b6a', '#8fc9f0', '#c7e86b', '#c9a7f0', '#ffffff']
const WIDTHS = [2, 4, 8]

const MIN_W = 260
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
const maxW = () => Math.max(MIN_W, window.innerWidth - 40)

export function Whiteboard({
  channelId,
  subscribe,
  onClose,
  constraintsRef,
}: {
  channelId: number
  subscribe: Subscribe
  onClose: () => void
  constraintsRef: RefObject<HTMLElement | null>
}) {
  const [width, setWidth] = useState(() => clamp(340, MIN_W, maxW()))
  const [color, setColor] = useState(COLORS[0])
  const [brush, setBrush] = useState(WIDTHS[1])
  // 모바일에선 화면 폭을 꽉 채우는 시트로 뜬다 — 드래그·리사이즈·인라인 폭을 모두 CSS에 맡긴다
  const isMobile = useIsMobile()
  const dragControls = useDragControls()
  const resizeRef = useRef<{ x: number; w: number } | null>(null)
  const pipRef = useRef<HTMLDivElement>(null)
  // 창 크기·뷰포트가 바뀌어도 채팅 본문 밖으로 나가지 않게 경계를 계속 다시 잰다
  const { x, y, dragConstraints } = usePipDrag(pipRef, constraintsRef, !isMobile)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // 지금까지 그려진 모든 획 — 캔버스 리사이즈 시 전체를 다시 그리는 데 쓴다
  const strokesRef = useRef<Stroke[]>([])
  // 그리는 도중인 현재 획의 정규화 좌표들
  const drawingRef = useRef<number[][] | null>(null)
  // 콜백들이 항상 최신 색/굵기를 읽도록 ref에 미러링
  const colorRef = useRef(color)
  const brushRef = useRef(brush)
  useEffect(() => {
    colorRef.current = color
  }, [color])
  useEffect(() => {
    brushRef.current = brush
  }, [brush])

  // 획 하나를 캔버스에 그린다.
  // space가 'px'면 좌표를 그대로 쓴다 — 창을 키워도 그림 크기는 그대로고 그릴 면만 넓어진다.
  // space가 'norm'(구버전 데이터)이면 0..1 좌표라 현재 캔버스 크기를 곱해 늘려 그린다.
  function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number) {
    if (s.points.length === 0) return
    const sx = s.space === 'px' ? 1 : w
    const sy = s.space === 'px' ? 1 : h
    ctx.strokeStyle = s.color
    ctx.lineWidth = s.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    const [x0, y0] = s.points[0]
    ctx.moveTo(x0 * sx, y0 * sy)
    if (s.points.length === 1) {
      // 점 하나만 찍힌 경우 — 작은 원처럼 보이게 살짝 이어 그린다
      ctx.lineTo(x0 * sx + 0.01, y0 * sy + 0.01)
    } else {
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i][0] * sx, s.points[i][1] * sy)
      }
    }
    ctx.stroke()
  }

  // 캔버스 픽셀 크기(devicePixelRatio 반영)를 화면 크기에 맞추고 전체 획을 다시 그린다
  function resizeAndRedraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, rect.width, rect.height)
    for (const s of strokesRef.current) paintStroke(ctx, s, rect.width, rect.height)
  }

  // 마운트 시 지금까지의 획을 불러와 그린다 + 실시간 구독. 재연결 시 다시 조회한다.
  useEffect(() => {
    let alive = true
    getDraw(channelId)
      .then((res) => {
        if (!alive) return
        strokesRef.current = res.strokes
        resizeAndRedraw()
      })
      .catch(() => {})
    const off = subscribe((e) => {
      if (e.type === 'draw.stroke') {
        const s = e.payload as unknown as Stroke
        strokesRef.current.push(s)
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (canvas && ctx) {
          const rect = canvas.getBoundingClientRect()
          paintStroke(ctx, s, rect.width, rect.height)
        }
      } else if (e.type === 'draw.clear') {
        strokesRef.current = []
        resizeAndRedraw()
      } else if (e.type === 'ws.open') {
        getDraw(channelId)
          .then((res) => {
            strokesRef.current = res.strokes
            resizeAndRedraw()
          })
          .catch(() => {})
      }
    })
    return () => {
      alive = false
      off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, subscribe])

  // 캔버스의 "표시 크기"가 바뀔 때마다 픽셀 버퍼를 다시 맞추고 전체를 다시 그린다.
  //
  // 캔버스는 버퍼 크기(canvas.width)와 CSS 표시 크기가 어긋나면 브라우저가 비트맵을
  // 통째로 늘려/줄여 그린다. 그래서 표시 크기가 바뀐 순간 버퍼를 같이 맞춰주지 않으면
  // "창 크기를 바꿨더니 그림까지 같이 늘어나는" 문제가 그대로 보인다.
  //
  // 예전엔 width state와 window resize만 지켜봤는데 두 군데가 새고 있었다:
  //  - width state 변경은 useEffect라 페인트 뒤에 반영돼, 리사이즈 핸들을 끄는 동안
  //    그림이 한 프레임씩 늘었다 줄었다 했다.
  //  - CSS만으로 폭이 바뀌는 경우(멤버 패널을 열어 채팅 본문이 좁아지면서 max-width에
  //    걸릴 때, 모바일 시트)는 width state가 안 바뀌어 아예 다시 그려지지 않았다.
  // ResizeObserver는 이 둘을 모두 잡고 페인트 전에 불리므로 한 번에 해결된다.
  // (버퍼 크기만 바꾸고 레이아웃은 건드리지 않으므로 관찰 루프는 생기지 않는다)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => resizeAndRedraw())
    ro.observe(canvas)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 뷰포트가 줄면 창 폭도 경계 안으로 다시 맞춘다 (다시 그리는 일은 위 ResizeObserver가 맡는다)
  useEffect(() => {
    function onWinResize() {
      setWidth((cur) => clamp(cur, MIN_W, maxW()))
    }
    window.addEventListener('resize', onWinResize)
    return () => window.removeEventListener('resize', onWinResize)
  }, [])

  // 왼쪽 위 핸들로 가로 크기 조절 (오른쪽 아래가 앵커)
  function onResizeStart(e: ReactPointerEvent) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeRef.current = { x: e.clientX, w: width }
  }
  function onResizeMove(e: ReactPointerEvent) {
    const s = resizeRef.current
    if (!s) return
    setWidth(clamp(s.w + (s.x - e.clientX), MIN_W, maxW()))
  }
  function onResizeEnd(e: ReactPointerEvent) {
    resizeRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  // 캔버스 좌상단 기준 CSS 픽셀 좌표. 정규화하지 않는 이유는 위 paintStroke 주석 참고 —
  // 창을 키웠을 때 그림이 함께 커지지 않고 그릴 수 있는 면이 넓어지게 하기 위해서다.
  function canvasPoint(e: ReactPointerEvent): [number, number] {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return [
      clamp(e.clientX - rect.left, 0, rect.width),
      clamp(e.clientY - rect.top, 0, rect.height),
    ]
  }

  function onDrawStart(e: ReactPointerEvent) {
    e.preventDefault()
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
    drawingRef.current = [canvasPoint(e)]
  }

  function onDrawMove(e: ReactPointerEvent) {
    const pts = drawingRef.current
    if (!pts) return
    const p = canvasPoint(e)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      // 방금 지나온 구간만 이어 그려 실시간 체감을 준다 (좌표가 이미 CSS 픽셀이라 그대로 쓴다)
      const prev = pts[pts.length - 1]
      ctx.strokeStyle = colorRef.current
      ctx.lineWidth = brushRef.current
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(prev[0], prev[1])
      ctx.lineTo(p[0], p[1])
      ctx.stroke()
    }
    pts.push(p)
  }

  function onDrawEnd(e: ReactPointerEvent) {
    const pts = drawingRef.current
    drawingRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (!pts || pts.length === 0) return
    const stroke = {
      points: pts,
      color: colorRef.current,
      width: brushRef.current,
      space: 'px' as const,
    }
    // 로컬 기록에 남겨 리사이즈 시에도 다시 그려지게 한다(방송 에코는 무시해도 무방)
    strokesRef.current.push({ ...stroke, user_id: -1 })
    void sendStroke(channelId, stroke).catch(() => {})
  }

  function onClear() {
    strokesRef.current = []
    resizeAndRedraw()
    void clearDraw(channelId).catch(() => {})
  }

  return (
    <motion.div
      ref={pipRef}
      className="wb-pip"
      style={isMobile ? { x, y } : { width, x, y }}
      drag={!isMobile}
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={dragConstraints}
      dragMomentum={false}
      dragElastic={0}
      // y는 드래그 위치를 담는 모션값이라 등장 애니메이션에서 건드리지 않는다(충돌 방지)
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {/* 왼쪽 위 리사이즈 핸들 — 게임 PIP와 동일한 그립 스타일 재사용 */}
      {!isMobile && (
        <div
          className="game-pip-resize"
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
          title="크기 조절"
        />
      )}

      <div className="wb-head" onPointerDown={isMobile ? undefined : (e) => dragControls.start(e)}>
        <span className="wb-title">🎨 공유 그림판</span>
        <button className="wb-close" onClick={onClose} title="닫기">
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="wb-body">
        <div className="wb-canvas-wrap">
          <canvas
            ref={canvasRef}
            className="wb-canvas"
            onPointerDown={onDrawStart}
            onPointerMove={onDrawMove}
            onPointerUp={onDrawEnd}
            onPointerCancel={onDrawEnd}
          />
        </div>

        <div className="wb-toolbar">
          <div className="wb-swatches">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`wb-swatch${c === color ? ' active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>
          <div className="wb-widths">
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                className={`wb-width${w === brush ? ' active' : ''}`}
                onClick={() => setBrush(w)}
                title={`굵기 ${w}`}
              >
                <span className="wb-width-dot" style={{ width: w + 3, height: w + 3 }} />
              </button>
            ))}
          </div>
          <button type="button" className="wb-clear" onClick={onClear}>
            전체 지우기
          </button>
        </div>
      </div>
    </motion.div>
  )
}
