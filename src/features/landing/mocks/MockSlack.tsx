import { motion } from 'motion/react'

/** 슬랙 봇 메시지 목업 — 실제 봇이 띄우는 기능 카탈로그(features.py)와 같은 구성. */
const GAME_BUTTONS = ['빙고', '끝말잇기', '오목', '틱택토', '밸런스게임', '초성퀴즈']
const TOOL_BUTTONS = ['같이보기', '그림판']

export function MockSlack() {
  return (
    <div className="lm-screen lm-slack">
      <div className="lm-slack-msg">
        <span className="lm-slack-avatar">D</span>
        <div className="lm-slack-body">
          <div className="lm-slack-name">
            Deverapo <span className="lm-slack-app">앱</span>
            <span className="lm-slack-time">오전 10:39</span>
          </div>
          <div className="lm-slack-label">게임</div>
          <div className="lm-slack-btns">
            {GAME_BUTTONS.map((b, i) => (
              <motion.span
                key={b}
                className="lm-slack-btn"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.3 }}
              >
                {b}
              </motion.span>
            ))}
          </div>
          <div className="lm-slack-label">그 외</div>
          <div className="lm-slack-btns">
            {TOOL_BUTTONS.map((b, i) => (
              <motion.span
                key={b}
                className="lm-slack-btn"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.06, duration: 0.3 }}
              >
                {b}
              </motion.span>
            ))}
          </div>
          <motion.div
            className="lm-slack-note"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            버튼을 누르면 본인만 볼 수 있는 입장 링크를 보내드려요 (15분 유효)
          </motion.div>
        </div>
      </div>
    </div>
  )
}
