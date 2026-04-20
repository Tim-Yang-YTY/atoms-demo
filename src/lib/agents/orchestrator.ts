// ============================================================
// Agent Orchestrator — ReAct-based agentic pipeline
// Pipeline: Orchestrator → PM → Engineer → Designer → Arbiter
// Each agent follows: Plan → Execute → Observe → Reflect
//
// Safety mechanisms:
//   1. MAX_ITERATIONS hard cap (3)
//   2. Duplicate feedback detection (cosine-like bigram similarity)
//   3. Per-agent timeout (AGENT_TIMEOUT_MS)
//   4. Per-agent step limit (MAX_STEPS_PER_AGENT)
//
// Intent system:
//   Orchestrator uses clarify_intent to extract structured requirements,
//   surfaces assumptions, and aligns with user intent before dispatching.
// ============================================================

import type { AgentRole, AgentStep, PipelineAgent, AgentContext, SSEEvent } from "@/lib/types";
import { callLLMStream, AGENT_PROMPTS } from "./llm";
import { toolRegistry } from "@/lib/tools/registry";

// --- Safety constants ---
const MAX_ITERATIONS = 3;
const AGENT_TIMEOUT_MS = 300_000; // 5 min per agent (mock mode streams slowly due to simulated typing delays)
const MAX_STEPS_PER_AGENT = 6;   // max tool calls per agent per iteration

