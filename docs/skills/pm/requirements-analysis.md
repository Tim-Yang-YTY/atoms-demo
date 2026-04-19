---
name: requirements-analysis
agent: pm
description: Extract structured requirements from vague user descriptions
version: 1.0.0
category: planning
tags: [requirements, analysis, features]
---

# Requirements Analysis

## When to Use
When a user provides a vague or brief app description and needs it broken down into concrete features, user flows, and data models.

## Procedure
1. Identify the core domain (finance, productivity, social, etc.)
2. Extract explicit features mentioned by the user
3. Infer implicit features (auth, CRUD, persistence) from context
4. Categorize features by priority (must-have vs nice-to-have)
5. Define user flows as sequences: trigger -> action -> result
6. Design data model with entity names, fields, and relationships
7. Estimate complexity: Low / Medium / High

## Output Format
```markdown
## Key Features
1. **Feature Name** - Brief description

## User Flows
- **Flow Name**: Step1 -> Step2 -> Step3

## Data Model
- `entity`: field1, field2, field3

## Complexity: [Low|Medium|High]
```

## Pitfalls
- Don't assume features the user didn't mention or imply
- Keep the plan under 300 words to avoid overwhelming the engineer
- Always include persistence strategy (localStorage, API, database)

## Verification
- Plan has at least 3 features identified
- At least 2 user flows defined
- Data model covers all features
- Complexity estimate is justified
