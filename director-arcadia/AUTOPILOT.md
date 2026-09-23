# Autopilot — Autonomous BMAD Sprint Loop (Director module)

A module of the Director atelier that **executes an already-planned sprint end to
end, autonomously.** Where `scan-and-execute` *discovers* work, autopilot *ships*
work that is already specced: for each ready story it runs **SM → Dev → QA →
commit → push** and moves to the next without asking — with a fresh adversarial
QA gate on every story so velocity never costs correctness.

Proven on a 19-story run (Epic 320, Solax Editor): 28 → 210 tests, 7 packages, 3
PRs, and a real compliance bypass caught by the adversarial gate that self-review
missed.

---

## When to use it

✅ A sprint is **already planned** — a `sprint-status*.yaml` with stories in
`backlog`/`ready-for-dev`, and an epics/PRD file the SM can pull ACs from.
✅ Each story is **verifiable by a local gate** (tests / typecheck / smoke / build).
✅ You want to say **"bora, roda o sprint todo, não me pergunta"** and walk away.

🚫 No plan yet → run BMAD `sprint-planning` first (or `/director scan-and-execute`
to discover + plan). 🚫 Work needs human design/product calls mid-flight. 🚫 The
changes are outward-facing/irreversible (deploys, posts) — those always stop.

---

## What's in the module

```
ateliers/director/
├── AUTOPILOT.md                     ← this file (activation guide)
├── tasks/autopilot.md               ← the executable workflow (the "how")
├── scripts/autopilot.js             ← the deterministic spine (next-story / validate / record)
├── agents/
│   ├── sprint-master.md             ← Bob  — writes the ULTIMATE story context, slices
│   ├── sprint-dev.md                ← Amelia — implements in a fresh subagent
│   └── sprint-qa.md                 ← Quinn — adversarial fresh-eyes gate
├── test/autopilot.test.js           ← tests for the spine (dep-graph next-story resolver)
└── data/autopilot-playbook.md       ← the hard-won "why" (read first; §1–§8)
```

The three agents map 1:1 to the loop roles. They run as **separate subagents** so
each gets a clean context — and so QA literally cannot trust the Dev's report
(it's a different agent that re-runs every gate from scratch).

### Reuses the Director's infra (doesn't reinvent it)

The deterministic parts of the loop call existing Director libs through
`scripts/autopilot.js` — the LLM only does the genuinely-LLM work (write context,
implement, adversarial review):

| Loop step | Spine command | Reuses |
|---|---|---|
| pick next ready story | `autopilot.js next-story` | dependency-graph resolver (zero-dep YAML subset parser — runs in a brand-new project with nothing installed) |
| the QA gate | `autopilot.js validate` | `lib/validation-runner.js` — auto-detects + runs lint/typecheck/tests |
| record the run | `autopilot.js record` | `lib/metrics-tracker.js` — feeds velocity/burndown |
| next story id / slug | (SM agent) | `lib/story-generator.js` `getNextStoryId`/`generateStorySlug` |
| detect a deferred AC | (QA agent) | `lib/prd-parser.js` `parseStoryDir`/`inferStatus` |

The genuinely-novel bit autopilot adds on top of `validation-runner` is the
**hermetic env-stripped run** (`env -u <KEYS> …`) — proving tests don't secretly
hit the network.

---

## Activate on a NEW project — 4 steps

### 1. Confirm the prerequisites
- [ ] **Git repo.** Autopilot creates a dedicated worktree to isolate the run.
- [ ] **A sprint-status YAML** with `development_status:` entries and a
      `dependencies:` graph. (Generate with BMAD `sprint-planning` if absent.)
- [ ] **An epics/PRD file** with per-story acceptance criteria.
- [ ] **A gate command per package/target** — the thing that proves a story
      green. Tests + typecheck + a smoke/build. Must run with secrets UNSET
      (hermetic), or autopilot can't verify in the loop.

### 2. Point it at the sprint
Either edit the inputs in `tasks/autopilot.md` (defaults assume
`docs/implementation-artifacts/sprint-status.yaml`) or pass them at invocation.
Minimum the orchestrator needs to know: **where the sprint-status is**, **where
the epics/PRD is**, and **the gate command**.

### 3. Invoke

```text
# Conversational (the usual path):
"roda o sprint X em autopilot, yolo, não me pergunta"

# Explicit:
/director autopilot \
  --sprint_status docs/implementation-artifacts/sprint-status-X.yaml \
  --epics_file    docs/planning-artifacts/epics-X.md \
  --gate_command  "npm test && npm run typecheck" \
  --adversarial_qa true \
  --max_stories   0          # 0 = run until backlog dry
```

### 4. Let it run; review the PR
Autopilot opens/updates one PR per coherent theme, with a running summary
(stories, commit hashes, cumulative test delta, deferred slices). It pauses only
on: a red gate it can't fix in-scope, a needed human decision, or an irreversible
action. **It never merges, deploys, or posts** — that's yours.

---

## What you get back

Per story: `{ story, sliceCuts, devSummary, qaVerdict (BLOCKER/MAJOR/MINOR/OK),
commit, testDelta }`. At the end: stories shipped, test count start→end, the
BLOCKER/MAJOR tally across QA passes (your health signal), and the list of
deferred slices + manual gates still needing you (live API smokes, device tests,
deploy approval).

---

## The non-negotiables it enforces (project-agnostic shape)

Autopilot doesn't hardcode any one project's rules — the SM restates the real
ones per run from the project's NFRs/CRs. The recurring shape:

- **Provider/routing discipline** — one source of truth, no rogue SDK calls.
- **Atomic writes** — `.tmp` + rename anywhere state persists.
- **Hermetic tests** — `_inject` seam; suite green with all keys unset.
- **No silent scope creep** — explicit out-of-scope per story; cuts documented.
- **One atomic commit per story**, story id in the subject.
- **Fresh adversarial QA** on anything with security/compliance/money/data-loss
  surface — this is the rail that caught the real bypass.

---

## Why a separate module from `scan-and-execute`

| | `scan-and-execute` | `autopilot` |
|---|---|---|
| Input | a codebase + lenses | a planned sprint (stories) |
| Job | **discover** improvements → backlog | **ship** specced stories |
| Loop | research → scan → review → execute | SM → Dev → QA → commit → push |
| Stops | budget / max_items / user | red gate / human decision / irreversible |
| Output | prioritized backlog + some executed | committed+pushed stories, stacked PR |

Use `scan-and-execute` to figure out *what* to build; use `autopilot` to *build
the sprint you already planned*. They compose: scan to fill the backlog, plan it
into a sprint, then autopilot to ship it.

---

See `data/autopilot-playbook.md` (§1–§8) for the reasoning behind every rule —
worktree isolation, slicing, fresh-eyes QA, hermetic discipline, crash-resume,
PR stacking, sprint-status as source of truth, and what "YOLO" does and doesn't
license.
