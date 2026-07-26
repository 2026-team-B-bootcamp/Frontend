/**
 * 채팅 로그에 쓰이는 순수 포맷 함수 모음 — 시간/날짜 표기와 링크 프리뷰 대상 판별.
 */
import { firstHttpUrl } from '../linkPreviewApi'

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export function dayKey(iso: string) {
  return new Date(iso).toDateString()
}

export function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

/** renderRichText가 이미 임베드하는 단독 이미지·유튜브 링크는 프리뷰를 겹치지 않는다 */
export function previewUrl(content: string): string | null {
  // renderRichText가 이미 이미지/유튜브 단독 메시지는 임베드하므로 그 경우는 건너뛴다.
  const trimmed = content.trim()
  const standalone = /^https?:\/\/\S+$/i.test(trimmed)
  const isYouTube =
    /(^|\.)(youtube\.com|youtu\.be|m\.youtube\.com|youtube-nocookie\.com)/i.test(trimmed)
  const isMedia =
    /\.(gif|png|jpe?g|webp)(\?[^\s]*)?$/i.test(trimmed) ||
    /(^|\.)(tenor|giphy)\.com/i.test(trimmed)
  if (standalone && (isYouTube || isMedia)) return null
  return firstHttpUrl(content)
}
