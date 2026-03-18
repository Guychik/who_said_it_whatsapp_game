export interface ParsedMessage {
  date: Date;
  author: string;
  message: string;
  index: number;
}

export interface FilteredMessage extends ParsedMessage {
  score?: number;
}

export interface Clue {
  type: "date" | "context_before" | "context_after" | "first_letter" | "message_count";
  label: string;
  value: string;
}

export interface GameQuestion {
  message: FilteredMessage;
  options: string[];
  correctAnswer: string;
  clues: Clue[];
}

export interface Player {
  name: string;
  score: number;
  streak: number;
}

export type GamePhase = "upload" | "loading" | "playing" | "reveal" | "end";

export interface ChatData {
  filteredMessages: ParsedMessage[];
  allMessages: ParsedMessage[];
  participants: string[];
  useAI: boolean;
  questionCount: number;
  geminiApiKey?: string;
}

export interface ScoreBreakdown {
  total: number;
  base: number;
  cluePenalty: number;
  streakBonus: number;
  streak: number;
  isCorrect: boolean;
}

export interface TurnRecord {
  questionIndex: number;
  playerName: string;
  isCorrect: boolean;
  cluesUsed: number;
  pointsEarned: number;
  streakAtTime: number;
}

export interface GameState {
  phase: GamePhase;
  questions: GameQuestion[];
  currentQuestionIndex: number;
  players: Player[];
  allParticipants: string[];
  allMessages: ParsedMessage[];
  revealedClues: number;
  selectedAnswer: string | null;
  chatData: ChatData | null;
  lastScoreBreakdown: ScoreBreakdown | null;
  turnHistory: TurnRecord[];
}
