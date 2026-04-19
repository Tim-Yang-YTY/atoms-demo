"use client";

import { AGENTS, type AgentStep } from "@/lib/types";

const STEP_STYLES: Record<AgentStep["stepType"], { icon: string; label: string; border: string; bg: string }> = {
  plan: { icon: "📋", label: "Planning", border: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  execute: { icon: "⚡", label: "Executing", border: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  observe: { icon: "👁", label: "Observing", border: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  reflect: { icon: "🔍", label: "Reflecting", border: "#a855f7", bg: "rgba(168,85,247,0.08)" },
};

interface Props {
  step: AgentStep;
}

export default function AgentStepMessage({ step }: Props) {
  const style = STEP_STYLES[step.stepType];
  const agent = AGENTS[step.agent] || AGENTS.system;

  return (
    <div
      className="ml-11 mb-2 rounded-lg px-3 py-2 text-xs animate-fade-in"
      style={{ borderLeft: `3px solid ${style.border}`, backgroundColor: style.bg }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span>{style.icon}</span>
        <span className="font-medium" style={{ color: style.border }}>{style.label}</span>
        <span className="text-[#52525b]">·</span>
        <span className="text-[#71717a]" style={{ color: agent.color }}>{agent.name}</span>
      </div>
      <p className="text-[#a1a1aa] leading-relaxed">{step.content}</p>

      {/* Tool execution details */}
      {step.toolName && (
        <div className="mt-1.5 px-2 py-1.5 rounded bg-[#09090b] border border-[#27272a]">
          <div className="flex items-center gap-1.5 text-[#71717a]">
            <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-[#27272a] text-[#a1a1aa]">{step.toolName}</span>
            {step.toolInput && <span className="text-[#52525b] truncate max-w-[200px]">{step.toolInput}</span>}
          </div>
          {step.toolOutput && (
            <pre className="mt-1 text-[10px] text-[#71717a] font-mono whitespace-pre-wrap max-h-[60px] overflow-hidden">{step.toolOutput.slice(0, 200)}</pre>
          )}
        </div>
      )}

      {/* Plan steps */}
      {step.planSteps && step.planSteps.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {step.planSteps.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[#a1a1aa]">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${step.currentStep !== undefined && i <= step.currentStep ? "bg-[#22c55e] text-white" : "bg-[#27272a] text-[#52525b]"}`}>
                {step.currentStep !== undefined && i < step.currentStep ? "✓" : i + 1}
              </span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Evaluation result */}
      {step.evaluation && (
        <div className={`mt-1.5 px-2 py-1.5 rounded font-medium ${step.evaluation.passed ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-[#ef4444]/10 text-[#ef4444]"}`}>
          {step.evaluation.passed ? "✅ PASS" : "❌ FAIL"}: {step.evaluation.reason}
          {step.evaluation.deficiencies && (
            <ul className="mt-1 font-normal text-[#a1a1aa] list-disc list-inside">
              {step.evaluation.deficiencies.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
