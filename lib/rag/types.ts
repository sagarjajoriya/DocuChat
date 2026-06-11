export type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
};

export type DocumentChunk = {
  documentId: string;
  sourceFilename: string;
  pageNumber: number;
  chunkIndex: number;
  tokenCount: number;
  content: string;
};

export type Citation = {
  documentId: string;
  sourceFilename: string;
  pageNumber: number;
  chunkIndex: number;
  similarity?: number;
};

export type RetrievedChunk = Citation & {
  id: string;
  content: string;
};

export type ChatMessageRecord = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  citations: Citation[] | null;
};

export type DocumentRecord = {
  id: string;
  filename: string;
  storage_path: string;
  page_count: number;
  chunk_count: number;
  status: "processing" | "ready" | "failed";
  size_bytes: number;
  created_at: string;
  error_message: string | null;
};
