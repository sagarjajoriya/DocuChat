import { getServerEnv } from "@/lib/env";
import type { DocumentChunk } from "@/lib/rag/types";

function averageTokenEmbeddings(tokenEmbeddings: number[][]) {
  if (tokenEmbeddings.length === 0) {
    return [];
  }

  const dimension = tokenEmbeddings[0]?.length ?? 0;
  const result = Array.from({ length: dimension }, () => 0);

  for (const tokenEmbedding of tokenEmbeddings) {
    for (let index = 0; index < dimension; index += 1) {
      result[index] += tokenEmbedding[index] ?? 0;
    }
  }

  return result.map((value) => value / tokenEmbeddings.length);
}

function toEmbeddingArray(payload: unknown): number[][] {
  if (!Array.isArray(payload)) {
    throw new Error("Unexpected embedding response payload.");
  }

  if (payload.length === 0) {
    return [];
  }

  if (typeof payload[0] === "number") {
    return [payload as number[]];
  }

  if (Array.isArray(payload[0]) && typeof payload[0][0] === "number") {
    return payload as number[][];
  }

  if (Array.isArray(payload[0]) && Array.isArray(payload[0][0])) {
    return (payload as number[][][]).map((item) => averageTokenEmbeddings(item));
  }

  throw new Error("Unsupported embedding response shape.");
}

async function requestEmbeddings(inputs: string[]) {
  const env = getServerEnv();
  const response = await fetch(`https://api-inference.huggingface.co/pipeline/feature-extraction/${env.HF_EMBEDDING_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.HF_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs,
      options: {
        wait_for_model: true,
        use_cache: true
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding request failed: ${response.status} ${errorText}`);
  }

  return toEmbeddingArray(await response.json());
}

export async function generateEmbeddings(chunks: DocumentChunk[]) {
  const embeddings: number[][] = [];

  for (let index = 0; index < chunks.length; index += 8) {
    const batch = chunks.slice(index, index + 8);
    const batchEmbeddings = await requestEmbeddings(batch.map((item) => item.content));
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

export async function generateQueryEmbedding(query: string) {
  const [embedding] = await requestEmbeddings([query]);

  if (!embedding) {
    throw new Error("Failed to generate query embedding.");
  }

  return embedding;
}
