"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import FileUpload from "@/components/FileUpload";
import { useGameStore } from "@/lib/game/game-store";

export default function Home() {
  const router = useRouter();
  const { addPlayer, removePlayer, players, initGame } = useGameStore();

  const [file, setFile] = useState<File | null>(null);
  const [playerInput, setPlayerInput] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [useAI, setUseAI] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleAddPlayer = () => {
    const name = playerInput.trim();
    if (name && !players.find((p) => p.name === name)) {
      addPlayer(name);
      setPlayerInput("");
    }
  };

  const handleStart = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Parse
      setLoadingText("...מנתח הודעות");
      const formData = new FormData();
      formData.append("file", file);

      const parseRes = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });
      const parseData = await parseRes.json();

      if (!parseRes.ok) {
        throw new Error(parseData.error || "שגיאה בניתוח הקובץ");
      }

      setLoadingText(
        useAI
          ? `נמצאו ${parseData.totalMessages} הודעות, ${parseData.filteredCount} עברו סינון. AI בוחר את הטובות...`
          : `נמצאו ${parseData.totalMessages} הודעות, ${parseData.filteredCount} עברו סינון. בוחר באקראי...`
      );

      // Step 2: Rank (with AI or random)
      const rankRes = await fetch("/api/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filteredMessages: parseData.filteredMessages,
          allMessages: parseData.allMessages,
          participants: parseData.participants,
          count: questionCount,
          useAI,
        }),
      });
      const rankData = await rankRes.json();

      if (!rankRes.ok) {
        throw new Error(rankData.error || "שגיאה בדירוג ההודעות");
      }

      // Initialize game with chat data for replay
      initGame(
        rankData.questions,
        parseData.participants,
        parseData.allMessages.map(
          (m: { date: string; author: string; message: string; index: number }) => ({
            ...m,
            date: new Date(m.date),
          })
        ),
        {
          filteredMessages: parseData.filteredMessages,
          allMessages: parseData.allMessages,
          participants: parseData.participants,
          useAI,
          questionCount,
        }
      );

      router.push("/game");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 12 }}
        className="w-full max-w-xl"
      >
        {/* Title */}
        <motion.h1
          className="text-6xl font-black text-center mb-2"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        >
          ?מי אמר את זה
        </motion.h1>
        <div className="flex items-center justify-center gap-2 mb-10">
          <p className="text-center text-white/60 text-lg">
            משחק הניחושים של קבוצת הוואטסאפ 💬
          </p>
          <button
            onClick={() => setShowHelp(true)}
            className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 text-white/70 hover:text-white
              text-xs font-bold flex items-center justify-center cursor-pointer transition-colors shrink-0"
            title="איך מייצאים שיחה מוואטסאפ?"
          >
            i
          </button>
        </div>

        {/* Help modal */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowHelp(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-kahoot-purple-light rounded-2xl p-6 max-w-md w-full shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black">איך מייצאים שיחה?</h3>
                  <button
                    onClick={() => setShowHelp(false)}
                    className="text-white/60 hover:text-white cursor-pointer text-lg"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-4 text-white/80">
                  <div>
                    <p className="font-bold text-white mb-1">iPhone:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>פתחו את הקבוצה בוואטסאפ</li>
                      <li>לחצו על שם הקבוצה למעלה</li>
                      <li>גללו למטה → &quot;ייצוא שיחה&quot;</li>
                      <li>בחרו &quot;ללא מדיה&quot;</li>
                      <li>שמרו את הקובץ</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-bold text-white mb-1">Android:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>פתחו את הקבוצה בוואטסאפ</li>
                      <li>לחצו על ⋮ (שלוש נקודות) → עוד → ייצוא שיחה</li>
                      <li>בחרו &quot;ללא מדיה&quot;</li>
                      <li>שמרו את הקובץ</li>
                    </ol>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="text-6xl mb-6 inline-block"
              >
                🎯
              </motion.div>
              <p className="text-xl font-bold">{loadingText}</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* File Upload */}
              <FileUpload onFileSelected={setFile} />

              {/* Question Count */}
              <div>
                <label className="block text-lg font-bold mb-2">
                  כמה שאלות?
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={5}
                    max={20}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="flex-1 accent-kahoot-yellow"
                  />
                  <span
                    dir="ltr"
                    className="bg-white/10 px-4 py-2 rounded-lg font-bold text-xl min-w-[3rem] text-center"
                  >
                    {questionCount}
                  </span>
                </div>
              </div>

              {/* AI Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-lg font-bold">
                    סינון חכם
                  </label>
                  <p className="text-white/40 text-sm">
                    {useAI ? "AI בוחר הודעות מעניינות" : "בחירה על ידי חוקים (אופליין)"}
                  </p>
                </div>
                <button
                  onClick={() => setUseAI(!useAI)}
                  className={`relative w-14 h-8 rounded-full transition-colors cursor-pointer ${
                    useAI ? "bg-kahoot-green" : "bg-white/20"
                  }`}
                >
                  <motion.div
                    animate={{ x: useAI ? -24 : 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full shadow"
                  />
                </button>
              </div>

              {/* Players */}
              <div>
                <label className="block text-lg font-bold mb-2">
                  שחקנים (אופציונלי - למעקב ניקוד)
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                    placeholder="שם השחקן/ית"
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white
                      placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-kahoot-yellow"
                  />
                  <button
                    onClick={handleAddPlayer}
                    className="bg-kahoot-green text-white font-bold px-6 py-3 rounded-lg
                      hover:bg-kahoot-green/80 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {players.map((p) => (
                    <motion.span
                      key={p.name}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-2"
                    >
                      {p.name}
                      <button
                        onClick={() => removePlayer(p.name)}
                        className="text-white/60 hover:text-white cursor-pointer"
                      >
                        ✕
                      </button>
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-kahoot-red/20 border border-kahoot-red/40 rounded-lg p-4 text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* Start Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStart}
                disabled={!file}
                className="w-full bg-kahoot-yellow text-kahoot-purple-dark font-black text-2xl py-5 rounded-xl
                  hover:bg-kahoot-yellow/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed
                  cursor-pointer shadow-xl"
              >
                !יאללה
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
