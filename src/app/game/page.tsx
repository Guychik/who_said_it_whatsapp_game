"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/lib/game/game-store";
import { smartScoreMessages } from "@/lib/filter/smart-scorer";
import { rankMessagesWithGemini } from "@/lib/gemini/client";
import { generateQuestions } from "@/lib/game/game-logic";
import QuestionCard from "@/components/QuestionCard";
import AnswerGrid from "@/components/AnswerGrid";
import CluePanel from "@/components/CluePanel";
import ScoreBoard from "@/components/ScoreBoard";
import ChatContext from "@/components/ChatContext";

export default function GamePage() {
  const router = useRouter();
  const {
    phase,
    questions,
    currentQuestionIndex,
    players,
    revealedClues,
    selectedAnswer,
    allMessages,
    chatData,
    selectAnswer,
    revealClue,
    revealAnswer,
    nextQuestion,
    resetGame,
    initGame,
    lastScoreBreakdown,
    turnHistory,
  } = useGameStore();

  const [activePlayer, setActivePlayer] = useState(0);
  const [replaying, setReplaying] = useState(false);
  const [frozenScores, setFrozenScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (questions.length === 0) {
      router.push("/");
    }
  }, [questions, router]);

  if (questions.length === 0) return null;

  const currentQuestion = questions[currentQuestionIndex];
  const currentPlayerName = players.length > 0 ? players[activePlayer]?.name : null;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleSelectAnswer = (answer: string) => {
    // Freeze scores before updating so header doesn't spoil the result
    const scores: Record<string, number> = {};
    players.forEach((p) => { scores[p.name] = p.score; });
    setFrozenScores(scores);

    if (currentPlayerName) {
      selectAnswer(currentPlayerName, answer);
    }
    setTimeout(() => revealAnswer(), 700);
    setTimeout(() => setFrozenScores({}), 1400);
  };

  const handleNext = () => {
    if (players.length > 0) {
      setActivePlayer((prev) => (prev + 1) % players.length);
    }
    nextQuestion();
  };

  const handleExit = () => {
    resetGame();
    router.push("/");
  };

  const handleReplay = async () => {
    if (!chatData) return;
    setReplaying(true);

    try {
      const hydratedFiltered = chatData.filteredMessages.map((m) => ({
        ...m,
        date: typeof m.date === "string" ? new Date(m.date) : m.date,
      }));
      const hydratedAll = chatData.allMessages.map((m) => ({
        ...m,
        date: typeof m.date === "string" ? new Date(m.date) : m.date,
      }));

      const ranked = chatData.useAI && chatData.geminiApiKey
        ? await rankMessagesWithGemini(hydratedFiltered, chatData.questionCount, chatData.geminiApiKey)
        : smartScoreMessages(hydratedFiltered, hydratedAll, chatData.questionCount);

      const newQuestions = generateQuestions(ranked, chatData.participants, hydratedAll);
      const resetPlayers = players.map((p) => ({ ...p, score: 0, streak: 0 }));

      initGame(newQuestions, chatData.participants, hydratedAll, chatData);
      useGameStore.setState({ players: resetPlayers, turnHistory: [] });
      setActivePlayer(0);
    } catch {
      resetGame();
      router.push("/");
    } finally {
      setReplaying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col wa-doodle-bg">
      {/* WhatsApp-style header */}
      {phase !== "end" && (
        <div className="wa-header-bar sticky top-0 z-40">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <button
              onClick={handleExit}
              className="text-wa-text-secondary hover:text-wa-text cursor-pointer transition-colors p-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>

            <div className="text-center">
              <p className="text-sm font-bold leading-tight">?מי אמר את זה</p>
              {currentPlayerName && (
                <p className="text-xs text-wa-green">{currentPlayerName} משחק/ת</p>
              )}
            </div>

            {/* Score pills */}
            <div className="flex items-center gap-1.5">
              {players.length > 0 && <span className="text-wa-text-secondary text-[10px]">ניקוד</span>}
              {players.length > 0 ? players.slice(0, 3).map((p) => (
                <div
                  key={p.name}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    currentPlayerName === p.name
                      ? "bg-wa-green/20 text-wa-green"
                      : "bg-wa-input text-wa-text-secondary"
                  }`}
                >
                  <span className="font-bold">{frozenScores[p.name] ?? p.score}</span>
                </div>
              )) : (
                <div className="w-5" />
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-0.5 bg-wa-border/30">
            <motion.div
              className="h-full bg-wa-green progress-glow"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 p-4 md:p-6">
        <AnimatePresence mode="wait">
          {/* PLAYING PHASE */}
          {phase === "playing" && currentQuestion && (
            <motion.div
              key={`playing-${currentQuestionIndex}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <QuestionCard
                question={currentQuestion}
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={questions.length}
              />

              <AnswerGrid
                options={currentQuestion.options}
                onSelect={handleSelectAnswer}
                selectedAnswer={selectedAnswer}
                isRevealed={false}
              />

              <CluePanel
                clues={currentQuestion.clues}
                revealedCount={revealedClues}
                onRevealClue={revealClue}
                disabled={!!selectedAnswer}
              />

              {!selectedAnswer && (
                <div className="text-center mt-6">
                  <button
                    onClick={handleNext}
                    className="text-wa-text-secondary hover:text-wa-text text-xs transition-colors cursor-pointer"
                  >
                    דלג ←
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* REVEAL PHASE */}
          {phase === "reveal" && currentQuestion && (
            <motion.div
              key={`reveal-${currentQuestionIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              {/* Answer reveal — styled like WhatsApp notification */}
              <motion.div
                initial={{ scale: 0, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                className="mb-6"
              >
                <div className="inline-block bg-wa-bubble-out rounded-xl px-8 py-4 shadow-lg relative">
                  <p className="text-xs text-wa-green mb-1 font-bold">:התשובה</p>
                  <p className="text-2xl font-black text-wa-text">
                    {currentQuestion.correctAnswer}
                  </p>
                  {/* Bubble tail */}
                  <div
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4"
                    style={{
                      backgroundColor: "#005C4B",
                      clipPath: "polygon(50% 100%, 0 0, 100% 0)",
                    }}
                  />
                </div>
              </motion.div>

              {/* Score feedback with breakdown */}
              {selectedAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-4"
                >
                  {selectedAnswer === currentQuestion.correctAnswer ? (
                    <div className="inline-flex items-center gap-2 text-sm font-bold">
                      <span className="bg-wa-green/15 text-wa-green px-3 py-1.5 rounded-full">תשובה נכונה +100</span>
                      {players.length > 0 && lastScoreBreakdown && lastScoreBreakdown.cluePenalty > 0 && (
                        <span className="bg-wa-danger/15 text-wa-danger px-3 py-1.5 rounded-full">רמז -{lastScoreBreakdown.cluePenalty}</span>
                      )}
                      {players.length > 0 && lastScoreBreakdown && lastScoreBreakdown.streakBonus > 0 && (
                        <span className="bg-wa-yellow/15 text-wa-yellow px-3 py-1.5 rounded-full">🔥 +{lastScoreBreakdown.streakBonus}</span>
                      )}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-sm font-bold">
                      <span className="bg-wa-danger/15 text-wa-danger px-3 py-1.5 rounded-full">תשובה שגויה</span>
                      {players.length > 0 && lastScoreBreakdown && lastScoreBreakdown.cluePenalty > 0 && (
                        <span className="bg-wa-danger/15 text-wa-danger px-3 py-1.5 rounded-full">רמז -{lastScoreBreakdown.cluePenalty}</span>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Chat context */}
              <div className="mt-6">
                <ChatContext
                  targetMessage={currentQuestion.message}
                  allMessages={allMessages}
                />
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleNext}
                className="mt-8 bg-wa-green text-white font-bold text-base px-8 py-3 rounded-xl
                  hover:bg-wa-green-dark transition-colors cursor-pointer"
              >
                {currentQuestionIndex < questions.length - 1
                  ? "שאלה הבאה ←"
                  : "לתוצאות 🏆"}
              </motion.button>
            </motion.div>
          )}

          {/* END PHASE */}
          {phase === "end" && (
            <motion.div
              key="end"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-8"
            >
              {/* End header — like WhatsApp group info */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10 }}
                  className="w-20 h-20 rounded-full bg-wa-green/20 mx-auto mb-4 flex items-center justify-center text-4xl"
                >
                  🏆
                </motion.div>
                <h1 className="text-2xl font-black mb-1">!המשחק נגמר</h1>
                <p className="text-wa-text-secondary text-sm">
                  {questions.length} שאלות שוחקו
                </p>
              </div>

              {players.length > 0 ? (
                <>
                  <ScoreBoard players={players} isEndScreen />

                  {/* Detailed breakdown per player */}
                  {turnHistory.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="max-w-md mx-auto mt-6"
                    >
                      <div className="bg-wa-panel rounded-xl border border-wa-border/30 overflow-hidden">
                        <div className="px-4 py-3 border-b border-wa-border/20">
                          <p className="text-wa-text-secondary text-xs">פירוט ניקוד</p>
                        </div>
                        {[...players].sort((a, b) => b.score - a.score).map((player) => {
                          const playerTurns = turnHistory.filter((t) => t.playerName === player.name);
                          const correctCount = playerTurns.filter((t) => t.isCorrect).length;
                          const totalClues = playerTurns.reduce((sum, t) => sum + t.cluesUsed, 0);
                          const maxStreak = Math.max(0, ...playerTurns.map((t) => t.streakAtTime));

                          return (
                            <div key={player.name} className="px-4 py-3 border-b border-wa-border/10 last:border-b-0" dir="rtl">
                              <p className="font-bold text-sm mb-2">{player.name}</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-wa-text-secondary">תשובות נכונות</span>
                                  <span className="text-wa-green font-bold">{correctCount}/{playerTurns.length}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-wa-text-secondary">רצף מקסימלי</span>
                                  <span className="text-wa-yellow font-bold">{maxStreak}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-wa-text-secondary">רמזים שנוצלו</span>
                                  <span className="text-wa-danger font-bold">{totalClues}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-wa-text-secondary">ניקוד סופי</span>
                                  <span className="text-wa-green font-black">{player.score}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="bg-wa-panel rounded-xl p-6 max-w-md mx-auto border border-wa-border/30 text-center">
                  <p className="text-base">!מקווים שנהניתם</p>
                  <p className="text-wa-text-secondary text-sm mt-1">
                    הוסיפו שחקנים בפעם הבאה למעקב ניקוד
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-center mt-8">
                {chatData && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleReplay}
                    disabled={replaying}
                    className="bg-wa-green text-white font-bold px-6 py-3 rounded-xl
                      hover:bg-wa-green-dark transition-colors cursor-pointer
                      disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {replaying ? (
                      <span className="flex items-center gap-2">
                        <span className="typing-dot" style={{ width: 5, height: 5 }} />
                        <span className="typing-dot" style={{ width: 5, height: 5 }} />
                        <span className="typing-dot" style={{ width: 5, height: 5 }} />
                      </span>
                    ) : "שאלות חדשות"}
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleExit}
                  className="bg-wa-panel text-wa-text font-bold px-6 py-3 rounded-xl
                    hover:bg-wa-input transition-colors cursor-pointer border border-wa-border/30 text-sm"
                >
                  צ׳אט חדש
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