// ============================================================
// Safety: duplicate feedback detection
// Uses bigram overlap to detect if arbiter keeps giving the same feedback
// ============================================================
function bigrams(text: string): Set<string> {
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) {
    set.add(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return set;
}

function bigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const setA = bigrams(a);
  const setB = bigrams(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let overlap = 0;
  for (const bg of setA) { if (setB.has(bg)) overlap++; }
  return overlap / Math.max(setA.size, setB.size);
}

// ============================================================
// Safety: per-agent timeout wrapper
// ============================================================
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Agent timeout: ${label} exceeded ${ms}ms`)), ms)
    ),
  ]);
}

// Helper to collect a full LLM stream with timeout
async function collectStream(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  agentLabel: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  let result = "";
  const streamPromise = (async () => {
    for await (const chunk of callLLMStream(systemPrompt, messages)) {
      result += chunk;
      onChunk(chunk);
    }
    return result;
  })();
  return withTimeout(streamPromise, AGENT_TIMEOUT_MS, agentLabel);
}

// ============================================================
// Helpers
// ============================================================
function stepEvent(agent: AgentRole, stepType: AgentStep["stepType"], content: string, extra?: Partial<AgentStep>): SSEEvent {
  return { type: "agent_step", agent, step: { agent, stepType, content, ...extra } };
}

function pipelineStatus(agents: AgentRole[], active: AgentRole, iteration: number): PipelineAgent[] {
  const order: AgentRole[] = ["orchestrator", "pm", "engineer", "designer", "arbiter"];
  const included = order.filter((a) => agents.includes(a));
  return included.map((a) => ({
    agent: a,
    status: a === active ? "active" : included.indexOf(a) < included.indexOf(active) ? "completed" : "pending",
    iteration,
  }));
}

// ============================================================
// Main orchestration loop
// ============================================================
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
  let prevArbiterFeedback = "";  // for duplicate detection
  let arbiterFeedback = "";

  while (iteration <= MAX_ITERATIONS) {
    yield { type: "iteration", iteration, maxIterations: MAX_ITERATIONS };

    // ============================================================
    // Phase 0: Orchestrator — Intent recognition + requirements alignment
    // ============================================================
    yield { type: "pipeline_update", pipeline: pipelineStatus(pipeline, "orchestrator", iteration) };
    yield { type: "agent_start", agent: "orchestrator" };

    // PLAN
    yield stepEvent("orchestrator", "plan", "Analyzing user request: classifying intent, extracting requirements, checking alignment");

    // EXECUTE — clarify_intent: structured requirement extraction
    const clarifyTool = toolRegistry.get("clarify_intent");
    let intentAnalysis = "";
    let intentParsed: Record<string, unknown> = {};
    let stepCount = 0;
    if (clarifyTool) {
      intentAnalysis = await clarifyTool.execute({ prompt: userPrompt });
      intentParsed = JSON.parse(intentAnalysis);
      stepCount++;
      yield stepEvent("orchestrator", "execute", "Extracting structured intent and requirements", {
        toolName: "clarify_intent",
        toolInput: userPrompt.slice(0, 100),
        toolOutput: intentAnalysis,
      });
    }

    // OBSERVE — surface requirements alignment
    const intentType = (intentParsed.intentType as string) || "build";
    const domains = (intentParsed.domains as string[]) || [];
    const features = (intentParsed.features as string[]) || [];
    const confidence = (intentParsed.confidence as string) || "medium";
    const ambiguities = (intentParsed.ambiguities as string[]) || [];
    const complexity = (intentParsed.complexity as string) || "medium";
    const isModify = intentType === "modify" && !!currentCode;

    // Build a requirements alignment summary the user/PM can reference
    const alignmentSummary = [
      `Intent: ${intentType}`,
      `Domain: ${domains.length > 0 ? domains.join(", ") : "unspecified (will infer)"}`,
      `Features detected: ${features.length > 0 ? features.join(", ") : "none explicit (will infer from context)"}`,
      `Confidence: ${confidence}`,
      `Complexity: ${complexity}`,
      ambiguities.length > 0 ? `Gaps: ${ambiguities.join("; ")}` : "No major gaps",
    ].join("\n");

    yield stepEvent("orchestrator", "observe", `Requirements alignment:\n${alignmentSummary}`);

    // --- Short-circuit: if request needs clarification, ask questions and stop ---
    const needsClarification = (intentParsed.needsClarification as boolean) || false;
    if (needsClarification && iteration === 1 && !isModify) {
      const clarifyMsg = [
        `Before I start building, I'd like to clarify a few things to make sure I get this right:\n`,
        ...ambiguities.map((a, i) => `${i + 1}. ${a}`),
        `\nCould you provide more details? For example:`,
        domains.length === 0 ? `- What type of app do you want? (e.g., tracker, dashboard, editor, game)` : null,
        features.length === 0 ? `- What key features should it have? (e.g., login, CRUD, charts, search)` : null,
        `\nOr if you'd like me to proceed with my best interpretation, just say "go ahead".`,
      ].filter(Boolean).join("\n");

      yield { type: "agent_message", agent: "orchestrator", content: clarifyMsg };
      yield stepEvent("orchestrator", "reflect", "Request is ambiguous. Asking for clarification before proceeding.");
      yield { type: "agent_complete", agent: "orchestrator" };
      yield { type: "done" };
      return;
    }

    // EXECUTE — create execution plan
    const planTool = toolRegistry.get("create_plan");
    let planResult = "";
    if (planTool && stepCount < MAX_STEPS_PER_AGENT) {
      planResult = await planTool.execute({ features, complexity });
      stepCount++;
      yield stepEvent("orchestrator", "execute", "Creating execution plan", {
        toolName: "create_plan",
        toolInput: JSON.stringify({ features: features.slice(0, 5), complexity }),
        toolOutput: planResult,
      });
    }

    // REFLECT — generate orchestrator message with requirements alignment
    let orchResponse = "";
    const iterationContext = iteration > 1
      ? `\n\nITERATION ${iteration}: Previous arbiter feedback:\n${arbiterFeedback}\nFocus on addressing the deficiencies.`
      : "";

    const orchMessages = [
      { role: "user" as const, content: `User request: ${userPrompt}\n\nRequirements alignment:\n${alignmentSummary}\n\nPlan: ${planResult}\n\nHistory:\n${historyText}${iterationContext}\n\nRespond with:\n1. Your interpretation of the user's requirements (what you understand they want)\n2. Any assumptions you are making (features not explicitly stated but inferred)\n3. The execution plan with agent assignments\n\nBe explicit about assumptions so the user can correct misunderstandings.` },
    ];

    orchResponse = await collectStream(AGENT_PROMPTS.orchestrator, orchMessages, "Orchestrator", (chunk) => {
      // no-op: we collect then yield at once for orchestrator
    });
    // Yield orchestrator response in one batch (it's a plan, not code)
    yield { type: "agent_message", agent: "orchestrator", content: orchResponse };

    yield stepEvent("orchestrator", "reflect", `Requirements aligned. Confidence: ${confidence}. ${iteration > 1 ? "Addressing previous deficiencies." : "Proceeding with initial plan."}`);
    yield { type: "agent_complete", agent: "orchestrator" };

    // ============================================================
    // Phase 1: Product Manager — Analyze requirements
    // ============================================================
    yield { type: "pipeline_update", pipeline: pipelineStatus(pipeline, "pm", iteration) };
    yield { type: "agent_start", agent: "pm" };

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

    yield stepEvent("pm", "observe", `Tool output: ${analysis}`);

    let pmResponse = "";
    const pmMessages = [
      { role: "user" as const, content: `User request: ${userPrompt}\n\nOrchestrator's requirements alignment:\n${orchResponse}\n\nTool analysis: ${analysis}\n\n${iteration > 1 ? `Arbiter feedback from previous iteration:\n${arbiterFeedback}\n\n` : ""}Based on the orchestrator's interpretation and assumptions above, provide a concise product plan:\n1) Key features list (confirm or adjust the orchestrator's interpretation)\n2) User flows\n3) Data model\n\nBe brief and structured.` },
    ];

    pmResponse = await collectStream(AGENT_PROMPTS.pm, pmMessages, "PM", (chunk) => {
      // stream chunks
    });
    yield { type: "agent_message", agent: "pm", content: pmResponse };

    yield stepEvent("pm", "reflect", "Product specification complete. Handing off to Engineer.");
    yield { type: "agent_complete", agent: "pm" };

    // ============================================================
    // Phase 2: Engineer — Generate code
    // ============================================================
    yield { type: "pipeline_update", pipeline: pipelineStatus(pipeline, "engineer", iteration) };
    yield { type: "agent_start", agent: "engineer" };

    const engPlanSteps = isModify
      ? ["Load existing code", "Identify change target", "Apply modification", "Verify no regressions", "Output updated HTML"]
      : ["Set up HTML structure", "Implement CSS with dark theme", "Build JavaScript logic", "Add localStorage persistence", "Wire up all features"];
    yield stepEvent("engineer", "plan", isModify ? "Planning code modification" : "Planning code generation", { planSteps: engPlanSteps, currentStep: 0 });

    let engineerResponse = "";
    let codeBuffer = "";

    // Build engineer prompt — include existing code if modifying or re-iterating
    const includeExistingCode = currentCode && (isModify || iteration > 1);
    const engineerPromptParts = [
      `Product plan:\n${pmResponse}`,
      `\nOriginal request: ${userPrompt}`,
    ];
    if (includeExistingCode) {
      engineerPromptParts.push(`\n\nExisting code (${currentCode.length} chars):\n${currentCode}`);
      if (isModify) {
        engineerPromptParts.push(`\n\nThe user wants to MODIFY the existing app. Apply ONLY the requested changes. Do NOT regenerate from scratch. Preserve all existing functionality.`);
        engineerPromptParts.push(`\nModification request: ${userPrompt}`);
      } else if (arbiterFeedback) {
        engineerPromptParts.push(`\n\nArbiter feedback:\n${arbiterFeedback}`);
      }
    }
    engineerPromptParts.push(`\n\nGenerate a COMPLETE, self-contained single HTML file. Include ALL HTML, CSS, and JavaScript inline. The app must be fully functional. Use modern dark UI (bg #0f0f0f, text #e4e4e7). Use localStorage for persistence. Output ONLY the HTML code wrapped in \`\`\`html ... \`\`\` tags.`);

    const engineerMessages = [
      { role: "user" as const, content: engineerPromptParts.join("") },
    ];

    yield stepEvent("engineer", "execute", "Generating application code");

    engineerResponse = await collectStream(AGENT_PROMPTS.engineer, engineerMessages, "Engineer", (chunk) => {
      // We need to stream engineer chunks for UX
    });
    yield { type: "agent_message", agent: "engineer", content: engineerResponse };

    // Extract code from response
    const codeMatch = engineerResponse.match(/```html\s*([\s\S]*?)```/);
    if (codeMatch && codeMatch[1]) {
      codeBuffer = codeMatch[1].trim();
    } else if (engineerResponse.includes("```html")) {
      codeBuffer = (engineerResponse.split("```html")[1] || "").trim();
    }

    yield stepEvent("engineer", "observe", `Generated ${codeBuffer.length} characters of HTML`);

    if (codeBuffer) {
      currentCode = codeBuffer;
      yield { type: "code_update", code: codeBuffer };
    }

    yield stepEvent("engineer", "reflect", "Code generation complete. Ready for design review.");
    yield { type: "agent_complete", agent: "engineer" };

    // ============================================================
    // Phase 3: Designer — Review UI/UX
    // ============================================================
    yield { type: "pipeline_update", pipeline: pipelineStatus(pipeline, "designer", iteration) };
    yield { type: "agent_start", agent: "designer" };

    yield stepEvent("designer", "plan", "Preparing to review visual design, usability, and accessibility");

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

    yield stepEvent("designer", "observe", `Validation result: ${validation}`);

    const designerMessages = [
      { role: "user" as const, content: `Review this generated app and suggest UI/UX improvements:\n\nValidation: ${validation}\n\nCode length: ${codeBuffer.length} chars\n\nOriginal request: ${userPrompt}\n\nProvide a brief review: 1) What looks good 2) Potential improvements 3) Accessibility notes. Keep it concise.` },
    ];

    const designerResponse = await collectStream(AGENT_PROMPTS.designer, designerMessages, "Designer", () => {});
    yield { type: "agent_message", agent: "designer", content: designerResponse };

    yield stepEvent("designer", "reflect", "Design review complete. Passing to Arbiter for final evaluation.");
    yield { type: "agent_complete", agent: "designer" };

    // ============================================================
    // Phase 4: Arbiter (仲裁官) — Evaluate requirements
    // ============================================================
    yield { type: "pipeline_update", pipeline: pipelineStatus(pipeline, "arbiter", iteration) };
    yield { type: "agent_start", agent: "arbiter" };

    yield stepEvent("arbiter", "plan", "Preparing to evaluate app against all user requirements");

    // EXECUTE — test_app tool
    const testTool = toolRegistry.get("test_app");
    let testResult = "";
    let arbiterSteps = 0;
    if (testTool && codeBuffer && arbiterSteps < MAX_STEPS_PER_AGENT) {
      testResult = await testTool.execute({ code: codeBuffer, requirements: userPrompt.split(/[,.]/).map((s: string) => s.trim()).filter(Boolean) });
      arbiterSteps++;
      yield stepEvent("arbiter", "execute", "Running app structure and feature tests", {
        toolName: "test_app",
        toolInput: `${codeBuffer.length} chars + ${userPrompt.slice(0, 60)}...`,
        toolOutput: testResult,
      });
    }

    // EXECUTE — evaluate_requirements tool
    const evalTool = toolRegistry.get("evaluate_requirements");
    let evalResult = "";
    if (evalTool && codeBuffer && arbiterSteps < MAX_STEPS_PER_AGENT) {
      evalResult = await evalTool.execute({ code: codeBuffer, description: userPrompt });
      arbiterSteps++;
      yield stepEvent("arbiter", "execute", "Evaluating requirements coverage", {
        toolName: "evaluate_requirements",
        toolInput: userPrompt.slice(0, 80),
        toolOutput: evalResult,
      });
    }

    yield stepEvent("arbiter", "observe", `Test results: ${testResult}\nRequirements evaluation: ${evalResult}`);

    // Generate arbiter verdict via LLM
    let arbiterResponse = "";
    const arbiterMessages = [
      { role: "user" as const, content: `Evaluate this app against the user's requirements.\n\nOriginal request: ${userPrompt}\n\nOrchestrator's interpretation:\n${orchResponse}\n\nTest results: ${testResult}\n\nRequirements evaluation: ${evalResult}\n\nCode size: ${codeBuffer.length} chars\n\nProvide: 1) Requirements checklist with PASS/FAIL per item 2) Technical checks 3) Final PASS or FAIL verdict 4) If FAIL, list specific deficiencies and recommendations.` },
    ];

    arbiterResponse = await collectStream(AGENT_PROMPTS.arbiter, arbiterMessages, "Arbiter", () => {});
    yield { type: "agent_message", agent: "arbiter", content: arbiterResponse };

    // Parse verdict
    const passed = /verdict.*pass|✅\s*pass|result.*pass/i.test(arbiterResponse) && !/verdict.*fail|❌\s*fail|result.*fail/i.test(arbiterResponse);

    // --- Safety: duplicate feedback detection ---
    const similarity = bigramSimilarity(prevArbiterFeedback, arbiterResponse);
    const isDuplicate = iteration > 1 && similarity > 0.8;

    if (isDuplicate && !passed) {
      yield stepEvent("arbiter", "reflect", `Duplicate feedback detected (similarity: ${(similarity * 100).toFixed(0)}%). Terminating to avoid unproductive loop.`, {
        evaluation: {
          passed: false,
          reason: `Iteration terminated: arbiter feedback is ${(similarity * 100).toFixed(0)}% similar to previous round — re-iteration unlikely to help`,
          deficiencies: ["Duplicate feedback — same issues persist across iterations"],
        },
      });
      yield { type: "agent_complete", agent: "arbiter" };
      yield { type: "pipeline_update", pipeline: pipeline.map((a) => ({ agent: a, status: "completed" as const, iteration })) };
      break;
    }

    // Normal reflection
    yield stepEvent("arbiter", "reflect", passed ? "All requirements met. App approved." : `Deficiencies found. ${iteration < MAX_ITERATIONS ? "Requesting re-iteration." : "Max iterations reached."}`, {
      evaluation: {
        passed,
        reason: passed ? "All requirements verified" : "Some requirements not met",
        deficiencies: passed ? undefined : arbiterResponse.match(/deficienc[^.]+\./gi)?.map((s) => s.trim()) || ["See arbiter report"],
      },
    });

    yield { type: "agent_complete", agent: "arbiter" };

    // If passed or max iterations, done
    if (passed || iteration >= MAX_ITERATIONS) {
      yield { type: "pipeline_update", pipeline: pipeline.map((a) => ({ agent: a, status: "completed" as const, iteration })) };
      break;
    }

    // Prepare next iteration
    prevArbiterFeedback = arbiterFeedback;
    arbiterFeedback = arbiterResponse;
    iteration++;
  }

  // --- Proactive follow-up: ask if anything needs adjusting ---
  yield { type: "agent_start", agent: "system" };
  yield { type: "agent_message", agent: "system", content: "Your app is ready! Is there anything you'd like me to adjust? You can ask for specific changes like:\n- \"Move the category dropdown before the name field\"\n- \"Add a dark blue color scheme instead\"\n- \"Make the chart bigger\"\n\nOr give a thumbs up/down below the preview to record your feedback." };
  yield { type: "agent_complete", agent: "system" };

  yield { type: "done" };
}
