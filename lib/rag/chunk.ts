import { getServerEnv } from "@/lib/env";
import type { DocumentChunk, ExtractedPdfPage } from "@/lib/rag/types";
import { decode, encode } from "gpt-tokenizer";

type ChunkTextInput = {
  documentId: string;
  sourceFilename: string;
  pages: ExtractedPdfPage[];
};

function normalizeChunkContent(content: string) {
  return content.replace(/\s+/g, " ").trim();
}

export function chunkText({ documentId, sourceFilename, pages }: ChunkTextInput) {
  const env = getServerEnv();
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const tokens = encode(page.text);

    if (tokens.length === 0) {
      continue;
    }

    const step = Math.max(env.RAG_CHUNK_SIZE - env.RAG_CHUNK_OVERLAP, 1);

    for (let start = 0; start < tokens.length; start += step) {
      const slice = tokens.slice(start, start + env.RAG_CHUNK_SIZE);
      const content = normalizeChunkContent(decode(slice));

      if (!content) {
        continue;
      }

      chunks.push({
        documentId,
        sourceFilename,
        pageNumber: page.pageNumber,
        chunkIndex,
        tokenCount: slice.length,
        content
      });

      chunkIndex += 1;

      if (start + env.RAG_CHUNK_SIZE >= tokens.length) {
        break;
      }
    }
  }

  return chunks;
}
