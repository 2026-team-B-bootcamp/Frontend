/**
 * 메시지 본문 문자열을 안전한 React 노드로 변환한다.
 * 지원 서식: **굵게**, _기울임_, ~~취소선~~, `인라인 코드`, http(s) 자동 링크, :shortcode: 이모지.
 * 메시지 전체가 이미지/GIF URL 하나면 이미지로 임베드한다(GIF 전송 등).
 * dangerouslySetInnerHTML을 쓰지 않고 노드를 직접 만들어 XSS를 원천 차단한다.
 */
import type { ReactNode } from 'react'
import { SHORTCODES } from './emojiData'
import { YouTubeEmbed } from './YouTubeEmbed'

const MEDIA_EXT = /\.(gif|png|jpe?g|webp)(\?[^\s]*)?$/i

// 유튜브 URL에서 영상 ID 추출 (watch?v=, youtu.be/, shorts/, embed/ 모두 지원)
function youTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v')
      const parts = u.pathname.split('/')
      if (parts[1] === 'shorts' || parts[1] === 'embed') return parts[2] ?? null
    }
    return null
  } catch {
    return null
  }
}

// 이미지로 임베드할 만한 URL인지 — 확장자 또는 GIF 호스트(Tenor/Giphy)로 판단
function isMediaUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false
  if (MEDIA_EXT.test(url)) return true
  try {
    const host = new URL(url).hostname
    return /(^|\.)tenor\.com$/i.test(host) || /(^|\.)giphy\.com$/i.test(host)
  } catch {
    return false
  }
}

// 인라인 토큰 매칭. 순서 중요: 코드 먼저(그 안의 * _ 등은 서식으로 보지 않음),
// 그다음 굵게/취소선/기울임, URL, 마지막에 :이모지:.
const TOKEN =
  /`([^`\n]+)`|\*\*([^*\n]+?)\*\*|~~([^~\n]+?)~~|_([^_\n]+?)_|(https?:\/\/[^\s]+)|:([a-z0-9_+-]+):/gi

export function renderRichText(content: string): ReactNode {
  const trimmed = content.trim()
  const standalone = /^https?:\/\/\S+$/i.test(trimmed)

  // 메시지 전체가 유튜브 링크 하나 → 영상 임베드
  if (standalone) {
    const yt = youTubeId(trimmed)
    if (yt) return <YouTubeEmbed id={yt} />
  }

  // 메시지 전체가 이미지/GIF 한 개 → 그대로 임베드
  if (standalone && isMediaUrl(trimmed)) {
    return (
      <a href={trimmed} target="_blank" rel="noopener noreferrer" className="chat-media-link">
        <img src={trimmed} alt="" className="chat-media" loading="lazy" />
      </a>
    )
  }

  const nodes: ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  TOKEN.lastIndex = 0

  while ((m = TOKEN.exec(content)) !== null) {
    if (m.index > last) nodes.push(content.slice(last, m.index))
    const [full, code, bold, strike, italic, url, shortcode] = m

    if (code != null) {
      nodes.push(
        <code key={key++} className="chat-code">
          {code}
        </code>,
      )
    } else if (bold != null) {
      nodes.push(<strong key={key++}>{bold}</strong>)
    } else if (strike != null) {
      nodes.push(<s key={key++}>{strike}</s>)
    } else if (italic != null) {
      nodes.push(<em key={key++}>{italic}</em>)
    } else if (url != null) {
      // 끝에 붙은 문장부호는 링크에서 떼어내 일반 텍스트로 (…example.com). 같은 경우)
      const trail = url.match(/[)\].,!?;:]+$/)?.[0] ?? ''
      const clean = trail ? url.slice(0, -trail.length) : url
      nodes.push(
        <a key={key++} href={clean} target="_blank" rel="noopener noreferrer" className="chat-link">
          {clean}
        </a>,
      )
      if (trail) nodes.push(trail)
    } else if (shortcode != null) {
      nodes.push(SHORTCODES[shortcode.toLowerCase()] ?? full)
    }

    last = m.index + full.length
  }

  if (last < content.length) nodes.push(content.slice(last))
  return nodes
}

/**
 * 입력창 뒤에 깔리는 하이라이트용 렌더러.
 * renderRichText와 달리 마커(** _ ~~ `)와 모든 글자를 "그대로" 남겨 textarea 글자와 위치가 1:1로 맞는다.
 * 글자 폭이 크게 달라지는 스타일(코드 모노폰트 등)은 피하고, 색/밑줄/굵기 정도만 입혀 정렬 어긋남을 최소화한다.
 */
function marked(cls: string, marker: string, inner: string, key: number) {
  return (
    <span className={cls} key={key}>
      <span className="hl-mark">{marker}</span>
      {inner}
      <span className="hl-mark">{marker}</span>
    </span>
  )
}

export function highlightRichText(content: string): ReactNode {
  const nodes: ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  TOKEN.lastIndex = 0

  while ((m = TOKEN.exec(content)) !== null) {
    if (m.index > last) nodes.push(content.slice(last, m.index))
    const [full, code, bold, strike, italic, url, shortcode] = m

    if (code != null) nodes.push(marked('hl-code', '`', code, key++))
    else if (bold != null) nodes.push(marked('hl-bold', '**', bold, key++))
    else if (strike != null) nodes.push(marked('hl-strike', '~~', strike, key++))
    else if (italic != null) nodes.push(marked('hl-italic', '_', italic, key++))
    else if (url != null) nodes.push(<span className="hl-link" key={key++}>{url}</span>)
    else if (shortcode != null) nodes.push(<span className="hl-emoji" key={key++}>{full}</span>)

    last = m.index + full.length
  }

  if (last < content.length) nodes.push(content.slice(last))
  // textarea가 끝의 개행만큼 높이를 가지므로 백드롭도 맞춰준다
  if (content.endsWith('\n')) nodes.push('\n')
  return nodes
}
