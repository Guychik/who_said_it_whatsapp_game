# Filtering Pipeline

## Shared Stage: Rule-Based Filter
Both AI and non-AI paths go through this first.

```
WhatsApp .txt file
       │
       ▼
┌─────────────────────────────┐
│  WhatsApp Parser            │
│  (whatsapp-chat-parser npm) │
│  • Parse messages & authors │
│  • Remove system messages   │
│  • Remove authors with < 5  │
│    messages (group name,    │
│    ghost members)           │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Clean Messages                 │
│  • Strip <This message was      │
│    edited> tags                  │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Rule-Based Filter              │
│                                 │
│  REMOVE if:                     │
│  • < 20 chars or > 500 chars    │
│  • In blocklist (lol, ok, חחח,  │
│    סבבה, בסדר, single emojis…)  │
│  • Contains <Media omitted> /   │
│    <מדיה לא נכללה>              │
│  • Contains URL                 │
│  • Starts with "Forwarded"      │
│  • Emoji-only message           │
│  • Repeated single char         │
│    (חחחחחחח, ההההההה)            │
│  • Location message             │
│                                 │
│  KEEP polls — rendered as a     │
│  WhatsApp-style poll card in UI │
│                                 │
│  THEN cap each participant      │
│  at 30% of remaining messages   │
└─────────────┬───────────────────┘
              │
              ▼
       Filtered Messages
              │
     ┌────────┴────────┐
     │                  │
  AI ON              AI OFF
     │                  │
     ▼                  ▼
```

## Path A: AI On (Bedrock)

```
Filtered Messages
       │
       ▼
┌──────────────────────────────┐
│  Sample (if > 80 messages,   │
│  randomly pick 80)           │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│  Bedrock Claude (Haiku)      │
│                              │
│  Prompt asks to pick top N   │
│  PRIORITIZING:               │
│  • Outrageous / unhinged     │
│  • Personal confessions      │
│  • Hot takes / drama         │
│  • Personality-dripping      │
│  • Inside jokes              │
│                              │
│  AVOIDING:                   │
│  • Generic messages          │
│  • Logistics / planning      │
│  • Plain questions           │
│  • News / forwards           │
│                              │
│  Returns: JSON array of      │
│  indices, ranked by interest │
│  Fallback: smart scorer if   │
│  Bedrock fails               │
└─────────────┬────────────────┘
              │
              ▼
        Game Questions
```

## Path B: AI Off (Smart Scorer)

```
Filtered Messages + All Messages
       │
       ▼
┌───────────────────────────────────┐
│  Smart Scorer                     │
│                                   │
│  Scores each message by:         │
│                                   │
│  +30  Next message is a reaction  │
│       (חחח, 😂, 🤣, lol, etc.)   │
│  +15  Next message contains       │
│       חח/😂/🤣/💀 anywhere        │
│  +10  2nd reply also has laughs   │
│  +20  Sparked conversation burst  │
│       (3+ replies within 5 min)   │
│  +5   Per emoji (max 15)         │
│  +5   Per exclamation ! (max 15)  │
│  +10  Per spicy word (max 20)     │
│       (שונא, אוהב, הכי, מטורף,   │
│        אני מת, בחיים לא, wtf…)    │
│  +10  Has 2+ rare words (words    │
│       appearing ≤ 2x in chat)     │
│  +5   Length 30-150 chars         │
│  -5   Contains question mark      │
│  +20  Reply to a voice message    │
│       (audio/ptt omitted before)  │
│                                   │
│  Sort by score, take top N        │
└─────────────┬─────────────────────┘
              │
              ▼
        Game Questions
```

## Clues (both paths, same logic)

```
Clue 1: Date (month + day)
Clue 2: Prior message in the conversation
         (text only, author hidden)
```
