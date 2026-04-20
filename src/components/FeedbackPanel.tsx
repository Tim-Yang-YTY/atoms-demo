"use client";

import { useState } from "react";

interface Props {
  projectId: string;
  enabled: boolean;
}

interface FeedbackEntry {
  id: string;
  rating: "up" | "down";
  comment: string;
  timestamp: string;
}

export default function FeedbackPanel({ projectId, enabled }: Props) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<FeedbackEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(`feedback_${projectId}`) || "[]");
    } catch { return []; }
  });

  const handleSubmit = () => {
    if (!rating) return;
    const entry: FeedbackEntry = {
      id: crypto.randomUUID(),
      rating,
      comment: comment.trim(),
      timestamp: new Date().toISOString(),
    };
    const updated = [entry, ...history];
    setHistory(updated);
    localStorage.setItem(`feedback_${projectId}`, JSON.stringify(updated));
    setSubmitted(true);
    setComment("");
    setTimeout(() => setSubmitted(false), 3000);
  };

  if (!enabled) {
    return (
      <div className="px-4 py-3 text-center text-xs text-[#3f3f46]">
        Feedback available after generation completes
      </div>
    );
  }

  return (
    <div className="border-t border-[#27272a] px-4 py-3">
      {/* Rating buttons */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs text-[#71717a]">Rate this app:</span>
        <div className="flex gap-1">
          <button
            onClick={() => setRating("up")}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all cursor-pointer ${
              rating === "up" ? "bg-[#22c55e]/20 text-[#22c55e] scale-110" : "bg-[#27272a] text-[#52525b] hover:text-[#22c55e] hover:bg-[#22c55e]/10"
            }`}
            title="Thumbs up"
          >
            👍
          </button>
          <button
            onClick={() => setRating("down")}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all cursor-pointer ${
              rating === "down" ? "bg-[#ef4444]/20 text-[#ef4444] scale-110" : "bg-[#27272a] text-[#52525b] hover:text-[#ef4444] hover:bg-[#ef4444]/10"
            }`}
            title="Thumbs down"
          >
            👎
          </button>
        </div>
        {submitted && <span className="text-xs text-[#22c55e] animate-fade-in">Saved!</span>}
      </div>

      {/* Comment input */}
      {rating && (
        <div className="flex gap-2 animate-fade-in">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={rating === "up" ? "What did you like?" : "What could be improved?"}
            className="flex-1 px-3 py-1.5 bg-[#18181b] border border-[#27272a] rounded-lg text-xs text-white outline-none focus:border-[#8b5cf6] placeholder-[#3f3f46]"
          />
          <button
            onClick={handleSubmit}
            className="px-3 py-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Submit
          </button>
        </div>
      )}

      {/* Feedback history */}
      {history.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-[120px] overflow-y-auto">
          {history.slice(0, 5).map((f) => (
            <div key={f.id} className="flex items-start gap-2 text-xs">
              <span>{f.rating === "up" ? "👍" : "👎"}</span>
              <span className="text-[#71717a] flex-1">{f.comment || (f.rating === "up" ? "Liked it" : "Needs improvement")}</span>
              <span className="text-[#3f3f46] shrink-0">{new Date(f.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
