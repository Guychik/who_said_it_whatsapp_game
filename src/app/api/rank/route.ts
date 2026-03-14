import { NextRequest, NextResponse } from "next/server";
import { ParsedMessage } from "@/types";
import { rankMessagesWithBedrock } from "@/lib/filter/bedrock-ranker";
import { smartScoreMessages } from "@/lib/filter/smart-scorer";
import { generateQuestions } from "@/lib/game/game-logic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      filteredMessages,
      allMessages,
      participants,
      count = 10,
      useAI = true,
    } = body as {
      filteredMessages: (ParsedMessage & { date: string })[];
      allMessages: (ParsedMessage & { date: string })[];
      participants: string[];
      count?: number;
      useAI?: boolean;
    };

    if (!filteredMessages || !allMessages || !participants) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Re-hydrate dates
    const hydratedFiltered: ParsedMessage[] = filteredMessages.map((m) => ({
      ...m,
      date: new Date(m.date),
    }));
    const hydratedAll: ParsedMessage[] = allMessages.map((m) => ({
      ...m,
      date: new Date(m.date),
    }));

    // Rank with Bedrock or random
    const ranked = useAI
      ? await rankMessagesWithBedrock(hydratedFiltered, count)
      : smartScoreMessages(hydratedFiltered, hydratedAll, count);

    // Generate full questions with options and clues
    const questions = generateQuestions(ranked, participants, hydratedAll);

    return NextResponse.json({
      questions: questions.map((q) => ({
        ...q,
        message: {
          ...q.message,
          date: q.message.date.toISOString(),
        },
      })),
    });
  } catch (error) {
    console.error("Rank error:", error);
    return NextResponse.json(
      { error: "שגיאה בדירוג ההודעות" },
      { status: 500 }
    );
  }
}
