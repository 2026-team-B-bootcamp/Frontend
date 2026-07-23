/**
 * 채팅 메시지 아래에 붙는 슬랙식 링크 미리보기 카드.
 * 마운트되면 백엔드에서 OG 메타를 받아와, 데이터가 있으면 카드를 그린다.
 * 로딩 중이거나 미리보기가 없으면 아무것도 렌더링하지 않는다(조용히 실패).
 */
import { useEffect, useState } from 'react'
import { getLinkPreview, type LinkPreviewResponse } from './linkPreviewApi'

// URL에서 표시용 도메인만 뽑는다(www. 제거). 파싱 실패 시 원본 반환.
function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function LinkPreview({ url }: { url: string }) {
  // url과 그 결과를 함께 들고 있는다 — url이 바뀌면 아래에서 데이터를 즉시 무효화(effect 내 동기 setState 회피)
  const [state, setState] = useState<{ url: string; data: LinkPreviewResponse | null }>({
    url: '',
    data: null,
  })

  useEffect(() => {
    let alive = true // 언마운트/변경 후 setState 방지 가드
    getLinkPreview(url).then((res) => {
      if (alive) setState({ url, data: res })
    })
    return () => {
      alive = false
    }
  }, [url])

  // 아직 이 url의 결과가 아니면(로딩 중이거나 이전 url) 그리지 않는다
  const data = state.url === url ? state.data : null
  if (!data) return null
  // 카드로 보여줄 내용이 하나도 없으면 굳이 그리지 않는다.
  if (!data.title && !data.description && !data.image) return null

  const label = data.site_name || domainOf(data.url)

  return (
    <a
      className="lp-card"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {data.image && (
        <div className="lp-thumb">
          <img src={data.image} alt="" loading="lazy" />
        </div>
      )}
      <div className="lp-body">
        <span className="lp-domain">{label}</span>
        {data.title && <span className="lp-title">{data.title}</span>}
        {data.description && <span className="lp-desc">{data.description}</span>}
      </div>
    </a>
  )
}
