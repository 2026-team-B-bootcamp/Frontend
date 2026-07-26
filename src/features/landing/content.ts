// LandingPage.tsx가 쓰는 순수 데이터(JSX 없음). SHOWCASE는 mock 컴포넌트를 JSX로
// 품고 있어서 여기 넣지 않고 PinnedShowcase.tsx 안에 둔다.

export const MARQUEE_TAGS = [
  '축구', '커피', '베이킹', '롤', '등산', '여행', '영화', '캠핑',
  '독서', '헬스', '포켓몬', '재즈', '요리', '사진', '보드게임', '러닝',
]

export const STEPS = [
  { n: '01', title: '서버 만들기', desc: '모임 공간을 만들면 기본 채널이 함께 생겨요' },
  { n: '02', title: '초대코드 공유', desc: '8자리 코드 하나로 멤버를 초대하세요' },
  { n: '03', title: '관심사 태그 설정', desc: '나를 소개하는 태그 3개를 골라요' },
  { n: '04', title: '대화 시작', desc: '태그·AI 질문·게임으로 자연스럽게 친해져요' },
]

export const FLOAT_PILLS = [
  { text: '커피 ✦', x: '6%', y: '22%', dur: 5.2, delay: 0 },
  { text: '등산', x: '12%', y: '58%', dur: 6.1, delay: 0.4 },
  { text: '롤', x: '86%', y: '26%', dur: 5.6, delay: 0.8 },
  { text: '여행 ✦', x: '82%', y: '62%', dur: 6.6, delay: 0.2 },
  { text: '베이킹', x: '90%', y: '44%', dur: 5.9, delay: 1.1 },
  { text: '재즈', x: '4%', y: '40%', dur: 6.4, delay: 0.6 },
]

/** 통계 카드 4개 — delay는 렌더링 시점에 0.08 * i로 계산한다 */
export const STATS = [
  { to: 1, suffix: '분', label: '서버 만들고 초대까지' },
  { to: 3, suffix: '개', label: '나를 보여주는 관심사 태그' },
  { to: 30, suffix: '초', label: '끝말잇기 턴 제한 — 긴장감 유지' },
  { to: 100, suffix: '%', label: '실시간 — 새로고침 없는 대화' },
]
