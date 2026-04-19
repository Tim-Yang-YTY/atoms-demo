# Atoms Demo — AI Multi-Agent App Builder

一个基于多 Agent 协作架构的 AI 应用生成器。用户描述想法，5 个 AI Agent（Orchestrator → PM → Engineer → Designer → 仲裁官）通过 ReAct 循环协作，实时生成完整的单文件 Web 应用。

**Live Demo**: 部署在 Vercel（Next.js 16 + Turbopack）

---

## 快速开始

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

可选：设置 `ANTHROPIC_API_KEY` 或 `OPENAI_API_KEY` 环境变量启用真实 LLM。未设置时自动使用 mock 模式。

---

## AI Coding 工具使用说明

本项目全程使用 **Claude Code**（Anthropic 官方 CLI）作为主要开发工具。

### 使用方式

| 环节 | 工具 | 说明 |
|------|------|------|
| 架构设计 | Claude Code | 通过 `ultrathink` 指令触发深度推理，逐步规划 types → config → orchestrator → UI 的分层实现 |
| 代码实现 | Claude Code (Read/Edit/Write) | 直接读取、编辑、创建项目文件；每个文件独立 commit |
| 类型检查 | Claude Code → `npx tsc --noEmit` | 每次提交前自动运行 typecheck，发现问题立即修复 |
| 构建验证 | Claude Code → `npx next build` | 确保生产构建通过后再推送 |
| Git 工作流 | Claude Code → `git` / `gh` | 自动创建分支、提交、推送、创建 PR、检查 CI、合并 |
| 问题定位 | Claude Code | 发现 types.ts 未提交导致 Vercel 构建失败，通过 `git diff HEAD` 定位并修复 |

### 典型工作流

```
用户: "add orchestrator and arbiter agents"
  ↓
Claude Code: ultrathink → 规划架构 → 分文件实现 → typecheck → build → commit → push → PR → CI → merge
```

每个 PR 包含完整的 CI 验证（lint + typecheck + build + Vercel preview），确保主分支始终可部署。

---

## AI 编码规范

本项目内置一套编码行为准则，用于减少 AI 编码中常见的过度工程化、隐性假设、副作用修改等问题。准则同时写入 `CLAUDE.md`（运行时约束）和 `docs/skills/shared/coding-discipline.md`（Skill 注入）。

| 原则 | 解决的问题 |
|------|-----------|
| **先想后写** | 隐性假设、忽略歧义、不暴露取舍 |
| **简洁优先** | 过度抽象、膨胀代码、多余功能 |
| **精准修改** | 改了不该改的代码、副作用式 refactor |
| **目标驱动** | 用可验证的成功标准替代模糊指令，让 agent 自主循环 |

核心洞察：不要告诉 AI「做什么」，而是给它「成功标准」让它自己循环验证。

```
# 模糊指令（差）
"Add validation"

# 目标驱动（好）
"Write tests for invalid inputs, then make them pass"
```

**检验标准**：diff 里没有多余改动、不需要因过度复杂而重写、澄清问题在实现之前而非之后出现。

---

## 意图识别与需求对齐

用户输入往往模糊（"帮我做个记账 app"），Agent 容易在隐性假设上越走越远。我们的意图系统不只是分类，而是**把模糊需求变成结构化的、可验证的规格**，在生成代码之前就对齐理解。

### 流程

```
用户输入 → clarify_intent 工具 → 结构化意图解析 → Orchestrator 明确陈述假设 → PM 确认/调整 → Engineer 执行
```

### clarify_intent 工具输出

| 字段 | 说明 | 示例 |
|------|------|------|
| `intentType` | 用户意图分类 | `build` / `modify` / `explain` / `question` |
| `domains` | 应用领域 | `["finance", "productivity"]` |
| `features` | 检测到的功能点 | `["authentication", "crud", "charts", "persistence"]` |
| `complexity` | 复杂度评估 | `simple` / `medium` / `complex` |
| `ambiguities` | 需求缺口 | `["No clear app type specified", "No specific features mentioned"]` |
| `confidence` | 对齐置信度 | `high` / `medium` / `low` |

### 需求对齐机制

Orchestrator 收到解析结果后，**必须**在输出中明确：
1. **我理解你要什么** — 把用户需求翻译成具体的功能列表
2. **我做了哪些假设** — 用户没说但我推断的功能（如"记账 app"隐含需要分类、图表、持久化）
3. **哪些地方不确定** — ambiguities 字段中的缺口

这些信息传递给 PM，PM 在此基础上确认或调整，而不是从零开始猜测。仲裁官最终评估时也参考 Orchestrator 的解释，确保评估标准与用户意图一致。

---

## ReAct 循环安全机制

ReAct（Plan → Execute → Observe → Reflect）循环如果不加约束，可能出现死循环：仲裁官一直 FAIL → Engineer 改不好 → 再 FAIL。我们用四层防护避免这个问题：

### 防护层级

