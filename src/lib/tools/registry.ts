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
