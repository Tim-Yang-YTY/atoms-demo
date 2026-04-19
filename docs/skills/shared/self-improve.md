---
name: self-improve
agent: shared
description: Meta-skill for agents to create new skills from completed tasks
version: 1.0.0
category: meta
tags: [self-improvement, learning, meta-skill]
---

# Self-Improvement Skill

## When to Use
After completing a complex or novel task that could benefit from documented procedures for future use.

## Procedure
1. Identify if the completed task required a novel approach
2. Extract the step-by-step procedure that led to success
3. Document failure modes encountered and their fixes
4. Create a new skill file with YAML front matter
5. Save to the appropriate agent's skills directory
6. Include verification steps to confirm skill execution

## Skill File Template
```yaml
---
name: [kebab-case-name]
agent: [pm|engineer|designer|shared]
description: [one-line description]
version: 1.0.0
category: [planning|code-generation|design-system|review|meta]
tags: [relevant, tags]
---
```

## Triggers for New Skill Creation
- Task required more than 3 iterations to get right
- User provided feedback that improved the output
- A pattern emerged across multiple similar requests
- A workaround was needed for a common limitation

## Pitfalls
- Don't create skills for one-off tasks unlikely to recur
- Keep skills focused on one procedure, not multiple
- Always include verification criteria
