import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from 'motion/react'
import { useAuth } from '../auth/authContext'
import { TagPills } from '../users/TagPills'
import { ChainIcon, DiceIcon, SparkIcon, UsersIcon } from '../../shared/ui/icons'
import { fireWinConfetti } from '../../shared/lib/confetti'

/* ---------- 유틸 컴포넌트 ---------- */

/** 뷰포트 진입 시 숫자가 차오르는 카운터 */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1200)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(to * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to])

  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  )
}

/** 헤드라인 단어별 스태거 리빌 */
function RevealWords({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="reveal-line">
      {text.split(' ').map((word, i) => (
        <motion.span
          key={i}
          className="reveal-word"
          initial={{ opacity: 0, y: '0.6em' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: delay + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}

/* ---------- 목업 화면들 (핀 섹션에서 교체됨) ---------- */

function MockChat() {
  return (
    <div className="lm-screen">
      <div className="lm-screen-head"># 일반</div>
      <div className="lm-row">
        <span className="chat-avatar" style={{ background: '#b5735f' }}>수</span>
        <div>
          <div className="lm-name">
            수진 <TagPills tags={['등산', '커피']} />
          </div>
          <div className="lm-msg">다들 반가워요! 잘 부탁드립니다</div>
        </div>
      </div>
      <div className="lm-row">
        <span className="chat-avatar" style={{ background: '#5c7fa3' }}>민</span>
        <div>
          <div className="lm-name">
            민호 <TagPills tags={['커피', '축구']} common={['커피']} />
          </div>
          <div className="lm-msg">수진님도 커피 좋아하시네요! 원두 뭐 드세요?</div>
        </div>
      </div>
      <div className="lm-typing">
        <span className="typing-dots"><i /><i /><i /></span>
        수진님이 입력 중…
      </div>
    </div>
  )
}

function MockAI() {
  return (
    <div className="lm-screen">
      <div className="lm-screen-head">
        <SparkIcon size={14} /> AI 아이스브레이커
      </div>
      <div className="lm-ai-target">
        <span className="chat-avatar" style={{ background: '#6f8f66' }}>지</span>
        <span>지우님에게 말 걸기</span>
        <TagPills tags={['캠핑', '재즈']} />
      </div>
      <motion.div
        className="lm-ai-question"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        "지우님, 캠핑 좋아하신다고 들었어요. 최근에 다녀온 캠핑장 중 최고는 어디였어요?"
      </motion.div>
      <div className="lm-ai-actions">
        <span className="btn small">이 질문으로 시작</span>
        <span className="btn ghost small">다시 생성</span>
      </div>
    </div>
  )
}

const MOCK_BOARD_MARKED = new Set([0, 3, 6, 7, 12, 13, 16, 18, 21, 24])

function MockGames() {
  return (
    <div className="lm-screen">
      <div className="lm-screen-head">
        <DiceIcon size={14} /> 빙고 · <ChainIcon size={14} /> 끝말잇기
      </div>
      <div className="lm-bingo">
        {Array.from({ length: 25 }, (_, i) => (
          <motion.span
            key={i}
            className={`lm-cell${MOCK_BOARD_MARKED.has(i) ? ' on' : ''}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.02 * i, duration: 0.25 }}
          >
            {((i * 7) % 25) + 1}
          </motion.span>
        ))}
      </div>
      <div className="lm-chain">
        {['사과', '과일', '일요일', '일기'].map((w, i) => (
          <motion.span
            key={w}
            className={`wc-chip${i % 2 ? ' mine' : ''}`}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.15, type: 'spring', stiffness: 400, damping: 24 }}
          >
            <span className="wc-chip-word">{w}</span>
          </motion.span>
        ))}
      </div>
    </div>
  )
}

/* ---------- 핀(고정) 쇼케이스 ---------- */

const SHOWCASE = [
  {
    icon: <UsersIcon size={20} />,
    title: '이름 옆에 항상 관심사가',
    desc: '모든 메시지·멤버 목록에 관심사 태그가 붙고, 나와 겹치는 관심사는 ✦로 빛나요. 말 걸 소재가 항상 눈앞에 있습니다.',
    mock: <MockChat />,
  },
  {
    icon: <SparkIcon size={20} />,
    title: 'AI가 첫 질문을 대신 고민',
    desc: '상대의 관심사를 반영한 아이스브레이킹 질문을 AI가 즉석에서 만들어줘요. 버튼 한 번이면 어색한 침묵이 끝납니다.',
    mock: <MockAI />,
  },
  {
    icon: <DiceIcon size={20} />,
    title: '게임 한 판이면 친구',
    desc: '채팅 옆 패널에서 빙고와 끝말잇기를 바로. 30초 턴 타이머, 실시간 대전, 승리 폭죽까지 — 노는 사이에 가까워져요.',
    mock: <MockGames />,
  },
]

function PinnedShowcase() {
  const ref = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const [active, setActive] = useState(0)

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setActive(Math.max(0, Math.min(SHOWCASE.length - 1, Math.floor(v * SHOWCASE.length))))
  })

  return (
    <section ref={ref} className="showcase">
      <div className="showcase-sticky">
        <div className="showcase-inner">
          <div className="showcase-left">
            <p className="landing-eyebrow">HOW IT FEELS</p>
            <h2>
              스크롤해보세요,
              <br />
              친해지는 과정이 보여요
            </h2>
            <div className="showcase-items">
              {SHOWCASE.map((s, i) => (
                <div key={s.title} className={`showcase-item${i === active ? ' active' : ''}`}>
                  <span className="showcase-item-icon">{s.icon}</span>
                  <div>
                    <div className="showcase-item-title">{s.title}</div>
                    <AnimatePresence>
                      {i === active && (
                        <motion.p
                          className="showcase-item-desc"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {s.desc}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
            <div className="showcase-progress">
              <motion.div className="showcase-progress-fill" style={{ scaleX: scrollYProgress }} />
            </div>
          </div>

          <div className="showcase-right">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                className="card showcase-mock"
                initial={{ opacity: 0, y: 30, rotate: 1.5 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: -30, rotate: -1.5 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {SHOWCASE[active].mock}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 메인 ---------- */

const MARQUEE_TAGS = [
  '축구', '커피', '베이킹', '롤', '등산', '여행', '영화', '캠핑',
  '독서', '헬스', '포켓몬', '재즈', '요리', '사진', '보드게임', '러닝',
]

const STEPS = [
  { n: '01', title: '서버 만들기', desc: '모임 공간을 만들면 기본 채널이 함께 생겨요' },
  { n: '02', title: '초대코드 공유', desc: '8자리 코드 하나로 멤버를 초대하세요' },
  { n: '03', title: '관심사 태그 설정', desc: '나를 소개하는 태그 3개를 골라요' },
  { n: '04', title: '대화 시작', desc: '태그·AI 질문·게임으로 자연스럽게 친해져요' },
]

const FLOAT_PILLS = [
  { text: '커피 ✦', x: '6%', y: '22%', dur: 5.2, delay: 0 },
  { text: '등산', x: '12%', y: '58%', dur: 6.1, delay: 0.4 },
  { text: '롤', x: '86%', y: '26%', dur: 5.6, delay: 0.8 },
  { text: '여행 ✦', x: '82%', y: '62%', dur: 6.6, delay: 0.2 },
  { text: '베이킹', x: '90%', y: '44%', dur: 5.9, delay: 1.1 },
  { text: '재즈', x: '4%', y: '40%', dur: 6.4, delay: 0.6 },
]

export function LandingPage() {
  const { token } = useAuth()
  const navigate = useNavigate()

  const heroRef = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress: heroP } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroTextY = useTransform(heroP, [0, 1], [0, -90])
  const heroTextOpacity = useTransform(heroP, [0, 0.7], [1, 0])
  const previewY = useTransform(heroP, [0, 1], [0, 70])

  const bigRef = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress: bigP } = useScroll({
    target: bigRef,
    offset: ['start end', 'end start'],
  })
  const bigX1 = useTransform(bigP, [0, 1], ['4%', '-8%'])
  const bigX2 = useTransform(bigP, [0, 1], ['-8%', '4%'])

  const [scrolled, setScrolled] = useState(false)
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 24))

  function onMainCta() {
    navigate(token ? '/servers' : '/signup')
  }

  return (
    <div className="landing">
      <header className={`landing-nav${scrolled ? ' scrolled' : ''}`}>
        <span className="landing-logo">이음</span>
        <nav className="landing-nav-links">
          {token ? (
            <button className="btn small" onClick={() => navigate('/servers')}>
              내 서버로 →
            </button>
          ) : (
            <>
              <Link to="/login" className="landing-nav-login">
                로그인
              </Link>
              <button className="btn small" onClick={() => navigate('/signup')}>
                시작하기
              </button>
            </>
          )}
        </nav>
      </header>

      {/* ---------- 히어로: 단어 리빌 + 떠다니는 태그 + 패럴랙스 ---------- */}
      <section ref={heroRef} className="landing-hero">
        {FLOAT_PILLS.map((p) => (
          <motion.span
            key={p.text}
            className={`float-pill${p.text.includes('✦') ? ' common' : ''}`}
            style={{ left: p.x, top: p.y }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, y: [0, -14, 0] }}
            transition={{
              opacity: { duration: 0.6, delay: 0.5 + p.delay },
              scale: { duration: 0.6, delay: 0.5 + p.delay },
              y: { duration: p.dur, repeat: Infinity, ease: 'easeInOut', delay: p.delay },
            }}
          >
            {p.text}
          </motion.span>
        ))}

        <motion.div style={{ y: heroTextY, opacity: heroTextOpacity }}>
          <motion.p
            className="landing-eyebrow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            RAPPORT CHAT
          </motion.p>
          <h1>
            <RevealWords text="처음 만나도," delay={0.1} />
            <br />
            <RevealWords text="금세 친해지는 채팅" delay={0.3} />
          </h1>
          <motion.p
            className="landing-sub"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.7, ease: 'easeOut' }}
          >
            새 모임의 어색한 침묵을 깨는 가장 쉬운 방법.
            <br />
            관심사 태그, AI 첫 질문, 미니게임이 있는 모임 공간 — 이음.
          </motion.p>
          <motion.div
            className="landing-cta"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.85, ease: 'easeOut' }}
          >
            <motion.button
              className="btn landing-cta-main"
              onClick={onMainCta}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              {token ? '내 서버로 들어가기' : '무료로 시작하기'}
            </motion.button>
            {!token && (
              <Link to="/login" className="btn ghost">
                로그인
              </Link>
            )}
          </motion.div>
        </motion.div>

        <motion.div
          className="landing-preview card"
          style={{ y: previewY }}
          initial={{ opacity: 0, y: 40, rotateX: 16 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <MockChat />
        </motion.div>

        <motion.div
          className="scroll-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 6, 0] }}
          transition={{
            opacity: { delay: 1.4, duration: 0.5 },
            y: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          ↓ 스크롤
        </motion.div>
      </section>

      {/* ---------- 태그 마퀴 ---------- */}
      <div className="marquee-band">
        <div className="marquee">
          <div className="marquee-track">
            {[...MARQUEE_TAGS, ...MARQUEE_TAGS].map((t, i) => (
              <span key={i} className="pill marquee-pill">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="marquee">
          <div className="marquee-track reverse">
            {[...MARQUEE_TAGS, ...MARQUEE_TAGS].reverse().map((t, i) => (
              <span key={i} className={`pill marquee-pill${i % 5 === 0 ? ' common' : ''}`}>
                {t}
                {i % 5 === 0 && ' ✦'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- 핀 쇼케이스 (스크롤 고정) ---------- */}
      <PinnedShowcase />

      {/* ---------- 숫자 카운터 ---------- */}
      <section className="landing-section">
        <div className="landing-stats">
          <motion.div
            className="stat"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4 }}
          >
            <span className="stat-num">
              <Counter to={1} suffix="분" />
            </span>
            <span className="stat-label">서버 만들고 초대까지</span>
          </motion.div>
          <motion.div
            className="stat"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            <span className="stat-num">
              <Counter to={3} suffix="개" />
            </span>
            <span className="stat-label">나를 보여주는 관심사 태그</span>
          </motion.div>
          <motion.div
            className="stat"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, delay: 0.16 }}
          >
            <span className="stat-num">
              <Counter to={30} suffix="초" />
            </span>
            <span className="stat-label">끝말잇기 턴 제한 — 긴장감 유지</span>
          </motion.div>
          <motion.div
            className="stat"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, delay: 0.24 }}
          >
            <span className="stat-num">
              <Counter to={100} suffix="%" />
            </span>
            <span className="stat-label">실시간 — 새로고침 없는 대화</span>
          </motion.div>
        </div>
      </section>

      {/* ---------- 빅 타이포 (스크롤 좌우 이동) ---------- */}
      <section ref={bigRef} className="bigtype">
        <motion.div className="bigtype-line" style={{ x: bigX1 }}>
          어색함 없이 · 빠르게 · 함께 ·
        </motion.div>
        <motion.div className="bigtype-line accent" style={{ x: bigX2 }}>
          태그로 잇다 · 질문으로 잇다 · 게임으로 잇다 ·
        </motion.div>
      </section>

      {/* ---------- 시작 단계 ---------- */}
      <section className="landing-section">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4 }}
        >
          시작은 1분이면 충분해요
        </motion.h2>
        <div className="landing-steps">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              className="landing-step"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: 0.07 * i }}
              whileHover={{ y: -4 }}
            >
              <span className="landing-step-n">{s.n}</span>
              <div>
                <div className="landing-step-title">{s.title}</div>
                <div className="landing-step-desc">{s.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------- 마지막 CTA (폭죽) ---------- */}
      <section className="landing-final">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4 }}
        >
          다음 모임, 이음에서 시작하세요
        </motion.h2>
        <motion.p
          className="landing-sub"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          버튼을 누르면 무슨 일이 일어날까요?
        </motion.p>
        <motion.button
          className="btn landing-cta-main"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.18 }}
          whileHover={{ scale: 1.05, rotate: [0, -1.5, 1.5, 0] }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            fireWinConfetti()
            setTimeout(onMainCta, 700)
          }}
        >
          {token ? '내 서버로 들어가기' : '무료로 시작하기'}
        </motion.button>
      </section>

      <footer className="landing-footer">
        <span className="landing-logo">이음</span>
        <span>관심사 태그로 라포를 만드는 채팅 서비스</span>
      </footer>
    </div>
  )
}
