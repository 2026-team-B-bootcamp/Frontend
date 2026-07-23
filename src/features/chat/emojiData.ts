/**
 * 이모지 피커와 리치 텍스트 렌더러(:shortcode: 변환)가 공유하는 이모지 데이터.
 * 전체 유니코드 목록 대신 채팅에서 자주 쓰는 것들만 카테고리별로 추린다 —
 * 번들을 가볍게 유지하면서 실사용 커버리지는 충분히 확보하는 절충.
 */
export interface EmojiGroup {
  label: string
  emojis: { char: string; name: string }[]
}

export const EMOJI_GROUPS: EmojiGroup[] = [
  {
    label: '표정',
    emojis: [
      { char: '😀', name: 'grinning' },
      { char: '😄', name: 'smile' },
      { char: '😁', name: 'grin' },
      { char: '😂', name: 'joy' },
      { char: '🤣', name: 'rofl' },
      { char: '😊', name: 'blush' },
      { char: '😉', name: 'wink' },
      { char: '😍', name: 'heart_eyes' },
      { char: '😘', name: 'kissing_heart' },
      { char: '😜', name: 'stuck_out_tongue_winking_eye' },
      { char: '🤪', name: 'zany' },
      { char: '🤗', name: 'hugging' },
      { char: '🤔', name: 'thinking' },
      { char: '😐', name: 'neutral' },
      { char: '😴', name: 'sleeping' },
      { char: '😎', name: 'sunglasses' },
      { char: '🥳', name: 'partying' },
      { char: '😭', name: 'sob' },
      { char: '😅', name: 'sweat_smile' },
      { char: '😳', name: 'flushed' },
      { char: '🥺', name: 'pleading' },
      { char: '😱', name: 'scream' },
      { char: '😤', name: 'triumph' },
      { char: '🙄', name: 'roll_eyes' },
    ],
  },
  {
    label: '제스처',
    emojis: [
      { char: '👍', name: 'thumbsup' },
      { char: '👎', name: 'thumbsdown' },
      { char: '👏', name: 'clap' },
      { char: '🙌', name: 'raised_hands' },
      { char: '🙏', name: 'pray' },
      { char: '👋', name: 'wave' },
      { char: '🤝', name: 'handshake' },
      { char: '✌️', name: 'v' },
      { char: '🤞', name: 'crossed_fingers' },
      { char: '👌', name: 'ok_hand' },
      { char: '💪', name: 'muscle' },
      { char: '🫶', name: 'heart_hands' },
      { char: '👀', name: 'eyes' },
      { char: '🫡', name: 'salute' },
    ],
  },
  {
    label: '하트·기호',
    emojis: [
      { char: '❤️', name: 'heart' },
      { char: '🧡', name: 'orange_heart' },
      { char: '💛', name: 'yellow_heart' },
      { char: '💚', name: 'green_heart' },
      { char: '💙', name: 'blue_heart' },
      { char: '💜', name: 'purple_heart' },
      { char: '🖤', name: 'black_heart' },
      { char: '💖', name: 'sparkling_heart' },
      { char: '💔', name: 'broken_heart' },
      { char: '✨', name: 'sparkles' },
      { char: '⭐', name: 'star' },
      { char: '🔥', name: 'fire' },
      { char: '🎉', name: 'tada' },
      { char: '💯', name: '100' },
      { char: '✅', name: 'white_check_mark' },
      { char: '❌', name: 'x' },
      { char: '⚡', name: 'zap' },
      { char: '💡', name: 'bulb' },
    ],
  },
  {
    label: '음식·활동',
    emojis: [
      { char: '☕', name: 'coffee' },
      { char: '🍺', name: 'beer' },
      { char: '🍕', name: 'pizza' },
      { char: '🍔', name: 'hamburger' },
      { char: '🍜', name: 'ramen' },
      { char: '🍚', name: 'rice' },
      { char: '🍗', name: 'poultry_leg' },
      { char: '🍰', name: 'cake' },
      { char: '🎮', name: 'video_game' },
      { char: '⚽', name: 'soccer' },
      { char: '🏀', name: 'basketball' },
      { char: '🎯', name: 'dart' },
      { char: '🎲', name: 'game_die' },
      { char: '🏆', name: 'trophy' },
      { char: '🎵', name: 'musical_note' },
      { char: '📚', name: 'books' },
    ],
  },
  {
    label: '기타',
    emojis: [
      { char: '🚀', name: 'rocket' },
      { char: '💻', name: 'computer' },
      { char: '📱', name: 'phone' },
      { char: '💰', name: 'money' },
      { char: '🎁', name: 'gift' },
      { char: '⏰', name: 'alarm_clock' },
      { char: '📌', name: 'pushpin' },
      { char: '🔔', name: 'bell' },
      { char: '🌙', name: 'moon' },
      { char: '☀️', name: 'sun' },
      { char: '🌈', name: 'rainbow' },
      { char: '🐶', name: 'dog' },
      { char: '🐱', name: 'cat' },
      { char: '🌸', name: 'cherry_blossom' },
      { char: '👏', name: 'clap2' },
      { char: '🤖', name: 'robot' },
    ],
  },
]

// :shortcode: → 이모지 문자. 렌더러가 본문의 :name: 을 치환할 때 쓴다.
export const SHORTCODES: Record<string, string> = Object.fromEntries(
  EMOJI_GROUPS.flatMap((g) => g.emojis.map((e) => [e.name, e.char])),
)
