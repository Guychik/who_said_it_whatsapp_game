import { ParsedMessage, FilteredMessage } from "@/types";

// Reaction patterns in the NEXT message that signal the current message was funny/interesting
const REACTION_PATTERNS = [
  /^(חח)+$/,
  /^😂+$/,
  /^🤣+$/,
  /^(לול|lol|lmao|rofl)/i,
  /^(אחלה|מדהים|וואו|wow|omg|אלוהים)/i,
  /^(dead|💀|☠️)/,
  /^(בדיוק|100%|כל הכבוד)/,
];

// Emoji regex for counting emojis in a message
const EMOJI_REGEX = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

// Words that signal drama/hot takes
const SPICY_WORDS = [
  "שונא", "אוהב", "הכי", "אף פעם", "תמיד", "נשבע", "מבטיח",
  "חייב", "אסור", "מטורף", "לא נורמלי", "אני מת", "בחיים לא",
  "hate", "love", "never", "always", "worst", "best", "insane",
  "wtf", "literally", "swear", "promise", "obsessed",
];

const VOICE_PATTERNS = ["audio omitted", "ptt omitted", "‎audio omitted", "‎ptt omitted"];

function isVoiceMessage(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return VOICE_PATTERNS.some((p) => lower.includes(p));
}

export function smartScoreMessages(
  filteredMessages: ParsedMessage[],
  allMessages: ParsedMessage[],
  count: number
): FilteredMessage[] {
  const scored: FilteredMessage[] = filteredMessages.map((msg) => {
    let score = 0;
    const text = msg.message;
    const lower = text.toLowerCase();

    // 1. Did the next message(s) react with laughter/excitement? (+30)
    const msgIdx = allMessages.findIndex((m) => m.index === msg.index);
    if (msgIdx >= 0 && msgIdx < allMessages.length - 1) {
      const next = allMessages[msgIdx + 1];
      if (next && next.author !== msg.author) {
        const nextText = next.message.trim();
        if (REACTION_PATTERNS.some((r) => r.test(nextText))) {
          score += 30;
        }
        // Also check for חחח or 😂 anywhere in the reply
        if (/חח|😂|🤣|💀/.test(nextText)) {
          score += 15;
        }
      }
      // Check 2nd reply too
      if (msgIdx < allMessages.length - 2) {
        const next2 = allMessages[msgIdx + 2];
        if (next2 && next2.author !== msg.author && /חח|😂|🤣|💀/.test(next2.message)) {
          score += 10;
        }
      }
    }

    // 2. Conversation burst after this message — did it spark discussion? (+20)
    if (msgIdx >= 0) {
      let burst = 0;
      for (let i = msgIdx + 1; i < Math.min(msgIdx + 6, allMessages.length); i++) {
        const timeDiff = new Date(allMessages[i].date).getTime() - new Date(msg.date).getTime();
        if (timeDiff < 5 * 60 * 1000) burst++; // within 5 minutes
        else break;
      }
      if (burst >= 3) score += 20;
    }

    // 3. Contains emojis — more expressive messages (+5 per emoji, max 15)
    const emojiCount = (text.match(EMOJI_REGEX) || []).length;
    score += Math.min(emojiCount * 5, 15);

    // 4. Exclamation marks — passion/emphasis (+5 per, max 15)
    const exclamations = (text.match(/!/g) || []).length;
    score += Math.min(exclamations * 5, 15);

    // 5. Spicy/dramatic words (+10 per, max 20)
    const spicyCount = SPICY_WORDS.filter((w) => lower.includes(w)).length;
    score += Math.min(spicyCount * 10, 20);

    // 6. Unique vocabulary — words that appear rarely across all messages (+10)
    const words = lower.split(/\s+/).filter((w) => w.length > 3);
    const wordFrequency = getWordFrequency(allMessages);
    const rareWords = words.filter((w) => (wordFrequency.get(w) || 0) <= 2);
    if (rareWords.length >= 2) score += 10;

    // 7. Message length sweet spot: 30-150 chars are usually the funniest (+5)
    if (text.length >= 30 && text.length <= 150) score += 5;

    // 8. Question marks reduce score — questions are less fun to guess (-5)
    if (text.includes("?")) score -= 5;

    // 9. Reply to a voice message — these are often funny reactions (+20)
    if (msgIdx > 0) {
      const prev = allMessages[msgIdx - 1];
      if (prev && isVoiceMessage(prev.message)) {
        score += 20;
      }
    }

    return { ...msg, score };
  });

  // Sort by score descending with random tiebreaker so same-score messages shuffle
  scored.sort((a, b) => {
    const diff = (b.score ?? 0) - (a.score ?? 0);
    return diff !== 0 ? diff : Math.random() - 0.5;
  });

  // Take top 3x candidates and shuffle, then pick N — adds variety each game
  const pool = scored.slice(0, Math.min(count * 3, scored.length));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// Cache word frequency across all messages
let cachedFrequency: Map<string, number> | null = null;
let cachedMessageCount = 0;

function getWordFrequency(allMessages: ParsedMessage[]): Map<string, number> {
  if (cachedFrequency && cachedMessageCount === allMessages.length) {
    return cachedFrequency;
  }

  const freq = new Map<string, number>();
  for (const msg of allMessages) {
    const words = msg.message.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
  }
  cachedFrequency = freq;
  cachedMessageCount = allMessages.length;
  return freq;
}
