"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clue } from "@/types";

interface CluePanelProps {
  clues: Clue[];
  revealedCount: number;
  onRevealClue: () => void;
  disabled: boolean;
}

export default function CluePanel({
  clues,
  revealedCount,
  onRevealClue,
  disabled,
}: CluePanelProps) {
  const hasMoreClues = revealedCount < clues.length;

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="flex items-center justify-between mb-3">
        <div />
        {hasMoreClues && !disabled && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRevealClue}
            className="bg-kahoot-orange text-white font-bold px-4 py-2 rounded-lg text-sm
              hover:bg-kahoot-orange/80 transition-colors cursor-pointer shadow-md"
          >
            גלה רמז (-20 נק׳)
          </motion.button>
        )}
        {!hasMoreClues && (
          <span className="text-white/40 text-sm">אין עוד רמזים</span>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {clues.slice(0, revealedCount).map((clue, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex items-start gap-3"
            >
              <span className="text-kahoot-yellow font-bold text-sm shrink-0">
                {clue.label}:
              </span>
              <span className="text-white">{clue.value}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
