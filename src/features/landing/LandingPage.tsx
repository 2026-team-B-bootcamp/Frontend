// 비로그인 사용자가 처음 보는 소개(랜딩) 페이지. 스크롤 애니메이션 위주의 마케팅 화면이라
// 백엔드 요청은 거의 없고, useAuth()로 로그인 여부만 확인해서 CTA 버튼 목적지를 바꾼다
// (로그인 상태면 /servers로, 아니면 /signup으로 이동).
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react'
import { useAuth } from '../auth/authContext'
import { fireWinConfetti } from '../../shared/lib/confetti'
import { Counter } from './Counter'
import { RevealWords } from './RevealWords'
import { PinnedShowcase } from './PinnedShowcase'
import { GamesGrid } from './GamesGrid'
import { SlackSection } from './SlackSection'
import { MockChat } from './mocks/MockChat'
import { FLOAT_PILLS, MARQUEE_TAGS, STATS, STEPS } from './content'

/* ---------- 메인 ---------- */

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

  // 메인 CTA 버튼 동작: 로그인 상태(token 있음)면 서버 목록으로, 아니면 회원가입으로 보낸다
  function onMainCta() {
    navigate(token ? '/servers' : '/signup')
  }

  return (
    <div className="landing">
      <header className={`landing-nav${scrolled ? ' scrolled' : ''}`}>
        <span className="landing-logo">Deverapo</span>
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
            <RevealWords text="금세 친해지는 채팅" delay={0.3} hl={{ 1: 'lime' }} />
          </h1>
          <motion.p
            className="landing-sub"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.7, ease: 'easeOut' }}
          >
            새 모임의 어색한 침묵을 깨는 가장 쉬운 방법.
            <br />
            관심사 태그, AI 첫 질문, 미니게임 6종, 같이보기와 그림판 —
            <br />
            슬랙에서도 이어지는 모임 공간, Deverapo.
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

      </section>

      {/* ---------- 코랄 곡면 밴드: 미리보기 카드 ---------- */}
      <section className="hero-band band">
        <motion.div
          className="landing-preview card"
          style={{ y: previewY }}
          initial={{ opacity: 0, y: 40, rotateX: 16 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
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

      {/* ---------- 미니게임 6종 그리드 ---------- */}
      <GamesGrid />

      {/* ---------- 슬랙 봇 ---------- */}
      <SlackSection />

      {/* ---------- 숫자 카운터 ---------- */}
      <section className="landing-section">
        <div className="landing-stats">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              className="stat"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: 0.08 * i }}
            >
              <span className="stat-num">
                <Counter to={s.to} suffix={s.suffix} />
              </span>
              <span className="stat-label">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------- 빅 타이포 (스크롤 좌우 이동) ---------- */}
      <section ref={bigRef} className="bigtype">
        {/* 문구를 반복해 양끝이 뷰포트 밖으로 흐르는 티커처럼 보이게 한다 */}
        <motion.div className="bigtype-line" style={{ x: bigX1 }}>
          {'어색함 없이 · 빠르게 · 함께 · '.repeat(3)}
        </motion.div>
        <motion.div className="bigtype-line accent" style={{ x: bigX2 }}>
          {'태그로 잇다 · 질문으로 잇다 · 게임으로 잇다 · 슬랙으로 잇다 · '.repeat(2)}
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

      {/* ---------- 라임 곡면 밴드: 마지막 CTA(폭죽) + 푸터 ---------- */}
      <div className="footer-band band">
      <section className="landing-final">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4 }}
        >
          다음 모임, Deverapo에서 시작하세요
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
        <span className="landing-logo">Deverapo</span>
        <span>관심사 태그로 라포를 만드는 채팅 서비스</span>
      </footer>
      </div>
    </div>
  )
}
