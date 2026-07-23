/**
 * 유튜브 임베드 — 처음엔 썸네일 페이사드만 그리고, 클릭하면 iframe으로 교체한다.
 * (메시지마다 무거운 iframe을 바로 띄우지 않아 성능·프라이버시에 유리)
 * URL → 영상 ID 추출은 youTubeId()가 담당하고, richText 렌더러가 이 컴포넌트를 쓴다.
 */
import { useState } from 'react'

export function YouTubeEmbed({ id }: { id: string }) {
  const [playing, setPlaying] = useState(false)
  if (playing) {
    return (
      <div className="yt-embed">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  return (
    <button type="button" className="yt-embed yt-facade" onClick={() => setPlaying(true)}>
      <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="YouTube 썸네일" loading="lazy" />
      <span className="yt-play" aria-hidden="true" />
    </button>
  )
}
