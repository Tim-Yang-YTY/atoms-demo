// UserRepository — Supabase + in-memory fallback
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { memoryStore } from "@/lib/storage/memory-store";
import type { User } from "@/lib/types";

export class UserRepository {
  async findByEmail(email: string): Promise<(User & { password?: string }) | null> {
    if (!isSupabaseConfigured()) return memoryStore.findUserByEmail(email);
    const { data, error } = await supabase.from("users").select("*").eq("email", email).single();
    if (error || !data) return null;
    return data as User & { password?: string };
  }

  async findById(id: string): Promise<User | null> {
    if (!isSupabaseConfigured()) return memoryStore.findUserById(id);
    const { data, error } = await supabase.from("users").select("id, email, name, created_at").eq("id", id).single();
    if (error || !data) return null;
    return data as User;
  }

  async create(email: string, password: string, name: string | null): Promise<User> {
    if (!isSupabaseConfigured()) return memoryStore.createUser(email, password, name);
    const { data, error } = await supabase.from("users").insert({ email, password, name }).select("id, email, name, created_at").single();
    if (error) throw new Error(error.message);
    return data as User;
  }
}

export const userRepository = new UserRepository();
