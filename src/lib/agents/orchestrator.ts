// ============================================================
// Agent Orchestrator — ReAct-based multi-agent pipeline
// Pipeline: Orchestrator → PM → Engineer → Designer → Arbiter
// Each agent follows: Plan → Execute → Observe → Reflect
// Arbiter can trigger re-iteration if requirements not met
// ============================================================

import type { AgentRole, AgentStep, PipelineAgent, AgentContext, SSEEvent } from "@/lib/types";
import { callLLMStream, AGENT_PROMPTS } from "./llm";
import { toolRegistry } from "@/lib/tools/registry";

const MAX_ITERATIONS = 3;

// Helper: emit a ReAct step event
function stepEvent(agent: AgentRole, stepType: AgentStep["stepType"], content: string, extra?: Partial<AgentStep>): SSEEvent {
  return { type: "agent_step", agent, step: { agent, stepType, content, ...extra } };
}

// Helper: build pipeline status
function pipelineStatus(agents: AgentRole[], active: AgentRole, iteration: number): PipelineAgent[] {
  const order: AgentRole[] = ["orchestrator", "pm", "engineer", "designer", "arbiter"];
  const included = order.filter((a) => agents.includes(a));
  return included.map((a) => ({
    agent: a,
    status: a === active ? "active" : included.indexOf(a) < included.indexOf(active) ? "completed" : "pending",
    iteration,
  }));
}

