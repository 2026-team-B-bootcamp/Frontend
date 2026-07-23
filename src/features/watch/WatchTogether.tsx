/**
 * 유튜브 함께 보기 PIP — 채널의 모두가 같은 영상을 동기화해서 본다.
 * 재생/일시정지/탐색을 하면 백엔드(watch API)로 동기화하고, 서버가 채널 전체에 방송한다.
 * 반대로 watch.state 이벤트를 받으면 그 상태를 플레이어에 반영한다(에코 방지 가드 포함).
 * 위치는 서버가 "지금 있어야 할 위치"로 보정해 주므로 늦게 들어와도 대략 맞는 지점부터 본다.
 */
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
  type RefObject,
} from 'react'
import { motion, useDragControls } from 'motion/react'
import { getWatch, startWatch, stopWatch, syncWatch, type WatchState } from './api'
import { loadYouTubeApi, PAUSED, PLAYING, type YTPlayer } from './youtube'
import { CloseIcon } from '../../shared/ui/icons'
import { ApiError } from '../../shared/api/client'
import type { Subscribe } from '../../shared/realtime/useChannelSocket'

const INACTIVE: WatchState = {
  active: false,
  video_id: null,
  playing: false,
  position: 0,
  host_user_id: null,
  host_name: null,
}

const MIN_W = 300
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
const maxW = () => Math.max(MIN_W, window.innerWidth - 40)

