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
  { bg: "bg-[#E13F3F]", hover: "hover:bg-[#C53030]", shape: "▲" },
  { bg: "bg-[#3B82F6]", hover: "hover:bg-[#2563EB]", shape: "◆" },
  { bg: "bg-[#F59E0B]", hover: "hover:bg-[#D97706]", shape: "●" },
  { bg: "bg-[#10B981]", hover: "hover:bg-[#059669]", shape: "■" },
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
            extraClasses = "ring-4 ring-wa-green scale-105";
          } else {
            extraClasses = "opacity-40 scale-95";
          }
        } else if (isSelected) {
          extraClasses = "ring-4 ring-wa-green";
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
              text-wa-text font-bold text-xl p-6 rounded-xl transition-all duration-300
              flex items-center gap-3 justify-center cursor-pointer
              disabled:cursor-default shadow-lg border border-wa-border/30`}
          >
            <span className="text-2xl opacity-60">{color.shape}</span>
            <span>{option}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
