import { motion } from 'motion/react'
import { MockSlack } from './mocks/MockSlack'
import { SLACK_POINTS } from './content'

/** 슬랙 봇 섹션 — 팀이 이미 쓰는 슬랙 채널 위에 Deverapo를 얹는 흐름을 보여준다. */
export function SlackSection() {
  return (
    <section className="landing-section landing-slack">
      <div className="landing-slack-copy">
        <motion.p
          className="landing-eyebrow"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4 }}
        >
          WORKS WITH SLACK
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4 }}
        >
          쓰던 슬랙에
          <br />
          그대로 얹으세요
        </motion.h2>
        <div className="landing-slack-points">
          {SLACK_POINTS.map((p, i) => (
            <motion.div
              key={p.title}
              className="landing-slack-point"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.08 * i }}
            >
              <div className="landing-slack-point-title">{p.title}</div>
              <div className="landing-slack-point-desc">{p.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        className="card landing-slack-mock"
        initial={{ opacity: 0, y: 30, rotate: 1.5 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <MockSlack />
      </motion.div>
    </section>
  )
}
