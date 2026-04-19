// ToolRegistry — central tool registration with registry pattern
import type { ToolDefinition } from "@/lib/types";

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  register(tool: ToolDefinition): void { this.tools.set(tool.name, tool); }
  get(name: string): ToolDefinition | undefined { return this.tools.get(name); }
  getAll(): ToolDefinition[] { return Array.from(this.tools.values()); }
  has(name: string): boolean { return this.tools.has(name); }
}

export const toolRegistry = new ToolRegistry();

toolRegistry.register({
  name: "analyze_requirements",
  description: "Break down user requirements into features",
  execute: async (input) => {
    const prompt = (input.prompt as string) || "";
    const kws = ["login","register","add","edit","delete","search","filter","chart","list","form","timer","export","drag","sort"];
    const found = kws.filter(k => prompt.toLowerCase().includes(k));
    const words = prompt.split(/\s+/).length;
    return JSON.stringify({
      features: found.length > 0 ? found : ["core functionality"],
      complexity: words > 60 ? "complex" : words > 30 ? "medium" : "simple",
      techStack: "HTML + CSS + JavaScript (single-file)",
    });
  },
});

toolRegistry.register({
  name: "validate_html",
  description: "Validate generated HTML is well-formed",
  execute: async (input) => {
    const code = (input.code as string) || "";
    const issues: string[] = [];
    if (!code.includes("<!DOCTYPE html>")) issues.push("Missing DOCTYPE");
    if (!code.includes("<html")) issues.push("Missing html tag");
    if (!code.includes("</html>")) issues.push("Missing closing html");
    if (!code.includes("<head>")) issues.push("Missing head");
    if (!code.includes("<body>")) issues.push("Missing body");
    return JSON.stringify({ valid: issues.length === 0, issues, size: code.length });
  },
});

// --- Orchestrator tools ---

toolRegistry.register({
  name: "clarify_intent",
  description: "Analyze user request for ambiguity and identify what needs clarification",
  execute: async (input) => {
    const prompt = (input.prompt as string) || "";
    const words = prompt.split(/\s+/).length;
    const hasAppType = /\b(app|dashboard|tracker|editor|game|tool|manager|timer|calculator|viewer)\b/i.test(prompt);
    const hasFeatures = /\b(login|register|add|edit|delete|search|filter|chart|list|form|drag|sort|export|import|save)\b/i.test(prompt);
    const ambiguities: string[] = [];
    if (words < 5) ambiguities.push("Request is very brief — may need more detail");
    if (!hasAppType) ambiguities.push("No clear app type specified");
    if (!hasFeatures) ambiguities.push("No specific features mentioned");
    return JSON.stringify({
      wordCount: words,
      hasAppType,
      hasFeatures,
      ambiguities,
      needsClarification: ambiguities.length > 1,
      confidence: ambiguities.length === 0 ? "high" : ambiguities.length === 1 ? "medium" : "low",
    });
  },
});

toolRegistry.register({
  name: "create_plan",
  description: "Create a structured execution plan for the agent pipeline",
  execute: async (input) => {
    const features = (input.features as string[]) || [];
    const complexity = (input.complexity as string) || "medium";
    const steps = [
      { phase: 1, agent: "pm", task: "Analyze requirements and create product spec", output: "Feature list, user flows, data model" },
      { phase: 2, agent: "engineer", task: "Generate complete HTML application", output: "Single-file HTML app with all features" },
      { phase: 3, agent: "designer", task: "Review UI/UX and suggest improvements", output: "Design feedback with actionable suggestions" },
      { phase: 4, agent: "arbiter", task: "Evaluate app against all requirements", output: "PASS/FAIL verdict with deficiency report" },
    ];
    return JSON.stringify({
      steps,
      featureCount: features.length,
      complexity,
      estimatedAgents: 4,
      maxIterations: complexity === "complex" ? 3 : 2,
    });
  },
});

// --- Arbiter tools ---

toolRegistry.register({
  name: "test_app",
  description: "Programmatically test generated HTML app for structure, features, and accessibility",
  execute: async (input) => {
    const code = (input.code as string) || "";
    const requirements = (input.requirements as string[]) || [];
    const checks: { name: string; passed: boolean; detail: string }[] = [];

    // Structure checks
    checks.push({ name: "DOCTYPE", passed: code.includes("<!DOCTYPE html>"), detail: "Valid HTML5 doctype" });
    checks.push({ name: "viewport_meta", passed: /meta.*viewport/.test(code), detail: "Responsive viewport meta tag" });
    checks.push({ name: "dark_theme", passed: /#0f0f0f|#1a1a2e|#18181b|--bg/.test(code), detail: "Dark theme tokens applied" });
    checks.push({ name: "localStorage", passed: code.includes("localStorage"), detail: "Data persistence with localStorage" });
    checks.push({ name: "no_external_deps", passed: !/<script\s+src=/.test(code), detail: "No external script dependencies" });
    checks.push({ name: "event_listeners", passed: /addEventListener|onclick|onsubmit/.test(code), detail: "Interactive event handlers present" });

    // Feature checks — look for keywords from requirements in the HTML
    for (const req of requirements) {
      const reqLower = req.toLowerCase();
      const keywords = reqLower.split(/\s+/).filter((w: string) => w.length > 3);
      const found = keywords.some((kw: string) => code.toLowerCase().includes(kw));
      checks.push({ name: `req_${reqLower.replace(/\s+/g, "_").slice(0, 30)}`, passed: found, detail: `Requirement: ${req}` });
    }

    const passed = checks.filter((c) => c.passed).length;
    const total = checks.length;
    return JSON.stringify({ passed, total, score: Math.round((passed / total) * 100), checks });
  },
});

toolRegistry.register({
  name: "evaluate_requirements",
  description: "Check if all user requirements are addressed in the generated app",
  execute: async (input) => {
    const code = (input.code as string) || "";
    const description = (input.description as string) || "";
    // Extract likely requirements from description
    const reqPatterns = [
      { name: "authentication", pattern: /login|register|auth|sign.?in|sign.?up/i },
      { name: "crud_operations", pattern: /add|create|edit|update|delete|remove/i },
      { name: "search", pattern: /search|find|filter|query/i },
      { name: "data_display", pattern: /list|table|grid|card|dashboard/i },
      { name: "charts", pattern: /chart|graph|pie|bar|line|visual/i },
      { name: "persistence", pattern: /save|store|persist|localStorage/i },
      { name: "categories", pattern: /categor|tag|label|group|folder/i },
      { name: "responsive", pattern: /responsive|mobile|viewport/i },
    ];
    const expected = reqPatterns.filter((r) => r.pattern.test(description));
    const results = expected.map((r) => ({
      requirement: r.name,
      inDescription: true,
      inCode: r.pattern.test(code),
      met: r.pattern.test(code),
    }));
    const metCount = results.filter((r) => r.met).length;
    return JSON.stringify({
      totalExpected: expected.length,
      totalMet: metCount,
      allMet: metCount === expected.length,
      results,
    });
  },
});
