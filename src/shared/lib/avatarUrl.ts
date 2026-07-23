// 업로드된 아바타는 백엔드 상대경로(/static/avatars/...)로 내려오므로 API 호스트를 붙여준다.
// (컴포넌트 파일에 두면 react-refresh가 경고하므로 별도 모듈로 뺐다)
import { BASE_URL } from '../api/client'

export function resolveAvatarUrl(url: string | null | undefined) {
  if (!url) return null
  return url.startsWith('http') ? url : `${BASE_URL}${url}`
}
