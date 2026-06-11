create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_path text not null unique,
  page_count integer not null default 0,
  chunk_count integer not null default 0,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  size_bytes bigint not null,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists document_chunks (
  id bigint generated always as identity primary key,
  document_id uuid not null references documents (id) on delete cascade,
  source_filename text not null,
  page_number integer not null,
  chunk_index integer not null,
  token_count integer not null,
  content text not null,
  embedding vector(384) not null,
  created_at timestamptz not null default now()
);

create unique index if not exists document_chunks_document_chunk_key
  on document_chunks (document_id, chunk_index);

create index if not exists document_chunks_document_id_idx
  on document_chunks (document_id);

create index if not exists document_chunks_embedding_idx
  on document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create table if not exists chat_sessions (
  id uuid primary key,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_created_idx
  on chat_messages (session_id, created_at);

create or replace function match_document_chunks(
  query_embedding vector(384),
  match_count integer default 6,
  filter_document_ids uuid[] default null
)
returns table (
  id bigint,
  document_id uuid,
  source_filename text,
  page_number integer,
  chunk_index integer,
  content text,
  similarity double precision
)
language sql
stable
as $$
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.source_filename,
    document_chunks.page_number,
    document_chunks.chunk_index,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where filter_document_ids is null
    or document_chunks.document_id = any (filter_document_ids)
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do nothing;
