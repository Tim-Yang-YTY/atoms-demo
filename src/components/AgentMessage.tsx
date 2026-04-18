"use client";

import { AGENTS, type AgentRole } from "@/lib/types";

interface Props {
  role: "user" | AgentRole;
  content: string;
  isStreaming?: boolean;
}

export default function AgentMessage({ role, content, isStreaming }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div className="max-w-[80%] bg-[#8b5cf6] text-white px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed">
          {content}
        </div>
      </div>
    );
  }

  const agent = AGENTS[role as AgentRole] || AGENTS.system;

  return (
    <div className="flex gap-3 mb-4 animate-slide-in">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 mt-1"
        style={{ backgroundColor: agent.bgColor, color: agent.color }}
      >
        {agent.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium" style={{ color: agent.color }}>
            {agent.name}
          </span>
          {isStreaming && (
            <span className="flex gap-1">
              <span className="w-1 h-1 rounded-full typing-dot" style={{ backgroundColor: agent.color }} />
              <span className="w-1 h-1 rounded-full typing-dot" style={{ backgroundColor: agent.color }} />
              <span className="w-1 h-1 rounded-full typing-dot" style={{ backgroundColor: agent.color }} />
            </span>
          )}
        </div>
        <div className="text-sm text-[#d4d4d8] leading-relaxed whitespace-pre-wrap break-words">
          {content}
          {isStreaming && <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse" />}
        </div>
      </div>
    </div>
  );
}
