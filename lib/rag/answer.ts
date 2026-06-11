import { getServerEnv } from "@/lib/env";
import type { ChatMessageRecord, Citation, RetrievedChunk } from "@/lib/rag/types";

const FALLBACK_ANSWER = "I don't know based on the uploaded documents.";

function buildSystemPrompt() {
  return [
    "You are an AI customer support assistant.",
    "Rules:",
    "- Only use the provided context.",
    "- Never hallucinate, guess, or use outside knowledge.",
    '- If the answer is not in the context, answer exactly: "I don\'t know based on the uploaded documents."',
    "- Be precise, concise, and grounded in the retrieved material.",
    "- Do not invent citations. Citations are appended separately."
  ].join("\n");
}

function buildContext(chunks: RetrievedChunk[]) {
  return chunks
    .map(
      (chunk) =>
        [
          `Document: ${chunk.sourceFilename}`,
          `Page: ${chunk.pageNumber}`,
          `Chunk: ${chunk.chunkIndex}`,
          `Content: ${chunk.content}`
        ].join("\n")
    )
    .join("\n\n---\n\n");
}

function formatConversation(messages: ChatMessageRecord[]) {
  return messages
    .slice(-6)
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");
}

async function* streamGroqResponse(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  const env = getServerEnv();
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL,
      temperature: 0.1,
      stream: true,
      messages
    })
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(`Groq request failed: ${response.status} ${errorText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed.startsWith("data:")) {
        continue;
      }

      const payload = trimmed.replace(/^data:\s*/, "");

      if (payload === "[DONE]") {
        return;
      }

      const parsed = JSON.parse(payload) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const token = parsed.choices?.[0]?.delta?.content;

      if (token) {
        yield token;
      }
    }
  }
}

export async function* generateAnswer(
  contextChunks: RetrievedChunk[],
  question: string,
  conversation: ChatMessageRecord[]
) {
  if (contextChunks.length === 0) {
    yield FALLBACK_ANSWER;
    return;
  }

  const prompt = [
    `Conversation:\n${formatConversation(conversation) || "No prior conversation."}`,
    `Context:\n${buildContext(contextChunks)}`,
    `Question:\n${question}`,
    "Answer:"
  ].join("\n\n");

  yield* streamGroqResponse([
    {
      role: "system",
      content: buildSystemPrompt()
    },
    ...conversation.slice(-6).map((message) => ({
      role: message.role,
      content: message.content
    })),
    {
      role: "user",
      content: prompt
    }
  ]);
}

export function serializeCitations(citations: Citation[]) {
  if (citations.length === 0) {
    return "";
  }

  const sourceLines = citations.map(
    (citation) => `Source: ${citation.sourceFilename} (Page ${citation.pageNumber}, Chunk ${citation.chunkIndex})`
  );

  return `\n\nSources:\n${sourceLines.join("\n")}`;
}

export { FALLBACK_ANSWER };
