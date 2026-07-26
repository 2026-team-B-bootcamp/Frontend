import { motion } from 'motion/react'

/** 헤드라인 단어별 스태거 리빌 — hl로 특정 단어에 컬러 하이라이트(배경 칠) */
export function RevealWords({
  text,
  delay = 0,
  hl = {},
}: {
  text: string
  delay?: number
  hl?: Record<number, 'lime' | 'coral' | 'sky'>
}) {
  return (
    <span className="reveal-line">
      {text.split(' ').map((word, i) => (
        <motion.span
          key={i}
          className={`reveal-word${hl[i] ? ` hl hl-${hl[i]}` : ''}`}
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
