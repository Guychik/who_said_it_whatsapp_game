import { ParsedMessage } from "@/types";

const MIN_LENGTH = 20;
const MAX_LENGTH = 500;

const BLOCKLIST = new Set([
  "lol", "haha", "hahaha", "ok", "אוקיי", "אוקי", "בסדר", "חחח", "חחחח",
  "חחחחחח", "חחחחחחח", "😂", "😅", "👍", "🤣", "❤️", "💯", "🔥", "כן", "לא",
  "נכון", "וואלה", "יש", "אין", "טוב", "תודה", "סבבה", "👏", "😍", "🙏",
  "oof", "bruh", "yep", "nope", "nice", "wow", "omg",
]);

const URL_REGEX = /https?:\/\/\S+/i;
const MEDIA_PATTERNS = [
  "<media omitted>",
  "<מדיה לא נכללה>",
  "image omitted",
  "video omitted",
  "audio omitted",
  "sticker omitted",
  "GIF omitted",
  "document omitted",
  "Contact card omitted",
];
const FORWARDED_PREFIX = "‎Forwarded";
const EMOJI_ONLY_REGEX = /^[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}\s]+$/u;

// WhatsApp metadata tags to strip from message text
const WA_TAGS_REGEX = /\u200e?<[^>]*(edited|deleted|This message was edited)[^>]*>/gi;

function cleanMessage(text: string): string {
  return text.replace(WA_TAGS_REGEX, "").trim();
}

export function filterMessages(messages: ParsedMessage[]): ParsedMessage[] {
  // Clean all messages first
  const cleaned = messages.map((msg) => ({
    ...msg,
    message: cleanMessage(msg.message),
  }));

  let filtered = cleaned.filter((msg) => {
    const text = msg.message.trim();
    const lower = text.toLowerCase();

    // Length checks
    if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) return false;

    // Blocklist
    if (BLOCKLIST.has(lower)) return false;

    // Media
    if (MEDIA_PATTERNS.some((p) => lower.includes(p.toLowerCase()))) return false;

    // URLs
    if (URL_REGEX.test(text)) return false;

    // Forwarded
    if (text.startsWith(FORWARDED_PREFIX)) return false;

    // Emoji-only
    if (EMOJI_ONLY_REGEX.test(text)) return false;

    // Repetitive single-character messages (חחחחח, ההההה, etc.)
    if (/^(.)\1{4,}$/.test(text.replace(/\s/g, ""))) return false;

    // Location messages
    if (lower.includes("location:") || lower.includes("מיקום:")) return false;


    return true;
  });

  // Cap any single participant at 30% of the filtered set
  const maxPerParticipant = Math.ceil(filtered.length * 0.3);
  const countByParticipant: Record<string, number> = {};
  filtered = filtered.filter((msg) => {
    countByParticipant[msg.author] = (countByParticipant[msg.author] || 0) + 1;
    return countByParticipant[msg.author] <= maxPerParticipant;
  });

  return filtered;
}
