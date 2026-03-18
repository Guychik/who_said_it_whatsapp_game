"use client";

import { create } from "zustand";
import { GameState, GameQuestion, ParsedMessage, ChatData, ScoreBreakdown, TurnRecord } from "@/types";
import { calculateScore } from "./game-logic";

interface GameActions {
  initGame: (
    questions: GameQuestion[],
    participants: string[],
    allMessages: ParsedMessage[],
    chatData?: ChatData
  ) => void;
  addPlayer: (name: string) => void;
  removePlayer: (name: string) => void;
  selectAnswer: (playerName: string, answer: string) => void;
  revealClue: () => void;
  revealAnswer: () => void;
  nextQuestion: () => void;
  resetGame: () => void;
  setPhase: (phase: GameState["phase"]) => void;
}

const initialState: GameState = {
  phase: "upload",
  questions: [],
  currentQuestionIndex: 0,
  players: [],
  allParticipants: [],
  allMessages: [],
  revealedClues: 0,
  selectedAnswer: null,
  chatData: null,
  lastScoreBreakdown: null,
  turnHistory: [],
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  initGame: (questions, participants, allMessages, chatData) =>
    set({
      phase: "playing",
      questions,
      allParticipants: participants,
      allMessages,
      currentQuestionIndex: 0,
      revealedClues: 0,
      selectedAnswer: null,
      ...(chatData ? { chatData } : {}),
    }),

  addPlayer: (name) =>
    set((state) => ({
      players: [...state.players, { name, score: 0, streak: 0 }],
    })),

  removePlayer: (name) =>
    set((state) => ({
      players: state.players.filter((p) => p.name !== name),
    })),

  selectAnswer: (playerName, answer) => {
    const state = get();
    const question = state.questions[state.currentQuestionIndex];
    if (!question) return;

    const isCorrect = answer === question.correctAnswer;
    let breakdown: ScoreBreakdown | null = null;

    set((s) => {
      const newPlayers = s.players.map((p) => {
        if (p.name !== playerName) return p;
        const result = calculateScore(isCorrect, s.revealedClues, p.streak);
        breakdown = result;
        return {
          ...p,
          score: p.score + result.total,
          streak: isCorrect ? p.streak + 1 : 0,
        };
      });

      const turn: TurnRecord = {
        questionIndex: s.currentQuestionIndex,
        playerName,
        isCorrect,
        cluesUsed: s.revealedClues,
        pointsEarned: breakdown?.total ?? 0,
        streakAtTime: breakdown?.streak ?? 0,
      };

      return {
        selectedAnswer: answer,
        players: newPlayers,
        lastScoreBreakdown: breakdown,
        turnHistory: [...s.turnHistory, turn],
      };
    });
  },

  revealClue: () =>
    set((state) => ({
      revealedClues: state.revealedClues + 1,
    })),

  revealAnswer: () =>
    set({ phase: "reveal" }),

  nextQuestion: () => {
    const state = get();
    const nextIndex = state.currentQuestionIndex + 1;
    if (nextIndex >= state.questions.length) {
      set({ phase: "end" });
    } else {
      set({
        phase: "playing",
        currentQuestionIndex: nextIndex,
        revealedClues: 0,
        selectedAnswer: null,
      });
    }
  },

  resetGame: () => set(initialState),

  setPhase: (phase) => set({ phase }),
}));
