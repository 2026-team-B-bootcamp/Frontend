import { API_BASE } from '../playwright.config'

/**
 * 백엔드가 살아있는지 먼저 확인한다.
 *
 * 없으면 모든 테스트가 "요소를 못 찾음" 타임아웃으로 죽는데, 그 화면만 봐서는
 * 원인이 백엔드 부재인지 프론트 버그인지 알 수 없다. 여기서 한 줄로 끊어준다.
 */
export default async function globalSetup(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) throw new Error(`상태 코드 ${res.status}`)
  } catch (err) {
    throw new Error(
      `백엔드(${API_BASE})에 연결하지 못했습니다: ${(err as Error).message}\n` +
        `Backend 폴더에서 \`docker compose up -d\` 로 먼저 띄워주세요.`,
      { cause: err },
    )
  }
}
