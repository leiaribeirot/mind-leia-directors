# Director — PM + Continuous-Improvement Engine

The meta-atelier: it works on the **other** ateliers (and on itself). Point it at any
target and it scans the real code, prioritizes what matters, ships the fix, and validates
it — then evolves its own backlog. It is how Arcadia improves Arcadia.

## What it does

Two modes:

- **`/director <target>`** — the 9-phase improvement pipeline: status → strategy → research
  → competitive scan → code scan → merge+prioritize → execute+validate → report+evolve →
  stories. Produces a prioritized, evidence-backed backlog and ships the safe items.
- **`/director autopilot`** — autonomously ships an already-planned sprint, one story at a
  time, with an adversarial fresh-eyes loop: **Sprint-Master → Dev → QA** per story, in an
  isolated git worktree, gated by hermetic tests.

The `atelier-strategy-map.yaml` (aitelier-only) is its lens: findings in `verdict=invest`
ateliers gain weight; `archive`/`merge` findings are discarded unless they are the archival
action itself.

## What you get

- A living backlog scored by impact × evidence, with `file:line` provenance.
- Safe, additive fixes shipped and verified — not just diagnosed.
- Fresh-eyes QA that catches plausible-but-wrong changes before they land.

## Team (16 artisans)

`scan-director` · `feature-scout` · `product-analyst` · `strategy-planner` ·
`backlog-curator` · `pattern-extractor` · `prd-evolver` · `atelier-architect` ·
`execution-validator` · `sprint-master` · `sprint-dev` · `sprint-qa` · plus reviewers
(`code`, `architecture`, `decision`, `ux`).

## Entry points

```bash
/director <target>                 # full pipeline (any atelier, or "director" itself)
/director autopilot <target>       # ship a planned sprint end-to-end
npm run atelier:director:scan      # scan only
npm run atelier:director:status    # where things stand
npm run atelier:director:execute   # execute a planned item
```

Valid targets are generated from the atelier registry — see `ateliers/REGISTRY.md`.
