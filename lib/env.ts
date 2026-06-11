import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default("documents"),
  GROQ_API_KEY: z.string().min(1),
  GROQ_MODEL: z.string().min(1).default("llama-3.3-70b-versatile"),
  HF_API_KEY: z.string().min(1),
  HF_EMBEDDING_MODEL: z.string().min(1).default("sentence-transformers/all-MiniLM-L6-v2"),
  RAG_CHUNK_SIZE: z.coerce.number().int().min(300).max(1200).default(750),
  RAG_CHUNK_OVERLAP: z.coerce.number().int().min(50).max(250).default(120),
  RAG_TOP_K: z.coerce.number().int().min(3).max(12).default(6),
  RAG_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.62),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(50).default(20)
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL,
    HF_API_KEY: process.env.HF_API_KEY,
    HF_EMBEDDING_MODEL: process.env.HF_EMBEDDING_MODEL,
    RAG_CHUNK_SIZE: process.env.RAG_CHUNK_SIZE,
    RAG_CHUNK_OVERLAP: process.env.RAG_CHUNK_OVERLAP,
    RAG_TOP_K: process.env.RAG_TOP_K,
    RAG_SIMILARITY_THRESHOLD: process.env.RAG_SIMILARITY_THRESHOLD,
    MAX_UPLOAD_MB: process.env.MAX_UPLOAD_MB
  });

  return cachedEnv;
}
