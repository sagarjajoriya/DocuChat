import { getServerEnv } from "@/lib/env";
import { chunkText } from "@/lib/rag/chunk";
import { generateEmbeddings } from "@/lib/rag/embeddings";
import { extractTextFromPDF } from "@/lib/rag/pdf";
import { storeVectors } from "@/lib/rag/vector-store";
import type { DocumentRecord } from "@/lib/rag/types";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { slugifyFileName } from "@/lib/utils";

export async function listDocuments() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, filename, storage_path, page_count, chunk_count, status, size_bytes, created_at, error_message")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load documents: ${error.message}`);
  }

  return (data ?? []) as DocumentRecord[];
}

export async function getDocumentById(documentId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, filename, storage_path, page_count, chunk_count, status, size_bytes, created_at, error_message")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load document: ${error.message}`);
  }

  return data as DocumentRecord | null;
}

export async function createDocumentRecord(filename: string, sizeBytes: number) {
  const supabase = createSupabaseAdminClient();
  const storagePath = `${crypto.randomUUID()}/${slugifyFileName(filename)}`;
  const { data, error } = await supabase
    .from("documents")
    .insert({
      filename,
      storage_path: storagePath,
      size_bytes: sizeBytes,
      status: "processing"
    })
    .select("id, filename, storage_path, page_count, chunk_count, status, size_bytes, created_at, error_message")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create document record: ${error?.message ?? "unknown error"}`);
  }

  return data as DocumentRecord;
}

export async function updateDocumentStatus(
  documentId: string,
  values: Partial<Pick<DocumentRecord, "chunk_count" | "page_count" | "status" | "error_message">>
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("documents").update(values).eq("id", documentId);

  if (error) {
    throw new Error(`Failed to update document: ${error.message}`);
  }
}

export async function uploadDocumentBuffer(storagePath: string, fileBuffer: Buffer) {
  const supabase = createSupabaseAdminClient();
  const env = getServerEnv();

  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(storagePath, fileBuffer, {
    contentType: "application/pdf",
    upsert: true
  });

  if (error) {
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }
}

export async function deleteDocumentAsset(storagePath: string) {
  const supabase = createSupabaseAdminClient();
  const env = getServerEnv();
  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete stored PDF: ${error.message}`);
  }
}

export async function deleteDocumentRecord(documentId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("documents").delete().eq("id", documentId);

  if (error) {
    throw new Error(`Failed to delete document record: ${error.message}`);
  }
}

export async function clearDocumentChunks(documentId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("document_chunks").delete().eq("document_id", documentId);

  if (error) {
    throw new Error(`Failed to clear document chunks: ${error.message}`);
  }
}

export async function downloadDocumentBuffer(storagePath: string) {
  const supabase = createSupabaseAdminClient();
  const env = getServerEnv();
  const { data, error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to download stored PDF: ${error?.message ?? "unknown error"}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function indexDocument(document: Pick<DocumentRecord, "id" | "filename" | "storage_path">, fileBuffer: Buffer) {
  const extraction = await extractTextFromPDF(fileBuffer);
  const chunks = chunkText({
    documentId: document.id,
    sourceFilename: document.filename,
    pages: extraction.pages
  });
  const embeddings = await generateEmbeddings(chunks);
  await clearDocumentChunks(document.id);
  await storeVectors(chunks, embeddings);
  await updateDocumentStatus(document.id, {
    status: "ready",
    error_message: null,
    page_count: extraction.pageCount,
    chunk_count: chunks.length
  });

  return {
    pageCount: extraction.pageCount,
    chunkCount: chunks.length
  };
}
