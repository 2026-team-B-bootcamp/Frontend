import { useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { DiceIcon, SparkIcon, TvIcon, UsersIcon } from '../../shared/ui/icons'
import { MockAI } from './mocks/MockAI'
import { MockChat } from './mocks/MockChat'
import { MockGames } from './mocks/MockGames'
import { MockPlay } from './mocks/MockPlay'

/* ---------- 핀(고정) 쇼케이스 ---------- */

// mock 컴포넌트를 JSX로 품고 있어서 content.ts(순수 데이터)에 두지 않고 여기 둔다
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
    desc: '빙고·끝말잇기·오목·틱택토·밸런스게임·초성퀴즈 — 6종을 채팅 옆 패널에서 바로. 30초 턴 타이머, 실시간 대전, 승리 폭죽까지.',
    mock: <MockGames />,
  },
  {
    icon: <TvIcon size={20} />,
    title: '보는 것도, 그리는 것도 같이',
    desc: '같이보기로 유튜브를 한 화면처럼 — 재생·일시정지가 모두에게 동기화돼요. 그림판에선 내가 그은 선이 채널 전체에 실시간으로 나타나고요.',
    mock: <MockPlay />,
  },
]

export function PinnedShowcase() {
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
