# Frontend 배포 메모

Vite SPA라 클라이언트 라우팅을 쓴다. `/room/abc` 같은 경로를 새로고침하거나
직접 열면 정적 호스트가 그 파일을 찾다 404를 낸다. 그래서 모든 경로를
`/index.html`로 폴백시켜야 한다(딥링크 fallback).

- Vercel: `vercel.json`의 `rewrites`가 처리한다.
- Netlify/Cloudflare Pages 등: `public/_redirects`(`/*  /index.html  200`)가 처리한다.
  (Vite가 빌드 시 `public/` 내용을 `dist/`로 그대로 복사한다.)
- nginx로 직접 서빙한다면 location 블록에 아래를 넣는다:

  ```nginx
  location / {
      try_files $uri /index.html;
  }
  ```

## 빌드 환경변수

빌드 시점에 주입해야 한다(런타임이 아니라 `npm run build` 시점):

- `VITE_API_BASE_URL` — 백엔드 API 주소(예: `https://api.example.com`).
  미설정 시 `http://localhost:8000`으로 폴백한다.
- `VITE_GIPHY_KEY`(또는 `VITE_TENOR_KEY`) — 채팅 GIF 검색용 키(선택).
