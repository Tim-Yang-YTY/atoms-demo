"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATES } from "@/lib/types";

export default function LandingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setUserId(localStorage.getItem("user_id"));
  }, []);

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
            Describe your idea. Our AI team — Product Manager, Engineer, and Designer — will build it live in your browser.
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
        <div className="max-w-3xl w-full mx-auto mb-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: "Product Manager", avatar: "PM", color: "#3b82f6", desc: "Analyzes requirements and creates a structured plan" },
              { name: "Engineer", avatar: "EG", color: "#22c55e", desc: "Writes production-ready code for your app" },
              { name: "Designer", avatar: "DS", color: "#a855f7", desc: "Refines the UI/UX with modern design" },
            ].map((a) => (
              <div key={a.name} className="p-5 rounded-xl border border-[#27272a] bg-[#18181b] hover:border-[#3f3f46] transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold mb-3" style={{ backgroundColor: a.color + "22", color: a.color }}>{a.avatar}</div>
                <h3 className="font-semibold mb-1">{a.name}</h3>
                <p className="text-sm text-[#a1a1aa] leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Templates */}
        <section id="templates" className="max-w-5xl w-full mx-auto pb-20">
          <h2 className="text-3xl font-bold text-center mb-2">Start from a template</h2>
          <p className="text-[#a1a1aa] text-center mb-10">Or describe your own idea from scratch</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => { localStorage.setItem("pending_template", JSON.stringify(t)); router.push(userId ? "/dashboard" : "/register"); }} className="text-left p-5 rounded-xl border border-[#27272a] bg-[#18181b] hover:border-[#8b5cf6]/50 transition-all group">
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