| 层级 | 机制 | 位置 | 说明 |
|------|------|------|------|
| L1 | **迭代硬上限** | `MAX_ITERATIONS = 3` | 无论如何最多 3 轮，到达上限强制终止 |
| L2 | **重复反馈检测** | `bigramSimilarity()` | 比较连续两轮仲裁官反馈的 bigram 相似度，>80% 提前终止（再迭代无意义） |
| L3 | **单 Agent 超时** | `AGENT_TIMEOUT_MS = 60s` | 每个 Agent 的 LLM 调用有 60s 硬超时，防止单个 Agent 卡死阻塞全管线 |
| L4 | **单 Agent 步骤上限** | `MAX_STEPS_PER_AGENT = 6` | 每个 Agent 每轮最多 6 次工具调用，防止未来扩展内部 tool loop 时失控 |

### 重复反馈检测原理

```
Round 1: 仲裁官 FAIL → "缺少分类功能、没有图表"
Round 2: 仲裁官 FAIL → "缺少分类功能、没有图表"  ← bigram 相似度 92%
→ 检测到重复，提前终止（不进 Round 3）
```

用 bigram overlap 而非精确匹配，因为 LLM 每次措辞略有不同但核心内容相同。阈值 0.8 在实践中能有效区分"同样的问题"和"不同的问题"。

### 超时机制实现

```typescript
// 每个 Agent 的 LLM 调用被 Promise.race 包装
collectStream(prompt, messages, "Engineer", onChunk)
  → withTimeout(streamPromise, 60_000, "Engineer")
    → Promise.race([streamPromise, timeoutReject])
```

超时抛出异常，被 `generate/route.ts` 的 try-catch 捕获，发送 `error` SSE 事件到前端。

---

## 实现思路与关键取舍

### 架构选择

**Type-first 设计**：所有数据结构先在 `src/lib/types.ts` 中定义，再向外扩展。`AgentRole`、`AgentStep`、`SSEEvent` 等类型是整个系统的骨架，确保 backend orchestrator 和 frontend components 之间的协议一致性。

**ReAct 循环（Plan → Execute → Observe → Reflect）**：每个 Agent 不是简单地生成文本，而是遵循结构化的推理流程。这让用户能看到 Agent 的"思考过程"——正在规划什么、调用了什么工具、观察到什么结果、做出了什么判断。

**SSE 流式架构**：选择 Server-Sent Events 而非 WebSocket，原因：
- 单向数据流足够（server → client）
- 天然兼容 Vercel Edge/Serverless
- 不需要维护长连接状态
- 浏览器原生支持，实现简单

**单文件 HTML 输出**：生成的应用是完整的单文件 HTML（嵌入 CSS + JS），而非组件化框架代码。取舍：
- 零依赖，即开即用，iframe 预览简单
- 适合 demo 场景和快速原型
- 不适合大型应用，缺乏模块化

### 关键取舍

| 决策 | 选择 | 理由 |
|------|------|------|
| 数据持久化 | 内存存储 + localStorage | 避免外部依赖，demo 场景够用；预留了 Supabase 接口 |
| LLM 调用 | 支持 Anthropic/OpenAI + mock fallback | 无 API key 也能完整体验流程 |
| Agent 协作模式 | 固定管线（Orch→PM→Eng→Des→Arb） | 比动态路由更可预测，适合 demo；Orchestrator 的 plan 为未来动态路由预留了接口 |
| 仲裁官迭代 | 最多 3 次 | 防止无限循环，同时给出足够的自我修正机会 |
| 工具系统 | 纯前端解析（正则匹配 HTML） | 无需真实浏览器环境；对 demo 精度足够 |
| Skill 系统 | localStorage CRUD + 内置 skills | Hermes 风格的自进化能力，但当前 skill 仅作为 prompt 上下文注入，未实现真正的动态学习 |

---

## 当前完成程度

### 已完成

**核心架构**
- Type-first 类型系统（`AgentRole`, `AgentStep`, `PipelineAgent`, `SSEEvent` 完整定义）
- 5 Agent 管线：Orchestrator → PM → Engineer → Designer → 仲裁官
- ReAct 循环（Plan/Execute/Observe/Reflect）每个 Agent 完整实现
- SSE 流式协议，支持 7 种事件类型
- 仲裁官 PASS/FAIL 评估 + 自动迭代（最多 3 轮）

**Agent 系统**
- Agent 配置中心（system prompt / few-shot / constraints / temperature / tools）
- 6 个工具：`analyze_requirements`, `validate_html`, `clarify_intent`, `create_plan`, `test_app`, `evaluate_requirements`
- 10 个内置 Skill（PM 2 / Engineer 2 / Designer 1 / Orchestrator 2 / Arbiter 2 / Shared 1）
- Dashboard 中可编辑所有 Agent 参数，localStorage 持久化

**前端 UI**
- 完整的聊天界面（流式消息 + 打字动画）
- `AgentStepMessage` 组件：渲染 ReAct 步骤，颜色区分 plan/execute/observe/reflect
- `PipelineProgress` 组件：实时显示 Agent 管线进度
- 代码预览面板（iframe sandbox）
- 6 个应用模板（Expense Tracker / Task Manager / Weather / Markdown Editor / Recipe Book / Pomodoro）
- 登录/注册/Dashboard/Workspace 完整页面

