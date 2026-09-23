---
task-id: improve
name: Improve Target
agent: scan-director
version: 4.0.0
purpose: >
  Single entry point for the PM + continuous improvement loop.
  Claude Code follows this task to scan, analyze, research competitors,
  and execute improvements on any target.
  v4: 9-phase pipeline adding competitive research (Phase 1b) and
  story generation (Phase 5d) to the existing engine.
workflow-mode: autonomous
elicit: false
timeout: 900s

inputs:
  - name: target
    type: string
    description: Target name from targets.yaml (e.g., videodrome, director, presentation)
    required: true
  - name: max_items
    type: number
    description: Maximum improvements to execute
    required: false
    default: 5
  - name: effort_filter
    type: string
    description: Only execute items of this effort level (small, medium)
    required: false
    default: null
  - name: scan_only
    type: boolean
    description: Scan and add to backlog without executing
    required: false
    default: false
  - name: research_only
    type: boolean
    description: Run research phase only
    required: false
    default: false
  - name: strategy_only
    type: boolean
    description: Run PRD analysis only, show gap report
    required: false
    default: false
  - name: competitive_review
    type: boolean
    description: Run competitive research phase only (Phase 1b)
    required: false
    default: false

outputs:
  - name: session
    type: object
    description: Session summary with scan results and executed improvements

dependencies:
  scripts:
    - scripts/status.js
    - scripts/execute.js
    - scripts/research.js
  lib:
    - lib/backlog-manager.js
    - lib/research-bank.js
    - lib/metrics-tracker.js
    - lib/prd-parser.js
    - lib/validation-runner.js
    - lib/competitive-intel.js
    - lib/story-generator.js
  data:
    - targets.yaml
    - backlog.json
    - metrics.json
    - atelier-patterns.yaml
    - research-bank.json
  lenses:
    - "lenses/*.yaml"
---

# Improve Target (v4 — 9-Phase PM + Improvement Pipeline)

## You are the Director

You are a Product Manager and continuous improvement engine. When invoked, you
autonomously cycle through 9 structured phases: status, strategy, research,
competitive research, multi-lens scan, merge+prioritize, execute+validate,
report+evolve+stories.

v4 adds competitive intelligence (Phase 1b) and story generation (Phase 5d).

You don't ask permission for small items. You execute, validate, and move on.
For medium+ items, you show what you'll do and proceed unless it's risky.

## How to Start

When the user says any of these:
- `improve videodrome`
- `improve director`
- `improve presentation`
- `director scan videodrome`
- `melhorar o director`

Follow the 8 phases below for the specified target.

---

## Phase 0: STATUS + METRICS

Load context and understand current state:

```bash
node ateliers/director/scripts/status.js --metrics --target {target}
```

Read the output. Note:
- Pending items for this target
- Velocity trend (items/week)
- Last session date

**Decision gate:** If >10 pending items + last scan <7 days ago, skip to Phase 4.

---

## Phase 0.5: STRATEGY

Read PRDs and identify what needs to be built.

