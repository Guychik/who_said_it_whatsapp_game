import { NextRequest, NextResponse } from "next/server";
import { parseWhatsAppChat } from "@/lib/parser/whatsapp-parser";
import { filterMessages } from "@/lib/filter/rule-based-filter";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const { participants, messages } = await parseWhatsAppChat(text);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "לא נמצאו הודעות בקובץ. וודאו שזהו ייצוא שיחה מוואטסאפ." },
        { status: 400 }
      );
    }

    if (participants.length < 2) {
      return NextResponse.json(
        { error: "נמצא רק משתתף אחד. יש צורך בלפחות 2 משתתפים." },
        { status: 400 }
      );
    }

    console.log(`\n📋 Participants (${participants.length}):`);
    participants.forEach((p, i) => {
      const count = messages.filter((m) => m.author === p).length;
      console.log(`  ${i + 1}. ${p} (${count} messages)`);
    });
    console.log(`\n📊 Total messages: ${messages.length}`);

    const filtered = filterMessages(messages);

    return NextResponse.json({
      participants,
      filteredMessages: filtered.map((m) => ({
        ...m,
        date: m.date.toISOString(),
      })),
      allMessages: messages.map((m) => ({
        ...m,
        date: m.date.toISOString(),
      })),
      totalMessages: messages.length,
      filteredCount: filtered.length,
    });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      { error: "שגיאה בניתוח הקובץ. וודאו שזהו קובץ ייצוא שיחה תקין." },
      { status: 500 }
    );
  }
}
