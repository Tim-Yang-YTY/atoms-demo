"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import PreviewPanel from "@/components/PreviewPanel";
import type { Project, Message } from "@/lib/types";

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [panelWidth, setPanelWidth] = useState(40); // percentage for chat panel
  const [isDragging, setIsDragging] = useState(false);
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

  useEffect(() => {
    if (!userId) { router.push("/login"); return; }
    loadProject();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) { router.push("/dashboard"); return; }
      const data = await res.json();
      setProject(data.project);
      setMessages(data.messages || []);
      if (data.project.generated_code) setCode(data.project.generated_code);
    } catch {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  const handleCodeUpdate = (newCode: string) => {
    setCode(newCode);
  };

  // Resizable panels
  const handleMouseDown = () => setIsDragging(true);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const pct = (e.clientX / window.innerWidth) * 100;
      setPanelWidth(Math.max(25, Math.min(65, pct)));
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#52525b]">
        Loading workspace...
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#27272a] bg-[#09090b] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-6 h-6 rounded bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6] flex items-center justify-center text-[10px] font-bold hover:scale-110 transition-transform"
            title="Home"
          >
            A
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[#71717a] hover:text-white text-sm transition-colors"
          >
            ← Projects
          </button>
          <div className="w-px h-4 bg-[#27272a]" />
          <span className="text-sm font-medium truncate max-w-[200px]">{project.name}</span>
          {isGenerating && (
            <span className="flex items-center gap-1.5 text-xs text-[#f97316]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse" />
              Generating...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {project.status === "completed" && (
            <span className="flex items-center gap-1.5 text-xs text-[#22c55e]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              Complete
            </span>
          )}
        </div>
      </div>

      {/* Main workspace: Chat + Preview */}
      <div className="flex-1 flex overflow-hidden" style={{ cursor: isDragging ? "col-resize" : undefined }}>
        {/* Chat Panel */}
        <div className="h-full overflow-hidden border-r border-[#27272a]" style={{ width: `${panelWidth}%` }}>
          <ChatPanel
            projectId={id}
            userId={userId || ""}
            initialMessages={messages}
            autoPrompt={messages.length === 0 && project.description ? project.description : undefined}
            onCodeUpdate={handleCodeUpdate}
            onGeneratingChange={setIsGenerating}
          />
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="w-1 hover:w-1.5 bg-[#27272a] hover:bg-[#8b5cf6] cursor-col-resize transition-all shrink-0"
        />

        {/* Preview Panel */}
        <div className="h-full overflow-hidden flex-1">
          <PreviewPanel code={code} isGenerating={isGenerating} />
        </div>
      </div>
    </div>
  );
}
