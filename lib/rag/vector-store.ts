import { getServerEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Citation, DocumentChunk, RetrievedChunk } from "@/lib/rag/types";

type StoredChunkRow = {
  document_id: string;
  source_filename: string;
  page_number: number;
  chunk_index: number;
  token_count: number;
  content: string;
  embedding: number[];
};

export async function storeVectors(chunks: DocumentChunk[], embeddings: number[][]) {
  if (chunks.length !== embeddings.length) {
    throw new Error("Chunk and embedding counts do not match.");
  }

  if (chunks.length === 0) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const rows: StoredChunkRow[] = chunks.map((chunk, index) => ({
    document_id: chunk.documentId,
    source_filename: chunk.sourceFilename,
    page_number: chunk.pageNumber,
    chunk_index: chunk.chunkIndex,
    token_count: chunk.tokenCount,
    content: chunk.content,
    embedding: embeddings[index]
  }));

  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100);
    const { error } = await supabase.from("document_chunks").insert(batch);

    if (error) {
      throw new Error(`Failed to store vectors: ${error.message}`);
    }
  }
}

export async function retrieveRelevantChunks(queryEmbedding: number[], documentIds?: string[]) {
  const supabase = createSupabaseAdminClient();
  const env = getServerEnv();
  const { data, error } = await supabase.rpc("match_document_chunks", {
    filter_document_ids: documentIds && documentIds.length > 0 ? documentIds : null,
    match_count: env.RAG_TOP_K + 2,
    query_embedding: queryEmbedding
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    document_id: string;
    source_filename: string;
    page_number: number;
    chunk_index: number;
    content: string;
    similarity: number;
  }>;

  return rows.map(
    (row): RetrievedChunk => ({
      id: row.id,
      documentId: row.document_id,
      sourceFilename: row.source_filename,
      pageNumber: row.page_number,
      chunkIndex: row.chunk_index,
      content: row.content,
      similarity: row.similarity
    })
  );
}

export function buildCitations(chunks: RetrievedChunk[]): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];

  for (const chunk of chunks) {
    const key = `${chunk.documentId}:${chunk.pageNumber}:${chunk.chunkIndex}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    citations.push({
      documentId: chunk.documentId,
      sourceFilename: chunk.sourceFilename,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      similarity: chunk.similarity
    });
  }

  return citations;
}
