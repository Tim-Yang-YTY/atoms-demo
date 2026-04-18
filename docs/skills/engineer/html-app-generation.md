---
name: html-app-generation
agent: engineer
description: Generate complete single-file HTML applications with embedded CSS/JS
version: 1.0.0
category: code-generation
tags: [html, css, javascript, app]
---

# HTML App Generation

## When to Use
When generating a complete, functional web application as a single HTML file.

## Procedure
1. Start with `<!DOCTYPE html>` and proper `<head>` with viewport meta
2. Embed all CSS in a `<style>` block using CSS custom properties for theming
3. Use dark theme: `--bg: #0f0f0f; --text: #e4e4e7; --accent: #8b5cf6`
4. Structure HTML with semantic elements
5. Write vanilla JavaScript (no external dependencies)
6. Use `localStorage` for all data persistence
7. Implement responsive design with flexbox/grid
8. Add CSS transitions for hover states and animations
9. Wrap complete output in ````html ... ```` code blocks

## Code Standards
- All interactive elements must have hover states
- Forms must validate input before submission
- Lists should handle empty state gracefully
- Use `crypto.randomUUID()` for generating IDs
- Use `Date.prototype.toISOString()` for timestamps

## Pitfalls
- Never use external CDN links or dependencies
- Never output placeholder/skeleton code
- Always test auth flow: register -> login -> use app -> logout
- Ensure the app works when opened as a local HTML file
