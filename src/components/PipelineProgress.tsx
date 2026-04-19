"use client";

import { AGENTS, type PipelineAgent } from "@/lib/types";

interface Props {
  pipeline: PipelineAgent[];
  iteration?: number;
  maxIterations?: number;
}

export default function PipelineProgress({ pipeline, iteration, maxIterations }: Props) {
  return (
    <div className="px-4 py-3 mb-3 rounded-xl bg-[#18181b] border border-[#27272a] animate-fade-in">
      {iteration && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-[#71717a] uppercase tracking-wider">Agent Pipeline</span>
          <span className="text-[10px] text-[#52525b]">
            Iteration {iteration}{maxIterations ? `/${maxIterations}` : ""}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1">
        {pipeline.map((p, i) => {
          const agent = AGENTS[p.agent] || AGENTS.system;
          const isActive = p.status === "active";
          const isCompleted = p.status === "completed";
          return (
            <div key={p.agent} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isActive ? "ring-1 ring-offset-1 ring-offset-[#18181b]" : ""
                } ${isCompleted ? "opacity-100" : p.status === "pending" ? "opacity-40" : "opacity-100"}`}
                style={{
                  backgroundColor: isActive ? agent.color + "22" : isCompleted ? agent.color + "15" : "#27272a",
                  color: isActive || isCompleted ? agent.color : "#52525b",
                  ringColor: isActive ? agent.color : undefined,
                }}
              >
                {isCompleted && <span className="text-[10px]">✓</span>}
                {isActive && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: agent.color }} />}
                <span>{agent.avatar}</span>
              </div>
              {i < pipeline.length - 1 && (
                <div className={`w-4 h-px mx-0.5 ${isCompleted ? "bg-[#3f3f46]" : "bg-[#27272a]"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
