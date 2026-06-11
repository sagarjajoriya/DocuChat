# DocuChat

Production-ready AI customer support SaaS built with free-tier and open-source tooling only.

## Stack

- Frontend: Next.js App Router + TailwindCSS
- Backend: Next.js route handlers
- LLM: Groq API free tier
- Embeddings: Hugging Face Inference API free tier
- Vector database + storage: Supabase `pgvector` + Storage free tier
- Hosting target: Vercel free tier

## Features

- PDF upload with drag-and-drop
- PDF parsing with per-page metadata
- Token-aware chunking with overlap
- Embedding generation and vector storage
- Multi-document semantic retrieval
- Streaming grounded answers
- Mandatory citations with page and chunk references
- Session-based conversation memory
- Document delete and re-index actions
- Dark mode SaaS dashboard

## Project Structure

```text
app/
  api/
    chat/route.ts
    documents/route.ts
    documents/[id]/route.ts
    documents/[id]/reindex/route.ts
    sessions/[sessionId]/messages/route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  dashboard-client.tsx
  theme-provider.tsx
  theme-toggle.tsx
  ui-icons.tsx
lib/
  env.ts
  utils.ts
  supabase/server.ts
  rag/
    answer.ts
    chat.ts
    chunk.ts
    documents.ts
    embeddings.ts
    memory.ts
    pdf.ts
    types.ts
    vector-store.ts
supabase/
  migrations/001_init.sql
.env.example
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project and enable `pgvector`.

3. Run the SQL in [supabase/migrations/001_init.sql](/Users/himanshujajoriya/Sagar/DocuChat/supabase/migrations/001_init.sql).

4. Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `HF_API_KEY`
- `HF_EMBEDDING_MODEL`

5. Start the app:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000).

## RAG Pipeline

1. Upload PDF
2. Extract per-page text using `pdfjs-dist`
3. Chunk text with token overlap using `gpt-tokenizer`
4. Generate embeddings with Hugging Face
5. Store chunks + embeddings in Supabase
6. Embed the query
7. Retrieve top relevant chunks via `pgvector`
8. Stream a grounded answer from Groq
9. Append citations in the format:

```text
Source: refund-policy.pdf (Page 3, Chunk 12)
```

## Notes

- The assistant is explicitly instructed to answer only from retrieved context.
- If retrieval returns no relevant context, the response falls back to:
  `I don't know based on the uploaded documents.`
- Session memory is stored in `chat_sessions` and `chat_messages`.
- All document operations run through server-side route handlers using the Supabase service role.