**工程化**
- TypeScript strict mode，零 type error
- Next.js 16 + Turbopack
- GitHub CI（lint + typecheck + build）
- Vercel 自动部署 + preview
- 多 Provider LLM 支持（Anthropic / OpenAI / Mock）

### 未完成

- **真实浏览器测试**：仲裁官的 `test_app` 工具目前用正则匹配 HTML，未接入 headless browser（Playwright）做真实 DOM 测试
- **动态 Agent 路由**：Orchestrator 目前按固定顺序执行，未实现根据 plan 动态跳过或重排 Agent
- **Skill 动态学习**：`self-improve` skill 定义了触发条件，但未实现从完成任务中自动提取新 skill
- **多轮对话上下文**：迭代修改时，Engineer 收到仲裁官反馈但 context window 管理比较粗糙
- **用户认证**：当前用 localStorage 模拟，未接入真实 auth provider
- **持久化存储**：预留了 Supabase repository 接口但实际用 memory store
- **测试覆盖**：仅有 tools registry 和 memory store 的基础测试

---

## 扩展计划与优先级

如果继续投入时间，按优先级排序：

### P0 — 核心体验提升

1. **接入 Playwright 做真实 DOM 测试**
   - 仲裁官的 `test_app` 工具改为在 headless browser 中加载生成的 HTML
   - 真实点击按钮、填写表单、检查 localStorage 是否写入
   - 对 demo 效果提升最大：从"看起来有测试"变成"真的在测试"

2. **动态 Agent 路由**
   - Orchestrator 根据 `clarify_intent` 结果决定是否跳过 PM（简单请求直接给 Engineer）
   - 支持 Agent 之间的条件分支（if 仲裁官 FAIL on UI → 只重新执行 Designer + Engineer）
   - 减少不必要的 Agent 调用，提升响应速度

3. **Context Window 管理**
   - 迭代时只传递 diff（仲裁官的具体 deficiencies），而非完整历史
   - 对长对话做 summary compression

### P1 — 功能完善

4. **Skill 自进化**
   - 当仲裁官触发 3 次迭代后成功，自动提取成功路径为新 Skill
   - Skill 版本管理 + A/B 测试（旧 skill vs 新 skill 的生成质量对比）

5. **多文件代码生成**
   - 从单文件 HTML 扩展到 React/Vue 组件
   - Engineer 输出文件树，Preview 面板用 WebContainer（StackBlitz）运行

6. **真实持久化 + Auth**
   - 接入 Supabase（repository 接口已预留）
   - OAuth 登录（GitHub / Google）

### P2 — 规模化

7. **Agent 可观测性**
   - 每次 pipeline 运行记录完整 trace（每个 step 的 input/output/latency）
   - Dashboard 展示成功率、平均迭代次数、耗时分布

8. **用户自定义 Agent**
   - 允许用户创建新 Agent（自定义 role、prompt、tools）
   - Agent marketplace：社区共享 Agent 配置

9. **协作 + 版本控制**
   - 生成代码的版本历史（每次迭代保存 snapshot）
   - 多用户协作编辑同一项目

---

## 项目结构

```
src/
├── lib/
│   ├── types.ts                 # 核心类型定义（AgentRole, AgentStep, SSEEvent...）
│   ├── agents/
│   │   ├── config.ts            # 5 个 Agent 的配置（prompt, tools, constraints...）
│   │   ├── orchestrator.ts      # ReAct 管线编排器
│   │   └── llm.ts               # LLM 抽象层（Anthropic / OpenAI / Mock）
│   ├── tools/registry.ts        # 工具注册中心（6 个工具）
│   ├── skills/registry.ts       # Skill 注册中心（10 个内置 skill）
│   ├── services/                # 业务逻辑层
│   ├── repositories/            # 数据访问层（Supabase 接口预留）
│   └── storage/memory-store.ts  # 内存存储（开发/demo 用）
├── components/
│   ├── ChatPanel.tsx            # 聊天面板（SSE 解析 + 消息渲染）
│   ├── AgentMessage.tsx         # Agent 消息气泡
│   ├── AgentStepMessage.tsx     # ReAct 步骤渲染（plan/execute/observe/reflect）
│   ├── PipelineProgress.tsx     # Agent 管线进度条
│   └── PreviewPanel.tsx         # 代码预览（iframe sandbox）
├── app/
│   ├── page.tsx                 # 首页（5 Agent 展示 + 模板）
│   ├── dashboard/page.tsx       # 项目管理 + Agent 配置编辑
│   ├── workspace/[id]/page.tsx  # 工作区（聊天 + 预览）
│   └── api/
│       ├── generate/route.ts    # SSE 流式生成端点
│       ├── projects/route.ts    # 项目 CRUD
│       └── auth/route.ts        # 认证
└── __tests__/                   # 测试
```

---

## 技术栈

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **LLM**: Anthropic Claude / OpenAI GPT-4o / Mock fallback
- **Deployment**: Vercel (自动 preview + production)
- **CI**: GitHub Actions (lint + typecheck + build)
- **AI Dev Tool**: Claude Code (Anthropic CLI)
