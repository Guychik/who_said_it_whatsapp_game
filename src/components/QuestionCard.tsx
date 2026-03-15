"use client";

import { motion } from "framer-motion";
import { GameQuestion } from "@/types";

interface QuestionCardProps {
  question: GameQuestion;
  questionNumber: number;
  totalQuestions: number;
}

interface ParsedPoll {
  question: string;
  options: { text: string; votes: number }[];
}

function parsePoll(text: string): ParsedPoll | null {
  const pollMatch = text.match(/^POLL:\s*\n?([\s\S]*)/);
  if (!pollMatch) return null;

  const lines = pollMatch[1].split("\n").filter((l) => l.trim());
  if (lines.length < 2) return null;

  const question = lines[0].trim();
  const options: { text: string; votes: number }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const optMatch = lines[i].match(/^OPTION:\s*(.+?)(?:\s*\((\d+)\s*vote)?/i);
    if (optMatch) {
      options.push({
        text: optMatch[1].trim(),
        votes: parseInt(optMatch[2] || "0"),
      });
    }
  }

  return options.length > 0 ? { question, options } : null;
}

function PollBubble({ poll }: { poll: ParsedPoll }) {
  const maxVotes = Math.max(...poll.options.map((o) => o.votes), 1);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <p className="text-lg font-bold text-wa-text">
          {poll.question}
        </p>
      </div>

      <div className="space-y-2">
        {poll.options.map((opt, i) => (
          <div key={i} className="rounded-lg overflow-hidden bg-wa-input/50">
            <div className="relative px-3 py-2">
              <div
                className="absolute inset-y-0 right-0 rounded-lg"
                style={{
                  backgroundColor: "#00A884",
                  opacity: 0.2,
                  width: `${Math.max((opt.votes / maxVotes) * 100, 0)}%`,
                }}
              />
              <div className="relative flex items-center justify-between">
                <span className="text-sm text-wa-text">
                  {opt.text}
                </span>
                {opt.votes > 0 && (
                  <span className="text-xs font-bold mr-2 text-wa-text-secondary">
                    {opt.votes}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
}: QuestionCardProps) {
  const date = new Date(question.message.date);
  const time = date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const year = date.getFullYear();
  const poll = parsePoll(question.message.message);

  return (
    <div className="max-w-2xl mx-auto">
      {/* WhatsApp date chip */}
      <div className="flex justify-center mb-4">
        <span
          dir="ltr"
          className="bg-wa-header/80 text-wa-text-secondary text-[11px] px-3 py-1 rounded-md shadow-sm"
        >
          שאלה {questionNumber} מתוך {totalQuestions}
        </span>
      </div>

      {/* Message bubble — floats right like outgoing */}
      <motion.div
        key={questionNumber}
        initial={{ opacity: 0, y: -15, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15 }}
        transition={{ type: "spring", damping: 22, stiffness: 200 }}
        className="flex justify-end"
      >
        <div className="relative max-w-sm">
          <div
            className="relative rounded-lg rounded-tr-none p-4 shadow-md"
            style={{ backgroundColor: "#005C4B" }}
          >
            {/* Author placeholder */}
            <p className="text-xs font-bold mb-1.5 text-wa-green">
              ?מי אמר את זה
            </p>

            {/* Message content */}
            {poll ? (
              <PollBubble poll={poll} />
            ) : (
              <p className="text-[15px] leading-relaxed text-wa-text">
                {question.message.message}
              </p>
            )}

            {/* Timestamp + read receipts */}
            <div className="flex items-center justify-end gap-1 mt-1.5">
              <span className="text-[10px] text-wa-text-secondary/60">
                {year} · {time}
              </span>
              <svg
                width="16"
                height="11"
                viewBox="0 0 16 11"
                fill="none"
                style={{ color: "#53BDEB" }}
              >
                <path
                  d="M11.071 0.653L4.857 6.867L2.929 4.939L1.515 6.353L4.857 9.696L12.485 2.067L11.071 0.653Z"
                  fill="currentColor"
                />
                <path
                  d="M14.071 0.653L7.857 6.867L7.15 6.16L5.736 7.574L7.857 9.696L15.485 2.067L14.071 0.653Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>

          {/* Bubble tail */}
          <div
            className="absolute top-0 -right-2 w-3 h-3"
            style={{
              backgroundColor: "#005C4B",
              clipPath: "polygon(0 0, 100% 0, 0 100%)",
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
