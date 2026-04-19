"use client";

import { useSyncExternalStore, useState } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATES } from "@/lib/types";
import { DEFAULT_AGENT_CONFIGS, saveAgentConfig, resetAgentConfig } from "@/lib/agents/config";
import { getSkillsForAgent } from "@/lib/skills/registry";

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
  const [agentOverrides, setAgentOverrides] = useState<Record<string, { prompt: string; temperature: number; maxTokens: number }>>(() => {
    const overrides: Record<string, { prompt: string; temperature: number; maxTokens: number }> = {};
    for (const [id, config] of Object.entries(DEFAULT_AGENT_CONFIGS)) {
      if (typeof window !== "undefined") {
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
      } else {
        overrides[id] = { prompt: config.systemPrompt, temperature: config.parameters.temperature, maxTokens: config.parameters.maxTokens };
      }
    }
    return overrides;
  });

  const handleSaveAgent = (agentId: string) => {
    const o = agentOverrides[agentId];
    saveAgentConfig(agentId, { systemPrompt: o.prompt, parameters: { temperature: o.temperature, maxTokens: o.maxTokens } });
  };

  const handleResetAgent = (agentId: string) => {
    resetAgentConfig(agentId);
    const d = DEFAULT_AGENT_CONFIGS[agentId];
    setAgentOverrides((prev) => ({ ...prev, [agentId]: { prompt: d.systemPrompt, temperature: d.parameters.temperature, maxTokens: d.parameters.maxTokens } }));
  };

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
            <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-sm font-medium transition-colors cursor-pointer hover:scale-105">Dashboard</button>
          ) : (
            <>
              <button onClick={() => router.push("/login")} className="px-4 py-2 text-[#a1a1aa] hover:text-white text-sm font-medium transition-colors cursor-pointer">Sign In</button>
              <button onClick={() => router.push("/register")} className="px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-sm font-medium transition-colors cursor-pointer hover:scale-105">Get Started</button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center px-6">
        <div className="max-w-4xl mx-auto text-center mt-24 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#3f3f46] text-xs text-[#a1a1aa] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            Powered by Agentic AI
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            Build apps with{" "}
            <span className="bg-gradient-to-r from-[#8b5cf6] via-[#3b82f6] to-[#22c55e] bg-clip-text text-transparent animate-gradient">AI agents</span>
          </h1>
          <p className="text-xl text-[#a1a1aa] mb-10 max-w-2xl mx-auto leading-relaxed">
            Describe your idea. Our AI team — Orchestrator, PM, Engineer, Designer, and 仲裁官 — will plan, build, review, and evaluate it live.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => router.push(userId ? "/dashboard" : "/register")} className="px-8 py-3 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-xl text-base font-medium transition-all hover:scale-105 shadow-lg shadow-[#8b5cf6]/25 cursor-pointer">
              Start Building
            </button>
            <button onClick={() => document.getElementById("templates")?.scrollIntoView({ behavior: "smooth" })} className="px-8 py-3 border border-[#3f3f46] hover:border-[#52525b] text-white rounded-xl text-base font-medium transition-colors cursor-pointer hover:scale-105">
              View Templates
            </button>
          </div>
        </div>

        {/* Agent Arena */}
        <div className="max-w-3xl w-full mx-auto mb-20">
          <h2 className="text-3xl font-bold text-center mb-2">Agent Arena</h2>
          <p className="text-[#a1a1aa] text-center mb-8">5 specialized agents collaborate in a ReAct pipeline. Click to inspect and customize.</p>
          <div className="flex flex-col gap-3">
            {Object.values(DEFAULT_AGENT_CONFIGS).map((agent, index) => {
              const isExpanded = expandedAgent === agent.id;
              const override = agentOverrides[agent.id];
              const isModified = override && (
                override.prompt !== DEFAULT_AGENT_CONFIGS[agent.id].systemPrompt ||
                override.temperature !== DEFAULT_AGENT_CONFIGS[agent.id].parameters.temperature ||
                override.maxTokens !== DEFAULT_AGENT_CONFIGS[agent.id].parameters.maxTokens
              );
              const skills = getSkillsForAgent(agent.id);
              return (
                <div key={agent.id}>
                  {/* Pipeline connector */}
                  {index > 0 && (
                    <div className="flex justify-center -mt-3 -mb-3 relative z-0">
                      <div className="w-px h-6 bg-[#27272a]" />
                    </div>
                  )}
                  <div className={`rounded-xl border bg-[#18181b] transition-all relative z-10 ${isExpanded ? "border-[#3f3f46]" : "border-[#27272a] hover:border-[#3f3f46]"}`} style={{ borderColor: isExpanded ? agent.color + "60" : undefined }}>
                    <button
                      onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                      className="w-full text-left px-5 py-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: agent.color + "22", color: agent.color }}>{agent.avatar}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{agent.name}</h3>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-[#27272a] text-[#52525b]">Phase {agent.pipelinePhase}</span>
                            {isModified && <span className="text-xs px-1.5 py-0.5 rounded bg-[#f97316]/20 text-[#f97316]">Modified</span>}
                          </div>
                          <p className="text-sm text-[#71717a] mt-0.5">{agent.role}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {agent.tools.length > 0 && (
                            <div className="hidden sm:flex gap-1">
                              {agent.tools.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[#27272a] text-[#52525b] font-mono">{t}</span>)}
                            </div>
                          )}
                          <span className="text-[#52525b] text-sm">{isExpanded ? "▲" : "▼"}</span>
                        </div>
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
        Atoms Demo — Agentic App Builder
      </footer>
    </div>
  );
}
