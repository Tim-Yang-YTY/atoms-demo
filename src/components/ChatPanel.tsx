"use client";

import { useState, useRef, useEffect } from "react";
import AgentMessage from "./AgentMessage";
import type { AgentRole, SSEEvent, Message } from "@/lib/types";

interface ChatMessage {
  id: string;
  role: "user" | AgentRole;
  content: string;
  isStreaming?: boolean;
}

interface Props {
  projectId: string;
  userId: string;
  initialMessages: Message[];
  onCodeUpdate: (code: string) => void;
  onGeneratingChange: (generating: boolean) => void;
}

export default function ChatPanel({
  projectId,
  userId,
  initialMessages,
  onCodeUpdate,
  onGeneratingChange,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.map((m) => ({ id: m.id, role: m.role, content: m.content }))
  );
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async () => {
    const prompt = input.trim();
    if (!prompt || isGenerating) return;

    setInput("");
    setIsGenerating(true);
    onGeneratingChange(true);

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, project_id: projectId, user_id: userId }),
      });

      if (!response.ok) throw new Error("Generation failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentAgentId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));

            if (event.type === "agent_start" && event.agent) {
              currentAgentId = crypto.randomUUID();
              setMessages((prev) => [
                ...prev,
                { id: currentAgentId!, role: event.agent!, content: "", isStreaming: true },
              ]);
            }

            if (event.type === "agent_message" && event.content && currentAgentId) {
              const agentId = currentAgentId;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentId ? { ...m, content: m.content + event.content } : m
                )
              );
            }

            if (event.type === "agent_complete" && currentAgentId) {
              const agentId = currentAgentId;
              setMessages((prev) =>
                prev.map((m) => (m.id === agentId ? { ...m, isStreaming: false } : m))
              );
              currentAgentId = null;
            }

            if (event.type === "code_update" && event.code) {
              onCodeUpdate(event.code);
            }

            if (event.type === "error") {
              setMessages((prev) => [
                ...prev,
                { id: crypto.randomUUID(), role: "system", content: `Error: ${event.content}` },
              ]);
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "system",
          content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      ]);
    } finally {
      setIsGenerating(false);
      onGeneratingChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-[#3f3f46]">
            <div className="text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm">Describe what you want to build</p>
              <p className="text-xs text-[#27272a] mt-1">The AI team will build it for you</p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <AgentMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isStreaming={msg.isStreaming}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#27272a] p-4">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isGenerating ? "Agents are working..." : "Describe your app or request changes..."}
            disabled={isGenerating}
            rows={1}
            className="flex-1 bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#52525b] outline-none focus:border-[#8b5cf6] resize-none transition-colors disabled:opacity-50"
            style={{ minHeight: "44px", maxHeight: "120px" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "44px";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isGenerating}
            className="h-[44px] px-4 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:bg-[#27272a] disabled:text-[#52525b] text-white rounded-xl text-sm font-medium transition-all"
          >
            {isGenerating ? (
              <span className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-white typing-dot" />
                <span className="w-1 h-1 rounded-full bg-white typing-dot" />
                <span className="w-1 h-1 rounded-full bg-white typing-dot" />
              </span>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
