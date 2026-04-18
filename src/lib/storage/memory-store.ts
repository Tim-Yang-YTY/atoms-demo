// ============================================================
// In-Memory Store — Fallback when Supabase is not configured
// Multi-provider strategy pattern for storage fallback
// Data persists only during server lifetime (fine for demo)
// ============================================================

import type { User, Project, Message, AgentRole } from "@/lib/types";

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

class MemoryStore {
  private users: Map<string, User & { password: string }> = new Map();
  private projects: Map<string, Project> = new Map();
  private messages: Map<string, Message> = new Map();

  // --- Users ---
  findUserByEmail(email: string): (User & { password: string }) | null {
    for (const u of this.users.values()) {
      if (u.email === email) return u;
    }
    return null;
  }

  findUserById(id: string): User | null {
    const u = this.users.get(id);
    if (!u) return null;
    const { password: _pw, ...safe } = u;
    return safe;
  }

  createUser(email: string, password: string, name: string | null): User {
    const user = { id: uuid(), email, password, name, created_at: now() };
    this.users.set(user.id, user);
    const { password: _pw2, ...safe } = user;
    return safe;
  }

  // --- Projects ---
  findProjectsByUserId(userId: string): Project[] {
    return Array.from(this.projects.values())
      .filter((p) => p.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  findProjectById(id: string): Project | null {
    return this.projects.get(id) || null;
  }

  createProject(userId: string, name: string, description: string, template: string | null): Project {
    const project: Project = {
      id: uuid(),
      user_id: userId,
      name,
      description,
      generated_code: null,
      status: "draft",
      template,
      created_at: now(),
      updated_at: now(),
    };
    this.projects.set(project.id, project);
    return project;
  }

  updateProjectCode(id: string, code: string): Project {
    const p = this.projects.get(id);
    if (!p) throw new Error("Project not found");
    p.generated_code = code;
    p.status = "completed";
    p.updated_at = now();
    return { ...p };
  }

  updateProjectStatus(id: string, status: Project["status"]): void {
    const p = this.projects.get(id);
    if (p) {
      p.status = status;
      p.updated_at = now();
    }
  }

  deleteProject(id: string): void {
    this.projects.delete(id);
    // Cascade delete messages
    for (const [mid, msg] of this.messages) {
      if (msg.project_id === id) this.messages.delete(mid);
    }
  }

  // --- Messages ---
  findMessagesByProjectId(projectId: string): Message[] {
    return Array.from(this.messages.values())
      .filter((m) => m.project_id === projectId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  createMessage(projectId: string, role: "user" | AgentRole, content: string): Message {
    const msg: Message = { id: uuid(), project_id: projectId, role, content, created_at: now() };
    this.messages.set(msg.id, msg);
    return msg;
  }

  createMessages(msgs: { project_id: string; role: "user" | AgentRole; content: string }[]): Message[] {
    return msgs.map((m) => this.createMessage(m.project_id, m.role, m.content));
  }

  deleteMessagesByProjectId(projectId: string): void {
    for (const [mid, msg] of this.messages) {
      if (msg.project_id === projectId) this.messages.delete(mid);
    }
  }
}

// Singleton — survives across API route invocations in dev
export const memoryStore = new MemoryStore();
