"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Project, Template, Ticket } from "@/lib/types";
import { TEMPLATES } from "@/lib/types";
import { DEFAULT_AGENT_CONFIGS, saveAgentConfig, resetAgentConfig } from "@/lib/agents/config";
import { getSkillsForAgent } from "@/lib/skills/registry";
import { getTicketsByUser, updateTicketStatus } from "@/lib/tickets/store";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [agentOverrides, setAgentOverrides] = useState<Record<string, { prompt: string; temperature: number; maxTokens: number }>>(() => {
    const overrides: Record<string, { prompt: string; temperature: number; maxTokens: number }> = {};
    for (const [id, config] of Object.entries(DEFAULT_AGENT_CONFIGS)) {
      overrides[id] = { prompt: config.systemPrompt, temperature: config.parameters.temperature, maxTokens: config.parameters.maxTokens };
    }
    return overrides;
  });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const userName = typeof window !== "undefined" ? localStorage.getItem("user_name") : null;

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects?user_id=${userId}`);
      const data = await res.json();
      setProjects(data.projects || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [userId]);

  const createProject = useCallback(async (name: string, description: string, template?: string) => {
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, name, description, template }),
      });
      const data = await res.json();
      if (data.project) router.push(`/workspace/${data.project.id}`);
    } catch { /* ignore */ }
    setCreating(false);
  }, [userId, router]);

  useEffect(() => {
    if (!userId) { router.push("/login"); return; }
    loadProjects(); // eslint-disable-line react-hooks/set-state-in-effect -- async data fetch
    setTickets(getTicketsByUser(userId)); // eslint-disable-line react-hooks/set-state-in-effect -- loading tickets on mount
    // Check for pending template
    const pt = localStorage.getItem("pending_template");
    if (pt) {
      localStorage.removeItem("pending_template");
      try {
        const t: Template = JSON.parse(pt);
        createProject(t.name, t.prompt, t.id);
      } catch { /* ignore */ }
    }
  }, [userId, router, loadProjects, createProject]);

  // Load saved agent overrides from localStorage
  useEffect(() => {
    const overrides: Record<string, { prompt: string; temperature: number; maxTokens: number }> = {};
    for (const [id, config] of Object.entries(DEFAULT_AGENT_CONFIGS)) {
      try {
        const saved = localStorage.getItem(`agent_config_${id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          overrides[id] = {
            prompt: parsed.systemPrompt || config.systemPrompt,
            temperature: parsed.parameters?.temperature ?? config.parameters.temperature,
            maxTokens: parsed.parameters?.maxTokens ?? config.parameters.maxTokens,
          };
        } else {
          overrides[id] = { prompt: config.systemPrompt, temperature: config.parameters.temperature, maxTokens: config.parameters.maxTokens };
        }
      } catch {
        overrides[id] = { prompt: config.systemPrompt, temperature: config.parameters.temperature, maxTokens: config.parameters.maxTokens };
      }
    }
    setAgentOverrides(overrides); // eslint-disable-line react-hooks/set-state-in-effect -- loading saved configs on mount
  }, []);

  const handleSaveAgent = (agentId: string) => {
    const o = agentOverrides[agentId];
    saveAgentConfig(agentId, { systemPrompt: o.prompt, parameters: { temperature: o.temperature, maxTokens: o.maxTokens } });
  };

  const handleResetAgent = (agentId: string) => {
    resetAgentConfig(agentId);
    const d = DEFAULT_AGENT_CONFIGS[agentId];
    setAgentOverrides((prev) => ({ ...prev, [agentId]: { prompt: d.systemPrompt, temperature: d.parameters.temperature, maxTokens: d.parameters.maxTokens } }));
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createProject(newName, newDesc);
    setShowNew(false);
    setNewName("");
    setNewDesc("");
  };

  const logout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_name");
    router.push("/");
  };

  const statusColors: Record<string, string> = {
    draft: "#71717a",
    generating: "#f97316",
    completed: "#22c55e",
    error: "#ef4444",
  };

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#27272a]">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6] flex items-center justify-center font-bold text-sm">A</div>
          <span className="font-semibold text-lg">Atoms Demo</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#a1a1aa]">{userName || "User"}</span>
          <button onClick={logout} className="px-3 py-1.5 text-xs text-[#71717a] hover:text-white border border-[#27272a] rounded-md transition-colors">Logout</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Projects</h1>
            <p className="text-sm text-[#71717a] mt-1">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => setShowNew(true)} disabled={creating} className="px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {creating ? "Creating..." : "+ New Project"}
          </button>
        </div>

        {/* New project form */}
        {showNew && (
          <form onSubmit={handleNewSubmit} className="mb-8 p-5 rounded-xl border border-[#8b5cf6]/30 bg-[#18181b] animate-fade-in">
            <h3 className="font-semibold mb-4">New Project</h3>
            <div className="space-y-3">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Project name" required className="w-full px-4 py-2.5 bg-[#09090b] border border-[#27272a] rounded-lg text-sm text-white outline-none focus:border-[#8b5cf6]" />
              <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Describe what you want to build..." rows={3} className="w-full px-4 py-2.5 bg-[#09090b] border border-[#27272a] rounded-lg text-sm text-white outline-none focus:border-[#8b5cf6] resize-none" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-[#a1a1aa] hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-sm font-medium transition-colors">Create</button>
              </div>
            </div>
          </form>
        )}

        {/* Project grid */}
        {loading ? (
          <div className="text-center text-[#52525b] py-20">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#27272a] rounded-xl">
            <div className="text-4xl mb-3">🚀</div>
            <p className="text-[#71717a] mb-4">No projects yet. Pick a template or create from scratch!</p>
            <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-sm font-medium transition-colors">+ New Blank Project</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.id} className="p-5 rounded-xl border border-[#27272a] bg-[#18181b] hover:border-[#3f3f46] transition-all group cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[p.status] }} />
                    <span className="text-xs text-[#71717a] capitalize">{p.status}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }} className="text-[#52525b] hover:text-[#ef4444] text-xs opacity-0 group-hover:opacity-100 transition-all">Delete</button>
                </div>
                <button onClick={() => router.push(`/workspace/${p.id}`)} className="text-left w-full">
                  <h3 className="font-semibold mb-1 group-hover:text-[#8b5cf6] transition-colors">{p.name}</h3>
                  <p className="text-xs text-[#52525b] line-clamp-2">{p.description || "No description"}</p>
                  <p className="text-xs text-[#3f3f46] mt-3">{new Date(p.created_at).toLocaleDateString()}</p>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Agents section */}
        <div className="mt-12 mb-8">
          <h2 className="text-xl font-bold mb-1">AI Agents</h2>
          <p className="text-sm text-[#71717a] mb-6">Click an agent to view and customize its configuration</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.values(DEFAULT_AGENT_CONFIGS).map((agent) => {
              const isExpanded = expandedAgent === agent.id;
              const override = agentOverrides[agent.id];
              const isModified = override && (
                override.prompt !== DEFAULT_AGENT_CONFIGS[agent.id].systemPrompt ||
                override.temperature !== DEFAULT_AGENT_CONFIGS[agent.id].parameters.temperature ||
                override.maxTokens !== DEFAULT_AGENT_CONFIGS[agent.id].parameters.maxTokens
              );
              const skills = getSkillsForAgent(agent.id);
              return (
                <div key={agent.id} className={`rounded-xl border bg-[#18181b] transition-all ${isExpanded ? "col-span-1 sm:col-span-3" : "hover:border-[#3f3f46] cursor-pointer"}`} style={{ borderColor: isExpanded ? agent.color + "80" : undefined }}>
                  <button
                    onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                    className="w-full text-left p-5 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: agent.color + "22", color: agent.color }}>{agent.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{agent.name}</h3>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-[#27272a] text-[#71717a]">Phase {agent.pipelinePhase}</span>
                          {isModified && <span className="text-xs px-1.5 py-0.5 rounded bg-[#f97316]/20 text-[#f97316]">Modified</span>}
                        </div>
                        <p className="text-sm text-[#71717a] mt-0.5">{agent.role}</p>
                      </div>
                      <span className="text-[#52525b] text-sm">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {isExpanded && override && (
                    <div className="px-5 pb-5 animate-fade-in">
                      <div className="border-t border-[#27272a] pt-4 space-y-5">
                        {/* System Prompt */}
                        <div>
                          <label className="text-xs font-medium text-[#a1a1aa] mb-2 block">System Prompt</label>
                          <textarea
                            value={override.prompt}
                            onChange={(e) => setAgentOverrides((prev) => ({ ...prev, [agent.id]: { ...prev[agent.id], prompt: e.target.value } }))}
                            rows={6}
                            className="w-full px-4 py-3 bg-[#09090b] border border-[#27272a] rounded-lg text-sm text-white outline-none focus:border-[#8b5cf6] resize-y font-mono leading-relaxed"
                          />
                        </div>
                        {/* Parameters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-[#a1a1aa] mb-2 block">Temperature: {override.temperature}</label>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.1"
                              value={override.temperature}
                              onChange={(e) => setAgentOverrides((prev) => ({ ...prev, [agent.id]: { ...prev[agent.id], temperature: parseFloat(e.target.value) } }))}
                              className="w-full accent-[#8b5cf6]"
                            />
                            <div className="flex justify-between text-xs text-[#52525b] mt-1">
                              <span>Precise (0)</span><span>Creative (2)</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-[#a1a1aa] mb-2 block">Max Tokens</label>
                            <input
                              type="number"
                              min="256"
                              max="16384"
                              step="256"
                              value={override.maxTokens}
                              onChange={(e) => setAgentOverrides((prev) => ({ ...prev, [agent.id]: { ...prev[agent.id], maxTokens: parseInt(e.target.value) || 2048 } }))}
                              className="w-full px-3 py-2 bg-[#09090b] border border-[#27272a] rounded-lg text-sm text-white outline-none focus:border-[#8b5cf6]"
                            />
                          </div>
                        </div>
                        {/* Constraints */}
                        <div>
                          <label className="text-xs font-medium text-[#a1a1aa] mb-2 block">Constraints</label>
                          <ul className="space-y-1.5">
                            {agent.constraints.map((c, i) => (
                              <li key={i} className="text-xs text-[#a1a1aa] flex items-start gap-2">
                                <span className="text-[#52525b] mt-0.5 shrink-0">-</span>{c}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {/* Tools & Few-shots */}
                        <div className="flex gap-6 flex-wrap">
                          {agent.tools.length > 0 && (
                            <div>
                              <label className="text-xs font-medium text-[#a1a1aa] mb-1.5 block">Tools</label>
                              <div className="flex gap-1.5 flex-wrap">
                                {agent.tools.map((t) => (
                                  <span key={t} className="text-xs px-2 py-0.5 rounded bg-[#27272a] text-[#a1a1aa] font-mono">{t}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {agent.fewShotExamples.length > 0 && (
                            <div>
                              <label className="text-xs font-medium text-[#a1a1aa] mb-1.5 block">Few-shot Examples</label>
                              <span className="text-xs text-[#71717a]">{agent.fewShotExamples.length} example{agent.fewShotExamples.length > 1 ? "s" : ""} configured</span>
                            </div>
                          )}
                        </div>
                        {/* Skills */}
                        {skills.length > 0 && (
                          <div>
                            <label className="text-xs font-medium text-[#a1a1aa] mb-2 block">Skills</label>
                            <div className="flex gap-2 flex-wrap">
                              {skills.map((s) => (
                                <span key={s.id} className="text-xs px-2.5 py-1 rounded-md border border-[#27272a] text-[#a1a1aa] bg-[#09090b]" title={s.description}>
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Save / Reset */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#27272a]">
                          <button onClick={() => handleResetAgent(agent.id)} className="text-xs text-[#71717a] hover:text-white transition-colors cursor-pointer">Reset to default</button>
                          <button onClick={() => handleSaveAgent(agent.id)} className="px-4 py-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer">Save Configuration</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tickets section */}
        {tickets.length > 0 && (
          <div className="mt-12 mb-8">
            <h2 className="text-xl font-bold mb-1">Support Tickets</h2>
            <p className="text-sm text-[#71717a] mb-6">{tickets.filter(t => t.status === "open").length} open ticket{tickets.filter(t => t.status === "open").length !== 1 ? "s" : ""}</p>
            <div className="space-y-3">
              {tickets.map((t) => {
                const statusColors: Record<string, string> = { open: "#f97316", in_progress: "#3b82f6", resolved: "#22c55e" };
                return (
                  <div key={t.id} className="p-4 rounded-xl border border-[#27272a] bg-[#18181b]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#a1a1aa] bg-[#27272a] px-2 py-0.5 rounded">{t.id}</span>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[t.status] || "#71717a" }} />
                        <span className="text-xs text-[#71717a] capitalize">{t.status.replace("_", " ")}</span>
                      </div>
                      <span className="text-xs text-[#3f3f46]">{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-[#a1a1aa] mb-1">{t.error.length > 80 ? t.error.slice(0, 80) + "..." : t.error}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#52525b]">{t.userEmail}</span>
                      {t.status === "open" && (
                        <button
                          onClick={() => { updateTicketStatus(t.id, "resolved"); setTickets(getTicketsByUser(userId!)); }}
                          className="text-xs text-[#22c55e] hover:text-[#4ade80] transition-colors cursor-pointer"
                        >
                          Mark resolved
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Templates section */}
        <div className="mt-12 mb-8">
          <h2 className="text-xl font-bold mb-1">Start from a template</h2>
          <p className="text-sm text-[#71717a] mb-6">Choose a template to instantly generate a fully functional app</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => createProject(t.name, t.prompt, t.id)}
                disabled={creating}
                className="text-left p-5 rounded-xl border border-[#27272a] bg-[#18181b] hover:border-[#8b5cf6]/50 transition-all group disabled:opacity-50 cursor-pointer"
              >
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#27272a] text-[#a1a1aa]">{t.category}</span>
                <h3 className="font-semibold mt-3 mb-1 group-hover:text-[#8b5cf6] transition-colors">{t.name}</h3>
                <p className="text-sm text-[#71717a] leading-relaxed">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
