---
name: dark-theme-ui
agent: engineer
description: Implement modern dark theme UI with consistent design tokens
version: 1.0.0
category: design-system
tags: [css, theme, dark-mode, design-tokens]
---

# Dark Theme UI

## When to Use
When styling any generated application with the platform's dark theme.

## Design Tokens
```css
:root {
  --bg: #0f0f0f;
  --surface: #1a1a2e;
  --surface2: #16213e;
  --border: #2a2a4a;
  --text: #e4e4e7;
  --muted: #9ca3af;
  --primary: #8b5cf6;
  --primary-hover: #7c3aed;
  --danger: #ef4444;
  --success: #22c55e;
  --blue: #3b82f6;
  --radius: 12px;
}
```

## Procedure
1. Apply `--bg` to body background
2. Use `--surface` for card/container backgrounds
3. Use `--border` for all borders (1px solid)
4. Text hierarchy: `--text` for primary, `--muted` for secondary
5. Interactive elements use `--primary` with `--primary-hover`
6. Add `border-radius: var(--radius)` to cards and inputs
7. Use `box-shadow: 0 4px 24px rgba(0,0,0,0.3)` for elevation

## Pitfalls
- Never use pure white (#fff) for text - use --text instead
- Ensure sufficient contrast ratio (4.5:1 minimum)
