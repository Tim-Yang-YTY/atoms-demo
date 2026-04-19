// ============================================================
// Skill Registry — Self-evolving agent skill system
// Hermes-inspired skill management with localStorage persistence
// Skills are procedural markdown documents agents can learn/create
// ============================================================

export interface Skill {
  id: string;
  name: string;
  agent: string; // pm | engineer | designer | shared
  description: string;
  version: string;
  category: string;
  tags: string[];
  content: string; // full markdown body
  createdAt: string;
  isBuiltIn: boolean;
}

// --- Built-in skills (mirrors docs/skills/*.md) ---
export const BUILT_IN_SKILLS: Skill[] = [
  {
    id: "pm-requirements-analysis",
    name: "requirements-analysis",
    agent: "pm",
    description: "Extract structured requirements from vague user descriptions",
    version: "1.0.0",
    category: "planning",
    tags: ["requirements", "analysis", "features"],
    content: `## When to Use\nWhen a user provides a vague or brief app description.\n\n## Procedure\n1. Identify the core domain\n2. Extract explicit features\n3. Infer implicit features (auth, CRUD, persistence)\n4. Categorize by priority\n5. Define user flows\n6. Design data model\n7. Estimate complexity`,
    createdAt: "2026-04-18T00:00:00Z",
    isBuiltIn: true,
  },
  {
    id: "pm-scope-estimation",
    name: "scope-estimation",
    agent: "pm",
    description: "Estimate project scope, complexity, and component count",
    version: "1.0.0",
    category: "planning",
    tags: ["scope", "estimation", "complexity"],
    content: `## When to Use\nWhen evaluating app complexity.\n\n## Procedure\n1. Count UI screens/views\n2. Count data entities\n3. Identify integration complexity\n4. Check for advanced features\n5. Assign complexity: Low / Medium / High`,
    createdAt: "2026-04-18T00:00:00Z",
    isBuiltIn: true,
  },
  {
    id: "eng-html-app-generation",
    name: "html-app-generation",
    agent: "engineer",
    description: "Generate complete single-file HTML applications",
    version: "1.0.0",
    category: "code-generation",
    tags: ["html", "css", "javascript", "app"],
    content: `## When to Use\nWhen generating a complete web app as a single HTML file.\n\n## Procedure\n1. DOCTYPE + viewport meta\n2. Embedded CSS with design tokens\n3. Dark theme (bg: #0f0f0f)\n4. Semantic HTML structure\n5. Vanilla JS, no dependencies\n6. localStorage persistence\n7. Responsive with flexbox/grid\n8. CSS transitions\n9. Wrap in \`\`\`html code blocks`,
    createdAt: "2026-04-18T00:00:00Z",
    isBuiltIn: true,
  },
  {
    id: "eng-dark-theme-ui",
    name: "dark-theme-ui",
    agent: "engineer",
    description: "Modern dark theme with consistent design tokens",
    version: "1.0.0",
    category: "design-system",
    tags: ["css", "theme", "dark-mode"],
    content: `## Design Tokens\n--bg: #0f0f0f, --surface: #1a1a2e, --border: #2a2a4a\n--text: #e4e4e7, --muted: #9ca3af, --primary: #8b5cf6\n\n## Procedure\n1. Apply --bg to body\n2. --surface for cards\n3. --border for borders\n4. Text hierarchy with --text / --muted\n5. --primary for interactive elements`,
    createdAt: "2026-04-18T00:00:00Z",
    isBuiltIn: true,
  },
  {
    id: "des-ui-review",
    name: "ui-review",
    agent: "designer",
    description: "Review apps for visual design, usability, and accessibility",
    version: "1.0.0",
    category: "review",
    tags: ["design", "accessibility", "usability"],
    content: `## When to Use\nAfter Engineer generates an application.\n\n## Procedure\n1. Check color consistency and spacing\n2. Verify interactive elements are discoverable\n3. Check contrast ratios and focus styles\n4. Verify responsive layout\n5. Check animations are smooth`,
    createdAt: "2026-04-18T00:00:00Z",
    isBuiltIn: true,
  },
  {
    id: "shared-self-improve",
    name: "self-improve",
    agent: "shared",
    description: "Meta-skill: create new skills from completed tasks",
    version: "1.0.0",
    category: "meta",
    tags: ["self-improvement", "learning", "meta-skill"],
    content: `## When to Use\nAfter completing a complex or novel task.\n\n## Triggers\n- Task needed 3+ iterations\n- User feedback improved output\n- Pattern emerged across requests\n- Workaround needed for limitation\n\n## Procedure\n1. Identify novel approach\n2. Extract step-by-step procedure\n3. Document failure modes\n4. Create skill file with metadata\n5. Include verification steps`,
    createdAt: "2026-04-18T00:00:00Z",
    isBuiltIn: true,
  },
];

const STORAGE_KEY = "atoms_skills";

/** Load all skills (built-in + user-created) */
export function getAllSkills(): Skill[] {
  const userSkills = getUserSkills();
  return [...BUILT_IN_SKILLS, ...userSkills];
}

/** Load user-created skills from localStorage */
export function getUserSkills(): Skill[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/** Get skills for a specific agent */
export function getSkillsForAgent(agentId: string): Skill[] {
  return getAllSkills().filter((s) => s.agent === agentId || s.agent === "shared");
}

/** Create a new user skill */
export function createSkill(skill: Omit<Skill, "id" | "createdAt" | "isBuiltIn">): Skill {
  const newSkill: Skill = {
    ...skill,
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    isBuiltIn: false,
  };
  const skills = getUserSkills();
  skills.push(newSkill);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
  return newSkill;
}

/** Delete a user-created skill (cannot delete built-in) */
export function deleteSkill(skillId: string): boolean {
  const skills = getUserSkills();
  const filtered = skills.filter((s) => s.id !== skillId);
  if (filtered.length === skills.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}
