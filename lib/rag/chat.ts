import { getServerEnv } from "@/lib/env";
import { FALLBACK_ANSWER, generateAnswer, serializeCitations } from "@/lib/rag/answer";
import { generateQueryEmbedding } from "@/lib/rag/embeddings";
import { buildCitations, retrieveRelevantChunks } from "@/lib/rag/vector-store";
import { ensureChatSession, listSessionMessages, saveMessage } from "@/lib/rag/memory";

export async function streamChatAnswer({
  sessionId,
  question,
  documentIds
}: {
  sessionId: string;
  question: string;
  documentIds?: string[];
}) {
  const env = getServerEnv();
  await ensureChatSession(sessionId);
  await saveMessage(sessionId, "user", question);

  const queryEmbedding = await generateQueryEmbedding(question);
  const retrievedChunks = await retrieveRelevantChunks(queryEmbedding, documentIds);
  const filteredChunks = retrievedChunks.filter(
    (chunk, index) => index < env.RAG_TOP_K && (chunk.similarity ?? 0) >= env.RAG_SIMILARITY_THRESHOLD
  );
  const citations = buildCitations(filteredChunks);
  const history = await listSessionMessages(sessionId, 12);

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let answer = "";

      const push = (payload: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      try {
        if (filteredChunks.length === 0) {
          answer = FALLBACK_ANSWER;
          push({ type: "token", value: answer });
        } else {
          for await (const token of generateAnswer(filteredChunks, question, history)) {
            answer += token;
            push({ type: "token", value: token });
          }
        }

        if (!answer.trim()) {
          answer = FALLBACK_ANSWER;
          push({ type: "token", value: answer });
        }

        const citationsText = serializeCitations(citations);

        if (citationsText) {
          answer += citationsText;
          push({ type: "token", value: citationsText });
        }

        await saveMessage(sessionId, "assistant", answer, citations);
        push({ type: "meta", citations });
        controller.close();
      } catch (error) {
        const fallback =
          filteredChunks.length === 0
            ? FALLBACK_ANSWER
            : "I don't know based on the uploaded documents.";

        if (!answer) {
          answer = fallback;
          push({ type: "token", value: answer });
          await saveMessage(sessionId, "assistant", answer, citations);
        }

        push({
          type: "error",
          message: error instanceof Error ? error.message : "Unexpected chat error."
        });
        controller.close();
      }
    }
  });
}