export async function* orchestrate(
  userPrompt: string,
  context: AgentContext
): AsyncGenerator<SSEEvent> {
  const historyText = context.conversationHistory
    .slice(-10)
    .map((m) => `[${m.role}]: ${m.content}`)
    .join("\n");

  const pipeline: AgentRole[] = ["orchestrator", "pm", "engineer", "designer", "arbiter"];
  let iteration = 1;
  let currentCode = context.currentCode || "";
  let arbiterFeedback = "";

  while (iteration <= MAX_ITERATIONS) {
    yield { type: "iteration", iteration, maxIterations: MAX_ITERATIONS };

    // ============================================================
    // Phase 0: Orchestrator — Plan the execution
    // ============================================================
    yield { type: "pipeline_update", pipeline: pipelineStatus(pipeline, "orchestrator", iteration) };
    yield { type: "agent_start", agent: "orchestrator" };

    // PLAN
    yield stepEvent("orchestrator", "plan", "Analyzing user request and planning execution strategy");

    // EXECUTE — use clarify_intent tool
    const clarifyTool = toolRegistry.get("clarify_intent");
    let intentAnalysis = "";
    if (clarifyTool) {
      intentAnalysis = await clarifyTool.execute({ prompt: userPrompt });
      yield stepEvent("orchestrator", "execute", "Analyzing intent clarity", {
        toolName: "clarify_intent",
        toolInput: userPrompt.slice(0, 100),
        toolOutput: intentAnalysis,
      });
    }

    // EXECUTE — use create_plan tool
    const planTool = toolRegistry.get("create_plan");
    let planResult = "";
    if (planTool) {
      const parsed = intentAnalysis ? JSON.parse(intentAnalysis) : {};
      planResult = await planTool.execute({ features: parsed.features || [], complexity: parsed.confidence || "medium" });
      yield stepEvent("orchestrator", "execute", "Creating execution plan", {
        toolName: "create_plan",
        toolInput: JSON.stringify({ complexity: parsed.confidence }),
        toolOutput: planResult,
      });
    }

    // OBSERVE
    yield stepEvent("orchestrator", "observe", `Intent analysis: ${intentAnalysis}\nExecution plan: ${planResult}`);

    // REFLECT + generate orchestrator message
    let orchResponse = "";
    const iterationContext = iteration > 1 ? `\n\nITERATION ${iteration}: Previous arbiter feedback:\n${arbiterFeedback}\nFocus on addressing the deficiencies.` : "";
    const orchMessages = [
      { role: "user" as const, content: `User request: ${userPrompt}\n\nIntent analysis: ${intentAnalysis}\nPlan: ${planResult}\n\nHistory:\n${historyText}${iterationContext}\n\nCreate a brief execution plan.` },
    ];

    for await (const chunk of callLLMStream(AGENT_PROMPTS.orchestrator, orchMessages)) {
      orchResponse += chunk;
      yield { type: "agent_message", agent: "orchestrator", content: chunk };
    }

    yield stepEvent("orchestrator", "reflect", `Execution plan created. ${iteration > 1 ? "Addressing previous deficiencies." : "Proceeding with initial plan."}`);
    yield { type: "agent_complete", agent: "orchestrator" };

    // ============================================================
    // Phase 1: Product Manager — Analyze requirements
    // ============================================================
    yield { type: "pipeline_update", pipeline: pipelineStatus(pipeline, "pm", iteration) };
    yield { type: "agent_start", agent: "pm" };

    // PLAN
    yield stepEvent("pm", "plan", "Preparing to analyze requirements and create product specification");

    // EXECUTE — use analyze_requirements tool
    const analysisTool = toolRegistry.get("analyze_requirements");
    let analysis = "";
    if (analysisTool) {
      analysis = await analysisTool.execute({ prompt: userPrompt });
      yield stepEvent("pm", "execute", "Running requirements analysis", {
        toolName: "analyze_requirements",
        toolInput: userPrompt.slice(0, 100),
        toolOutput: analysis,
      });
    }

    // OBSERVE
    yield stepEvent("pm", "observe", `Tool output: ${analysis}`);

    // Generate PM response
    let pmResponse = "";
    const pmMessages = [
      { role: "user" as const, content: `User request: ${userPrompt}\n\nOrchestrator plan:\n${orchResponse}\n\nTool analysis: ${analysis}\n\n${iteration > 1 ? `Arbiter feedback from previous iteration:\n${arbiterFeedback}\n\n` : ""}Provide a concise product plan with: 1) Key features list 2) User flows 3) Data model. Be brief and structured.` },
    ];

    for await (const chunk of callLLMStream(AGENT_PROMPTS.pm, pmMessages)) {
      pmResponse += chunk;
      yield { type: "agent_message", agent: "pm", content: chunk };
    }

    // REFLECT
    yield stepEvent("pm", "reflect", "Product specification complete. Handing off to Engineer.");
    yield { type: "agent_complete", agent: "pm" };

    // ============================================================
    // Phase 2: Engineer — Generate code
    // ============================================================
    yield { type: "pipeline_update", pipeline: pipelineStatus(pipeline, "engineer", iteration) };
    yield { type: "agent_start", agent: "engineer" };

    // PLAN
    const engPlanSteps = ["Set up HTML structure", "Implement CSS with dark theme", "Build JavaScript logic", "Add localStorage persistence", "Wire up all features"];
    yield stepEvent("engineer", "plan", "Planning code generation", { planSteps: engPlanSteps, currentStep: 0 });

    let engineerResponse = "";
    let codeBuffer = "";

    const engineerMessages = [
      { role: "user" as const, content: `Product plan:\n${pmResponse}\n\nOriginal request: ${userPrompt}\n\n${currentCode && iteration > 1 ? `Current code to improve (fix deficiencies):\n${currentCode}\n\nArbiter feedback:\n${arbiterFeedback}\n\n` : ""}Generate a COMPLETE, self-contained single HTML file. Include ALL HTML, CSS, and JavaScript inline. The app must be fully functional. Use modern dark UI (bg #0f0f0f, text #e4e4e7). Use localStorage for persistence. Output ONLY the HTML code wrapped in \`\`\`html ... \`\`\` tags.` },
    ];

    // EXECUTE — stream code generation
    yield stepEvent("engineer", "execute", "Generating application code");

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
        const partial = fullText.split("```html")[1] || "";
        if (partial.trim() !== codeBuffer) {
          codeBuffer = partial.trim();
        }
      }
    }

    // OBSERVE
    yield stepEvent("engineer", "observe", `Generated ${codeBuffer.length} characters of HTML`);

    // Send final code update
    if (codeBuffer) {
      currentCode = codeBuffer;
      yield { type: "code_update", code: codeBuffer };
    }

    // REFLECT
    yield stepEvent("engineer", "reflect", "Code generation complete. Ready for design review.");
    yield { type: "agent_complete", agent: "engineer" };

    // ============================================================
    // Phase 3: Designer — Review UI/UX
    // ============================================================
    yield { type: "pipeline_update", pipeline: pipelineStatus(pipeline, "designer", iteration) };
    yield { type: "agent_start", agent: "designer" };

    // PLAN
    yield stepEvent("designer", "plan", "Preparing to review visual design, usability, and accessibility");

    // EXECUTE — validate HTML
    const validateTool = toolRegistry.get("validate_html");
    let validation = "";
    if (validateTool && codeBuffer) {
      validation = await validateTool.execute({ code: codeBuffer });
      yield stepEvent("designer", "execute", "Validating HTML structure", {
        toolName: "validate_html",
        toolInput: `${codeBuffer.length} chars of HTML`,
        toolOutput: validation,
      });
    }

    // OBSERVE
    yield stepEvent("designer", "observe", `Validation result: ${validation}`);

    const designerMessages = [
      { role: "user" as const, content: `Review this generated app and suggest UI/UX improvements:\n\nValidation: ${validation}\n\nCode length: ${codeBuffer.length} chars\n\nOriginal request: ${userPrompt}\n\nProvide a brief review: 1) What looks good 2) Potential improvements 3) Accessibility notes. Keep it concise.` },
    ];

    for await (const chunk of callLLMStream(AGENT_PROMPTS.designer, designerMessages)) {
      yield { type: "agent_message", agent: "designer", content: chunk };
    }

    // REFLECT
    yield stepEvent("designer", "reflect", "Design review complete. Passing to Arbiter for final evaluation.");
    yield { type: "agent_complete", agent: "designer" };

    // ============================================================
    // Phase 4: Arbiter (仲裁官) — Evaluate requirements
    // ============================================================
    yield { type: "pipeline_update", pipeline: pipelineStatus(pipeline, "arbiter", iteration) };
    yield { type: "agent_start", agent: "arbiter" };

    // PLAN
    yield stepEvent("arbiter", "plan", "Preparing to evaluate app against all user requirements");

    // EXECUTE — test_app tool
    const testTool = toolRegistry.get("test_app");
    let testResult = "";
    if (testTool && codeBuffer) {
      testResult = await testTool.execute({ code: codeBuffer, requirements: userPrompt.split(/[,.]/).map((s: string) => s.trim()).filter(Boolean) });
      yield stepEvent("arbiter", "execute", "Running app structure and feature tests", {
        toolName: "test_app",
        toolInput: `${codeBuffer.length} chars + ${userPrompt.slice(0, 60)}...`,
        toolOutput: testResult,
      });
    }

    // EXECUTE — evaluate_requirements tool
    const evalTool = toolRegistry.get("evaluate_requirements");
    let evalResult = "";
    if (evalTool && codeBuffer) {
      evalResult = await evalTool.execute({ code: codeBuffer, description: userPrompt });
      yield stepEvent("arbiter", "execute", "Evaluating requirements coverage", {
        toolName: "evaluate_requirements",
        toolInput: userPrompt.slice(0, 80),
        toolOutput: evalResult,
      });
    }

    // OBSERVE
    yield stepEvent("arbiter", "observe", `Test results: ${testResult}\nRequirements evaluation: ${evalResult}`);

    // Generate arbiter verdict via LLM
    let arbiterResponse = "";
    const arbiterMessages = [
      { role: "user" as const, content: `Evaluate this app against the user's requirements.\n\nOriginal request: ${userPrompt}\n\nTest results: ${testResult}\n\nRequirements evaluation: ${evalResult}\n\nCode size: ${codeBuffer.length} chars\n\nProvide: 1) Requirements checklist with PASS/FAIL per item 2) Technical checks 3) Final PASS or FAIL verdict 4) If FAIL, list specific deficiencies and recommendations.` },
    ];

    for await (const chunk of callLLMStream(AGENT_PROMPTS.arbiter, arbiterMessages)) {
      arbiterResponse += chunk;
      yield { type: "agent_message", agent: "arbiter", content: chunk };
    }

    // Parse verdict — check if arbiter says PASS or FAIL
    const passed = /verdict.*pass|✅\s*pass|result.*pass/i.test(arbiterResponse) && !/verdict.*fail|❌\s*fail|result.*fail/i.test(arbiterResponse);

    // REFLECT with evaluation result
    yield stepEvent("arbiter", "reflect", passed ? "All requirements met. App approved." : `Deficiencies found. ${iteration < MAX_ITERATIONS ? "Requesting re-iteration." : "Max iterations reached."}`, {
      evaluation: {
        passed,
        reason: passed ? "All requirements verified" : "Some requirements not met",
        deficiencies: passed ? undefined : arbiterResponse.match(/deficienc[^.]+\./gi)?.map((s) => s.trim()) || ["See arbiter report"],
      },
    });

    yield { type: "agent_complete", agent: "arbiter" };

    // If passed or max iterations, we're done
    if (passed || iteration >= MAX_ITERATIONS) {
      yield { type: "pipeline_update", pipeline: pipeline.map((a) => ({ agent: a, status: "completed" as const, iteration })) };
      break;
    }

    // Otherwise, iterate with arbiter feedback
    arbiterFeedback = arbiterResponse;
    iteration++;
  }

  yield { type: "done" };
}
