"use client";

import { useState } from "react";
import { createTicket } from "@/lib/tickets/store";

interface Props {
  error: string;
  projectId: string;
  userId: string;
  context: string; // what the user was trying to do (their prompt)
}

export default function ErrorRecovery({ error, projectId, userId, context }: Props) {
  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("user_email") || "";
    return "";
  });
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!email.trim()) return;
    const ticket = createTicket({
      projectId,
      userId,
      userEmail: email.trim(),
      error,
      context,
    });
    setTicketId(ticket.id);
    setSubmitted(true);
    // Save email for future use
    localStorage.setItem("user_email", email.trim());
  };

  return (
    <div className="mx-4 mb-3 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/5 p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#ef4444]/20 flex items-center justify-center text-sm shrink-0">
          ⚠
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-[#fca5a5] mb-1">Something went wrong</h4>
          <p className="text-xs text-[#a1a1aa] leading-relaxed mb-3">
            We&apos;re sorry about this. We&apos;ve automatically created a support ticket and our team will follow up.
            Please leave your email so we can contact you with the resolution.
          </p>

          {!submitted ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="your@email.com"
                  className="flex-1 px-3 py-2 bg-[#18181b] border border-[#27272a] rounded-lg text-xs text-white outline-none focus:border-[#8b5cf6] placeholder-[#3f3f46]"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!email.trim()}
                  className="px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:bg-[#27272a] disabled:text-[#52525b] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Submit
                </button>
              </div>
              <p className="text-[10px] text-[#52525b]">
                Error: {error.length > 100 ? error.slice(0, 100) + "..." : error}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg">
                <span className="text-[#22c55e] text-sm">✓</span>
                <div>
                  <p className="text-xs text-[#22c55e] font-medium">Ticket created: {ticketId}</p>
                  <p className="text-[10px] text-[#a1a1aa]">We&apos;ll contact {email} with updates</p>
                </div>
              </div>
              <p className="text-[10px] text-[#52525b]">
                You can track this ticket in the Dashboard → Tickets section.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
