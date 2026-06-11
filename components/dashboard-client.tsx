"use client";

import { AlertIcon, CheckIcon, FileIcon, RefreshIcon, SendIcon, TrashIcon, UploadIcon } from "@/components/ui-icons";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Citation, ChatMessageRecord, DocumentRecord } from "@/lib/rag/types";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  citations: Citation[] | null;
};

const SESSION_STORAGE_KEY = "docuchat-session-id";

function buildSessionId() {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const sessionId = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}

function parseNdjsonChunk(chunk: string) {
  return chunk
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { type: string; value?: string; citations?: Citation[]; message?: string });
}

export function DashboardClient() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [question, setQuestion] = useState("");
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const latestCitations = useMemo(() => {
    const assistantMessages = messages.filter((message) => message.role === "assistant");
    return assistantMessages.at(-1)?.citations ?? [];
  }, [messages]);

  useEffect(() => {
    setSessionId(buildSessionId());
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    void loadHistory(sessionId);
  }, [sessionId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadDocuments() {
    setIsLoadingDocuments(true);
    setError(null);

    try {
      const response = await fetch("/api/documents");
      const payload = (await response.json()) as { documents?: DocumentRecord[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load documents.");
      }

      const readyDocumentIds = (payload.documents ?? [])
        .filter((document) => document.status === "ready")
        .map((document) => document.id);

      setDocuments(payload.documents ?? []);
      setSelectedDocumentIds((current) => {
        const preserved = current.filter((id) => readyDocumentIds.includes(id));
        return preserved.length > 0 ? preserved : readyDocumentIds;
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load documents.");
    } finally {
      setIsLoadingDocuments(false);
    }
  }

  async function loadHistory(nextSessionId: string) {
    try {
      const response = await fetch(`/api/sessions/${nextSessionId}/messages`);
      const payload = (await response.json()) as { messages?: ChatMessageRecord[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load chat history.");
      }

      setMessages(payload.messages ?? []);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load chat history.");
    }
  }

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);

    if (files.length === 0) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();

      for (const file of files) {
        formData.append("files", file);
      }

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as { documents?: DocumentRecord[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      await loadDocuments();
      const newIds = (payload.documents ?? []).map((document) => document.id);
      setSelectedDocumentIds((current) => Array.from(new Set([...current, ...newIds])));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDeleteDocument(documentId: string) {
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete document.");
      }

      setSelectedDocumentIds((current) => current.filter((id) => id !== documentId));
      await loadDocuments();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to delete document.");
    }
  }

  async function handleReindexDocument(documentId: string) {
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/reindex`, {
        method: "POST"
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to re-index document.");
      }

      await loadDocuments();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to re-index document.");
    }
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();

    if (!question.trim() || !sessionId || isSending) {
      return;
    }

    const nextQuestion = question.trim();
    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: nextQuestion,
      created_at: new Date().toISOString(),
      citations: null
    };
    const assistantMessageId = crypto.randomUUID();

    setQuestion("");
    setIsSending(true);
    setError(null);
    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        citations: []
      }
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId,
          question: nextQuestion,
          documentIds: selectedDocumentIds
        })
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to send message.");
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

        for (const payload of parseNdjsonChunk(lines.join("\n"))) {
          if (payload.type === "token" && payload.value) {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      content: `${message.content}${payload.value}`
                    }
                  : message
              )
            );
          }

          if (payload.type === "meta") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      citations: payload.citations ?? []
                    }
                  : message
              )
            );
          }

          if (payload.type === "error") {
            throw new Error(payload.message ?? "Chat stream failed.");
          }
        }
      }

      if (buffer.trim()) {
        for (const payload of parseNdjsonChunk(buffer)) {
          if (payload.type === "meta") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      citations: payload.citations ?? []
                    }
                  : message
              )
            );
          }
        }
      }
    } catch (nextError) {
      setMessages((current) =>
        current.filter((message) => !(message.id === assistantMessageId && message.content.length === 0))
      );
      setError(nextError instanceof Error ? nextError.message : "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  }

  function toggleDocument(documentId: string) {
    setSelectedDocumentIds((current) =>
      current.includes(documentId) ? current.filter((id) => id !== documentId) : [...current, documentId]
    );
  }

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="glass-panel flex min-h-[300px] flex-col rounded-[28px] p-4 lg:min-h-full">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">DocuChat</p>
              <h1 className="mt-2 text-2xl font-semibold text-balance">AI customer support, grounded in your PDFs.</h1>
            </div>
            <ThemeToggle />
          </div>

          <div
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              void handleFiles(event.dataTransfer.files);
            }}
            className={cn(
              "rounded-[24px] border border-dashed p-5 transition",
              dragActive ? "border-primary bg-primary/10" : "border-border/80 bg-background/40"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-primary/12 p-3 text-primary">
                <UploadIcon className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h2 className="font-semibold">Upload knowledge base PDFs</h2>
                <p className="text-sm text-muted-foreground">
                  Drag and drop files here or upload them manually. Each document is chunked, embedded, and indexed for RAG.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                {isUploading ? "Uploading..." : "Choose PDFs"}
              </button>
              <span className="inline-flex items-center rounded-2xl border border-border/70 px-3 py-2 text-xs text-muted-foreground">
                Free-tier stack: Supabase + Hugging Face + Groq
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf"
              className="hidden"
              onChange={(event) => {
                if (event.target.files) {
                  void handleFiles(event.target.files);
                }
              }}
            />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Documents</h2>
              <p className="text-sm text-muted-foreground">Select one or more sources for retrieval.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadDocuments()}
              className="rounded-2xl border border-border/70 px-3 py-2 text-sm transition hover:border-primary/40 hover:text-primary"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {isLoadingDocuments ? (
              <div className="rounded-[22px] border border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
                Loading indexed documents...
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-[22px] border border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
                No PDFs uploaded yet.
              </div>
            ) : (
              documents.map((document) => {
                const isSelected = selectedDocumentIds.includes(document.id);

                return (
                  <div
                    key={document.id}
                    className={cn(
                      "rounded-[22px] border p-4 transition",
                      isSelected ? "border-primary/40 bg-primary/5" : "border-border/70 bg-background/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleDocument(document.id)}
                        disabled={document.status !== "ready"}
                        className={cn(
                          "mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-md border transition",
                          isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
                          document.status !== "ready" && "opacity-50"
                        )}
                      >
                        {isSelected ? <CheckIcon className="h-3.5 w-3.5" /> : null}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <FileIcon className="h-4 w-4 text-primary" />
                              <p className="truncate font-semibold">{document.filename}</p>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatBytes(document.size_bytes)} • {document.page_count || 0} pages • {document.chunk_count || 0} chunks
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                              document.status === "ready" && "bg-success/15 text-success",
                              document.status === "processing" && "bg-primary/15 text-primary",
                              document.status === "failed" && "bg-danger/10 text-danger"
                            )}
                          >
                            {document.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{formatDate(document.created_at)}</p>
                        {document.error_message ? (
                          <div className="mt-3 flex gap-2 rounded-2xl border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
                            <AlertIcon className="mt-0.5 h-4 w-4 flex-none" />
                            <span>{document.error_message}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleReindexDocument(document.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-border/70 px-3 py-2 text-xs transition hover:border-primary/40 hover:text-primary"
                      >
                        <RefreshIcon className="h-3.5 w-3.5" />
                        Re-index
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteDocument(document.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-border/70 px-3 py-2 text-xs transition hover:border-danger/40 hover:text-danger"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <section className="glass-panel flex min-h-[70vh] flex-col rounded-[28px]">
          <div className="border-b border-border/70 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">RAG Chat</p>
                <h2 className="mt-1 text-xl font-semibold">Ask support questions against your knowledge base</h2>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                Session memory active
              </div>
            </div>
          </div>

          <div className="grid flex-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="flex min-h-[420px] flex-col rounded-[24px] border border-border/70 bg-background/35">
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {messages.length === 0 ? (
                  <div className="mx-auto max-w-xl rounded-[24px] border border-border/70 bg-card/70 p-6 text-center animate-fade-in">
                    <p className="text-lg font-semibold">Start with a support question</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Example: “What does the refund policy say about partial refunds?” or “How do enterprise cancellations work?”
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <article
                      key={message.id}
                      className={cn(
                        "max-w-3xl rounded-[24px] border px-4 py-3 animate-fade-in",
                        message.role === "user"
                          ? "ml-auto border-primary/30 bg-primary/8"
                          : "border-border/70 bg-card/85"
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {message.role === "user" ? "You" : "Assistant"}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(message.created_at)}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-7">{message.content || (isSending ? "Thinking..." : "")}</div>
                      {message.citations && message.citations.length > 0 ? (
                        <div className="mt-4 rounded-[20px] border border-border/70 bg-background/45 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Citations</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {message.citations.map((citation) => (
                              <span
                                key={`${citation.documentId}-${citation.pageNumber}-${citation.chunkIndex}`}
                                className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground"
                              >
                                {citation.sourceFilename} • Page {citation.pageNumber} • Chunk {citation.chunkIndex}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={handleSubmit} className="border-t border-border/70 px-4 py-4">
                {error ? (
                  <div className="mb-3 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                    {error}
                  </div>
                ) : null}
                <div className="rounded-[24px] border border-border/70 bg-card/70 p-3">
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask a grounded support question..."
                    className="min-h-[110px] w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {selectedDocumentIds.length > 0
                        ? `${selectedDocumentIds.length} document${selectedDocumentIds.length > 1 ? "s" : ""} selected for retrieval`
                        : "No document selected. The assistant will likely fall back to “I don't know.”"}
                    </p>
                    <button
                      type="submit"
                      disabled={isSending || !question.trim()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <SendIcon className="h-4 w-4" />
                      {isSending ? "Streaming..." : "Send"}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <aside className="space-y-4">
              <div className="rounded-[24px] border border-border/70 bg-background/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Agent flow</p>
                <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
                  <li>1. Understand the query and preserve session memory.</li>
                  <li>2. Retrieve top-matching chunks from the selected PDFs.</li>
                  <li>3. Filter weak matches before generation.</li>
                  <li>4. Answer only from retrieved context.</li>
                  <li>5. Attach page and chunk citations.</li>
                </ol>
              </div>

              <div className="rounded-[24px] border border-border/70 bg-background/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Latest sources</p>
                <div className="mt-3 space-y-2">
                  {latestCitations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Citations will appear here after the next grounded answer.</p>
                  ) : (
                    latestCitations.map((citation) => (
                      <div
                        key={`${citation.documentId}-${citation.pageNumber}-${citation.chunkIndex}`}
                        className="rounded-2xl border border-border/70 bg-card/70 px-3 py-2 text-sm text-muted-foreground"
                      >
                        <p className="font-semibold text-foreground">{citation.sourceFilename}</p>
                        <p className="mt-1 text-xs">Page {citation.pageNumber}</p>
                        <p className="text-xs">Chunk {citation.chunkIndex}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
