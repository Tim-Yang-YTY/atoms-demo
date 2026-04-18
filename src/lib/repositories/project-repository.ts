// ProjectRepository — Supabase + in-memory fallback
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { memoryStore } from "@/lib/storage/memory-store";
import type { Project } from "@/lib/types";

export class ProjectRepository {
  async findByUserId(userId: string): Promise<Project[]> {
    if (!isSupabaseConfigured()) return memoryStore.findProjectsByUserId(userId);
    const { data, error } = await supabase.from("projects").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as Project[];
  }

  async findById(id: string): Promise<Project | null> {
    if (!isSupabaseConfigured()) return memoryStore.findProjectById(id);
    const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
    if (error || !data) return null;
    return data as Project;
  }

  async create(userId: string, name: string, description: string, template: string | null = null): Promise<Project> {
    if (!isSupabaseConfigured()) return memoryStore.createProject(userId, name, description, template);
    const { data, error } = await supabase.from("projects").insert({ user_id: userId, name, description, template, status: "draft" }).select("*").single();
    if (error) throw new Error(error.message);
    return data as Project;
  }

  async updateCode(id: string, code: string): Promise<Project> {
    if (!isSupabaseConfigured()) return memoryStore.updateProjectCode(id, code);
    const { data, error } = await supabase.from("projects").update({ generated_code: code, status: "completed", updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    return data as Project;
  }

  async updateStatus(id: string, status: Project["status"]): Promise<void> {
    if (!isSupabaseConfigured()) { memoryStore.updateProjectStatus(id, status); return; }
    const { error } = await supabase.from("projects").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    if (!isSupabaseConfigured()) { memoryStore.deleteProject(id); return; }
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export const projectRepository = new ProjectRepository();
