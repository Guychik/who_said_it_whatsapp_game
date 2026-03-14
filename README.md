# Who Said It? (מי אמר את זה?)

A Kahoot-style party game where players guess who sent a message in a WhatsApp group chat.

Upload your WhatsApp chat export, add player names, and compete to see who really knows the group best.

## How It Works

1. **Upload** a WhatsApp chat export (`.txt` file)
2. **Configure** the number of questions and add player names
3. **Play** — each round shows a real message from the chat. Guess who sent it from 4 options
4. **Use clues** — reveal the date or surrounding context, but it costs you points
5. **Score** — earn points for correct answers, bonus for streaks, penalty for clues

## Scoring

| Action | Points |
|---|---|
| Correct answer | +100 |
| Per clue used | -20 |
| Streak bonus (per consecutive correct) | +25 |
| Wrong answer | 0 |

## Smart Filtering

Toggle AI-powered message selection (via AWS Bedrock) to pick the most interesting and guessable messages, or use offline mode for random selection.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env.local` file:

```
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

AWS credentials are read from your terminal environment. Smart filtering works without AWS — it falls back to offline mode automatically.

## Tech Stack

- **Next.js 16** with App Router
- **React 19** + **TypeScript**
- **Tailwind CSS 4** + **Framer Motion**
- **Zustand** for state management
- **AWS Bedrock** (Claude) for smart message ranking
- **whatsapp-chat-parser** for parsing chat exports
