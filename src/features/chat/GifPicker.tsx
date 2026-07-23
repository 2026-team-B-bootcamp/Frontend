/**
 * 입력창 위에 뜨는 GIF 검색 팝오버 — GIPHY 또는 Tenor를 브라우저에서 직접 호출한다(백엔드 불필요).
 * 고른 GIF는 onPick(url)로 넘겨 그 URL을 메시지로 전송하고, 채팅에선 이미지로 렌더된다.
 * 키 주입(Frontend/.env): VITE_GIPHY_KEY 또는 VITE_TENOR_KEY. 둘 다 있으면 GIPHY 우선.
 * 어느 키도 없으면 안내만 보여준다.
 */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

const GIPHY_KEY = import.meta.env.VITE_GIPHY_KEY as string | undefined
const TENOR_KEY = import.meta.env.VITE_TENOR_KEY as string | undefined
const PROVIDER: 'giphy' | 'tenor' | null = GIPHY_KEY ? 'giphy' : TENOR_KEY ? 'tenor' : null

interface Gif {
  id: string
  preview: string
  full: string
  alt: string
}

// 검색어(빈 값이면 인기 GIF)로 요청 URL을 만든다
function buildUrl(query: string): string {
  const q = query.trim()
  if (PROVIDER === 'giphy') {
    const path = q ? 'search' : 'trending'
    const qs = q ? `&q=${encodeURIComponent(q)}` : ''
    return `https://api.giphy.com/v1/gifs/${path}?api_key=${GIPHY_KEY}&limit=24&rating=pg-13${qs}`
  }
  // tenor
  const base = q
    ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&`
    : 'https://tenor.googleapis.com/v2/featured?'
  return `${base}key=${TENOR_KEY}&client_key=rapport_chat&limit=24&media_filter=tinygif,gif&contentfilter=medium`
}

// 공급자별 응답을 공통 Gif 형태로 정규화한다
function parse(data: unknown): Gif[] {
  if (PROVIDER === 'giphy') {
    const rows = (data as { data?: GiphyItem[] }).data ?? []
    return rows
      .map((g) => ({
        id: g.id,
        preview: g.images.fixed_width_small?.url ?? g.images.downsized?.url ?? '',
        full: g.images.downsized_medium?.url ?? g.images.original?.url ?? '',
        alt: g.title ?? '',
      }))
      .filter((g) => g.preview && g.full)
  }
  const rows = (data as { results?: TenorItem[] }).results ?? []
  return rows
    .map((g) => ({
      id: g.id,
      preview: g.media_formats.tinygif?.url ?? g.media_formats.gif?.url ?? '',
      full: g.media_formats.gif?.url ?? g.media_formats.tinygif?.url ?? '',
      alt: g.content_description ?? '',
    }))
    .filter((g) => g.preview && g.full)
}

interface GiphyItem {
  id: string
  title?: string
  images: {
    fixed_width_small?: { url: string }
    downsized?: { url: string }
    downsized_medium?: { url: string }
    original?: { url: string }
  }
}

interface TenorItem {
  id: string
  content_description?: string
  media_formats: { gif?: { url: string }; tinygif?: { url: string } }
}

export function GifPicker({
  onPick,
  onClose,
}: {
  onPick: (url: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Gif[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 검색어 입력을 300ms 디바운스해서 호출을 아낀다. 빈 검색어면 인기 GIF를 보여준다.
  useEffect(() => {
    if (!PROVIDER) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      setError(null)
      fetch(buildUrl(query), { signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw new Error('gif')
          return r.json()
        })
        .then((data) => setResults(parse(data)))
        .catch((e) => {
          if (e.name !== 'AbortError') setError('GIF를 불러오지 못했어요')
        })
        .finally(() => setLoading(false))
    }, 300)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query])

  return (
    <motion.div
      className="gif-popover"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <div className="emoji-popover-head">
        <input
          ref={inputRef}
          className="input gif-search"
          placeholder="GIF 검색…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={!PROVIDER}
        />
        <button type="button" className="emoji-close" onClick={onClose} title="닫기">
          ✕
        </button>
      </div>

      {!PROVIDER ? (
        <p className="muted gif-hint">
          GIF 검색을 쓰려면 <code>Frontend/.env</code> 에 <code>VITE_GIPHY_KEY</code> (또는{' '}
          <code>VITE_TENOR_KEY</code>) 를 넣고 개발 서버를 다시 시작하세요. 둘 다 무료 키예요.
        </p>
      ) : error ? (
        <p className="muted gif-hint">{error}</p>
      ) : (
        <div className="gif-grid">
          {loading && results.length === 0 ? (
            <p className="muted gif-hint">불러오는 중…</p>
          ) : results.length === 0 ? (
            <p className="muted gif-hint">결과가 없어요</p>
          ) : (
            results.map((g) => (
              <button
                key={g.id}
                type="button"
                className="gif-cell"
                title={g.alt}
                onClick={() => onPick(g.full)}
              >
                <img src={g.preview} alt={g.alt} loading="lazy" />
              </button>
            ))
          )}
        </div>
      )}
      <div className="gif-attribution">
        {PROVIDER === 'giphy' ? 'Powered by GIPHY' : PROVIDER === 'tenor' ? 'Powered by Tenor' : ''}
      </div>
    </motion.div>
  )
}
