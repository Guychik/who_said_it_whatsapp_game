import { FilteredMessage, GameQuestion, Clue, ParsedMessage } from "@/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateQuestions(
  rankedMessages: FilteredMessage[],
  allParticipants: string[],
  allMessages: ParsedMessage[]
): GameQuestion[] {
  return rankedMessages.map((msg) => {
    const correctAnswer = msg.author;

    // Pick distractors (other participants)
    const others = allParticipants.filter((p) => p !== correctAnswer);
    const numOptions = Math.min(4, allParticipants.length);
    const distractors = shuffle(others).slice(0, numOptions - 1);
    const options = shuffle([correctAnswer, ...distractors]);

    const clues = generateClues(msg, allMessages, allParticipants);

    return {
      message: msg,
      options,
      correctAnswer,
      clues,
    };
  });
}

function generateClues(
  msg: FilteredMessage,
  allMessages: ParsedMessage[],
  allParticipants: string[]
): Clue[] {
  const clues: Clue[] = [];

  // Clue 1: Date of message
  const date = new Date(msg.date);
  const formattedDate = date.toLocaleDateString("he-IL", {
    month: "long",
    day: "numeric",
  });
  clues.push({
    type: "date",
    label: "תאריך ההודעה",
    value: formattedDate,
  });

  // Clue 2: Prior message in the conversation (author hidden)
  const msgIdx = allMessages.findIndex((m) => m.index === msg.index);
  if (msgIdx > 0) {
    const prev = allMessages[msgIdx - 1];
    if (prev) {
      clues.push({
        type: "context_before",
        label: "ההודעה שלפני",
        value: `"${prev.message.slice(0, 120)}${prev.message.length > 120 ? "..." : ""}"`,
      });
    }
  }

  return clues;
}

export function calculateScore(
  isCorrect: boolean,
  cluesUsed: number,
  currentStreak: number
): number {
  if (!isCorrect) return 0;

  const basePoints = 100;
  const cluePenalty = cluesUsed * 20;
  const streakBonus = currentStreak * 25;

  return Math.max(0, basePoints - cluePenalty + streakBonus);
}
