# ?מי אמר את זה — Who Said It?

A WhatsApp-themed party game where players guess who sent a message in a WhatsApp group chat.

Upload your WhatsApp chat export and compete to see who really knows the group best.

## Game Modes

### Solo
Play alone on one device. Upload a chat, hit play, and answer questions.

### Party (Kahoot-style)
Host a multiplayer game — everyone answers from their own phone.

1. **Host** uploads a chat and creates a party
2. A **QR code + room code** appears on screen
3. **Players** scan the code from their phones, enter a name, and join the lobby
4. Host starts the game — all players see the same question simultaneously
5. **15-second timer** per question — faster answers earn more points
6. Scoreboard shown after every round

Uses **PeerJS** for peer-to-peer communication. No server, no accounts, no sign-ups.

## How It Works

1. **Upload** a WhatsApp chat export (`.txt` file)
2. **Play** — each round shows a real message styled as a WhatsApp bubble. Guess who sent it
3. **Use clues** — reveal surrounding context, but it costs you points
4. **Score** — earn points for correct answers, bonus for streaks and speed

## Scoring

### Solo
| Action | Points |
|---|---|
| Correct answer | +100 |
| Per clue used | -20 |
| Streak bonus (per consecutive correct) | +25 |
| Wrong answer | 0 (clue cost still applies) |

### Party
| Action | Points |
|---|---|
| Correct answer | +100 |
| Speed bonus (answer quickly) | up to +50 |
| Per clue used | -20 |
| Streak bonus (per consecutive correct) | +25 |
| Wrong answer | 0 (clue cost still applies) |

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
- **PeerJS** for peer-to-peer multiplayer
- **Gemini API** (client-side) for smart message ranking
- **whatsapp-chat-parser** for parsing chat exports

## Features

- Solo and Party (multiplayer) game modes
- Hebrew RTL interface
- WhatsApp dark mode UI (chat bubbles, wallpaper, typing indicator)
- QR code room sharing for party mode
- Speed bonus scoring in party mode
- Poll message rendering
- Chat context shown on answer reveal
- Play again with new questions from the same chat
- Fully client-side — no data leaves your device (party mode sends question text peer-to-peer)
