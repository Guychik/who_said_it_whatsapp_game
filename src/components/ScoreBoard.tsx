"use client";

import { motion } from "framer-motion";
import { Player } from "@/types";

interface ScoreBoardProps {
  players: Player[];
  isEndScreen?: boolean;
}

export default function ScoreBoard({
  players,
  isEndScreen = false,
}: ScoreBoardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  if (players.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${isEndScreen ? "max-w-lg" : "max-w-2xl"} mx-auto mt-6`}
    >
      {isEndScreen && (
        <h2 className="text-4xl font-black text-center mb-8">🏆 תוצאות</h2>
      )}

      <div className="space-y-3">
        {sorted.map((player, i) => (
          <motion.div
            key={player.name}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: isEndScreen ? i * 0.2 : 0 }}
            className={`flex items-center justify-between p-4 rounded-xl ${
              isEndScreen && i === 0
                ? "bg-wa-green/20 ring-2 ring-wa-green"
                : "bg-wa-panel border border-wa-border/50"
            }`}
          >
            <div className="flex items-center gap-3">
              {isEndScreen && (
                <span className="text-2xl">
                  {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </span>
              )}
              <span className="font-bold text-lg">{player.name}</span>
              {player.streak > 1 && (
                <span className="text-wa-yellow text-sm">
                  🔥 {player.streak}
                </span>
              )}
            </div>
            <div dir="ltr" className="font-black text-xl text-wa-green">
              {player.score}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
