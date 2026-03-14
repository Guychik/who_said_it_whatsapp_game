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
  // WhatsApp poll format: "POLL:\nquestion\nOPTION: text (X vote(s))\n..."
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
      {/* Poll icon + question */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <p className="text-lg font-bold" style={{ color: "#303030" }}>
          {poll.question}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((opt, i) => (
          <div key={i} className="rounded-lg overflow-hidden" style={{ backgroundColor: "#f0f0f0" }}>
            <div className="relative px-3 py-2">
              {/* Vote bar */}
              <div
                className="absolute inset-y-0 right-0 rounded-lg"
                style={{
                  backgroundColor: "#25D366",
                  opacity: 0.2,
                  width: `${Math.max((opt.votes / maxVotes) * 100, 0)}%`,
                }}
              />
              <div className="relative flex items-center justify-between">
                <span className="text-sm" style={{ color: "#303030" }}>
                  {opt.text}
                </span>
                {opt.votes > 0 && (
                  <span className="text-xs font-bold mr-2" style={{ color: "#667781" }}>
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
      {/* Question counter */}
      <div className="flex justify-center mb-4">
        <span
          dir="ltr"
          className="bg-white/15 backdrop-blur-sm text-white text-sm font-bold px-4 py-1.5 rounded-full"
        >
          {questionNumber} / {totalQuestions}
        </span>
      </div>

      {/* WhatsApp chat background */}
      <motion.div
        key={questionNumber}
        initial={{ opacity: 0, y: -20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        className="rounded-2xl p-6 shadow-2xl"
        style={{
          background: "#ECE5DD",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      >
        {/* Message bubble */}
        <div className="relative max-w-md mx-auto">
          <div
            className="relative rounded-lg p-4 shadow-sm"
            style={{ backgroundColor: "#DCF8C6" }}
          >
            {/* Bubble tail */}
            <div
              className="absolute -top-0 -right-2 w-4 h-4"
              style={{
                backgroundColor: "#DCF8C6",
                clipPath: "polygon(0 0, 100% 0, 0 100%)",
              }}
            />

            {/* Author placeholder */}
            <p className="text-sm font-bold mb-1" style={{ color: "#075E54" }}>
              ?מי אמר את זה
            </p>

            {/* Message content — poll or regular */}
            {poll ? (
              <PollBubble poll={poll} />
            ) : (
              <p
                className="text-lg leading-relaxed"
                style={{ color: "#303030" }}
              >
                {question.message.message}
              </p>
            )}

            {/* Timestamp + year */}
            <div className="flex items-center justify-end gap-1.5 mt-1">
              <span className="text-xs" style={{ color: "#8E8E8E" }}>
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
        </div>
      </motion.div>
    </div>
  );
}
