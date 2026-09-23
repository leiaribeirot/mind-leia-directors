---
task-id: spawn-atelier
name: Spawn New Atelier
agent: atelier-architect
version: 1.0.0
purpose: >
  Create a new atelier from blueprints with standard directory structure,
  config.yaml, and initial agent/task stubs. Registers in targets.yaml
  for immediate director scanning.
workflow-mode: autonomous
elicit: false
timeout: 300s

inputs:
  - name: atelier_name
    type: string
    description: Name of the new atelier (lowercase, hyphenated)
    required: true
  - name: purpose
    type: string
    description: What this atelier produces (1-2 sentences)
    required: true
  - name: reference_atelier
    type: string
    description: Which existing atelier to use as primary reference
    required: false
    default: blog

outputs:
  - name: created_files
    type: array
    description: List of files created during scaffolding

dependencies:
  lib:
    - lib/atelier-blueprint.js
  data:
    - data/blueprints/atelier-scaffold.yaml
    - data/blueprints/pipeline-patterns.yaml
    - data/blueprints/agent-patterns.yaml
    - data/targets.yaml
---

# Spawn New Atelier

## Purpose

Create a new atelier from proven blueprints. The scaffold includes standard
directory structure, config.yaml with model routing and cost control, and
registration in targets.yaml for immediate director scanning.

## Steps

1. **Read blueprints** from `data/blueprints/`
2. **Extract reference** patterns via `extractBlueprint(referencePath)`
3. **Generate scaffold** via `generateScaffold(atelierName)`
4. **Register** in `data/targets.yaml` with default lens assignments
5. **Return** created files list

## Invocation

Via the director slash command:
```
/director --spawn <name>
```

## Example

```
/director --spawn email-marketing
```

Creates:
```
ateliers/email-marketing/
  config.yaml
  agents/
  tasks/
  lib/
  data/
  scripts/
  test/
```
