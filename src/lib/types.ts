// ============================================================
// Atoms Demo — Core Type Definitions
// Type-first approach with full type safety
// ============================================================

// --- Agent Types ---
export type AgentRole = "pm" | "engineer" | "designer" | "orchestrator" | "arbiter" | "system";

export interface AgentInfo {
  role: AgentRole;
  name: string;
  avatar: string;
  color: string;
  bgColor: string;
  description: string;
}

export const AGENTS: Record<AgentRole, AgentInfo> = {
  system: {
    role: "system",
    name: "Atoms",
    avatar: "A",
    color: "#8b5cf6",
    bgColor: "rgba(139,92,246,0.12)",
    description: "System orchestrator",
  },
  orchestrator: {
    role: "orchestrator",
    name: "Orchestrator",
    avatar: "OC",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.12)",
    description: "Plans execution strategy and routes to agents",
  },
  pm: {
    role: "pm",
    name: "Product Manager",
    avatar: "PM",
    color: "#3b82f6",
    bgColor: "rgba(59,130,246,0.12)",
    description: "Analyzes requirements and creates structured plans",
  },
  engineer: {
    role: "engineer",
    name: "Engineer",
    avatar: "EG",
    color: "#22c55e",
    bgColor: "rgba(34,197,94,0.12)",
    description: "Writes production-ready code",
  },
  designer: {
    role: "designer",
    name: "Designer",
    avatar: "DS",
    color: "#a855f7",
    bgColor: "rgba(168,85,247,0.12)",
    description: "Refines UI/UX and visual design",
  },
  arbiter: {
    role: "arbiter",
    name: "仲裁官",
    avatar: "判",
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.12)",
    description: "Evaluates if the product meets all requirements",
  },
};

// --- Database Models (mirror Supabase tables) ---
export interface User {
  id: string;
  email: string;
  password?: string;
  name: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  generated_code: string | null;
  status: "draft" | "generating" | "completed" | "error";
  template: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  project_id: string;
  role: "user" | AgentRole;
  content: string;
  created_at: string;
}

// --- ReAct Step Types ---
export type AgentStepType = "plan" | "execute" | "observe" | "reflect";

export interface AgentStep {
  agent: AgentRole;
  stepType: AgentStepType;
  content: string;
  toolName?: string;
  toolInput?: string;
  toolOutput?: string;
  planSteps?: string[];
  currentStep?: number;
  evaluation?: { passed: boolean; reason: string; deficiencies?: string[] };
}

// --- Pipeline Progress ---
export type PipelineStatus = "pending" | "active" | "completed" | "skipped";

export interface PipelineAgent {
  agent: AgentRole;
  status: PipelineStatus;
  iteration?: number;
}

// --- SSE Event Protocol ---
export interface SSEEvent {
  type:
    | "agent_start"
    | "agent_message"
    | "agent_complete"
    | "agent_step"
    | "code_update"
    | "pipeline_update"
    | "iteration"
    | "error"
    | "done";
  agent?: AgentRole;
  content?: string;
  code?: string;
  step?: AgentStep;
  pipeline?: PipelineAgent[];
  iteration?: number;
  maxIterations?: number;
}

// --- Agent System Types ---
export interface AgentContext {
  projectId: string;
  userId: string;
  conversationHistory: Message[];
  currentCode?: string;
}

export interface AgentResponse {
  role: AgentRole;
  content: string;
  code?: string;
}

// --- Support Ticket Types ---
export type TicketStatus = "open" | "in_progress" | "resolved";

export interface Ticket {
  id: string;
  projectId: string;
  userId: string;
  userEmail: string;
  error: string;
  context: string;       // what the user was trying to do
  status: TicketStatus;
  created_at: string;
}

// --- Tool System Types (registry pattern) ---
export interface ToolDefinition {
  name: string;
  description: string;
  execute: (input: Record<string, unknown>) => Promise<string>;
}

// --- Templates ---
export interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: string;
  category: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "expense-tracker",
    name: "Personal Expense Tracker",
    description:
      "Track daily expenses with categories, charts, and budget management",
    prompt:
      "Build a personal expense tracker app with: user login/register, add/edit/delete expenses with name/amount/category, category filter, total calculation, a pie chart showing category breakdown, and a clean modern dark UI. Use localStorage for data persistence.",
    icon: "receipt",
    category: "Finance",
  },
  {
    id: "todo-app",
    name: "Task Manager",
    description:
      "Organize tasks with priorities, due dates, and project boards",
    prompt:
      "Build a task management app with: multiple project boards, drag-and-drop tasks, priority levels (high/medium/low), due dates, task completion toggle, search/filter, and a clean kanban board UI. Use localStorage for persistence.",
    icon: "check-square",
    category: "Productivity",
  },
  {
    id: "weather-dashboard",
    name: "Weather Dashboard",
    description:
      "Beautiful weather display with forecasts and location search",
    prompt:
      "Build a weather dashboard app with: city search, current weather display with temperature/humidity/wind, 5-day forecast cards, weather icons, beautiful gradient backgrounds that change with weather, and location favorites. Use mock weather data.",
    icon: "cloud",
    category: "Utility",
  },
  {
    id: "markdown-editor",
    name: "Markdown Editor",
    description: "Live markdown editor with preview and file management",
    prompt:
      "Build a markdown editor with: split pane (editor + live preview), toolbar with formatting buttons, file management (create/save/delete notes), export to HTML, word count, and syntax highlighting for code blocks. Use localStorage.",
    icon: "edit",
    category: "Developer",
  },
  {
    id: "recipe-book",
    name: "Recipe Book",
    description:
      "Collect and organize recipes with ingredients and steps",
    prompt:
      "Build a recipe book app with: add/edit/delete recipes, ingredient lists with quantities, step-by-step instructions, recipe categories, search by name or ingredient, beautiful card grid layout, and cooking timer. Use localStorage.",
    icon: "book",
    category: "Lifestyle",
  },
  {
    id: "pomodoro-timer",
    name: "Pomodoro Timer",
    description:
      "Focus timer with work/break cycles and session tracking",
    prompt:
      "Build a pomodoro timer app with: 25-min work / 5-min break cycles, customizable durations, session counter, daily statistics, notification sounds, beautiful circular progress indicator, and history log. Use localStorage.",
    icon: "clock",
    category: "Productivity",
  },
];
