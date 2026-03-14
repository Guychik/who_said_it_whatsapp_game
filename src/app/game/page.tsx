"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/lib/game/game-store";
import QuestionCard from "@/components/QuestionCard";
import AnswerGrid from "@/components/AnswerGrid";
import CluePanel from "@/components/CluePanel";
import ScoreBoard from "@/components/ScoreBoard";

export default function GamePage() {
  const router = useRouter();
  const {
    phase,
    questions,
    currentQuestionIndex,
    players,
    revealedClues,
    selectedAnswer,
    chatData,
    selectAnswer,
    revealClue,
    revealAnswer,
    nextQuestion,
    resetGame,
    initGame,
  } = useGameStore();

  const [activePlayer, setActivePlayer] = useState(0);
  const [replaying, setReplaying] = useState(false);

  // Redirect if no game is loaded
  useEffect(() => {
    if (questions.length === 0) {
      router.push("/");
    }
  }, [questions, router]);

  if (questions.length === 0) return null;

  const currentQuestion = questions[currentQuestionIndex];
  const currentPlayerName = players.length > 0 ? players[activePlayer]?.name : null;

  const handleSelectAnswer = (answer: string) => {
    if (currentPlayerName) {
      selectAnswer(currentPlayerName, answer);
    }
    // Auto-reveal after selection
    setTimeout(() => revealAnswer(), 700);
  };

  const handleNext = () => {
    // Cycle to next player
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
      const rankRes = await fetch("/api/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filteredMessages: chatData.filteredMessages,
          allMessages: chatData.allMessages,
          participants: chatData.participants,
          count: chatData.questionCount,
          useAI: chatData.useAI,
        }),
      });
      const rankData = await rankRes.json();

      if (!rankRes.ok) throw new Error(rankData.error);

      // Reset player scores but keep names
      const resetPlayers = players.map((p) => ({ ...p, score: 0, streak: 0 }));

      initGame(
        rankData.questions,
        chatData.participants,
        chatData.allMessages.map((m) => ({
          ...m,
          date: typeof m.date === "string" ? new Date(m.date) : m.date,
        })),
        chatData
      );

      // Restore players with reset scores and reset active player
      useGameStore.setState({ players: resetPlayers });
      setActivePlayer(0);
    } catch {
      // If replay fails, go back to upload
      resetGame();
      router.push("/");
    } finally {
      setReplaying(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Exit button */}
      {phase !== "end" && (
        <div className="flex justify-start mb-4">
          <button
            onClick={handleExit}
            className="bg-white/10 hover:bg-white/20 text-white/70 hover:text-white
              font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer text-sm"
          >
            ✕ יציאה
          </button>
        </div>
      )}

      {/* Top bar: scores */}
      {players.length > 0 && phase !== "end" && (
        <div className="flex justify-center gap-4 mb-6 flex-wrap">
          {players.map((p) => (
            <div
              key={p.name}
              className={`bg-white/10 px-4 py-2 rounded-full flex items-center gap-2 ${
                currentPlayerName === p.name ? "ring-2 ring-kahoot-yellow" : ""
              }`}
            >
              <span className="font-bold">{p.name}</span>
              <span dir="ltr" className="text-kahoot-yellow font-black">
                {p.score}
              </span>
              {p.streak > 1 && <span className="text-sm">🔥{p.streak}</span>}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* PLAYING PHASE */}
        {phase === "playing" && currentQuestion && (
          <motion.div
            key={`playing-${currentQuestionIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {currentPlayerName && (
              <p className="text-center text-white/60 mb-4">
                תור של <span className="text-kahoot-yellow font-bold">{currentPlayerName}</span>
              </p>
            )}

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

            {/* Skip button */}
            {!selectedAnswer && (
              <div className="text-center mt-6">
                <button
                  onClick={handleNext}
                  className="text-white/40 hover:text-white/70 text-sm font-bold transition-colors cursor-pointer"
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
            <QuestionCard
              question={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={questions.length}
            />

            <AnswerGrid
              options={currentQuestion.options}
              onSelect={() => {}}
              selectedAnswer={selectedAnswer}
              correctAnswer={currentQuestion.correctAnswer}
              isRevealed={true}
            />

            {/* Reveal animation */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 10, stiffness: 200 }}
              className="mt-8"
            >
              <div className="bg-kahoot-green/30 border-2 border-kahoot-green rounded-2xl p-6 max-w-md mx-auto">
                <p className="text-2xl font-black mb-1">
                  {currentQuestion.correctAnswer}
                </p>
              </div>
            </motion.div>

            {/* Confetti-like elements */}
            <div className="relative">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    opacity: 1,
                    x: 0,
                    y: 0,
                    scale: 0,
                  }}
                  animate={{
                    opacity: 0,
                    x: (Math.random() - 0.5) * 400,
                    y: -(Math.random() * 200 + 50),
                    scale: 1,
                    rotate: Math.random() * 720,
                  }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="absolute top-0 left-1/2 text-2xl pointer-events-none"
                >
                  {["🎉", "✨", "🌟", "🎊"][i % 4]}
                </motion.div>
              ))}
            </div>

            {/* Score update */}
            {selectedAnswer && players.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-4"
              >
                {selectedAnswer === currentQuestion.correctAnswer ? (
                  <p className="text-kahoot-green text-xl font-bold">!תשובה נכונה 🎉</p>
                ) : (
                  <p className="text-kahoot-red text-xl font-bold">תשובה שגויה 😔</p>
                )}
              </motion.div>
            )}

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className="mt-8 bg-kahoot-yellow text-kahoot-purple-dark font-black text-xl px-10 py-4 rounded-xl
                hover:bg-kahoot-yellow/90 transition-colors cursor-pointer shadow-xl"
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.h1
              className="text-5xl font-black mb-2"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              !המשחק נגמר
            </motion.h1>
            <p className="text-white/60 text-lg mb-8">
              שיחקתם {questions.length} שאלות
            </p>

            {players.length > 0 ? (
              <ScoreBoard players={players} isEndScreen />
            ) : (
              <div className="bg-white/10 rounded-2xl p-8 max-w-md mx-auto">
                <p className="text-xl">!מקווים שנהניתם</p>
                <p className="text-white/60 mt-2">
                  הוסיפו שחקנים בפעם הבאה למעקב ניקוד
                </p>
              </div>
            )}

            <div className="flex gap-4 justify-center mt-10">
              {chatData && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReplay}
                  disabled={replaying}
                  className="bg-kahoot-yellow text-kahoot-purple-dark font-black text-xl px-8 py-4 rounded-xl
                    hover:bg-kahoot-yellow/90 transition-colors cursor-pointer shadow-xl
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {replaying ? "...טוען שאלות חדשות" : "🔄 שאלות חדשות"}
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExit}
                className="bg-white/20 text-white font-bold text-xl px-8 py-4 rounded-xl
                  hover:bg-white/30 transition-colors cursor-pointer"
              >
                צ׳אט חדש
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
