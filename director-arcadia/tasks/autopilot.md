---
task-id: autopilot
name: Autonomous BMAD Sprint Loop (YOLO mode)
agent: scan-director
version: 1.0.0
purpose: >
  Execute an ALREADY-PLANNED sprint end to end, autonomously: for each
  ready story, run SM (write context) -> Dev (implement in an isolated
  subagent) -> QA (adversarial fresh-eyes review) -> commit -> push, then
  move to the next story without asking. This is the inverse of
  scan-and-execute: that DISCOVERS work; autopilot SHIPS work that is
  already specced in a sprint-status file.
workflow-mode: autonomous
elicit: false
timeout: 3600s

# WHEN TO USE
# - You have a sprint-status YAML with stories in `backlog`/`ready-for-dev`.
# - The user said "go", "bora", "yolo", "run the whole sprint", "don't ask".
# - Each story is verifiable by a local gate (tests / typecheck / smoke / build).
# WHEN NOT TO USE
# - No sprint plan exists yet -> run bmad sprint-planning first.
# - Work needs human decisions mid-flight (design tradeoffs, product calls).
# - Changes are outward-facing / irreversible without approval (deploys, posts).

prerequisites:
  - A sprint-status file exists (default: docs/implementation-artifacts/sprint-status*.yaml)
  - Git repository (autopilot isolates work in a dedicated worktree)
  - Each package/target has a runnable test + typecheck command
  - Story specs (epics file or PRD) the SM can pull acceptance criteria from

inputs:
  - name: sprint_status
    type: string
    description: Path to the sprint-status YAML (the source of truth for story state)
    required: false
    default: docs/implementation-artifacts/sprint-status.yaml
  - name: epics_file
    type: string
    description: Epics/PRD file the SM reads acceptance criteria from
    required: false
  - name: max_stories
    type: number
    description: Stop after N stories (safety cap). 0 = run until backlog dry.
    required: false
    default: 0
  - name: gate_command
    type: string
    description: >
      The command that proves a story green (tests + typecheck + smoke).
      If omitted, the SM infers per-package commands from the repo.
    required: false
  - name: branch
    type: string
    description: Branch to stack commits on. Autopilot creates a worktree for it.
    required: false
  - name: adversarial_qa
    type: boolean
    description: >
      Run QA as a FRESH subagent that re-runs every gate from scratch and
      tries to break the change. STRONGLY recommended — self-QA misses
      blockers fresh eyes catch.
    required: false
    default: true

outputs:
  - name: session
    type: object
    description: >
      Per-story log: {story, sliceCuts, devSummary, qaVerdict, commit,
      testDelta}, plus final totals and any deferred follow-ups.

dependencies:
  agents:
    - sprint-master.md       # SM / Bob — writes the ULTIMATE story context
    - sprint-dev.md          # Dev / Amelia — implements in an isolated subagent
    - sprint-qa.md           # QA / Quinn — adversarial fresh-eyes reviewer
  data:
    - autopilot-playbook.md  # the distilled lessons (read this first)

validation:
  success-criteria:
    - Every executed story ends green (gate passes) before the next starts
    - QA ran as a fresh adversarial pass (when adversarial_qa=true)
    - One atomic commit per story, story-id in the subject
    - sprint-status flipped backlog -> ready-for-dev -> review per story
    - No regression: pre-existing test count never drops
  failure-conditions:
    - A gate fails and cannot be fixed within the story -> stop, report, do NOT proceed
    - A story needs a human decision -> stop and surface it
    - Working tree of another session would be clobbered -> isolate first (worktree)
---

# Autopilot — Autonomous BMAD Sprint Loop

> Read `data/autopilot-playbook.md` first. It is the hard-won "why" behind every
> step here. This task is the "how".

The loop is dead simple and never varies: **pick the next ready story → SM writes
its context → Dev implements it in a clean subagent → QA breaks it with fresh
eyes → commit + push → repeat.** You (the orchestrator) hold the conclusions; the
subagents hold the file-by-file work and return only what matters.

