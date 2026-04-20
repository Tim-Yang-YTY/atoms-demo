// Auth API — login/register endpoints
// Note: MemoryStore resets on deploy. Login auto-registers if user not found
// (transparent re-creation for returning users after server restart).
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/services/auth-service";

export async function POST(req: NextRequest) {
  try {
    const { action, email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    if (action === "register") {
      // If user already exists (e.g., MemoryStore survived), just log them in
      try {
        const user = await authService.register(email, password, name || email.split("@")[0]);
        return NextResponse.json({ user });
      } catch {
        // Already registered — try login instead
        const user = await authService.login(email, password);
        return NextResponse.json({ user });
      }
    }

    if (action === "login") {
      try {
        const user = await authService.login(email, password);
        return NextResponse.json({ user });
      } catch {
        // User not in MemoryStore (server restarted) — auto-register transparently
        const user = await authService.register(email, password, name || email.split("@")[0]);
        return NextResponse.json({ user });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
