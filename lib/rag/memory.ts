import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Citation, ChatMessageRecord } from "@/lib/rag/types";

export async function ensureChatSession(sessionId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("chat_sessions").upsert({ id: sessionId }, { onConflict: "id" });

  if (error) {
    throw new Error(`Failed to create chat session: ${error.message}`);
  }
}

export async function listSessionMessages(sessionId: string, limit = 20) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at, citations")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load session messages: ${error.message}`);
  }

  return (data ?? []) as ChatMessageRecord[];
}

export async function saveMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  citations: Citation[] | null = null
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role,
    content,
    citations
  });

  if (error) {
    throw new Error(`Failed to save chat message: ${error.message}`);
  }
}