---

## Phase 0 — Isolate (once per run)

1. **Read the sprint-status file** end to end. It is the single source of truth
   for which stories exist and their state (`backlog` → `ready-for-dev` →
   `in-progress` → `review` → `done`).
2. **Detect concurrent sessions.** `git status` + a quick `ps` for other
   `claude` processes on the same checkout. If another session is live on this
   working tree, **do not share it** — create a dedicated worktree:
   ```bash
   git worktree add ../<repo>-<sprint> -b <branch> origin/main
   ```
   Work entirely inside that worktree for the rest of the run. (This is the #1
   cause of corruption when two agents share one tree — see playbook §1.)
3. **Establish the green baseline.** Run the gate ONCE per package via the
   deterministic CLI (reuses `lib/validation-runner.js` — auto-detects + runs
   lint/typecheck/tests, returns a composite pass/score):
   ```bash
   node ateliers/director/scripts/autopilot.js validate --target <pkgPath> --json
   ```
   Record the starting test count per package; every story keeps it monotonic.
4. **Build the work-list.** Don't topo-sort in your head — the spine does it:
   ```bash
   node ateliers/director/scripts/autopilot.js next-story --sprint-status <path> --json
   ```
   It returns the next `ready` story whose deps are all `review`/`done`,
   preferring the one that unblocks the most downstream work. Loop on it.

## Phase 1 — The per-story loop (repeat until backlog dry or max_stories hit)

For each ready story, in dependency order:

### 1a. SM — write the ULTIMATE story context (in-context, fast)
Invoke the `sprint-master` agent. It produces a `docs/stories/<id>.md` with:
- Story (as/I want/so that), numbered ACs from the epics/PRD
- **Slice decision** (see playbook §2): if the story is too big, needs env you
  lack (API keys, Chromium, a device), or mixes verifiable + unverifiable work,
  CUT it into a shippable slice now + a documented follow-up. Name the slice
  (e.g. `320.5.1-A`). The status line records both.
- Dev Notes: exact files to touch, patterns to mirror, the non-negotiables
  (provider rules, atomicity, frame-accuracy — whatever the project's CRs/NFRs
  are), and an explicit **out-of-scope** list.
- A test plan (happy + failure per unit).
Then flip the story `backlog → ready-for-dev` in the sprint-status.

### 1b. Dev — implement in a FRESH subagent
Spawn the `sprint-dev` agent (general-purpose subagent, clean context). Hand it:
- The story file path (its source of truth) + 5–10 ordered files to read first
- The non-negotiables restated as BLOCKER-level rules
- The exact gate commands to run before reporting done
- "Fill the Dev Agent Record + File List; DO NOT commit; DO NOT touch sprint-status"

The subagent returns a summary (test deltas, deviations + rationale, what QA
should scrutinize). If it dies mid-way (rate limit / 529), **resume from
filesystem state** — re-spawn a continuation that reads what's on disk and
finishes the gap, rather than restarting (playbook §5).

### 1c. QA — adversarial fresh eyes (when adversarial_qa=true)
Spawn the `sprint-qa` agent as a SEPARATE clean subagent. It does NOT trust the
Dev's report. It:
- Re-runs the deterministic gate via the spine (`autopilot.js validate`) AND a
  hermetic env-stripped run (`env -u <KEYS> …` — the one thing validation-runner
  doesn't do natively, and autopilot's genuine addition). Records real numbers.
- Reads the whole diff and tries to BREAK it: probe the non-negotiables, hunt for
  bypasses, fault-inject to prove tests are real and not theater.
- Uses `lib/prd-parser.js` `parseStoryDir()`/`inferStatus()` to confirm every AC
  checkbox is genuinely satisfied — catching an AC silently marked "deferred".
- Returns BLOCKER / MAJOR / MINOR / OK findings with file:line + minimal fix.

