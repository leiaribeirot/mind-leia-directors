---
task-id: evolve-prd
name: Evolve PRD
agent: prd-evolver
version: 1.0.0
purpose: >
  Review and evolve PRDs based on accumulated session learnings.
  Marks completed criteria, suggests new ones, flags stale stories.
workflow-mode: autonomous
elicit: false
timeout: 300s

inputs:
  - name: stories_dir
    type: string
    description: Path to the stories directory
    required: false
    default: docs/stories
  - name: session_threshold
    type: number
    description: Minimum sessions since last evolution before triggering
    required: false
    default: 5

outputs:
  - name: evolution_report
    type: object
    description: Report of PRD changes made

dependencies:
  lib:
    - lib/prd-parser.js
    - lib/metrics-tracker.js
  data:
    - metrics.json
---

# Evolve PRD

## Purpose

After N sessions, analyze accumulated changes and evolve PRDs to match
reality. This keeps stories accurate and actionable.

## Steps

1. **Check threshold**: Load metrics.json, count sessions since last evolution
2. **Parse stories**: Run `parseStoryDir(storiesDir)`
3. **Cross-reference**: Compare pending criteria with executed backlog items
4. **Mark completed**: Update checkboxes where evidence exists
5. **Suggest new**: Propose criteria based on recurring patterns
6. **Flag stale**: Identify stories with no progress in 30+ days
7. **Generate report**: Summary of all changes and suggestions

## Trigger

- Automatic: When session count >= threshold during Phase 5
- Manual: Via `--evolve` flag on the director command

## Invocation

```
/director director --evolve
```
