import { ensureChatSession, listSessionMessages } from "@/lib/rag/memory";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const sessionParamsSchema = z.object({
  sessionId: z.string().uuid()
});

type Context = {
  params: {
    sessionId: string;
  };
};

export async function GET(_: Request, { params }: Context) {
  try {
    const { sessionId } = sessionParamsSchema.parse(params);
    await ensureChatSession(sessionId);
    const messages = await listSessionMessages(sessionId);
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load session history." },
      { status: 500 }
    );
  }
}
