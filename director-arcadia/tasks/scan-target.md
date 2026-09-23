---
task-id: scan-target
name: Scan Target Through Lenses
agent: scan-director
version: 1.0.0
purpose: >
  Scan a codebase target through structured lenses to identify improvements.
  Produces deduplicated, prioritized backlog items.
workflow-mode: automated
elicit: false
timeout: 120s

prerequisites:
  - Target registered in data/targets.yaml
  - At least one lens YAML exists in lenses/

inputs:
  - name: target
    type: string
    description: Target name from targets.yaml (e.g., "videodrome")
    required: true
  - name: lenses
    type: string[]
    description: >
      Optional subset of lenses to apply. If omitted, uses target's default lens list.
    required: false
  - name: dry_run
    type: boolean
    description: If true, display findings but don't write to backlog
    required: false
    default: false

outputs:
  - name: findings
    type: object[]
    description: Array of backlog items produced by the scan
  - name: summary
    type: object
    description: Scan summary with counts by lens and severity

dependencies:
  data:
    - targets.yaml
    - backlog.json
    - scan-history.json
    - research-bank.json
    - atelier-patterns.yaml
  lenses:
    - code-quality.yaml
    - ui-ux.yaml
    - feature-expansion.yaml
    - performance.yaml
    - architecture.yaml
    - dx-tooling.yaml
    - external-patterns.yaml

validation:
  success-criteria:
    - All specified lenses executed without error
    - Findings are deduplicated against existing backlog
    - Each finding has required fields (lens, criterion, title, effort, priority)
  failure-conditions:
    - Target not found in targets.yaml
    - No files discovered in target path
    - Cost hard stop exceeded
---

# Scan Target Through Lenses

## Purpose
Systematically scan a codebase target to identify improvements, producing actionable backlog items ranked by priority.

## Execution Steps

### Step 1: Resolve Target
1. Load `data/targets.yaml`
2. Find the target by name
3. Resolve the target's absolute path
4. If target not found, abort with error

### Step 2: Discover Files
1. Load scan config from `config.yaml` (include/exclude patterns, size limits)
2. Glob the target directory with configured patterns
3. Apply target-specific exclusions (e.g., videodrome excluded from site scan)
4. Limit to `max_files_per_lens` files
5. Report: "Found N files in {target}"

### Step 3: Load Lenses
1. Determine which lenses to apply:
   - If `lenses` input provided, use those
   - Otherwise, use target's `lenses` list from targets.yaml
2. For each lens, read the lens YAML from `lenses/`
3. Report: "Applying N lenses: [list]"

### Step 4: Scan Per Lens
For each lens:
1. Read the lens YAML — get criteria and scan_instructions
2. Read the relevant files (filtered by lens focus — e.g., ui-ux focuses on TSX/CSS)
3. Analyze each file against the lens criteria
4. Produce structured findings with:
   - `lens`, `criterion`, `target`, `target_path`
   - `title` (imperative, actionable)
   - `description` (what's wrong, where)
   - `rationale` (why it matters)
   - `priority` (critical/high/medium/low)
   - `effort` (small/medium/large/xlarge)
   - `impact` (category: reliability, maintainability, etc.)
   - `files` (affected file paths)
5. Group related findings into single items

### Step 5: Deduplicate
1. Load existing backlog from `data/backlog.json`
2. For each finding, check:
   - Same `target_path` + `criterion` → skip (exact duplicate)
   - Same `target` + title similarity > 85% → skip (fuzzy duplicate)
3. Report: "N new findings, M duplicates skipped"

### Step 6: Score
For each new finding, calculate `priority_score`:
```
impact_score = config.priority.impact_scores[priority]      # 0-100
effort_score = config.priority.effort_scores[effort]         # 0-100
freshness_score = 100                                        # new items start at 100
lens_weight_score = lens.weight × 100                        # 0-100

priority_score = round(
  (impact_score × 0.40) +
  (effort_score × 0.30) +
  (freshness_score × 0.15) +
  (lens_weight_score × 0.15)
) × target.priority_boost
```
Cap at 100.

### Step 7: Commit to Backlog
1. If `dry_run` is true, skip writing — display only
2. Otherwise, add items to `data/backlog.json` via backlog-manager
3. Auto-generate IDs in format `dir-YYYY-MM-DD-NNN`
4. Set status = "pending"

### Step 8: Record Scan
1. Add entry to `data/scan-history.json`:
   ```json
   {
     "id": "scan-YYYY-MM-DD-{hash}",
     "target": "videodrome",
     "lenses": ["code-quality", "ui-ux"],
     "files_scanned": 42,
     "findings_total": 15,
     "findings_new": 12,
     "findings_duplicate": 3,
     "timestamp": "2026-05-24T10:00:00Z"
   }
   ```

### Step 9: Display Summary
Show a summary table:
```
Target: videodrome (42 files scanned)
Lenses: code-quality, ui-ux, architecture

| Lens          | Findings | New | Dupes | Critical | High | Medium | Low |
|---------------|----------|-----|-------|----------|------|--------|-----|
| code-quality  | 8        | 7   | 1     | 0        | 3    | 3      | 1   |
| ui-ux         | 5        | 4   | 1     | 0        | 2    | 2      | 1   |
| architecture  | 2        | 1   | 1     | 0        | 1    | 0      | 0   |
| TOTAL         | 15       | 12  | 3     | 0        | 6    | 5      | 2   |

Top 5 by priority:
1. [82] Extract shared mutation wrapper from 15 hooks (code-quality, small)
2. [78] Add error boundary around Videodrome feature (architecture, small)
3. [72] Add loading skeletons to movie list (ui-ux, medium)
...
```
