"use client";

import { motion } from "framer-motion";

interface AnswerGridProps {
  options: string[];
  onSelect: (answer: string) => void;
  selectedAnswer: string | null;
  correctAnswer?: string | null;
  isRevealed: boolean;
}

const COLORS = [
  { bg: "bg-kahoot-red", hover: "hover:bg-kahoot-red/80", shape: "▲" },
  { bg: "bg-kahoot-blue", hover: "hover:bg-kahoot-blue/80", shape: "◆" },
  { bg: "bg-kahoot-green", hover: "hover:bg-kahoot-green/80", shape: "●" },
  { bg: "bg-kahoot-yellow", hover: "hover:bg-kahoot-yellow/80", shape: "■" },
];

export default function AnswerGrid({
  options,
  onSelect,
  selectedAnswer,
  correctAnswer,
  isRevealed,
}: AnswerGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto mt-6">
      {options.map((option, i) => {
        const color = COLORS[i % COLORS.length];
        const isSelected = selectedAnswer === option;
        const isCorrect = correctAnswer === option;

        let extraClasses = "";
        if (isRevealed) {
          if (isCorrect) {
            extraClasses = "ring-4 ring-white scale-105";
          } else {
            extraClasses = "opacity-40 scale-95";
          }
        } else if (isSelected) {
          extraClasses = "ring-4 ring-white";
        }

        return (
          <motion.button
            key={option}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, type: "spring", damping: 15 }}
            onClick={() => !isRevealed && !selectedAnswer && onSelect(option)}
            disabled={isRevealed || !!selectedAnswer}
            className={`${color.bg} ${!isRevealed && !selectedAnswer ? color.hover : ""} ${extraClasses}
              text-white font-bold text-xl p-6 rounded-xl transition-all duration-300
              flex items-center gap-3 justify-center cursor-pointer
              disabled:cursor-default shadow-lg`}
          >
            <span className="text-2xl opacity-60">{color.shape}</span>
            <span>{option}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
