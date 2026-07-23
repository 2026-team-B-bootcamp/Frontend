/**
 * 유튜브 IFrame Player API 로더 + 최소 타입.
 * 스크립트는 한 번만 불러오고(window.onYouTubeIframeAPIReady 콜백), 준비되면 Promise가 resolve된다.
 * 함께 보기(WatchTogether)에서 프로그램적으로 재생/정지/탐색을 제어하려고 쓴다.
 */

export interface YTPlayer {
  loadVideoById(videoId: string, startSeconds?: number): void
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getPlayerState(): number
  destroy(): void
}

interface YTPlayerEvent {
  target: YTPlayer
  data: number
}

interface YTNamespace {
  Player: new (
    el: HTMLElement | string,
    opts: {
      videoId?: string
      playerVars?: Record<string, number>
      events?: {
        onReady?: (e: YTPlayerEvent) => void
        onStateChange?: (e: YTPlayerEvent) => void
      }
    },
  ) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

// YT.PlayerState 상수 (API가 로드되기 전에도 쓰려고 직접 정의)
export const PLAYING = 1
export const PAUSED = 2
export const ENDED = 0

let apiPromise: Promise<YTNamespace> | null = null

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      if (window.YT) resolve(window.YT)
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return apiPromise
}
