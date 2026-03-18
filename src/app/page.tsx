"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import FileUpload from "@/components/FileUpload";
import { useGameStore } from "@/lib/game/game-store";
import { parseWhatsAppChat } from "@/lib/parser/whatsapp-parser";
import { filterMessages } from "@/lib/filter/rule-based-filter";
import { smartScoreMessages } from "@/lib/filter/smart-scorer";
import { rankMessagesWithGemini } from "@/lib/gemini/client";
import { generateQuestions } from "@/lib/game/game-logic";

export default function Home() {
  const router = useRouter();
  const { addPlayer, removePlayer, players, initGame } = useGameStore();

  const [file, setFile] = useState<File | null>(null);
  const [playerInput, setPlayerInput] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
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
    if (useAI && !geminiApiKey.trim()) {
      setError("יש להזין מפתח Gemini API כדי להשתמש בסינון חכם");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setLoadingText("...מנתח הודעות");
      const text = await file.text();
      const { participants, messages } = await parseWhatsAppChat(text);

      if (messages.length === 0) {
        throw new Error("לא נמצאו הודעות בקובץ. וודאו שזהו ייצוא שיחה מוואטסאפ.");
      }

      if (participants.length < 2) {
        throw new Error("נמצא רק משתתף אחד. יש צורך בלפחות 2 משתתפים.");
      }

      const filtered = filterMessages(messages);

      setLoadingText(
        useAI
          ? `נמצאו ${messages.length} הודעות, ${filtered.length} עברו סינון. AI בוחר את הטובות...`
          : `נמצאו ${messages.length} הודעות, ${filtered.length} עברו סינון. בוחר באקראי...`
      );

      const ranked = useAI
        ? await rankMessagesWithGemini(filtered, questionCount, geminiApiKey.trim())
        : smartScoreMessages(filtered, messages, questionCount);

      const questions = generateQuestions(ranked, participants, messages);

      initGame(
        questions.map((q) => ({
          ...q,
          message: {
            ...q.message,
            date: q.message.date instanceof Date ? q.message.date : new Date(q.message.date),
          },
        })),
        participants,
        messages,
        {
          filteredMessages: filtered,
          allMessages: messages,
          participants,
          useAI,
          questionCount,
          geminiApiKey: useAI ? geminiApiKey.trim() : undefined,
        }
      );

      router.push("/game");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col wa-doodle-bg">
      {/* WhatsApp-style header */}
      <div className="wa-header-bar sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-wa-green/20 flex items-center justify-center text-lg">
            💬
          </div>
          <div>
            <h1 className="text-3xl font-black leading-tight">?מי אמר את זה</h1>
            <p className="text-wa-text-secondary text-xs">משחק ניחושים לקבוצת וואטסאפ</p>
          </div>
        </div>
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
              className="bg-wa-header rounded-2xl p-6 max-w-md w-full shadow-2xl border border-wa-border"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black">איך מייצאים שיחה?</h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-wa-text-secondary hover:text-wa-text cursor-pointer text-lg"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4 text-wa-text-secondary">
                <div>
                  <p className="font-bold text-wa-text mb-1">iPhone:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>פתחו את הקבוצה בוואטסאפ</li>
                    <li>לחצו על שם הקבוצה למעלה</li>
                    <li>גללו למטה → &quot;ייצוא שיחה&quot;</li>
                    <li>בחרו &quot;ללא מדיה&quot;</li>
                    <li>שמרו את הקובץ</li>
                  </ol>
                </div>
                <div>
                  <p className="font-bold text-wa-text mb-1">Android:</p>
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

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6 py-20"
              >
                {/* WhatsApp typing indicator style */}
                <div className="bg-wa-bubble-in rounded-lg rounded-tr-none px-5 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
                <p className="text-wa-text-secondary text-sm text-center max-w-xs">{loadingText}</p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* File Upload */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <FileUpload onFileSelected={setFile} />
                  </div>
                  <button
                    onClick={() => setShowHelp(true)}
                    className="w-8 h-8 rounded-full bg-wa-input hover:bg-wa-text-secondary/30 text-wa-text-secondary hover:text-wa-text
                      flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="איך מייצאים שיחה?"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                    </svg>
                  </button>
                </div>

                {/* Settings section — styled like WhatsApp settings */}
                <div className="bg-wa-panel rounded-xl overflow-hidden border border-wa-border/30">
                  {/* Question Count */}
                  <div className="px-4 py-4 border-b border-wa-border/20">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold">כמה שאלות?</label>
                      <span
                        dir="ltr"
                        className="text-wa-green font-black text-lg min-w-[2rem] text-center"
                      >
                        {questionCount}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={20}
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* AI Toggle */}
                  <div className="px-4 py-4 flex items-center justify-between border-b border-wa-border/20">
                    <div>
                      <p className="text-sm font-bold">סינון חכם</p>
                      <p className="text-wa-text-secondary text-xs mt-0.5">
                        {useAI ? "AI בוחר הודעות מעניינות" : "בחירה על ידי חוקים (אופליין)"}
                      </p>
                    </div>
                    <button
                      onClick={() => setUseAI(!useAI)}
                      className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
                        useAI ? "bg-wa-green" : "bg-wa-input"
                      }`}
                    >
                      <motion.div
                        animate={{ x: useAI ? -20 : 0 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="absolute top-0.5 right-0.5 w-6 h-6 bg-white rounded-full shadow"
                      />
                    </button>
                  </div>

                  {/* Gemini API Key */}
                  <AnimatePresence>
                    {useAI && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 py-4 border-b border-wa-border/20">
                          <label className="text-sm font-bold mb-2 block">Gemini API Key</label>
                          <input
                            type="password"
                            name="gemini-api-key"
                            autoComplete="on"
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            placeholder="AIza..."
                            dir="ltr"
                            className="w-full bg-wa-input border border-wa-border rounded-lg px-3 py-2 text-wa-text
                              placeholder:text-wa-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-wa-green font-mono text-sm"
                          />
                          <p className="text-wa-text-secondary text-xs mt-1.5">
                            <a
                              href="https://aistudio.google.com/apikey"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-wa-text"
                            >
                              Google AI Studio — קבלו מפתח חינמי
                            </a>
                            {" · "}
                            המפתח נשמר רק בדפדפן
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Players */}
                  <div className="px-4 py-4">
                    <label className="text-sm font-bold mb-2 block">
                      שחקנים <span className="text-wa-text-secondary font-normal">(אופציונלי)</span>
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={playerInput}
                        onChange={(e) => setPlayerInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                        placeholder="שם השחקן/ית"
                        className="flex-1 bg-wa-input border border-wa-border rounded-lg px-3 py-2 text-wa-text text-sm
                          placeholder:text-wa-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-wa-green"
                      />
                      <button
                        onClick={handleAddPlayer}
                        className="bg-wa-green text-white font-bold px-4 py-2 rounded-lg
                          hover:bg-wa-green-dark transition-colors cursor-pointer text-sm"
                      >
                        +
                      </button>
                    </div>
                    {players.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {players.map((p) => (
                          <motion.span
                            key={p.name}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="bg-wa-input text-sm px-2.5 py-1 rounded-full flex items-center gap-1.5"
                          >
                            {p.name}
                            <button
                              onClick={() => removePlayer(p.name)}
                              className="text-wa-text-secondary hover:text-wa-danger cursor-pointer text-xs"
                            >
                              ✕
                            </button>
                          </motion.span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-wa-danger/10 border border-wa-danger/30 rounded-lg px-4 py-3 text-center text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Start Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStart}
                  disabled={!file}
                  className="w-full bg-wa-green text-white font-bold text-lg py-4 rounded-xl
                    hover:bg-wa-green-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed
                    cursor-pointer"
                >
                  !יאללה
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
