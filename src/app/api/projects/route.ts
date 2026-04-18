// Projects API — list and create
import { NextRequest, NextResponse } from "next/server";
import { projectService } from "@/lib/services/project-service";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id");
    if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
    const projects = await projectService.getUserProjects(userId);
    return NextResponse.json({ projects });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, name, description, template } = await req.json();
    if (!user_id || !name) {
      return NextResponse.json({ error: "user_id and name required" }, { status: 400 });
    }
    const project = await projectService.createProject(user_id, name, description || "", template || null);
    return NextResponse.json({ project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
