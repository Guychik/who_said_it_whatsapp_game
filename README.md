# ?מי אמר את זה — Who Said It?

A WhatsApp-themed party game where players guess who sent a message in a WhatsApp group chat.

Upload your WhatsApp chat export, add player names, and compete to see who really knows the group best.

## How It Works

1. **Upload** a WhatsApp chat export (`.txt` file) — everything stays on your device
2. **Configure** the number of questions and add player names
3. **Play** — each round shows a real message from the chat, styled as a WhatsApp bubble. Guess who sent it from 4 options
4. **Use clues** — reveal the date or surrounding context, but it costs you points
5. **Score** — earn points for correct answers, bonus for streaks, penalty for clues

## Scoring

| Action | Points |
|---|---|
| Correct answer | +100 |
| Per clue used | -20 |
| Streak bonus (per consecutive correct) | +25 |
| Wrong answer | 0 |

## Message Selection

Two modes for picking interesting messages:

- **Gemini AI** — paste your Gemini API key in the UI and the app ranks messages client-side by how funny/interesting they are
- **Rule-based (offline)** — heuristic scoring based on reactions, laughs in replies, emojis, spicy words, conversation bursts, and more

Both modes apply rule-based filtering first (length, blocklist, media, URLs, forwarded, emoji-only, etc). See [FILTERING.md](FILTERING.md) for the full pipeline.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No server-side configuration or environment variables needed — everything runs in the browser.

## Tech Stack

- **Next.js 16** with App Router
- **React 19** + **TypeScript**
- **Tailwind CSS 4** + **Framer Motion**
- **Zustand** for state management
- **Gemini API** (client-side) for smart message ranking
- **whatsapp-chat-parser** for parsing chat exports

## Features

- Hebrew RTL interface
- WhatsApp dark mode UI (chat bubbles, wallpaper, typing indicator)
- Poll message rendering
- Chat context shown on answer reveal
- Play again with new questions from the same chat
- Fully client-side — no data leaves your device
