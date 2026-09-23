---
task-id: review-backlog
name: Review and Curate Backlog
agent: backlog-curator
version: 1.0.0
purpose: >
  Curate the improvement backlog: validate items, merge duplicates,
  recalibrate priorities, remove stale items, flag conflicts.
workflow-mode: automated
elicit: false
timeout: 60s

prerequisites:
  - Backlog has items to curate

inputs:
  - name: target
    type: string
    description: Optional — limit curation to items from this target
    required: false
  - name: prune
    type: boolean
    description: If true, remove done/skipped items older than 90 days
    required: false
    default: true

outputs:
  - name: report
    type: object
    description: Curation report with merge, prune, and conflict details

dependencies:
  data:
    - backlog.json
    - scan-history.json

validation:
  success-criteria:
    - No duplicate items remain in backlog
    - Stale items pruned (if prune=true)
    - Conflicts documented
  failure-conditions:
    - Backlog file corrupted or unreadable
---

# Review and Curate Backlog

## Purpose
Keep the backlog sharp and actionable by merging duplicates, pruning stale items, and detecting conflicts.

## Execution Steps

### Step 1: Load Backlog
1. Read `data/backlog.json`
2. If `target` filter provided, focus on those items (but check cross-target conflicts)
3. Report: "Loaded N items (P pending, D done, S skipped)"

### Step 2: Detect Duplicates
1. Group items by `target` + `criterion`
2. Within each group, check title similarity (>85% = duplicate)
3. For exact duplicates (same target_path + criterion), mark the newer one for merge
4. Report: "Found N duplicate pairs"

### Step 3: Merge Similar Items
For each duplicate pair:
1. Keep the item with higher priority_score
2. Merge the other's description into the kept item (if it adds context)
3. Combine the files arrays
4. Mark the merged item as "skipped" with note "Merged into {kept_id}"
5. Report each merge: "Merged dir-001 → dir-002"

### Step 4: Detect Conflicts
Look for conflicting items:
1. Two items modifying the same files with opposing approaches
2. Refactor items that would invalidate other pending items
3. Feature additions conflicting with simplification items
4. Report conflicts as pairs: "CONFLICT: dir-003 vs dir-007 — both modify hooks/useAuth.ts"

### Step 5: Recalibrate Priorities
1. For pending items older than 30 days, reduce freshness score
2. Recalculate priority_score with updated freshness
3. Report items with significant score changes (>10 points)

### Step 6: Prune Stale
If `prune` is true:
1. Find done/skipped items with `updated` or `created` older than 90 days
2. Remove them from backlog
3. Report: "Pruned N stale items"

### Step 7: Report Summary
```
Curation Report
===============
Total items: 45 → 38 (7 changes)

Merged: 3 pairs
  - dir-001 → dir-002 (same mutation wrapper finding)
  - dir-008 → dir-012 (both about missing error boundaries)
  - dir-015 → dir-016 (duplicate type safety finding)

Pruned: 4 stale items (completed >90 days ago)

Conflicts: 1
  - dir-003 vs dir-007: both modify useAuth.ts — refactor vs feature add

Priority recalibrated: 5 items
  - dir-005: 72 → 65 (freshness decay)
  - dir-009: 58 → 51 (freshness decay)
  ...

Backlog health: 38 total | 28 pending | 8 done | 2 skipped
```
