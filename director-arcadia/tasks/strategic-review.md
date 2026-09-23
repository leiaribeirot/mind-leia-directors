---
task-id: strategic-review
name: Strategic Review — PRD Gap Analysis
agent: strategy-planner
version: 1.0.0
purpose: >
  Parse active PRDs/stories and generate strategic backlog items
  from pending acceptance criteria and tasks. Bridges the gap between
  what the product should be (PRD) and what exists (codebase).
workflow-mode: autonomous
elicit: false
timeout: 300s

inputs:
  - name: stories_dir
    type: string
    description: Path to the stories directory
    required: false
    default: docs/stories
  - name: target
    type: string
    description: Optional filter to specific target atelier
    required: false
    default: null

outputs:
  - name: strategic_items
    type: array
    description: Backlog-compatible items from PRD gaps

dependencies:
  lib:
    - lib/prd-parser.js
  data:
    - atelier-patterns.yaml
---

# Strategic Review — PRD Gap Analysis

## Purpose

Read PRDs/stories and identify what needs to be built. This task generates
strategic backlog items that represent intentional product gaps — features and
criteria defined in stories that haven't been implemented yet.

## Steps

1. **Parse active stories**: Run `parseStoryDir(storiesDir)` from `lib/prd-parser.js`
2. **Filter by target** (if provided): Match stories by `files_mentioned` or title keywords
3. **For each active story**:
   - Review pending acceptance criteria
   - Review pending task items
   - Identify implementation gaps
4. **Generate strategic items** via `generateStrategicItems(parsedStories)`
5. **Return items** for merge with tactical backlog in Phase 3

## Integration

This task runs during Phase 0.5 (STRATEGY) of the improve pipeline.
Its output is held until Phase 3 (MERGE + PRIORITIZE), where strategic
items are merged with tactical scan findings.

## Example Output

```
Strategic Review Results:
  Active stories found: 8
  Filtered to target: presentation → 2 stories

  Story 305 — Presentation Atelier MVP
    Status: in_progress (10/13 criteria done)
    Pending criteria: 3
    → "Pipeline produces a single HTML file" (medium effort)
    → "Output quality matches storytelling reference" (large effort)
    → "Every slide declares a slide function" (medium effort)

  Strategic items generated: 3
```
