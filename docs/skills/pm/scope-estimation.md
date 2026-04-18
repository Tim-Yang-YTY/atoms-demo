---
name: scope-estimation
agent: pm
description: Estimate project scope, complexity, and component count
version: 1.0.0
category: planning
tags: [scope, estimation, complexity]
---

# Scope Estimation

## When to Use
When evaluating how complex an app will be to generate and what components are needed.

## Procedure
1. Count distinct UI screens/views
2. Count data entities and their relationships
3. Identify integration complexity (APIs, auth, real-time)
4. Check for advanced features (charts, drag-drop, animations)
5. Assign complexity score:
   - **Low**: 1-2 screens, simple CRUD, no charts
   - **Medium**: 3-5 screens, categories/filters, basic charts
   - **High**: 5+ screens, complex state, multiple integrations

## Pitfalls
- Single-file HTML apps should stay Medium or below
- Don't scope features that require external APIs in mock mode
