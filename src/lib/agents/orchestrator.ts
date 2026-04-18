// ============================================================
// Agent Orchestrator — Multi-agent pipeline coordinator
// Multi-agent pipeline coordinator
// Pipeline: PM (plan) -> Engineer (code) -> Designer (refine)
// ============================================================

import type { AgentContext, SSEEvent } from "@/lib/types";
import { callLLMStream, AGENT_PROMPTS } from "./llm";
import { toolRegistry } from "@/lib/tools/registry";

export async function* orchestrate(
  userPrompt: string,
  context: AgentContext
): AsyncGenerator<SSEEvent> {
  const historyText = context.conversationHistory
    .slice(-10)
    .map((m) => `[${m.role}]: ${m.content}`)
    .join("\n");

  // --- Phase 1: Product Manager analyzes requirements ---
  yield { type: "agent_start", agent: "pm" };

  // Use tool to analyze requirements
  const analysisTool = toolRegistry.get("analyze_requirements");
  let analysis = "";
  if (analysisTool) {
    analysis = await analysisTool.execute({ prompt: userPrompt });
  }

  let pmResponse = "";
  const pmMessages = [
    { role: "user" as const, content: `User request: ${userPrompt}\n\nTool analysis: ${analysis}\n\nPrevious conversation:\n${historyText}\n\nProvide a concise product plan with: 1) Key features list 2) User flows 3) Data model. Be brief and structured.` },
  ];

  for await (const chunk of callLLMStream(AGENT_PROMPTS.pm, pmMessages)) {
    pmResponse += chunk;
    yield { type: "agent_message", agent: "pm", content: chunk };
  }
  yield { type: "agent_complete", agent: "pm" };

  // --- Phase 2: Engineer generates code ---
  yield { type: "agent_start", agent: "engineer" };

  let engineerResponse = "";
  let codeBuffer = "";

  const engineerMessages = [
    { role: "user" as const, content: `Product plan:\n${pmResponse}\n\nOriginal request: ${userPrompt}\n\n${context.currentCode ? `Current code to improve:\n${context.currentCode}\n\n` : ""}Generate a COMPLETE, self-contained single HTML file. Include ALL HTML, CSS, and JavaScript inline. The app must be fully functional. Use modern dark UI (bg #0f0f0f, text #e4e4e7). Use localStorage for persistence. Output ONLY the HTML code wrapped in \`\`\`html ... \`\`\` tags.` },
  ];

  for await (const chunk of callLLMStream(AGENT_PROMPTS.engineer, engineerMessages)) {
    engineerResponse += chunk;
    yield { type: "agent_message", agent: "engineer", content: chunk };

    // Extract code from markdown code blocks in real-time
    const fullText = engineerResponse;
    const codeMatch = fullText.match(/```html\s*([\s\S]*?)```/);
    if (codeMatch && codeMatch[1]) {
      const newCode = codeMatch[1].trim();
      if (newCode !== codeBuffer) {
        codeBuffer = newCode;
      }
    } else if (fullText.includes("```html") && !fullText.includes("```html\n```")) {
      // Still streaming code block
      const partial = fullText.split("```html")[1] || "";
      if (partial.trim() !== codeBuffer) {
        codeBuffer = partial.trim();
      }
    }
  }

  // Send final code update
  if (codeBuffer) {
    yield { type: "code_update", code: codeBuffer };
  }
  yield { type: "agent_complete", agent: "engineer" };

  // --- Phase 3: Designer reviews & refines ---
  yield { type: "agent_start", agent: "designer" };

  // Validate with tool
  const validateTool = toolRegistry.get("validate_html");
  let validation = "";
  if (validateTool && codeBuffer) {
    validation = await validateTool.execute({ code: codeBuffer });
  }

  const designerMessages = [
    { role: "user" as const, content: `Review this generated app and suggest UI/UX improvements:\n\nValidation: ${validation}\n\nCode length: ${codeBuffer.length} chars\n\nOriginal request: ${userPrompt}\n\nProvide a brief review: 1) What looks good 2) Potential improvements 3) Accessibility notes. Keep it concise.` },
  ];

  for await (const chunk of callLLMStream(AGENT_PROMPTS.designer, designerMessages)) {
    yield { type: "agent_message", agent: "designer", content: chunk };
  }
  yield { type: "agent_complete", agent: "designer" };

  yield { type: "done" };
}
