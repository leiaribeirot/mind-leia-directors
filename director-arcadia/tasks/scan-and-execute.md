---
task-id: scan-and-execute
name: Continuous Scan and Execute Loop
agent: scan-director
version: 2.0.0
purpose: >
  Continuous improvement loop: research → scan → review → execute → repeat.
  Includes Exa research for external patterns, Taynã gate for decision
  review, and persistent research bank.
workflow-mode: interactive
elicit: true
timeout: 600s

prerequisites:
  - Target registered in data/targets.yaml
  - Codebase accessible

inputs:
  - name: target
    type: string
    description: Target name to scan and improve
    required: true
  - name: lenses
    type: string[]
    description: Optional lens subset
    required: false
  - name: max_items
    type: number
    description: Maximum items to execute before stopping
    required: false
    default: 5
  - name: auto_execute_small
    type: boolean
    description: Auto-execute small-effort items without confirmation
    required: false
    default: false
  - name: with_research
    type: boolean
    description: Run Exa research phase before scanning
    required: false
    default: true
  - name: with_tayna_gate
    type: boolean
    description: Run decision review on high-priority items
    required: false
    default: true

outputs:
  - name: session
    type: object
    description: Session summary with research, scan, and execution log

dependencies:
  data:
    - targets.yaml
    - backlog.json
    - scan-history.json
    - research-bank.json
    - atelier-patterns.yaml
  agents:
    - decision-reviewer.md

validation:
  success-criteria:
    - Scan completed and findings added to backlog
    - At least one item executed (or user chose to stop)
    - Session cost within budget
    - Research results persisted in research-bank.json
  failure-conditions:
    - Cost hard stop exceeded
    - Target not found
---

# Continuous Scan and Execute Loop

## Purpose
The full continuous improvement workflow with three enhancements:
1. **Research phase** — Exa search for external patterns and solutions before scanning
2. **Taynã gate** — Decision review using cognitive clone frameworks for high-impact items
3. **Research bank** — Persistent storage so research accumulates across sessions

## Execution Steps

### Step 0: Load Context
1. Load `data/atelier-patterns.yaml` — our architecture preferences and anti-patterns
2. Load research bank stats — how much research already exists for this target
3. Display: "Target: {name} | Research bank: {N} entries | Backlog: {M} pending"

### Step 1: Research Phase (if with_research=true)
1. Generate Exa search queries for the target's tech stack
2. For each query, check the research bank cache (30-day window):
   - **Cache hit**: Skip search, display "Cached: {query} ({age} days ago)"
   - **Cache miss**: Run Exa search via `mcp__exa-server__web_search_exa`
3. Store new results in `data/research-bank.json`
4. Display research summary:
   ```
   Research Phase: videodrome
   Queries: 5 total | 2 cached | 3 new searches
   Results: 15 new sources found

   Key findings:
   - TanStack Query v5 mutation wrapper pattern (github.com/TanStack/query)
   - Supabase error boundary recipe (supabase.com/docs)
   - React.lazy route splitting guide (react.dev)
   ```
5. Research findings inform the scan phase — agents reference relevant URLs

### Step 2: Scan Phase
1. Execute the `scan-target` task for the specified target and lenses
2. Pass research context to scan agents (relevant bank entries for each lens focus)
3. Collect new findings added to backlog
4. Display scan summary
5. Check cost — if approaching budget, warn user

### Step 3: Taynã Gate (if with_tayna_gate=true)
For items with `priority_score >= 75` or `effort = large|xlarge`:
1. Load the `decision-reviewer` agent
2. Apply the four frameworks:
   - **Lei do Fogo**: Forja (approve) / Fogueira (deprioritize) / Cinzas (reject)
   - **Alavanca vs Prótese**: Leverage (approve) / Prosthesis (warn)
   - **Obliquação**: Meta-improvement (+10) / Direct (neutral) / Surface (-10)
   - **Assinatura Cósmica**: Reinforces our patterns (approve) / Contradicts (reject)
3. Adjust priority scores based on verdict
4. Display review summary:
   ```
   Taynã Gate: 3 items reviewed
   - dir-001: FORJA + ALAVANCA + META → Strong approve (+10 → 92)
   - dir-002: FOGUEIRA → Deprioritize (-15 → 57)
   - dir-003: FORJA + PRÓTESE → Approve with warning (82)
   ```

### Step 4: Execution Loop
Repeat until `max_items` reached or user stops:

1. **Select next item**: Highest priority pending item for this target
2. **Display item**: Show title, priority, effort, description
3. **Show research context**: If research bank has relevant entries, display:
   ```
   Related research:
   - "React mutation wrapper pattern" (res-2026-05-24-abc)
     → https://github.com/TanStack/query/examples/mutations
   ```
4. **Decision gate**:
   - If `auto_execute_small` AND effort = "small": proceed automatically
   - If effort = "large" or "xlarge": show item but recommend deferring
   - Otherwise: ask "Execute? [y/n/stop]"
5. **Execute**: If approved, run `execute-improvement` task
   - Reference research bank URLs as implementation examples
   - Link research entry to backlog item via `research_ref` field
6. **Cost check**: After each execution, check cost tracker
   - If over soft budget: warn "Session approaching cost limit"
   - If over hard stop: abort loop
7. **Continue**: Ask "Continue to next item? [y/stop]"

### Step 5: Session Summary
Display at end of session:
```
Session Summary
===============
Target: videodrome

Research: 5 queries | 3 new searches | 15 sources banked
Scan: 42 files | 12 new findings | 3 duplicates
Taynã Gate: 3 reviewed | 1 boosted | 1 deprioritized

Executed: 4 items
  1. [done] dir-2026-05-24-001 — Extract shared mutation wrapper (small)
     Research ref: TanStack Query mutation pattern
  2. [done] dir-2026-05-24-003 — Add error boundary (small)
  3. [done] dir-2026-05-24-005 — Add loading skeleton (medium)
  4. [skip] dir-2026-05-24-007 — Refactor service layer (large — deferred)

Remaining: 8 pending items for videodrome
Next highest: dir-2026-05-24-002 — Add missing ARIA labels (priority: 75)

Research bank: 23 total entries | 4 linked to executed items
Cost: $0.42 / $2.00 budget
```
