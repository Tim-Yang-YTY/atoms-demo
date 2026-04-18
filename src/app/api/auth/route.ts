// Auth API — login/register endpoints
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/services/auth-service";

export async function POST(req: NextRequest) {
  try {
    const { action, email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    if (action === "register") {
      const user = await authService.register(email, password, name || email.split("@")[0]);
      return NextResponse.json({ user });
    }

    if (action === "login") {
      const user = await authService.login(email, password);
      return NextResponse.json({ user });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
