"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
  duration: number; // total seconds
  startedAt: number; // Date.now() when timer started
  onExpire?: () => void;
}

export default function CountdownTimer({ duration, startedAt, onExpire }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [duration, startedAt, onExpire]);

  const progress = remaining / duration;
  const isUrgent = remaining <= 5;

  return (
    <div className="w-full max-w-2xl mx-auto mt-4">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-bold tabular-nums ${isUrgent ? "text-wa-danger" : "text-wa-text-secondary"}`}>
          {Math.ceil(remaining)}
        </span>
      </div>
      <div className="h-1.5 bg-wa-border/30 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isUrgent ? "bg-wa-danger" : "bg-wa-green"}`}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
      </div>
    </div>
  );
}
