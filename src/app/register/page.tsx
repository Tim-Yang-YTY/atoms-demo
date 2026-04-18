"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("user_id", data.user.id);
      localStorage.setItem("user_email", data.user.email);
      localStorage.setItem("user_name", data.user.name || "");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6] flex items-center justify-center font-bold text-lg mx-auto mb-4">A</div>
          <h1 className="text-2xl font-bold mb-1">Create account</h1>
          <p className="text-sm text-[#a1a1aa]">Start building apps with AI agents</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="px-4 py-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg text-sm text-[#ef4444]">{error}</div>}
          <div>
            <label className="block text-xs text-[#a1a1aa] mb-1.5">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-sm text-white outline-none focus:border-[#8b5cf6] transition-colors" placeholder="Your name" />
          </div>
          <div>
            <label className="block text-xs text-[#a1a1aa] mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-sm text-white outline-none focus:border-[#8b5cf6] transition-colors" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-xs text-[#a1a1aa] mb-1.5">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full px-4 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-sm text-white outline-none focus:border-[#8b5cf6] transition-colors" placeholder="Min 6 characters" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-[#52525b] mt-6">
          Already registered?{" "}
          <button onClick={() => router.push("/login")} className="text-[#8b5cf6] hover:text-[#a855f7] transition-colors">Sign In</button>
        </p>
      </div>
    </div>
  );
}
