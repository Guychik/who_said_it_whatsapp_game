import { parseString } from "whatsapp-chat-parser";
import { ParsedMessage } from "@/types";

export interface ParseResult {
  participants: string[];
  messages: ParsedMessage[];
}

export async function parseWhatsAppChat(text: string): Promise<ParseResult> {
  const parsed = await parseString(text);

  let index = 0;
  const messages: ParsedMessage[] = [];
  const participantSet = new Set<string>();

  for (const msg of parsed) {
    // Skip system messages (author is "System" or empty)
    if (!msg.author || msg.author === "System") continue;

    participantSet.add(msg.author);
    messages.push({
      date: new Date(msg.date),
      author: msg.author,
      message: msg.message,
      index: index++,
    });
  }

  // Count messages per participant — filter out those with very few messages
  // (likely the group name or briefly-added members)
  const MIN_MESSAGES = 5;
  const countByAuthor: Record<string, number> = {};
  for (const msg of messages) {
    countByAuthor[msg.author] = (countByAuthor[msg.author] || 0) + 1;
  }

  const validParticipants = new Set(
    Object.entries(countByAuthor)
      .filter(([, count]) => count >= MIN_MESSAGES)
      .map(([author]) => author)
  );

  const filteredMessages = messages.filter((m) => validParticipants.has(m.author));

  return {
    participants: Array.from(validParticipants),
    messages: filteredMessages,
  };
}
