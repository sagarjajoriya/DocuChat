import { deleteDocumentAsset, deleteDocumentRecord, getDocumentById } from "@/lib/rag/documents";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Context = {
  params: {
    id: string;
  };
};

export async function DELETE(_: Request, { params }: Context) {
  try {
    const document = await getDocumentById(params.id);

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    await deleteDocumentAsset(document.storage_path);
    await deleteDocumentRecord(document.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete document." },
      { status: 500 }
    );
  }
}
