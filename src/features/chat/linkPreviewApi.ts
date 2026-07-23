// 채팅 메시지 속 링크의 미리보기(OpenGraph 카드) 데이터를 백엔드에서 가져온다.
// 서버가 URL을 대신 받아와 OG 메타를 파싱해준다(프런트는 CORS/SSRF 걱정 없이 결과만 받음).
import { ApiError, apiFetch } from '../../shared/api/client'

export interface LinkPreviewResponse {
  url: string
  title: string | null
  description: string | null
  image: string | null
  site_name: string | null
}

// 미리보기가 없으면(백엔드가 404) null을 돌려준다 — 호출부는 카드를 그리지 않으면 된다.
// 그 외 에러(네트워크 등)는 조용히 삼켜 채팅 흐름을 방해하지 않는다.
export async function getLinkPreview(url: string): Promise<LinkPreviewResponse | null> {
  try {
    return await apiFetch<LinkPreviewResponse>(
      `/link-preview?url=${encodeURIComponent(url)}`,
    )
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    return null
  }
}

/**
 * 문자열에서 첫 번째 http(s) URL을 뽑는다. 없으면 null.
 * 끝에 붙은 문장부호(…example.com). 등)는 richText와 같은 규칙으로 떼어낸다.
 * 부모가 "이 메시지에 카드를 붙일지" 판단하는 데 쓴다.
 */
export function firstHttpUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s]+/i)
  if (!m) return null
  const url = m[0]
  const trail = url.match(/[)\].,!?;:]+$/)?.[0] ?? ''
  return trail ? url.slice(0, -trail.length) : url
}
