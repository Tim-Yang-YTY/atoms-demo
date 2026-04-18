"use client";

import { useState } from "react";

interface Props {
  code: string | null;
  isGenerating: boolean;
}

export default function PreviewPanel({ code, isGenerating }: Props) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!code) return;
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "app.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#27272a]">
        <div className="flex gap-1">
          <button
            onClick={() => setTab("preview")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === "preview"
                ? "bg-[#27272a] text-white"
                : "text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setTab("code")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === "code"
                ? "bg-[#27272a] text-white"
                : "text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            Code
          </button>
        </div>
        {code && (
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs text-[#71717a] hover:text-white border border-[#27272a] rounded-md transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-xs text-[#71717a] hover:text-white border border-[#27272a] rounded-md transition-colors"
            >
              Export HTML
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {!code && !isGenerating && (
          <div className="flex items-center justify-center h-full text-[#3f3f46]">
            <div className="text-center">
              <div className="text-4xl mb-3">🚀</div>
              <p className="text-sm">Describe your app to see the preview</p>
            </div>
          </div>
        )}

        {isGenerating && !code && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="flex gap-2 justify-center mb-3">
                <div className="w-2 h-2 rounded-full bg-[#8b5cf6] typing-dot" />
                <div className="w-2 h-2 rounded-full bg-[#3b82f6] typing-dot" />
                <div className="w-2 h-2 rounded-full bg-[#22c55e] typing-dot" />
              </div>
              <p className="text-sm text-[#71717a]">Agents are building your app...</p>
            </div>
          </div>
        )}

        {code && tab === "preview" && (
          <iframe
            srcDoc={code}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            title="App Preview"
          />
        )}

        {code && tab === "code" && (
          <div className="h-full overflow-auto p-4 bg-[#0a0a0a]">
            <pre className="text-xs leading-relaxed">
              <code className="text-[#a1a1aa]">{code}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
