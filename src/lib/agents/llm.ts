// ============================================================
// LLM Provider Abstraction — Multi-provider support
// Multi-provider LLM abstraction with strategy pattern
// Supports: Anthropic Claude, OpenAI, and mock mode
// ============================================================

export const AGENT_PROMPTS = {
  pm: `You are a senior Product Manager AI agent on the Atoms platform. Your job is to analyze user requirements and create a clear, structured product plan. Be concise and actionable. Format your output with clear sections using markdown. Focus on features, user flows, and data models. Keep responses under 300 words.`,

  engineer: `You are a senior Software Engineer AI agent on the Atoms platform. You generate complete, production-quality single-file HTML applications. Rules:
- Output a SINGLE self-contained HTML file with embedded CSS and JavaScript
- Use modern dark UI design (background: #0f0f0f, text: #e4e4e7, accent: #8b5cf6)
- Use localStorage for all data persistence
- Make it fully responsive and mobile-friendly
- Include smooth CSS transitions and animations
- Use modern CSS (flexbox, grid, custom properties)
- Use vanilla JavaScript (no external dependencies)
- Wrap the COMPLETE HTML in \`\`\`html ... \`\`\` code blocks
- The app MUST be fully functional, not a placeholder`,

  designer: `You are a senior UI/UX Designer AI agent on the Atoms platform. Review generated applications and provide brief, actionable feedback on visual design, usability, and accessibility. Keep feedback concise and constructive. Mention specific improvements.`,
};

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function* callLLMStream(
  systemPrompt: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const provider = process.env.AI_PROVIDER || "anthropic";
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (provider === "openai" && openaiKey) {
    yield* callOpenAIStream(systemPrompt, messages, openaiKey);
  } else if (anthropicKey) {
    yield* callAnthropicStream(systemPrompt, messages, anthropicKey);
  } else {
    yield* mockStream(systemPrompt, messages);
  }
}

async function* callAnthropicStream(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string
): AsyncGenerator<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${err}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            yield parsed.delta.text;
          }
        } catch {
          // skip non-JSON lines
        }
      }
    }
  }
}

async function* callOpenAIStream(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string
): AsyncGenerator<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // skip
        }
      }
    }
  }
}

