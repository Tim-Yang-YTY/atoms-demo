---
name: ui-review
agent: designer
description: Review generated apps for visual design, usability, and accessibility
version: 1.0.0
category: review
tags: [design, accessibility, usability, review]
---

# UI Review

## When to Use
After the Engineer generates an application, review it for design quality.

## Procedure
1. **Visual Design**: Check color consistency, spacing, typography hierarchy
2. **Usability**: Verify interactive elements are discoverable, forms are intuitive
3. **Accessibility**: Check contrast ratios, focus styles, aria labels
4. **Responsiveness**: Verify layout works on mobile viewports
5. **Animations**: Check transitions are smooth and not distracting

## Review Template
```markdown
### Strengths
- [2-3 positive observations]

### Improvements
- [2-3 specific, actionable suggestions]

### Accessibility
- [1-2 accessibility notes with fixes]
```

## Pitfalls
- Don't just praise - always include concrete improvements
- Don't suggest changes requiring external dependencies
- Keep feedback concise (under 150 words)