export function WatchTogether({
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
  const [state, setState] = useState<WatchState | null>(null)
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [width, setWidth] = useState(() => clamp(400, MIN_W, maxW()))
  const dragControls = useDragControls()
  const resizeRef = useRef<{ x: number; w: number } | null>(null)

  const playerRef = useRef<YTPlayer | null>(null)
  const mountRef = useRef<HTMLDivElement | null>(null)
  // 플레이어가 onReady 이후(메서드 호출 가능)인지 — 준비 전 호출은 예외를 던져 트리를 죽인다
  const readyRef = useRef(false)
  // 서버 상태를 플레이어에 반영하는 동안엔 그로 인해 발생하는 onStateChange를 무시(에코 방지)
  const applyingRef = useRef(false)
  const applyTimerRef = useRef<number | null>(null)
  const videoIdRef = useRef<string | null>(null)
  const creatingRef = useRef(false)
  // onReady 등 비동기 콜백이 항상 최신 상태를 읽도록 ref에 미러링해 둔다
  const stateRef = useRef<WatchState | null>(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // 초기 상태 로드 + 실시간 구독(watch.state). 재연결 시 다시 조회한다.
  useEffect(() => {
    let alive = true
    getWatch(channelId)
      .then((s) => alive && setState(s))
      .catch(() => alive && setState(INACTIVE))
    const off = subscribe((e) => {
      if (e.type === 'watch.state') setState(e.payload as unknown as WatchState)
      else if (e.type === 'ws.open') getWatch(channelId).then(setState).catch(() => {})
    })
    return () => {
      alive = false
      off()
    }
  }, [channelId, subscribe])

  // YT IFrame API를 미리 로드해 첫 영상 시작 지연을 줄인다(공유 체감 속도 개선)
  useEffect(() => {
    loadYouTubeApi().catch(() => {})
  }, [])

  // 뷰포트가 줄면 창 폭도 경계 안으로 다시 맞춘다
  useEffect(() => {
    function onWinResize() {
      setWidth((cur) => clamp(cur, MIN_W, maxW()))
    }
    window.addEventListener('resize', onWinResize)
    return () => window.removeEventListener('resize', onWinResize)
  }, [])

  // 왼쪽 위 핸들로 가로 크기 조절 (오른쪽 아래가 앵커) — 높이는 16:9로 따라간다
  function onResizeStart(e: PointerEvent) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeRef.current = { x: e.clientX, w: width }
  }
  function onResizeMove(e: PointerEvent) {
    const s = resizeRef.current
    if (!s) return
    setWidth(clamp(s.w + (s.x - e.clientX), MIN_W, maxW()))
  }
  function onResizeEnd(e: PointerEvent) {
    resizeRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  // 내 조작(재생/정지)을 서버에 알린다 — 원격 반영 중이거나 아직 준비 전이면 보내지 않는다
  function onPlayerStateChange(data: number) {
    if (applyingRef.current || !readyRef.current) return
    const p = playerRef.current
    if (!p) return
    try {
      const pos = p.getCurrentTime()
      if (data === PLAYING) void syncWatch(channelId, true, pos).catch(() => {})
      else if (data === PAUSED) void syncWatch(channelId, false, pos).catch(() => {})
    } catch {
      // 플레이어가 아직 준비 전이면 무시
    }
  }

  // 서버 상태를 플레이어에 반영: 영상 교체/탐색/재생·정지. 준비 전 호출은 예외를 던지므로 try로 감싼다.
  function applyRemote(target: WatchState, p: YTPlayer) {
    if (!target.active || !target.video_id) return
    try {
      applyingRef.current = true
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current)
      if (videoIdRef.current !== target.video_id) {
        videoIdRef.current = target.video_id
        p.loadVideoById(target.video_id, target.position)
      } else if (Math.abs(p.getCurrentTime() - target.position) > 0.8) {
        p.seekTo(target.position, true)
      }
      if (target.playing) p.playVideo()
      else p.pauseVideo()
      applyTimerRef.current = window.setTimeout(() => {
        applyingRef.current = false
      }, 1000)
    } catch {
      applyingRef.current = false
    }
  }

  // 상태가 올 때마다: 플레이어를 처음 만들거나(비동기 로드) 원격 상태를 반영한다
  useEffect(() => {
    if (!state) return
    if (!state.active || !state.video_id) {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
        videoIdRef.current = null
        readyRef.current = false
      }
      return
    }
    if (playerRef.current) {
      // 아직 준비 전이면 건너뛴다 — onReady가 최신 상태를 반영한다
      if (readyRef.current) applyRemote(state, playerRef.current)
      return
    }
    if (creatingRef.current) return
    creatingRef.current = true
    let cancelled = false
    loadYouTubeApi()
      .then((yt) => {
        if (cancelled || !mountRef.current) {
          creatingRef.current = false
          return
        }
        // YT가 대상 엘리먼트를 iframe으로 교체하므로, React가 관리하지 않는 자식을 따로 만들어 넘긴다
        const host = document.createElement('div')
        mountRef.current.appendChild(host)
        playerRef.current = new yt.Player(host, {
          videoId: stateRef.current?.video_id ?? state.video_id!,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: () => {
              readyRef.current = true
              videoIdRef.current = stateRef.current?.video_id ?? null
              if (stateRef.current && playerRef.current) applyRemote(stateRef.current, playerRef.current)
            },
            onStateChange: (e) => onPlayerStateChange(e.data),
          },
        })
        creatingRef.current = false
      })
      .catch(() => {
        creatingRef.current = false
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // 언마운트 정리
  useEffect(
    () => () => {
      if (playerRef.current) playerRef.current.destroy()
      playerRef.current = null
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current)
    },
    [],
  )

  async function onStart(e: FormEvent) {
    e.preventDefault()
    const v = url.trim()
    if (!v) return
    setError(null)
    try {
      setState(await startWatch(channelId, v))
      setUrl('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '시작하지 못했어요')
    }
  }

  async function onStop() {
    try {
      setState(await stopWatch(channelId))
    } catch {
      // 종료 실패는 다음 이벤트에서 정정됨
    }
  }

  const active = Boolean(state?.active && state.video_id)

  return (
    <motion.div
      className="watch-pip"
      style={{ width }}
      drag
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={constraintsRef}
      dragMomentum={false}
      dragElastic={0}
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {/* 왼쪽 위 리사이즈 핸들 — 헤더 위에 얹히지만 stopPropagation으로 드래그와 충돌하지 않는다 */}
      <div
        className="game-pip-resize"
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        onPointerCancel={onResizeEnd}
        title="크기 조절"
      />

      <div className="watch-pip-head" onPointerDown={(e) => dragControls.start(e)}>
        <span className="watch-pip-title">
          📺 함께 보기{active && state?.host_name ? ` · ${state.host_name}님` : ''}
        </span>
        <button className="watch-pip-close" onClick={onClose} title="닫기">
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="watch-pip-body">
        {active ? (
          <>
            <div className="watch-player">
              <div ref={mountRef} className="watch-player-mount" />
            </div>
            <div className="watch-actions">
              <span className="muted watch-hint">재생·정지·이동이 모두에게 동기화돼요</span>
              <button type="button" className="watch-stop" onClick={onStop}>
                종료
              </button>
            </div>
          </>
        ) : (
          <form className="watch-start" onSubmit={onStart}>
            {error && <div className="error">{error}</div>}
            <p className="muted watch-hint">유튜브 링크를 붙여넣고 함께 보기를 시작하세요</p>
            <input
              className="input"
              placeholder="https://youtu.be/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button className="btn" type="submit">
              함께 보기 시작
            </button>
          </form>
        )}
      </div>
    </motion.div>
  )
}
