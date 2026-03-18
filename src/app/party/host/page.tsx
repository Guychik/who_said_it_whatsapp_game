"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { createHostPeer, PeerMessage, PartyPlayerInfo, ContextMessage } from "@/lib/peer/connection";
import { calculatePartyScore } from "@/lib/game/game-logic";
import { GameQuestion, ParsedMessage } from "@/types";
import QuestionCard from "@/components/QuestionCard";
import ScoreBoard from "@/components/ScoreBoard";
import CountdownTimer from "@/components/CountdownTimer";
import ChatContext from "@/components/ChatContext";
import type { DataConnection } from "peerjs";

const TIMER_DURATION = 15; // seconds per question

interface ConnectedPlayer {
  id: string;
  name: string;
  conn: DataConnection;
  score: number;
  streak: number;
  answer: string | null;
  answeredAt: number | null;
  cluesUsed: number;
}

type HostPhase = "lobby" | "playing" | "reveal" | "end";

export default function PartyHostPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<HostPhase>("lobby");
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [allMessages, setAllMessages] = useState<{ date: Date; author: string; message: string; index: number }[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [players, setPlayers] = useState<ConnectedPlayer[]>([]);
  const [roomCode, setRoomCode] = useState("");
  const [timerStartedAt, setTimerStartedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const peerRef = useRef<{ destroy: () => void } | null>(null);
  const playersRef = useRef<ConnectedPlayer[]>([]);
  const phaseRef = useRef<HostPhase>("lobby");

  // Keep refs in sync
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Load questions from sessionStorage and create peer
  useEffect(() => {
    const raw = sessionStorage.getItem("partyData");
    if (!raw) {
      router.push("/");
      return;
    }

    try {
      const data = JSON.parse(raw);
      const qs = data.questions.map((q: GameQuestion & { message: { date: string } }) => ({
        ...q,
        message: { ...q.message, date: new Date(q.message.date) },
      }));
      setQuestions(qs);
      setAllMessages(
        data.allMessages.map((m: { date: string; author: string; message: string; index: number }) => ({
          ...m,
          date: new Date(m.date),
        }))
      );
    } catch {
      router.push("/");
      return;
    }

    const host = createHostPeer(
      (playerId, conn) => {
        const name = conn.metadata?.name || "שחקן";
        const id = conn.metadata?.playerId || playerId;

        setPlayers((prev) => {
          if (prev.find((p) => p.id === id)) return prev;
          return [...prev, { id, name, conn, score: 0, streak: 0, answer: null, answeredAt: null, cluesUsed: 0 }];
        });

        // Listen for messages from this player
        conn.on("data", (msg) => {
          const data = msg as PeerMessage;
          if (data.type === "answer") {
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === data.playerId
                  ? { ...p, answer: data.answer, answeredAt: data.answeredAt, cluesUsed: data.cluesUsed || 0 }
                  : p
              )
            );
          }
        });

        conn.on("close", () => {
          setPlayers((prev) => prev.filter((p) => p.id !== id));
        });
      },
      (_peerId, code) => {
        setRoomCode(code);
      },
      (err) => {
        setError(`שגיאת חיבור: ${err.message}`);
      }
    );

    peerRef.current = host;

    return () => {
      host.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Broadcast a message to all players
  const broadcast = useCallback((msg: PeerMessage) => {
    playersRef.current.forEach((p) => {
      if (p.conn.open) {
        p.conn.send(msg);
      }
    });
  }, []);

  // Start the game
  const handleStart = useCallback(() => {
    if (questions.length === 0 || players.length === 0) return;

    setPhase("playing");
    setCurrentQuestionIndex(0);

    // Reset player answers
    setPlayers((prev) => prev.map((p) => ({ ...p, answer: null, answeredAt: null, cluesUsed: 0 })));

    const q = questions[0];
    const now = Date.now();
    setTimerStartedAt(now);

    broadcast({ type: "game-start" });
    broadcast({
      type: "question",
      data: {
        text: q.message.message,
        options: q.options,
        questionNumber: 1,
        totalQuestions: questions.length,
        isPoll: q.message.message.startsWith("POLL:"),
        timestamp: q.message.date.getTime(),
        timerDuration: TIMER_DURATION,
        timerStartedAt: now,
        clues: q.clues.map((c) => ({ label: c.label, value: c.value })),
      },
    });
  }, [questions, players.length, broadcast]);

  // Check if all players answered
  useEffect(() => {
    if (phase !== "playing") return;
    const allAnswered = players.length > 0 && players.every((p) => p.answer !== null);
    if (allAnswered) {
      handleReveal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, phase]);

  // Build chat context for a question
  const buildChatContext = useCallback((q: GameQuestion): ContextMessage[] => {
    const msgIdx = allMessages.findIndex((m) => m.index === q.message.index);
    if (msgIdx < 0) return [];
    const radius = 3;
    const start = Math.max(0, msgIdx - radius);
    const end = Math.min(allMessages.length, msgIdx + radius + 1);
    return allMessages.slice(start, end).map((m) => ({
      author: m.author,
      message: m.message.length > 150 ? m.message.slice(0, 150) + "..." : m.message,
      date: m.date.getTime(),
      index: m.index,
      isTarget: m.index === q.message.index,
    }));
  }, [allMessages]);

  // Reveal answers and calculate scores
  const handleReveal = useCallback(() => {
    // Guard against double-calls
    if (phaseRef.current !== "playing") return;

    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;

    setPhase("reveal");

    const playerResults: Record<string, { isCorrect: boolean; points: number; total: number; speedBonus: number; cluePenalty: number }> = {};

    setPlayers((prev) =>
      prev.map((p) => {
        const isCorrect = p.answer === currentQ.correctAnswer;
        const timeRemaining = p.answeredAt
          ? Math.max(0, TIMER_DURATION - (p.answeredAt - timerStartedAt) / 1000)
          : 0;
        const result = calculatePartyScore(isCorrect, timeRemaining, TIMER_DURATION, p.streak, p.cluesUsed);

        playerResults[p.id] = {
          isCorrect,
          points: result.total,
          total: p.score + result.total,
          speedBonus: result.speedBonus,
          cluePenalty: result.cluePenalty,
        };

        return {
          ...p,
          score: p.score + result.total,
          streak: isCorrect ? p.streak + 1 : 0,
        };
      })
    );

    const chatContext = buildChatContext(currentQ);

    // Small delay to ensure state is updated before broadcast
    setTimeout(() => {
      broadcast({
        type: "reveal",
        data: {
          correctAnswer: currentQ.correctAnswer,
          playerResults,
          chatContext,
        },
      });

      // Also broadcast updated scoreboard
      const updatedPlayers = playersRef.current;
      broadcast({
        type: "scoreboard",
        players: updatedPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          score: p.score,
          isCorrect: p.answer === currentQ.correctAnswer,
          streak: p.streak,
        })),
      });
    }, 100);
  }, [questions, currentQuestionIndex, timerStartedAt, broadcast, buildChatContext]);

  // Timer expired
  const handleTimerExpire = useCallback(() => {
    if (phaseRef.current === "playing") {
      handleReveal();
    }
  }, [handleReveal]);

  // Next question
  const handleNext = useCallback(() => {
    const nextIdx = currentQuestionIndex + 1;

    if (nextIdx >= questions.length) {
      setPhase("end");
      broadcast({
        type: "game-end",
        players: playersRef.current.map((p) => ({
          id: p.id,
          name: p.name,
          score: p.score,
          streak: p.streak,
        })),
      });
      return;
    }

    setCurrentQuestionIndex(nextIdx);
    setPhase("playing");

    // Reset answers
    setPlayers((prev) => prev.map((p) => ({ ...p, answer: null, answeredAt: null, cluesUsed: 0 })));

    const q = questions[nextIdx];
    const now = Date.now();
    setTimerStartedAt(now);

    broadcast({
      type: "question",
      data: {
        text: q.message.message,
        options: q.options,
        questionNumber: nextIdx + 1,
        totalQuestions: questions.length,
        isPoll: q.message.message.startsWith("POLL:"),
        timestamp: q.message.date.getTime(),
        timerDuration: TIMER_DURATION,
        timerStartedAt: now,
        clues: q.clues.map((c) => ({ label: c.label, value: c.value })),
      },
    });
  }, [currentQuestionIndex, questions, broadcast]);

  const handleExit = () => {
    peerRef.current?.destroy();
    sessionStorage.removeItem("partyData");
    router.push("/");
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = players.filter((p) => p.answer !== null).length;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/party/play/${roomCode}` : "";

  // Convert players to ScoreBoard format
  const scoreboardPlayers = [...players]
    .sort((a, b) => b.score - a.score)
    .map((p) => ({ name: p.name, score: p.score, streak: p.streak }));

  return (
    <div className="min-h-screen flex flex-col wa-doodle-bg">
      {/* Header */}
      <div className="wa-header-bar sticky top-0 z-40">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <button onClick={handleExit} className="text-wa-text-secondary hover:text-wa-text cursor-pointer transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
          <div className="text-center">
            <p className="text-sm font-bold leading-tight">?מי אמר את זה</p>
            <p className="text-xs text-wa-green">
              {phase === "lobby" && `${players.length} שחקנים`}
              {phase === "playing" && `${answeredCount}/${players.length} ענו`}
              {phase === "reveal" && "תוצאות"}
              {phase === "end" && "סיום"}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {roomCode && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-wa-green/20 text-wa-green font-bold">
                {roomCode}
              </span>
            )}
          </div>
        </div>
        {phase !== "lobby" && phase !== "end" && (
          <div className="h-0.5 bg-wa-border/30">
            <motion.div
              className="h-full bg-wa-green progress-glow"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 md:p-6">
        {error && (
          <div className="bg-wa-danger/10 border border-wa-danger/30 rounded-lg px-4 py-3 text-center text-sm mb-4">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* LOBBY */}
          {phase === "lobby" && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-md mx-auto text-center"
            >
              {/* QR Code */}
              {roomCode && (
                <div className="bg-white rounded-2xl p-6 inline-block mb-6">
                  <QRCodeSVG value={joinUrl} size={200} level="M" />
                </div>
              )}

              {/* Room code */}
              <div className="mb-6">
                <p className="text-wa-text-secondary text-sm mb-2">סרקו את הקוד או הכנסו:</p>
                <p className="text-5xl font-black tracking-[0.3em] text-wa-green">{roomCode}</p>
                <p className="text-wa-text-secondary text-xs mt-2 break-all" dir="ltr">{joinUrl}</p>
              </div>

              {/* Connected players */}
              <div className="bg-wa-panel rounded-xl border border-wa-border/30 overflow-hidden mb-6">
                <div className="px-4 py-3 border-b border-wa-border/20">
                  <p className="text-wa-text-secondary text-xs">{players.length} שחקנים מחוברים</p>
                </div>
                {players.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="flex gap-1.5 justify-center mb-3">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                    <p className="text-wa-text-secondary text-sm">ממתינים לשחקנים...</p>
                  </div>
                ) : (
                  <div className="divide-y divide-wa-border/15">
                    {players.map((p, i) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: ["#00A884", "#53BDEB", "#FF9800", "#E91E63", "#9C27B0", "#3F51B5"][i % 6] }}
                        >
                          {p.name.charAt(0)}
                        </div>
                        <span className="font-bold text-sm">{p.name}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Start button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                disabled={players.length === 0}
                className="w-full bg-wa-green text-white font-bold text-lg py-4 rounded-xl
                  hover:bg-wa-green-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                !התחל משחק
              </motion.button>
            </motion.div>
          )}

          {/* PLAYING */}
          {phase === "playing" && currentQuestion && (
            <motion.div
              key={`playing-${currentQuestionIndex}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="max-w-2xl mx-auto"
            >
              <QuestionCard
                question={currentQuestion}
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={questions.length}
              />

              <CountdownTimer
                duration={TIMER_DURATION}
                startedAt={timerStartedAt}
                onExpire={handleTimerExpire}
              />

              {/* Answer status */}
              <div className="text-center mt-6">
                <p className="text-wa-text-secondary text-sm">
                  {answeredCount}/{players.length} ענו
                </p>
                <div className="flex justify-center gap-2 mt-3 flex-wrap">
                  {players.map((p) => (
                    <span
                      key={p.id}
                      className={`text-xs px-2.5 py-1 rounded-full ${
                        p.answer !== null
                          ? "bg-wa-green/20 text-wa-green"
                          : "bg-wa-input text-wa-text-secondary"
                      }`}
                    >
                      {p.name} {p.answer !== null && "✓"}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* REVEAL */}
          {phase === "reveal" && currentQuestion && (
            <motion.div
              key={`reveal-${currentQuestionIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto text-center"
            >
              {/* Correct answer */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="mb-6"
              >
                <div className="inline-block bg-wa-bubble-out rounded-xl px-8 py-4 shadow-lg relative">
                  <p className="text-xs text-wa-green mb-1 font-bold">:התשובה</p>
                  <p className="text-2xl font-black text-wa-text">{currentQuestion.correctAnswer}</p>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4" style={{ backgroundColor: "#005C4B", clipPath: "polygon(50% 100%, 0 0, 100% 0)" }} />
                </div>
              </motion.div>

              {/* Per-player results */}
              <div className="bg-wa-panel rounded-xl border border-wa-border/30 overflow-hidden mb-6">
                {[...players].sort((a, b) => b.score - a.score).map((p, i) => {
                  const isCorrect = p.answer === currentQuestion.correctAnswer;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex items-center gap-3 px-4 py-3 ${i < players.length - 1 ? "border-b border-wa-border/15" : ""}`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: ["#00A884", "#53BDEB", "#FF9800", "#E91E63", "#9C27B0", "#3F51B5"][i % 6] }}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <span className="font-bold text-sm flex-1">{p.name}</span>
                      <span className={`text-sm font-bold ${isCorrect ? "text-wa-green" : "text-wa-danger"}`}>
                        {isCorrect ? "✓" : "✗"}
                      </span>
                      <span className="text-wa-green font-black text-sm">{p.score}</span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Chat context */}
              <div className="mt-6 mb-6">
                <ChatContext
                  targetMessage={currentQuestion.message}
                  allMessages={allMessages}
                />
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleNext}
                className="bg-wa-green text-white font-bold text-base px-8 py-3 rounded-xl
                  hover:bg-wa-green-dark transition-colors cursor-pointer"
              >
                {currentQuestionIndex < questions.length - 1 ? "שאלה הבאה ←" : "לתוצאות 🏆"}
              </motion.button>
            </motion.div>
          )}

          {/* END */}
          {phase === "end" && (
            <motion.div
              key="end"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-8 max-w-md mx-auto"
            >
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
                <p className="text-wa-text-secondary text-sm">{questions.length} שאלות שוחקו</p>
              </div>

              <ScoreBoard players={scoreboardPlayers} isEndScreen />

              <div className="flex gap-3 justify-center mt-8">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleExit}
                  className="bg-wa-panel text-wa-text font-bold px-6 py-3 rounded-xl
                    hover:bg-wa-input transition-colors cursor-pointer border border-wa-border/30 text-sm"
                >
                  סיום
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
