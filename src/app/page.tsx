"use client";

import { useSyncExternalStore, useState } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATES } from "@/lib/types";
import { DEFAULT_AGENT_CONFIGS, saveAgentConfig, resetAgentConfig } from "@/lib/agents/config";

function getSnapshot(): string | null {
  return localStorage.getItem("user_id");
}

function getServerSnapshot(): string | null {
  return null;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export default function LandingPage() {
  const router = useRouter();
  const userId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [agentPrompts, setAgentPrompts] = useState<Record<string, string>>(() => {
    const prompts: Record<string, string> = {};
    for (const [id, config] of Object.entries(DEFAULT_AGENT_CONFIGS)) {
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem(`agent_config_${id}`);
          if (saved) { prompts[id] = JSON.parse(saved).systemPrompt || config.systemPrompt; }
          else { prompts[id] = config.systemPrompt; }
        } catch { prompts[id] = config.systemPrompt; }
      } else { prompts[id] = config.systemPrompt; }
    }
    return prompts;
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6] flex items-center justify-center font-bold text-sm">A</div>
          <span className="font-semibold text-lg">Atoms Demo</span>
        </div>
        <div className="flex items-center gap-3">
          {userId ? (
            <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-sm font-medium transition-colors">Dashboard</button>
          ) : (
            <>
              <button onClick={() => router.push("/login")} className="px-4 py-2 text-[#a1a1aa] hover:text-white text-sm font-medium transition-colors">Sign In</button>
              <button onClick={() => router.push("/register")} className="px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-sm font-medium transition-colors">Get Started</button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center px-6">
        <div className="max-w-4xl mx-auto text-center mt-24 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#3f3f46] text-xs text-[#a1a1aa] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            Powered by Multi-Agent AI
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            Build apps with{" "}
            <span className="bg-gradient-to-r from-[#8b5cf6] via-[#3b82f6] to-[#22c55e] bg-clip-text text-transparent animate-gradient">AI agents</span>
          </h1>
          <p className="text-xl text-[#a1a1aa] mb-10 max-w-2xl mx-auto leading-relaxed">
            Describe your idea. Our AI team — Orchestrator, PM, Engineer, Designer, and 仲裁官 — will plan, build, review, and evaluate it live.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => router.push(userId ? "/dashboard" : "/register")} className="px-8 py-3 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-xl text-base font-medium transition-all hover:scale-105 shadow-lg shadow-[#8b5cf6]/25">
              Start Building
            </button>
            <button onClick={() => document.getElementById("templates")?.scrollIntoView({ behavior: "smooth" })} className="px-8 py-3 border border-[#3f3f46] hover:border-[#52525b] text-white rounded-xl text-base font-medium transition-colors">
              View Templates
            </button>
          </div>
        </div>

        {/* Agent cards */}
        <div className="max-w-5xl w-full mx-auto mb-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.values(DEFAULT_AGENT_CONFIGS).map((agent) => {
              const isExpanded = expandedAgent === agent.id;
              const isModified = agentPrompts[agent.id] !== DEFAULT_AGENT_CONFIGS[agent.id].systemPrompt;
              return (
                <div key={agent.id} className={`rounded-xl border bg-[#18181b] transition-all ${isExpanded ? "border-[#3f3f46] col-span-1 sm:col-span-3 lg:col-span-5" : "border-[#27272a] hover:border-[#3f3f46] cursor-pointer"}`}>
                  <button
                    onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                    className="w-full text-left p-5 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: agent.color + "22", color: agent.color }}>{agent.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{agent.name}</h3>
                          {isModified && <span className="text-xs px-1.5 py-0.5 rounded bg-[#f97316]/20 text-[#f97316]">Modified</span>}
                        </div>
                        <p className="text-sm text-[#a1a1aa] leading-relaxed">{agent.role}</p>
                      </div>
                      <span className="text-[#52525b] text-sm">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 animate-fade-in">
                      <div className="border-t border-[#27272a] pt-4 space-y-4">
                        <div>
                          <label className="text-xs font-medium text-[#a1a1aa] mb-2 block">System Prompt</label>
                          <textarea
                            value={agentPrompts[agent.id] || ""}
                            onChange={(e) => setAgentPrompts((prev) => ({ ...prev, [agent.id]: e.target.value }))}
                            rows={5}
                            className="w-full px-4 py-3 bg-[#09090b] border border-[#27272a] rounded-lg text-sm text-white outline-none focus:border-[#8b5cf6] resize-y font-mono leading-relaxed"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <button onClick={() => { resetAgentConfig(agent.id); setAgentPrompts((prev) => ({ ...prev, [agent.id]: DEFAULT_AGENT_CONFIGS[agent.id].systemPrompt })); }} className="text-xs text-[#71717a] hover:text-white transition-colors cursor-pointer">Reset to default</button>
                            <button onClick={() => saveAgentConfig(agent.id, { systemPrompt: agentPrompts[agent.id] })} className="px-3 py-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer">Save</button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-[#a1a1aa] mb-2 block">Constraints</label>
                          <ul className="space-y-1">
                            {agent.constraints.map((c, i) => (
                              <li key={i} className="text-xs text-[#a1a1aa] flex items-start gap-2"><span className="text-[#52525b] mt-0.5 shrink-0">-</span>{c}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex gap-6 flex-wrap text-xs text-[#71717a]">
                          <div>Temperature: <span className="text-white">{agent.parameters.temperature}</span></div>
                          <div>Max tokens: <span className="text-white">{agent.parameters.maxTokens.toLocaleString()}</span></div>
                          {agent.tools.length > 0 && <div>Tools: {agent.tools.map(t => <span key={t} className="ml-1 px-1.5 py-0.5 rounded bg-[#27272a] text-[#a1a1aa] font-mono">{t}</span>)}</div>}
                          <div>{agent.fewShotExamples.length} few-shot example{agent.fewShotExamples.length > 1 ? "s" : ""}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Templates */}
        <section id="templates" className="max-w-5xl w-full mx-auto pb-20">
          <h2 className="text-3xl font-bold text-center mb-2">Start from a template</h2>
          <p className="text-[#a1a1aa] text-center mb-10">Or describe your own idea from scratch</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => { localStorage.setItem("pending_template", JSON.stringify(t)); router.push(userId ? "/dashboard" : "/register"); }} className="text-left p-5 rounded-xl border border-[#27272a] bg-[#18181b] hover:border-[#8b5cf6]/50 transition-all group cursor-pointer">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#27272a] text-[#a1a1aa]">{t.category}</span>
                <h3 className="font-semibold mt-3 mb-1 group-hover:text-[#8b5cf6] transition-colors">{t.name}</h3>
                <p className="text-sm text-[#a1a1aa] leading-relaxed">{t.description}</p>
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#27272a] px-6 py-6 text-center text-sm text-[#52525b]">
        Atoms Demo — AI-Powered App Builder | Multi-Agent Architecture
      </footer>
    </div>
  );
}
