import type { ExtractedPdfPage } from "@/lib/rag/types";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

function normalizePdfText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export async function extractTextFromPDF(fileBuffer: Buffer) {
  const pdf = await getDocument({
    data: new Uint8Array(fileBuffer),
    isEvalSupported: false,
    useWorkerFetch: false,
    verbosity: 0
  }).promise;

  const pages: ExtractedPdfPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = normalizePdfText(
      textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ")
    );

    if (text.length > 0) {
      pages.push({
        pageNumber,
        text
      });
    }
  }

  return {
    pageCount: pdf.numPages,
    pages,
    text: pages.map((page) => page.text).join("\n\n")
  };
}
