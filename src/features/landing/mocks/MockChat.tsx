import { TagPills } from '../../users/TagPills'

export function MockChat() {
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
