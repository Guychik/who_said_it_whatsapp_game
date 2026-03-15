"use client";

import { motion } from "framer-motion";
import { Player } from "@/types";

interface ScoreBoardProps {
  players: Player[];
  isEndScreen?: boolean;
}

// WhatsApp-style contact colors
const AVATAR_COLORS = ["#00A884", "#53BDEB", "#FF9800", "#E91E63", "#9C27B0", "#3F51B5"];

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
      className={`${isEndScreen ? "max-w-md" : "max-w-2xl"} mx-auto`}
    >
      {/* Styled like WhatsApp group members list */}
      <div className="bg-wa-panel rounded-xl overflow-hidden border border-wa-border/30">
        {isEndScreen && (
          <div className="px-4 py-3 border-b border-wa-border/20">
            <p className="text-wa-text-secondary text-xs">{sorted.length} משתתפים</p>
          </div>
        )}

        {sorted.map((player, i) => (
          <motion.div
            key={player.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: isEndScreen ? i * 0.15 : 0 }}
            className={`flex items-center gap-3 px-4 py-3 ${
              i < sorted.length - 1 ? "border-b border-wa-border/15" : ""
            }`}
          >
            {/* Avatar with rank */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 relative"
              style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
            >
              {isEndScreen && i === 0 ? "👑" : player.name.charAt(0)}
              {isEndScreen && i < 3 && (
                <span className="absolute -bottom-0.5 -right-0.5 bg-wa-bg text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-wa-border/30 font-black">
                  {i + 1}
                </span>
              )}
            </div>

            {/* Name + streak */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{player.name}</p>
              {player.streak > 1 && (
                <p className="text-wa-yellow text-xs">
                  🔥 רצף של {player.streak}
                </p>
              )}
            </div>

            {/* Score */}
            <div dir="ltr" className="font-black text-wa-green text-lg">
              {player.score}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
