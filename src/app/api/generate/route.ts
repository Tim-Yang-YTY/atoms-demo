// ============================================================
// Generate API — SSE streaming endpoint for multi-agent orchestration
// SSE streaming endpoint for multi-agent orchestration
// This is the core AI-native endpoint
// ============================================================

import { NextRequest } from "next/server";
import { orchestrate } from "@/lib/agents/orchestrator";
import { projectService } from "@/lib/services/project-service";
import type { AgentContext, SSEEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { prompt, project_id, user_id } = await req.json();

    if (!prompt || !project_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "prompt, project_id, and user_id required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Save user message
    await projectService.addMessage(project_id, "user", prompt);
    await projectService.setProjectStatus(project_id, "generating");

    // Get conversation history for context
    const messages = await projectService.getMessages(project_id);
    const project = await projectService.getProject(project_id);

    const context: AgentContext = {
      projectId: project_id,
      userId: user_id,
      conversationHistory: messages,
      currentCode: project?.generated_code || undefined,
    };

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const agentMessages: { role: string; content: string }[] = [];
        let finalCode = "";

        try {
          for await (const event of orchestrate(prompt, context)) {
            // Send SSE event
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));

            // Collect agent messages for persistence
            if (event.type === "agent_message" && event.agent && event.content) {
              const last = agentMessages[agentMessages.length - 1];
              if (last && last.role === event.agent) {
                last.content += event.content;
              } else {
                agentMessages.push({ role: event.agent, content: event.content });
              }
            }

            // Capture final code
            if (event.type === "code_update" && event.code) {
              finalCode = event.code;
            }
          }

          // Persist agent messages and code
          if (agentMessages.length > 0) {
            await projectService.addMessages(
              agentMessages.map((m) => ({
                project_id,
                role: m.role as "pm" | "engineer" | "designer",
                content: m.content,
              }))
            );
          }

          if (finalCode) {
            await projectService.updateProjectCode(project_id, finalCode);
          } else {
            await projectService.setProjectStatus(project_id, "completed");
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Generation failed";
          const errorEvent: SSEEvent = { type: "error", content: errorMsg };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          await projectService.setProjectStatus(project_id, "error");
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