1. Parse active stories: `prd-parser.js` → `parseStoryDir('docs/stories/')`
2. Filter to stories relevant to `{target}` (by `files_mentioned` or explicit target)
3. Generate strategic items from pending criteria via `generateStrategicItems()`
4. Hold items for Phase 3 merge (don't commit yet)

If `strategy_only`, stop here and show PRD gap report:
```
Strategic Review Results:
  Active stories found: N
  Filtered to target: {target} → N stories
  Strategic items generated: N

  Per-story breakdown:
    Story {id} — {title}
      Status: {status} ({completed}/{total} criteria done)
      Pending criteria: N
```

---

## Phase 1: RESEARCH (Exa)

Gather external patterns relevant to the target.

1. Read target config from `ateliers/director/data/targets.yaml`
2. Check research bank for cached results: `node ateliers/director/scripts/research.js --target {target}`
3. For each lens, formulate a research query
4. For uncached queries, call Exa MCP tool (`mcp__exa__web_search_exa` or `mcp__exa-server__web_search_exa`)
5. Store results in research bank via `storeResults()`
6. If Exa unavailable: skip gracefully, continue

If `research_only`, stop here.

---

## Phase 1b: COMPETITIVE RESEARCH

Analyze competitor products for feature, UX, engagement, and data gaps.

**Skip if:** Target has no `competitors` block in targets.yaml.

1. Load `competitors` and `product_context` from targets.yaml
2. Build research queries: `competitive-intel.js → buildCompetitorQueries(targetConfig)`
3. Search with fallback chain: Exa MCP → WebSearch → skip
4. Store results in research bank with `focus: 'competitive-analysis'`
5. Parse and analyze: `parseCompetitorFeatures()` → `compareFeatures()` → `generateCompetitiveFindings()`
6. Build briefing: `buildCompetitiveBriefing()`
7. Hold competitive findings for Phase 3 merge

If `competitive_review`, stop here and show competitive briefing.

---

## Phase 2: MULTI-LENS SCAN

For each lens assigned to this target:

1. **Read the lens file** from `ateliers/director/lenses/{lens}.yaml`
2. **Read the target's source files** (glob the target path)
3. **Analyze through each criterion** in the lens
4. **Check research bank** for relevant patterns
5. **Generate findings** with fields:
   - `title`: What's wrong (imperative, specific)
   - `description`: Why it matters, what to do
   - `lens`: Which lens found it
   - `criterion`: Which specific criterion
   - `target`: Target name
   - `effort`: small / medium / large / xlarge
   - `priority`: critical / high / medium / low
   - `target_path`: Specific file(s) affected
   - `files`: Array of files to modify

---

## Phase 3: MERGE + PRIORITIZE

Merge tactical (scan) + strategic (PRD) + competitive items and commit to backlog:

1. Collect tactical findings from Phase 2
2. Collect strategic items from Phase 0.5
3. Collect competitive findings from Phase 1b
4. Merge all sets into a single array
5. Score alignment:
   - Strategic: `prd_alignment: 100`, `competitive_alignment: 0`
   - Competitive: `prd_alignment: 0`, `competitive_alignment: 100`
   - Tactical: `prd_alignment: 0`, `competitive_alignment: 0`
5. Deduplicate against existing backlog
6. Commit to backlog:

```javascript
import { addItems } from './ateliers/director/lib/backlog-manager.js';
const allItems = [...tacticalFindings, ...strategicItems, ...competitiveFindings];
const result = await addItems(DATA_DIR, allItems);
console.log('Added:', result.added, '| Duplicates:', result.duplicates);
```

Show summary: findings by lens (including strategic + competitive), top 5 by priority.

If `scan_only`, stop here.

---

## Phase 4: EXECUTE + VALIDATE

Loop through highest-priority pending items:

1. **Pick next**: `node ateliers/director/scripts/execute.js --target {target}`
2. **Read the context**: Description, files, research refs
3. **Implement the fix**: Read files, understand patterns, make minimal changes
4. **Run validation**: `validation-runner.js` — lint, typecheck, test
   - If lint/typecheck/test fail: fix the issues before proceeding
   - If all checks pass: continue to QA scoring
5. **Run execution-validator agent** (QA score across 5 dimensions)
   - If QA score >= threshold (default 70): proceed to mark done
   - If QA score < threshold: flag for review, do NOT mark as done
6. **Mark done** (only if validation passes):
   `node ateliers/director/scripts/execute.js --done {id} "what was done"`
7. **Repeat** until max_items reached

---

## Phase 5: REPORT + EVOLVE

Record the session, show metrics, and optionally evolve PRDs:

### 5a. Record Session

```javascript
import { recordSession } from './ateliers/director/lib/metrics-tracker.js';
await recordSession(DATA_DIR, {
  target: '{target}',
  findings_new: N,
  findings_duplicate: N,
  items_executed: N,
  items_skipped: N,
  research_queries: N,
  strategic_items: N,
  lenses_applied: ['...'],
  duration_minutes: N
});
```

### 5b. Show Metrics

```bash
node ateliers/director/scripts/status.js --metrics
```

### 5c. PRD Evolution Check

Check if session count >= `evolution.session_threshold` (default: 5):
- If yes (or `--evolve` flag): run prd-evolver agent
  - Update PRD checkboxes for completed items
  - Suggest new criteria based on patterns
  - Flag stale stories (no progress in 30+ days)
- If no: skip evolution, show count until next evolution

### 5d. Story Generation

Auto-generate story files from competitive findings (Phase 1b output).
Only runs if `config.yaml → story_generation.enabled` is true and competitive
findings exist.

```javascript
import { generateStoriesFromFindings } from './ateliers/director/lib/story-generator.js';
const stories = await generateStoriesFromFindings(storiesDir, competitiveFindings, context, {
  minEffort: config.story_generation.min_effort,
  minPriority: config.story_generation.min_priority,
  maxStories: config.story_generation.max_stories_per_session,
});
```

Generated stories include competitive context tables, acceptance criteria,
effort estimates, and references to competitor evidence.

---

## Rules

### What to Fix (Always)
- Dead code, unused imports
- Missing error handling on async operations
- Hardcoded values that should be in config
- Duplicated logic that should be extracted
- Missing tests for pure functions
- Anti-patterns from atelier-patterns.yaml

### What to Improve (When Found)
- Inconsistent naming conventions
- Functions over 50 lines
- Missing JSDoc on exported functions
- Performance issues (unnecessary re-renders, N+1 queries)
- Accessibility gaps (missing ARIA labels, focus management)

### What NOT to Do
- Don't refactor working code just because you can
- Don't add features that weren't requested
- Don't change code style preferences
- Don't modify files outside the target scope
- Don't break existing tests
- Don't exceed the max_items limit

### Self-Improvement (target = director)
When improving the director itself:
- The director's own lib/ modules are the primary target
- Run `npx vitest run ateliers/director/test/` after changes
- Use the cross-atelier lens to compare against blog patterns
- Any bug found by tests is a high-priority fix
- New capabilities (like metrics tracking) count as improvements

### Cross-Atelier Improvement
When improving other ateliers:
- Load atelier-patterns.yaml to understand our standards
- Compare against production ateliers (blog, research) for patterns
- Use the cross-atelier lens checklist
- Prioritize: tests > error handling > dedup > config extraction
