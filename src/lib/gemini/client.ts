import { ParsedMessage, FilteredMessage } from "@/types";

const MAX_MESSAGES_TO_SEND = 80;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function rankMessagesWithGemini(
  messages: ParsedMessage[],
  count: number,
  apiKey: string
): Promise<FilteredMessage[]> {
  if (messages.length <= count) {
    return messages.map((m) => ({ ...m, score: 1 }));
  }

  const sampled =
    messages.length > MAX_MESSAGES_TO_SEND
      ? shuffle(messages).slice(0, MAX_MESSAGES_TO_SEND)
      : messages;

  const messagesText = sampled
    .map((m, i) => `${i}: ${m.message}`)
    .join("\n");

  const prompt = `You are picking the JUICIEST messages from a WhatsApp group chat for a party game called "Who Said It?" (מי אמר את זה).
Your job: find the messages that will make the room EXPLODE with laughter. Pick the ${count} best ones.

Return ONLY a JSON array of the message indices you picked, ranked most outrageous first. Example: [3, 7, 12, 0, 5]

PRIORITIZE (this is what makes a great game):
- Outrageous, unhinged, or chaotic messages that make you go "WHO said that?!"
- Personal confessions, hot takes, embarrassing moments, or drama
- Messages dripping with personality — you can almost hear the person saying it
- Juicy gossip, spicy opinions, roasts, or over-the-top reactions
- Inside jokes or references that only this group would understand
- Messages that are so specific to one person that friends will fight over who said it

HARD AVOID (these kill the vibe):
- Generic stuff anyone could say ("I went to the mall", "sounds good", "what time?")
- Logistics, planning, addresses, or coordination
- Plain questions without personality
- News/links/forwards — we want ORIGINAL thoughts
- Anything boring or forgettable

Think of it this way: if reading the message out loud at a party wouldn't get a reaction, skip it.

Messages:
${messagesText}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error?.message || response.statusText;
      throw new Error(`Gemini API error: ${errorMsg}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const match = text.match(/\[[\d,\s]+\]/);
    if (!match) {
      console.warn("Gemini did not return valid JSON, falling back to random selection");
      return fallbackSelection(messages, count);
    }

    const indices: number[] = JSON.parse(match[0]);
    const ranked: FilteredMessage[] = [];

    for (let rank = 0; rank < indices.length && ranked.length < count; rank++) {
      const idx = indices[rank];
      if (idx >= 0 && idx < sampled.length) {
        ranked.push({
          ...sampled[idx],
          score: count - rank,
        });
      }
    }

    if (ranked.length < count) {
      const pickedIndices = new Set(ranked.map((r) => r.index));
      const remaining = messages.filter((m) => !pickedIndices.has(m.index));
      const extra = shuffle(remaining).slice(0, count - ranked.length);
      ranked.push(...extra.map((m) => ({ ...m, score: 0 })));
    }

    return ranked;
  } catch (error) {
    console.error("Gemini ranking failed:", error);
    throw error;
  }
}

function fallbackSelection(
  messages: ParsedMessage[],
  count: number
): FilteredMessage[] {
  return shuffle(messages)
    .slice(0, count)
    .map((m) => ({ ...m, score: 0 }));
}
