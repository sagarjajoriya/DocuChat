import { streamChatAnswer } from "@/lib/rag/chat";
import { z } from "zod";

export const runtime = "nodejs";

const chatPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  question: z.string().min(1).max(4000),
  documentIds: z.array(z.string().uuid()).optional()
});

export async function POST(request: Request) {
  try {
    const payload = chatPayloadSchema.parse(await request.json());
    const stream = await streamChatAnswer(payload);

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "application/x-ndjson; charset=utf-8"
      }
    });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 500;

    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to process chat request." },
      { status }
    );
  }
}
