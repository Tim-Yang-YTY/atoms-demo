import { toolRegistry } from "@/lib/tools/registry";

describe("ToolRegistry", () => {
  it("has analyze_requirements tool registered", () => {
    expect(toolRegistry.has("analyze_requirements")).toBe(true);
  });

  it("has validate_html tool registered", () => {
    expect(toolRegistry.has("validate_html")).toBe(true);
  });

  it("analyze_requirements extracts features from prompt", async () => {
    const tool = toolRegistry.get("analyze_requirements")!;
    const result = await tool.execute({
      prompt: "Build an app with login, search, and chart features",
    });
    const parsed = JSON.parse(result);
    expect(parsed.features).toContain("login");
    expect(parsed.features).toContain("search");
    expect(parsed.features).toContain("chart");
  });

  it("validate_html detects missing elements", async () => {
    const tool = toolRegistry.get("validate_html")!;
    const result = await tool.execute({ code: "<div>incomplete</div>" });
    const parsed = JSON.parse(result);
    expect(parsed.valid).toBe(false);
    expect(parsed.issues.length).toBeGreaterThan(0);
  });

  it("validate_html passes valid HTML", async () => {
    const tool = toolRegistry.get("validate_html")!;
    const result = await tool.execute({
      code: '<!DOCTYPE html><html><head><meta name="viewport"></head><body>ok</body></html>',
    });
    const parsed = JSON.parse(result);
    expect(parsed.valid).toBe(true);
  });
});
