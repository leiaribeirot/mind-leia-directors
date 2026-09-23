---
task-id: execute-improvement
name: Execute Next Improvement
agent: code-reviewer
version: 1.0.0
purpose: >
  Pick the highest-priority pending backlog item and implement it.
  Reads the target code, understands context, makes the change,
  and marks the item as done.
workflow-mode: interactive
elicit: true
timeout: 300s

prerequisites:
  - Backlog has at least one pending item
  - Target codebase is accessible

inputs:
  - name: id
    type: string
    description: >
      Specific backlog item ID to execute. If omitted, picks highest priority pending item.
    required: false
  - name: target
    type: string
    description: Filter to items from this target only
    required: false
  - name: auto_execute
    type: boolean
    description: >
      If true, execute small-effort items without confirmation.
      Medium+ items always require confirmation.
    required: false
    default: false

outputs:
  - name: result
    type: object
    description: Execution result with item ID, changes made, and notes

dependencies:
  data:
    - backlog.json

validation:
  success-criteria:
    - Item implemented following existing codebase patterns
    - Tests pass (if applicable)
    - Backlog item status updated to "done"
  failure-conditions:
    - No pending items in backlog
    - Implementation would break existing tests
    - Cost hard stop exceeded
---

# Execute Next Improvement

## Purpose
Pick up the next actionable item from the backlog, implement it, and mark it done.

## Execution Steps

### Step 1: Select Item
1. If `id` provided, find that specific item in backlog
2. Otherwise, query backlog for highest priority pending item:
   - Apply `target` filter if provided
   - Sort by `priority_score` descending
3. If no items found, report "Backlog empty — no pending items"

### Step 2: Present Item
Display the selected item:
```
Item: dir-2026-05-24-001
Lens: code-quality | Criterion: duplication
Target: videodrome
Priority: 82/100 | Effort: small

Title: Extract shared mutation wrapper from 15 hooks
Description: All mutation hooks duplicate toast success/error logic...
Files: site/src/features/videodrome/hooks/useReviews.ts, ...
```

### Step 3: Confirm Execution
- If `auto_execute` is true AND effort is "small": proceed without asking
- Otherwise: ask user "Execute this improvement? [y/n/skip]"
- If "skip": mark as "skipped" in backlog, move to next item
- If "n": stop execution

### Step 4: Understand Context
1. Read the files listed in the backlog item
2. Read surrounding files for context (imports, related components)
3. Understand existing patterns in the codebase
4. Plan the implementation approach

### Step 5: Implement
1. Make the code changes following existing patterns
2. Keep changes minimal and focused — only what the item describes
3. Don't add extra improvements beyond the item scope
4. Preserve existing code style, naming, and conventions

### Step 6: Validate
1. Run linting if applicable (`npm run lint`)
2. Run type checking if applicable (`npm run typecheck`)
3. Run tests if applicable (`npm test`)
4. If any check fails, fix the issue before continuing

### Step 7: Update Backlog
1. Mark the item as "done" in backlog.json
2. Add `execution_notes` with a brief summary of changes made
3. Set `updated` to today's date

### Step 8: Report
Display execution summary:
```
Completed: dir-2026-05-24-001
Changes: Extracted useMutationWrapper() hook, updated 15 hooks to use it
Files modified: 16
Status: done
```
