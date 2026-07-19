// 공용 HTTP 클라이언트. 모든 feature의 api.ts(예: features/auth/api.ts)가
// 이 apiFetch/apiUpload를 거쳐서 백엔드로 요청을 보낸다.
// 로그인 토큰을 localStorage에 저장/조회하고, 요청마다 Authorization 헤더에 자동으로 실어 보낸다.
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const TOKEN_KEY = 'access_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

// AuthContext가 로그인/로그아웃 시 이 함수를 호출해서 토큰을 저장하거나 지운다
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface ApiOptions {
  method?: string
  body?: unknown
}

// 모든 REST 요청이 거치는 공통 함수. 여기서 자동으로 하는 일:
// 1) localStorage의 토큰을 Authorization: Bearer 헤더에 실음 (로그인 API 제외 전부)
// 2) body가 있으면 JSON으로 직렬화하고 Content-Type 설정
// 3) 응답이 실패(res.ok === false)면 서버 에러 메시지를 파싱해 ApiError로 던짐
export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let body: string | undefined
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body,
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      if (typeof data?.detail === 'string') detail = data.detail
      else if (Array.isArray(data?.detail) && data.detail[0]?.msg) detail = data.detail[0].msg
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// apiFetch와 동일하지만 JSON 대신 FormData(파일 업로드)를 body로 그대로 보낸다
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      if (typeof data?.detail === 'string') detail = data.detail
      else if (Array.isArray(data?.detail) && data.detail[0]?.msg) detail = data.detail[0].msg
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new ApiError(res.status, detail)
  }

  return (await res.json()) as T
}
