import { downloadDocumentBuffer, getDocumentById, indexDocument, updateDocumentStatus } from "@/lib/rag/documents";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Context = {
  params: {
    id: string;
  };
};

export async function POST(_: Request, { params }: Context) {
  try {
    const document = await getDocumentById(params.id);

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    await updateDocumentStatus(document.id, {
      status: "processing",
      error_message: null
    });

    const fileBuffer = await downloadDocumentBuffer(document.storage_path);
    const indexing = await indexDocument(document, fileBuffer);

    return NextResponse.json({
      document: {
        ...document,
        status: "ready",
        page_count: indexing.pageCount,
        chunk_count: indexing.chunkCount,
        error_message: null
      }
    });
  } catch (error) {
    await updateDocumentStatus(params.id, {
      status: "failed",
      error_message: error instanceof Error ? error.message : "Re-indexing failed."
    }).catch(() => undefined);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to re-index document." },
      { status: 500 }
    );
  }
}
