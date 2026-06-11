import { getServerEnv } from "@/lib/env";
import {
  createDocumentRecord,
  indexDocument,
  listDocuments,
  updateDocumentStatus,
  uploadDocumentBuffer,
} from "@/lib/rag/documents";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const documents = await listDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list documents.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const env = getServerEnv();

  try {
    const formData = await request.formData();
    const incomingFiles = formData.getAll("files");
    const files = incomingFiles.filter(
      (entry): entry is File => entry instanceof File
    );

    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one PDF file is required." },
        { status: 400 }
      );
    }

    const uploadedDocuments = [];

    for (const file of files) {
      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { error: `${file.name} is not a PDF.` },
          { status: 400 }
        );
      }

      if (file.size > env.MAX_UPLOAD_MB * 1024 * 1024) {
        return NextResponse.json(
          {
            error: `${file.name} exceeds the ${env.MAX_UPLOAD_MB} MB upload limit.`,
          },
          { status: 400 }
        );
      }

      const document = await createDocumentRecord(file.name, file.size);

      try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        await uploadDocumentBuffer(document.storage_path, fileBuffer);
        const indexing = await indexDocument(document, fileBuffer);

        uploadedDocuments.push({
          ...document,
          status: "ready",
          page_count: indexing.pageCount,
          chunk_count: indexing.chunkCount,
          error_message: null,
        });
      } catch (error) {
        await updateDocumentStatus(document.id, {
          status: "failed",
          error_message:
            error instanceof Error ? error.message : "Indexing failed.",
        });
        throw error;
      }
    }

    return NextResponse.json({ documents: uploadedDocuments }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload document.",
      },
      { status: 500 }
    );
  }
}
