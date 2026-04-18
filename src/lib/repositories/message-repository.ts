// MessageRepository — Supabase + in-memory fallback
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { memoryStore } from "@/lib/storage/memory-store";
import type { Message, AgentRole } from "@/lib/types";

export class MessageRepository {
  async findByProjectId(projectId: string): Promise<Message[]> {
    if (!isSupabaseConfigured()) return memoryStore.findMessagesByProjectId(projectId);
    const { data, error } = await supabase.from("messages").select("*").eq("project_id", projectId).order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as Message[];
  }

  async create(projectId: string, role: "user" | AgentRole, content: string): Promise<Message> {
    if (!isSupabaseConfigured()) return memoryStore.createMessage(projectId, role, content);
    const { data, error } = await supabase.from("messages").insert({ project_id: projectId, role, content }).select("*").single();
    if (error) throw new Error(error.message);
    return data as Message;
  }

  async createBatch(messages: { project_id: string; role: "user" | AgentRole; content: string }[]): Promise<Message[]> {
    if (!isSupabaseConfigured()) return memoryStore.createMessages(messages);
    const { data, error } = await supabase.from("messages").insert(messages).select("*");
    if (error) throw new Error(error.message);
    return (data || []) as Message[];
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    if (!isSupabaseConfigured()) { memoryStore.deleteMessagesByProjectId(projectId); return; }
    const { error } = await supabase.from("messages").delete().eq("project_id", projectId);
    if (error) throw new Error(error.message);
  }
}

export const messageRepository = new MessageRepository();
