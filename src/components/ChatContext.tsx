"use client";

import { motion } from "framer-motion";
import { ParsedMessage } from "@/types";

interface ChatContextProps {
  /** The message that was the question */
  targetMessage: ParsedMessage;
  /** All messages in the chat */
  allMessages: ParsedMessage[];
  /** How many messages to show before/after */
  radius?: number;
}

// Stable color palette for participant names
const NAME_COLORS = [
  "#075E54", "#E91E63", "#9C27B0", "#3F51B5",
  "#00BCD4", "#FF9800", "#795548", "#607D8B",
  "#E65100", "#1B5E20", "#4A148C", "#B71C1C",
];

function getNameColor(name: string, allNames: string[]): string {
  const idx = allNames.indexOf(name);
  return NAME_COLORS[idx >= 0 ? idx % NAME_COLORS.length : 0];
}

export default function ChatContext({
  targetMessage,
  allMessages,
  radius = 3,
}: ChatContextProps) {
  const msgIdx = allMessages.findIndex((m) => m.index === targetMessage.index);
  if (msgIdx < 0) return null;

  const start = Math.max(0, msgIdx - radius);
  const end = Math.min(allMessages.length, msgIdx + radius + 1);
  const slice = allMessages.slice(start, end);

  const allNames = [...new Set(allMessages.map((m) => m.author))];
  const sourceAuthor = targetMessage.author;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="max-w-md mx-auto w-full"
    >
      <p className="text-white/50 text-xs text-center mb-2">ההקשר המלא</p>
      <div
        className="rounded-2xl p-4 space-y-1.5 shadow-lg"
        style={{
          background: "#ECE5DD",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      >
        {slice.map((msg) => {
          const isTarget = msg.index === targetMessage.index;
          const isSource = msg.author === sourceAuthor;
          const time = new Date(msg.date).toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={msg.index}
              className={`flex ${isSource ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative rounded-lg px-3 py-2 max-w-[80%] shadow-sm ${
                  isTarget ? "ring-2 ring-kahoot-yellow" : ""
                }`}
                style={{
                  backgroundColor: isSource ? "#DCF8C6" : "#FFFFFF",
                }}
              >
                {/* Author name */}
                <p
                  className="text-xs font-bold mb-0.5"
                  style={{ color: getNameColor(msg.author, allNames) }}
                >
                  {msg.author}
                </p>

                {/* Message text */}
                <p className="text-sm leading-snug" style={{ color: "#303030" }}>
                  {msg.message.length > 150
                    ? msg.message.slice(0, 150) + "..."
                    : msg.message}
                </p>

                {/* Timestamp */}
                <p
                  className={`mt-0.5 ${isSource ? "text-right" : "text-left"}`}
                  style={{ color: "#8E8E8E", fontSize: "10px" }}
                >
                  {time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
