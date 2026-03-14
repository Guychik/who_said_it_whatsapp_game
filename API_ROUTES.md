# API Routes

The app has two server-side API routes. Neither persists any data — everything is processed in-memory and returned to the client.

## Full Flow

```
Browser (client)
     │
     │  POST /api/parse
     │  Body: FormData with .txt file
     │
     ▼
┌─────────────────────────────────────────┐
│  /api/parse                             │
│                                         │
│  1. Read the uploaded .txt file         │
│  2. Parse with whatsapp-chat-parser     │
│  3. Remove system messages              │
│  4. Remove authors with < 5 messages    │
│  5. Run rule-based filter               │
│     (see FILTERING.md)                  │
│                                         │
│  Returns:                               │
│  • participants: string[]               │
│  • filteredMessages: ParsedMessage[]    │
│  • allMessages: ParsedMessage[]         │
│  • totalMessages: number                │
│  • filteredCount: number                │
└────────────────┬────────────────────────┘
                 │
                 ▼
          Client stores participants,
          filteredMessages, allMessages
                 │
                 │  POST /api/rank
                 │  Body: JSON {
                 │    filteredMessages,
                 │    allMessages,
                 │    participants,
                 │    count,      // number of questions
                 │    useAI       // true = Bedrock, false = smart scorer
                 │  }
                 │
                 ▼
┌─────────────────────────────────────────┐
│  /api/rank                              │
│                                         │
│  1. Re-hydrate date strings → Dates     │
│  2. Rank messages (AI or offline):      │
│     • AI ON → Bedrock Claude Haiku      │
│     • AI OFF → Smart Scorer             │
│  3. Generate game questions:            │
│     • Pick 3 random distractors         │
│     • Shuffle 4 answer options          │
│     • Generate 2 clues per question     │
│                                         │
│  Returns:                               │
│  • questions: GameQuestion[]            │
└─────────────────────────────────────────┘
```

---

## POST `/api/parse`

**File:** `src/app/api/parse/route.ts`

Accepts a WhatsApp chat export file and returns parsed + filtered messages.

### Request

- **Content-Type:** `multipart/form-data`
- **Body:** `file` — a `.txt` WhatsApp chat export

### Processing

1. **Parse** the raw text using `whatsapp-chat-parser` npm package
2. **Remove** system messages (no author or author = "System")
3. **Remove** participants with fewer than 5 messages (ghosts, group name changes)
4. **Filter** messages through the rule-based filter (length, blocklist, media, URLs, etc. — see [FILTERING.md](FILTERING.md))
5. **Return** both filtered and unfiltered messages (unfiltered are needed later for context clues)

### Response

```json
{
  "participants": ["Alice", "Bob", "Charlie"],
  "filteredMessages": [{ "date": "...", "author": "Alice", "message": "...", "index": 0 }],
  "allMessages": [{ "date": "...", "author": "Alice", "message": "...", "index": 0 }],
  "totalMessages": 5432,
  "filteredCount": 812
}
```

### Errors

| Status | When |
|--------|------|
| 400 | No file provided |
| 400 | No messages found in file |
| 400 | Fewer than 2 participants |
| 500 | Parse failure |

---

## POST `/api/rank`

**File:** `src/app/api/rank/route.ts`

Takes filtered messages and returns fully formed game questions.

### Request

- **Content-Type:** `application/json`

```json
{
  "filteredMessages": [...],
  "allMessages": [...],
  "participants": ["Alice", "Bob", "Charlie"],
  "count": 10,
  "useAI": true
}
```

### Processing

#### Step 1: Rank messages

**If `useAI = true`** → `rankMessagesWithBedrock()`
- Samples up to 80 messages (random) if pool is larger
- Sends them to Claude Haiku via AWS Bedrock
- Prompt asks for the "juiciest" messages ranked by interest
- Parses the returned JSON array of indices
- Falls back to smart scorer if Bedrock fails

**If `useAI = false`** → `smartScoreMessages()`
- Scores each message using heuristics (reactions, conversation bursts, emojis, spicy words, etc.)
- See [FILTERING.md](FILTERING.md) for the full scoring breakdown

#### Step 2: Generate questions

For each ranked message, `generateQuestions()` builds a `GameQuestion`:

```
┌──────────────────────────────────────┐
│  GameQuestion                        │
│                                      │
│  message:       the chat message     │
│  correctAnswer: who actually sent it │
│  options:       [4 shuffled names]   │
│  clues:         [                    │
│    { type: "date",                   │
│      label: "תאריך ההודעה",          │
│      value: "15 בדצמבר" },           │
│    { type: "context_before",         │
│      label: "ההודעה שלפני",          │
│      value: "truncated prev msg" }   │
│  ]                                   │
└──────────────────────────────────────┘
```

- **Options:** the correct author + 3 random other participants, shuffled
- **Clue 1 (date):** the month and day the message was sent
- **Clue 2 (context):** the previous message in the conversation (author hidden, max 120 chars)

### Response

```json
{
  "questions": [
    {
      "message": { "date": "...", "author": "Alice", "message": "...", "index": 42 },
      "options": ["Bob", "Alice", "Charlie", "Dana"],
      "correctAnswer": "Alice",
      "clues": [
        { "type": "date", "label": "תאריך ההודעה", "value": "15 בדצמבר" },
        { "type": "context_before", "label": "ההודעה שלפני", "value": "\"...\"" }
      ]
    }
  ]
}
```

### Errors

| Status | When |
|--------|------|
| 400 | Missing required fields |
| 500 | Ranking/question generation failure |

---

## Why two separate routes?

The parse step is **always fast** (pure text processing). The rank step can be **slow** if AI is enabled (Bedrock API call). Splitting them lets the client show participants and stats immediately after upload, then kick off ranking as a second step.