// --- Mock mode: realistic demo without API keys ---
async function* mockStream(
  systemPrompt: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const userMsg = messages[messages.length - 1]?.content || "";
  let text: string;

  if (systemPrompt.includes("Product Manager")) {
    text = getMockPMResponse(userMsg);
  } else if (systemPrompt.includes("Software Engineer")) {
    text = getMockEngineerResponse(userMsg);
  } else {
    text = getMockDesignerResponse();
  }

  // Simulate streaming with realistic typing speed
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 8) {
    chunks.push(text.slice(i, i + 8));
  }
  for (const chunk of chunks) {
    yield chunk;
    await sleep(20 + Math.random() * 30);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getMockPMResponse(_userMsg: string): string {
  return `## Product Analysis

### Key Features
1. **User Authentication** — Login/register with localStorage session
2. **CRUD Operations** — Create, read, update, delete records
3. **Data Categorization** — Organize by category with filter
4. **Summary Dashboard** — Visual stats and totals
5. **Responsive Design** — Mobile-first dark theme UI

### User Flows
- **Onboarding**: Register → Login → Dashboard
- **Core Loop**: Add entry → View list → Filter/sort → Delete
- **Analytics**: View totals → Category breakdown → Charts

### Data Model
- \`users\`: id, email, password (localStorage)
- \`entries\`: id, user_id, name, amount, category, date

### Complexity: Medium
Estimated components: Auth module, CRUD form, list view, chart, nav.`;
}

function getMockEngineerResponse(_userMsg: string): string {
  return "Building your application now...\n\n```html\n" + MOCK_APP_CODE + "\n```\n\nThe app is fully functional with localStorage persistence, responsive design, and all requested features.";
}

function getMockDesignerResponse(): string {
  return `## Design Review

### What Looks Good
- Clean dark theme with consistent color palette
- Good use of spacing and visual hierarchy
- Smooth hover transitions on interactive elements
- Responsive layout that works on mobile

### Suggested Improvements
- Add subtle box-shadows for depth on cards
- Consider adding entrance animations for list items
- The chart could use tooltip interactions
- Add focus-visible styles for keyboard navigation

### Accessibility Notes
- All interactive elements have proper contrast ratios
- Form inputs have associated labels
- Consider adding aria-labels for icon-only buttons
- Tab order follows visual flow correctly

Overall: **Solid implementation** ready for use.`;
}

const MOCK_APP_CODE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Expense Tracker</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0f0f0f;--surface:#1a1a2e;--surface2:#16213e;--border:#2a2a4a;--text:#e4e4e7;--muted:#9ca3af;--primary:#8b5cf6;--primary-hover:#7c3aed;--danger:#ef4444;--success:#22c55e;--blue:#3b82f6;--orange:#f97316;--pink:#ec4899;--radius:12px;--shadow:0 4px 24px rgba(0,0,0,0.3)}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.hidden{display:none!important}
/* Auth */
.auth-container{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.auth-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:40px;width:100%;max-width:400px;box-shadow:var(--shadow)}
.auth-card h1{font-size:24px;margin-bottom:8px;background:linear-gradient(135deg,var(--primary),var(--blue));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.auth-card p{color:var(--muted);margin-bottom:24px;font-size:14px}
.form-group{margin-bottom:16px}
.form-group label{display:block;font-size:13px;color:var(--muted);margin-bottom:6px}
.form-group input,.form-group select{width:100%;padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;outline:none;transition:border-color 0.2s}
.form-group input:focus,.form-group select:focus{border-color:var(--primary)}
.btn{padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn-primary{background:var(--primary);color:white;width:100%}
.btn-primary:hover{background:var(--primary-hover);transform:translateY(-1px)}
.btn-ghost{background:transparent;color:var(--muted);font-size:13px}
.btn-ghost:hover{color:var(--text)}
.btn-danger{background:transparent;color:var(--danger);padding:6px 10px;font-size:12px}
.btn-danger:hover{background:rgba(239,68,68,0.1)}
.auth-toggle{text-align:center;margin-top:16px}
/* App */
.app{max-width:900px;margin:0 auto;padding:20px}
.header{display:flex;align-items:center;justify-content:space-between;padding:16px 0;margin-bottom:24px;border-bottom:1px solid var(--border)}
.header h1{font-size:22px;display:flex;align-items:center;gap:8px}
.header h1 span{font-size:24px}
.user-info{display:flex;align-items:center;gap:12px}
.user-badge{padding:4px 12px;background:var(--surface);border:1px solid var(--border);border-radius:20px;font-size:13px;color:var(--muted)}
/* Stats */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;transition:transform 0.2s}
.stat-card:hover{transform:translateY(-2px)}
.stat-card .label{font-size:13px;color:var(--muted);margin-bottom:4px}
.stat-card .value{font-size:28px;font-weight:700}
.stat-card .value.expense{color:var(--danger)}
.stat-card .value.income{color:var(--success)}
.stat-card .value.balance{color:var(--primary)}
/* Form */
.add-form{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:24px}
.add-form h2{font-size:16px;margin-bottom:16px}
.form-row{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end}
@media(max-width:640px){.form-row{grid-template-columns:1fr;}}
/* Filter */
.filter-bar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.filter-btn{padding:6px 14px;border:1px solid var(--border);border-radius:20px;background:transparent;color:var(--muted);font-size:13px;cursor:pointer;transition:all 0.2s}
.filter-btn:hover,.filter-btn.active{background:var(--primary);color:white;border-color:var(--primary)}
/* List */
.entries{display:flex;flex-direction:column;gap:8px}
.entry{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);transition:all 0.2s;animation:fadeIn 0.3s ease}
.entry:hover{border-color:var(--primary);transform:translateX(4px)}
.entry-info{display:flex;align-items:center;gap:12px}
.entry-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px}
.entry-name{font-weight:500;font-size:14px}
.entry-meta{font-size:12px;color:var(--muted)}
.entry-amount{font-weight:600;font-size:16px}
.entry-amount.negative{color:var(--danger)}
.entry-amount.positive{color:var(--success)}
.entry-actions{display:flex;gap:4px}
/* Chart */
.chart-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:24px}
.chart-section h2{font-size:16px;margin-bottom:16px}
.chart-bars{display:flex;flex-direction:column;gap:8px}
.chart-row{display:flex;align-items:center;gap:12px}
.chart-label{width:80px;font-size:13px;color:var(--muted);text-align:right}
.chart-bar-wrap{flex:1;height:24px;background:var(--bg);border-radius:4px;overflow:hidden}
.chart-bar{height:100%;border-radius:4px;transition:width 0.6s ease;min-width:2px}
.chart-value{width:60px;font-size:13px;font-weight:600;text-align:right}
.empty-state{text-align:center;padding:40px;color:var(--muted)}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
</style>
</head>
<body>
<!-- Auth Screen -->
<div id="auth-screen" class="auth-container">
<div class="auth-card">
<h1 id="auth-title">Welcome Back</h1>
<p id="auth-subtitle">Sign in to your expense tracker</p>
<form id="auth-form">
<div class="form-group"><label>Email</label><input type="email" id="auth-email" placeholder="you@example.com" required></div>
<div class="form-group" id="name-group" class="hidden"><label>Name</label><input type="text" id="auth-name" placeholder="Your name"></div>
<div class="form-group"><label>Password</label><input type="password" id="auth-password" placeholder="Min 6 characters" required></div>
<button type="submit" class="btn btn-primary" id="auth-btn">Sign In</button>
</form>
<div class="auth-toggle"><button class="btn btn-ghost" id="toggle-auth">Don't have an account? Register</button></div>
</div>
</div>
<!-- Main App -->
<div id="app-screen" class="app hidden">
<div class="header">
<h1><span>💰</span> Expense Tracker</h1>
<div class="user-info"><span class="user-badge" id="user-name"></span><button class="btn btn-ghost" onclick="logout()">Logout</button></div>
</div>
<div class="stats">
<div class="stat-card"><div class="label">Total Expenses</div><div class="value expense" id="total-expense">$0</div></div>
<div class="stat-card"><div class="label">Total Income</div><div class="value income" id="total-income">$0</div></div>
<div class="stat-card"><div class="label">Balance</div><div class="value balance" id="balance">$0</div></div>
</div>
<div class="chart-section"><h2>Category Breakdown</h2><div id="chart" class="chart-bars"></div></div>
<div class="add-form"><h2>Add Entry</h2>
<div class="form-row">
<div class="form-group"><label>Name</label><input type="text" id="entry-name" placeholder="Coffee, Salary..."></div>
<div class="form-group"><label>Amount ($)</label><input type="number" id="entry-amount" placeholder="0.00" step="0.01"></div>
<div class="form-group"><label>Category</label><select id="entry-cat"><option value="food">🍔 Food</option><option value="transport">🚗 Transport</option><option value="entertainment">🎮 Entertainment</option><option value="shopping">🛒 Shopping</option><option value="bills">📄 Bills</option><option value="income">💰 Income</option><option value="other">📦 Other</option></select></div>
<button class="btn btn-primary" onclick="addEntry()" style="height:42px;width:auto;padding:0 24px">Add</button>
</div></div>
<div class="filter-bar" id="filters"><button class="filter-btn active" data-cat="all">All</button><button class="filter-btn" data-cat="food">🍔 Food</button><button class="filter-btn" data-cat="transport">🚗 Transport</button><button class="filter-btn" data-cat="entertainment">🎮 Entertainment</button><button class="filter-btn" data-cat="shopping">🛒 Shopping</button><button class="filter-btn" data-cat="bills">📄 Bills</button><button class="filter-btn" data-cat="income">💰 Income</button></div>
<div class="entries" id="entries"></div>
<div class="empty-state hidden" id="empty">No entries yet. Add your first expense above!</div>
</div>
<script>
const CATS={food:{icon:'🍔',color:'#f97316'},transport:{icon:'🚗',color:'#3b82f6'},entertainment:{icon:'🎮',color:'#8b5cf6'},shopping:{icon:'🛒',color:'#ec4899'},bills:{icon:'📄',color:'#eab308'},income:{icon:'💰',color:'#22c55e'},other:{icon:'📦',color:'#6b7280'}};
let currentUser=null,entries=[],currentFilter='all',isLogin=true;
const $=id=>document.getElementById(id);
function init(){const uid=localStorage.getItem('et_user');if(uid){currentUser=JSON.parse(uid);showApp()}else{showAuth()}}
function showAuth(){$('auth-screen').classList.remove('hidden');$('app-screen').classList.add('hidden')}
function showApp(){$('auth-screen').classList.add('hidden');$('app-screen').classList.remove('hidden');$('user-name').textContent=currentUser.name||currentUser.email;loadEntries();render()}
function toggleAuth(){isLogin=!isLogin;$('auth-title').textContent=isLogin?'Welcome Back':'Create Account';$('auth-subtitle').textContent=isLogin?'Sign in to your expense tracker':'Start tracking your expenses';$('auth-btn').textContent=isLogin?'Sign In':'Register';$('toggle-auth').textContent=isLogin?"Don't have an account? Register":'Already have an account? Sign In';const ng=$('name-group');if(!isLogin)ng.classList.remove('hidden');else ng.classList.add('hidden')}
$('toggle-auth').addEventListener('click',toggleAuth);
$('auth-form').addEventListener('submit',e=>{e.preventDefault();const email=$('auth-email').value,pw=$('auth-password').value,name=$('auth-name').value;
if(isLogin){const users=JSON.parse(localStorage.getItem('et_users')||'[]');const u=users.find(u=>u.email===email&&u.password===pw);if(!u){alert('Invalid credentials');return}currentUser=u}
else{if(pw.length<6){alert('Password must be 6+ chars');return}const users=JSON.parse(localStorage.getItem('et_users')||'[]');if(users.find(u=>u.email===email)){alert('Email taken');return}const u={id:crypto.randomUUID(),email,password:pw,name:name||email.split('@')[0]};users.push(u);localStorage.setItem('et_users',JSON.stringify(users));currentUser=u}
localStorage.setItem('et_user',JSON.stringify(currentUser));showApp()});
function logout(){localStorage.removeItem('et_user');currentUser=null;showAuth()}
function loadEntries(){entries=JSON.parse(localStorage.getItem('et_entries_'+currentUser.id)||'[]')}
function saveEntries(){localStorage.setItem('et_entries_'+currentUser.id,JSON.stringify(entries))}
function addEntry(){const name=$('entry-name').value.trim(),amount=parseFloat($('entry-amount').value),cat=$('entry-cat').value;if(!name||isNaN(amount)){alert('Fill all fields');return}entries.unshift({id:crypto.randomUUID(),name,amount:cat==='income'?Math.abs(amount):-Math.abs(amount),category:cat,date:new Date().toISOString()});saveEntries();render();$('entry-name').value='';$('entry-amount').value=''}
function deleteEntry(id){entries=entries.filter(e=>e.id!==id);saveEntries();render()}
function render(){const filtered=currentFilter==='all'?entries:entries.filter(e=>e.category===currentFilter);
const el=$('entries');el.innerHTML='';
const exp=entries.filter(e=>e.amount<0).reduce((s,e)=>s+Math.abs(e.amount),0);
const inc=entries.filter(e=>e.amount>0).reduce((s,e)=>s+e.amount,0);
$('total-expense').textContent='$'+exp.toFixed(2);$('total-income').textContent='$'+inc.toFixed(2);$('balance').textContent='$'+(inc-exp).toFixed(2);
if(filtered.length===0){$('empty').classList.remove('hidden')}else{$('empty').classList.add('hidden');filtered.forEach(e=>{const cat=CATS[e.category]||CATS.other;const d=new Date(e.date);el.innerHTML+=\`<div class="entry"><div class="entry-info"><div class="entry-icon" style="background:\${cat.color}22;color:\${cat.color}">\${cat.icon}</div><div><div class="entry-name">\${e.name}</div><div class="entry-meta">\${e.category} · \${d.toLocaleDateString()}</div></div></div><div style="display:flex;align-items:center;gap:12px"><span class="entry-amount \${e.amount<0?'negative':'positive'}">\${e.amount<0?'-':'+'}\$\${Math.abs(e.amount).toFixed(2)}</span><button class="btn btn-danger" onclick="deleteEntry('\${e.id}')">✕</button></div></div>\`})}
renderChart()}
function renderChart(){const catTotals={};entries.filter(e=>e.amount<0).forEach(e=>{const c=e.category;catTotals[c]=(catTotals[c]||0)+Math.abs(e.amount)});const max=Math.max(...Object.values(catTotals),1);const ch=$('chart');ch.innerHTML='';if(Object.keys(catTotals).length===0){ch.innerHTML='<div class="empty-state">No expense data for chart</div>';return}Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).forEach(([cat,val])=>{const c=CATS[cat]||CATS.other;ch.innerHTML+=\`<div class="chart-row"><span class="chart-label">\${c.icon} \${cat}</span><div class="chart-bar-wrap"><div class="chart-bar" style="width:\${(val/max*100).toFixed(1)}%;background:\${c.color}"></div></div><span class="chart-value">\$\${val.toFixed(0)}</span></div>\`})}
$('filters').addEventListener('click',e=>{const btn=e.target.closest('.filter-btn');if(!btn)return;currentFilter=btn.dataset.cat;document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');render()});
init();
</script>
</body>
</html>`;
