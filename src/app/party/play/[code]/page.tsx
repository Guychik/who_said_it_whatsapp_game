"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { connectToHost, PeerMessage, PartyQuestionData, PartyRevealData, PartyPlayerInfo } from "@/lib/peer/connection";
import AnswerGrid from "@/components/AnswerGrid";
import CountdownTimer from "@/components/CountdownTimer";
import ScoreBoard from "@/components/ScoreBoard";
import type { DataConnection } from "peerjs";

type PlayerPhase = "join" | "lobby" | "playing" | "waiting" | "reveal" | "end";

export default function PartyPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string)?.toUpperCase() || "";

  const [phase, setPhase] = useState<PlayerPhase>("join");
  const [name, setName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<PartyQuestionData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [revealData, setRevealData] = useState<PartyRevealData | null>(null);
  const [scoreboard, setScoreboard] = useState<PartyPlayerInfo[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [revealedClues, setRevealedClues] = useState(0);

  const connRef = useRef<DataConnection | null>(null);
  const peerRef = useRef<{ destroy: () => void } | null>(null);
  const playerIdRef = useRef("");

  const handleJoin = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed || !code) return;

    setError(null);

    const peer = connectToHost(
      code,
      trimmed,
      (conn, id) => {
        connRef.current = conn;
        setPlayerId(id);
        playerIdRef.current = id;
        setPhase("lobby");
      },
      (msg: PeerMessage) => {
        switch (msg.type) {
          case "game-start":
            setPhase("playing");
            break;
          case "question":
            setQuestion(msg.data);
            setSelectedAnswer(null);
            setRevealData(null);
            setRevealedClues(0);
            setPhase("playing");
            break;
          case "reveal":
            setRevealData(msg.data);
            // Update my score from reveal data
            const myResult = msg.data.playerResults[playerIdRef.current];
            if (myResult) {
              setMyScore(myResult.total);
            }
            setPhase("reveal");
            break;
          case "scoreboard":
            setScoreboard(msg.players);
            break;
          case "game-end":
            setScoreboard(msg.players);
            setPhase("end");
            break;
          case "kick":
            setError(msg.reason || "הוסרת מהמשחק");
            setPhase("join");
            break;
        }
      },
      () => {
        setError("החיבור נותק");
        setPhase("join");
      },
      (err) => {
        setError(`שגיאת חיבור: ${err.message}. בדקו את הקוד ונסו שוב.`);
      }
    );

    peerRef.current = peer;
  }, [name, code]);

  useEffect(() => {
    return () => {
      peerRef.current?.destroy();
    };
  }, []);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    setPhase("waiting");

    connRef.current?.send({
      type: "answer",
      playerId: playerIdRef.current,
      answer,
      answeredAt: Date.now(),
      cluesUsed: revealedClues,
    } as PeerMessage);
  };

  const handleTimerExpire = () => {
    if (!selectedAnswer && phase === "playing") {
      setPhase("waiting");
      connRef.current?.send({
        type: "answer",
        playerId: playerIdRef.current,
        answer: "__timeout__",
        answeredAt: Date.now(),
        cluesUsed: revealedClues,
      } as PeerMessage);
    }
  };

  const handleExit = () => {
    peerRef.current?.destroy();
    router.push("/");
  };

  const myRevealResult = revealData?.playerResults[playerIdRef.current];

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
            {phase !== "join" && <p className="text-xs text-wa-green">{name}</p>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full bg-wa-green/20 text-wa-green font-bold">{code}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-wa-danger/10 border border-wa-danger/30 rounded-lg px-4 py-3 text-center text-sm mb-4"
            >
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* JOIN */}
            {phase === "join" && (
              <motion.div
                key="join"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <p className="text-wa-text-secondary text-sm mb-2">מצטרפים למשחק</p>
                  <p className="text-3xl font-black tracking-[0.2em] text-wa-green">{code}</p>
                </div>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  placeholder="מה השם שלך?"
                  className="w-full bg-wa-input border border-wa-border rounded-xl px-4 py-4 text-wa-text text-center text-lg
                    placeholder:text-wa-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-wa-green"
                  autoFocus
                />

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleJoin}
                  disabled={!name.trim()}
                  className="w-full bg-wa-green text-white font-bold text-lg py-4 rounded-xl
                    hover:bg-wa-green-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  !הצטרף
                </motion.button>
              </motion.div>
            )}

            {/* LOBBY */}
            {phase === "lobby" && (
              <motion.div
                key="lobby"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <div className="bg-wa-bubble-in rounded-lg rounded-tr-none px-5 py-3 shadow-sm inline-block mb-6">
                  <div className="flex gap-1.5">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
                <p className="text-wa-text font-bold text-lg mb-2">!{name}, את/ה בפנים</p>
                <p className="text-wa-text-secondary text-sm">...ממתינים שהמארח יתחיל</p>
              </motion.div>
            )}

            {/* PLAYING */}
            {phase === "playing" && question && (
              <motion.div
                key={`playing-${question.questionNumber}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
              >
                {/* Question number */}
                <div className="flex justify-center mb-4">
                  <span className="bg-wa-header/80 text-wa-text-secondary text-[11px] px-3 py-1 rounded-md shadow-sm">
                    שאלה {question.questionNumber} מתוך {question.totalQuestions}
                  </span>
                </div>

                {/* Question text as bubble */}
                <div className="flex justify-end mb-4">
                  <div className="relative max-w-sm">
                    <div className="rounded-lg rounded-tr-none p-4 shadow-md" style={{ backgroundColor: "#005C4B" }}>
                      <p className="text-xs font-bold mb-1.5 text-wa-green">?מי אמר את זה</p>
                      <p className="text-[15px] leading-relaxed text-wa-text">{question.text}</p>
                    </div>
                    <div className="absolute top-0 -right-2 w-3 h-3" style={{ backgroundColor: "#005C4B", clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
                  </div>
                </div>

                <CountdownTimer
                  duration={question.timerDuration}
                  startedAt={question.timerStartedAt}
                  onExpire={handleTimerExpire}
                />

                <div className="mt-4">
                  <AnswerGrid
                    options={question.options}
                    onSelect={handleAnswer}
                    selectedAnswer={selectedAnswer}
                    isRevealed={false}
                  />
                </div>

                {/* Clues */}
                {question.clues.length > 0 && !selectedAnswer && (
                  <div className="mt-4 max-w-md mx-auto">
                    {revealedClues < question.clues.length ? (
                      <button
                        onClick={() => setRevealedClues((prev) => prev + 1)}
                        className="bg-wa-green text-white font-bold px-4 py-2 rounded-lg text-sm
                          hover:bg-wa-green-dark transition-colors cursor-pointer shadow-md w-full"
                      >
                        גלה רמז (-20 נק׳)
                      </button>
                    ) : (
                      <span className="text-wa-text-secondary text-sm block text-center">אין עוד רמזים</span>
                    )}
                    {question.clues.slice(0, revealedClues).map((clue, i) => (
                      <div
                        key={i}
                        className="mt-2 bg-wa-panel rounded-lg p-3 flex items-start gap-3 border border-wa-border/50"
                      >
                        <span className="text-wa-green font-bold text-sm shrink-0">{clue.label}:</span>
                        <span className="text-wa-text text-sm">{clue.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* WAITING for others */}
            {phase === "waiting" && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <div className="bg-wa-bubble-in rounded-lg rounded-tr-none px-5 py-3 shadow-sm inline-block mb-6">
                  <div className="flex gap-1.5">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
                <p className="text-wa-text font-bold">!נבחר</p>
                <p className="text-wa-text-secondary text-sm">...ממתינים לשאר השחקנים</p>
              </motion.div>
            )}

            {/* REVEAL */}
            {phase === "reveal" && revealData && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                {/* Correct answer */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12 }}
                  className="mb-6"
                >
                  <div className="inline-block bg-wa-bubble-out rounded-xl px-8 py-4 shadow-lg">
                    <p className="text-xs text-wa-green mb-1 font-bold">:התשובה</p>
                    <p className="text-2xl font-black text-wa-text">{revealData.correctAnswer}</p>
                  </div>
                </motion.div>

                {/* My result */}
                {myRevealResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6"
                  >
                    {myRevealResult.isCorrect ? (
                      <div className="inline-flex items-center gap-2 text-sm font-bold flex-wrap justify-center">
                        <span className="bg-wa-green/15 text-wa-green px-4 py-2 rounded-full">תשובה נכונה +100</span>
                        {myRevealResult.speedBonus > 0 && (
                          <span className="bg-wa-yellow/15 text-wa-yellow px-3 py-2 rounded-full">⚡ +{myRevealResult.speedBonus}</span>
                        )}
                        {myRevealResult.cluePenalty > 0 && (
                          <span className="bg-wa-danger/15 text-wa-danger px-3 py-2 rounded-full">רמז -{myRevealResult.cluePenalty}</span>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-sm font-bold flex-wrap justify-center">
                        <span className="bg-wa-danger/15 text-wa-danger px-4 py-2 rounded-full">תשובה שגויה</span>
                        {myRevealResult.cluePenalty > 0 && (
                          <span className="bg-wa-danger/15 text-wa-danger px-3 py-2 rounded-full">רמז -{myRevealResult.cluePenalty}</span>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Score */}
                <p className="text-wa-text-secondary text-sm mb-4">הניקוד שלך: <span className="text-wa-green font-black">{myScore}</span></p>

                {/* Mini scoreboard */}
                {scoreboard.length > 0 && (
                  <ScoreBoard
                    players={scoreboard.map((p) => ({ name: p.name, score: p.score, streak: p.streak }))}
                  />
                )}
              </motion.div>
            )}

            {/* END */}
            {phase === "end" && (
              <motion.div
                key="end"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center pt-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10 }}
                  className="w-20 h-20 rounded-full bg-wa-green/20 mx-auto mb-4 flex items-center justify-center text-4xl"
                >
                  🏆
                </motion.div>
                <h1 className="text-2xl font-black mb-1">!המשחק נגמר</h1>
                <p className="text-wa-text-secondary text-sm mb-6">הניקוד שלך: <span className="text-wa-green font-black text-lg">{myScore}</span></p>

                {scoreboard.length > 0 && (
                  <ScoreBoard
                    players={scoreboard.map((p) => ({ name: p.name, score: p.score, streak: p.streak }))}
                    isEndScreen
                  />
                )}

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleExit}
                  className="mt-8 bg-wa-panel text-wa-text font-bold px-6 py-3 rounded-xl
                    hover:bg-wa-input transition-colors cursor-pointer border border-wa-border/30 text-sm"
                >
                  סיום
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