**If 0 BLOCKER and 0 MAJOR:** QA flips the status `ready-for-dev → review` and
writes ONE commit (story id in the subject, conventional commits, the project's
author + co-author trailer), then returns a one-paragraph PASS verdict. **The
orchestrator does the `git push`** — keep the single outward action out of the
adversarial agent (clean side-effect boundary: subagents return conclusions +
local commits; the orchestrator owns the remote).

**If ≥1 BLOCKER/MAJOR:** do NOT commit. Either (a) fix inline if small and re-run
QA, or (b) hand the structured findings back to a Dev subagent. Never advance a
red story.

> The single most valuable lesson (playbook §3): self-QA by the same context that
> wrote the code misses blockers. A fresh adversarial subagent that re-runs gates
> and fault-injects is what caught a real compliance bypass that 13 clean self-
> reviewed loops would not have. Keep `adversarial_qa: true` for anything with
> security, compliance, money, or data-loss surface.

### 1d. Advance
Mark the story done-for-this-PR, update the session log, pick the next ready
story. Keep PRs coherent: stack related stories on one branch/PR; open a new PR
when the theme shifts.

## Phase 2 — Close out

- Push the branch; open or update the PR with a running summary (stories, commit
  hashes, cumulative test delta, what's deferred + why).
- **Record the run into the Director's metrics** so autopilot velocity/burndown
  shows up alongside scan-and-execute work (and gives crash-resume an anchor):
  ```bash
  node ateliers/director/scripts/autopilot.js record --target <name> --stories <n>
  ```
- List the deferred slices and the manual gates that still need the user
  (live API smokes, device tests, deploy approval).
- Report totals: stories shipped, test count start→end, BLOCKER/MAJOR tally
  across QA passes (the health signal).

## Slicing in the sprint-status schema

`development_status:` is a flat `key: status` map. When the SM cuts a story into
slices (playbook §2), represent it so nothing looks falsely done:
- **Keep the parent epic-story line at `backlog`** until every slice ships
  (e.g. `320-5-1-remotion-final-export: backlog`).
- **Add one line per slice**, each flipping independently. Either key convention
  works — the resolver understands both:
  - `<parent-key>-slice-<letter>` — `320-5-1-remotion-final-export-slice-a: review`
  - `<parent numeric prefix>-<letter>-<slug>` — parent `340-4-threads-profiles-follow`
    → `340-4-a-threads: review`, `340-4-b-profiles-follow: blocked`

  The slice tag is a SINGLE letter, and it keys off the parent so the dependency
  graph still resolves on the parent id.
- The `next-story` resolver treats slice lines as ordinary stories and **keeps
  the parent OUT of the ready set until every one of its slices is
  `review`/`done`** — handing a Dev the parent would mean re-implementing a
  shipped slice and/or attempting a blocked one. When all slices have shipped the
  parent becomes ready again, as the close-out line.
- Slice matching is segment-aware, never a raw string prefix: `340-1-…` is not a
  parent of `340-10-…`, and `340-4x-…` is not a slice of `340-4-…`.

---

## Stop conditions (hard — never push past these)

- A gate goes red and the fix isn't within the story's scope.
- A story requires a product/design decision the spec doesn't settle.
- An action becomes outward-facing or irreversible (deploy, publish, send,
  destructive migration) — pause and ask, even in YOLO mode.
- `max_stories` reached, or the backlog is dry.
- Token budget directive (`+Nk`) exhausted.

## What "autonomous" does and does not mean

- DOES: pick stories, write context, implement, adversarially review, commit,
  push, and move on without asking between stories.
- DOES NOT: skip the QA gate, merge PRs, deploy, post, or take irreversible
  outward actions. YOLO is about *velocity through the build loop*, not about
  removing the safety rails.

## Invocation examples

```text
# Conversationally, after a sprint is planned:
"bora, roda o sprint todo em autopilot, não me pergunta"

# Explicit:
/director autopilot --sprint_status docs/implementation-artifacts/sprint-status-x.yaml --adversarial_qa true
```

The orchestrator translates either into: Phase 0 isolate → loop → Phase 2 close.
