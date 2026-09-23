# Workflow: generate-ad-batch

**Mode**: Batch (Non-Interactive)
**Purpose**: Automated ad generation for batch processing
**Optimization**: 60% faster, 60% fewer tokens vs interactive mode

---

## Overview

This workflow generates Instagram story ads **without user interaction**, optimized for:
- Batch/bulk ad generation (`batch-generate-ads.js`)
- API/automation contexts
- High-volume campaigns

**Key Difference from Interactive Mode:**
- Zero elicitation → decisions made via heuristics
- Minimal token usage → streamlined prompts
- Fast execution → ~50s vs ~120s per ad

---

## Inputs

### Required
- `brief_path`: Path to ad brief text file
- `brand`: Brand name (from config or CLI)
- `output_dir`: Where to save generated ad

### Optional
- `template`: Template ID (default: auto-select based on goal)
- `theme`: Visual theme (default: minimalist)
- `cta_text`: Custom CTA text (default: auto-generate)

---

## Steps

### 1. Analyze Ad Brief (Batch Mode)
**Task**: `analyze-ad-brief-batch.md`
**Behavior**: Extract structured data without confirmation

```yaml
inputs:
  - brief_text
outputs:
  - brand_name
  - target_audience
  - campaign_goal (conversion|awareness|engagement)
  - key_benefits []
  - tone_indicators [] (professional|friendly|urgent)
  - template_recommendation (auto-selected, no elicitation)
```

**Heuristics:**
- `conversion` goal → template: `ad-01-hero-overlay`
- `awareness` goal → template: `ad-02-benefit-focus`
- `engagement` goal → template: `ad-03-story-arc`

---

### 2. Craft Ad Copy (Batch Mode)
**Task**: `craft-ad-copy-batch.md`
**Behavior**: Generate all copy elements in single pass

```yaml
inputs:
  - brief_analysis
  - brand_name
  - target_audience
outputs:
  - headline (engaging, benefit-driven)
  - body_text (concise, max 2 sentences)
  - cta_text (action-oriented)
  - tone (auto-selected from brief keywords)
```

**Tone Selection Logic:**
```javascript
if (brief includes "profissional", "expert", "corporativo") → professional
if (brief includes "iniciante", "dúvida", "ajuda") → friendly
if (brief includes "limitado", "últimas vagas", "hoje") → urgent
default → professional
```

---

### 3. Design CTA Component (Batch Mode)
**Task**: `design-cta-component-batch.md`
**Behavior**: Auto-select CTA verb and format

```yaml
inputs:
  - campaign_goal
  - cta_text (optional override)
outputs:
  - cta_verb (Garanta|Descubra|Comece)
  - cta_full_text
  - cta_style (button|link|badge)
```

**CTA Verb Heuristic:**
```javascript
conversion → "Garanta" (creates urgency)
awareness → "Descubra" (invites exploration)
engagement → "Comece" (prompts action)
```

---

### 4. Design Ad Layout (Batch Mode)
**Task**: `design-ad-layout-batch.md`
**Behavior**: Apply template without options/confirmation

```yaml
inputs:
  - template_id (from step 1)
  - headline
  - body_text
  - cta_component
  - theme
outputs:
  - layout_html (complete HTML)
  - layout_css (theme-specific styles)
```

**Template Application:**
- Uses selected template structure
- Applies theme colors automatically
- No layout variation prompts

---

### 5. Validate Ad Quality (Batch Mode)
**Task**: `validate-ad-quality-batch.md`
**Behavior**: Check quality, report issues, continue

```yaml
inputs:
  - layout_html
  - copy_data
checks:
  - Text readability (< 100 chars headline)
  - CTA visibility (contrast ratio > 4.5:1)
  - Brand consistency (logo/colors present)
outputs:
  - validation_status (pass|warn|fail)
  - issues [] (logged, not blocking)
```

**Difference from Interactive:**
- No "fix issues?" prompt
- Warnings logged to `generation.log`
- Process continues unless critical error

---

### 6. Render & Export
**Task**: `render-and-export.md` (same for both modes)
**Behavior**: Generate PNG output

```yaml
inputs:
  - layout_html
  - output_dir
outputs:
  - ad_image.png (1080x1920)
  - ad_data.json (metadata)
```

---

## Performance Targets

| Metric | Target | Interactive Mode (baseline) |
|--------|--------|------------------------------|
| **Execution Time** | < 60s | ~120s |
| **Token Usage** | < 7K | ~15K |
| **Quality** | Match interactive | Same |

---

## Error Handling

### Non-Critical Errors
- Log warning, continue execution
- Examples: missing brand color, low contrast

### Critical Errors
- Abort workflow, return error
- Examples: invalid template, missing brief data

```javascript
try {
  await executeTask('analyze-ad-brief-batch');
} catch (error) {
  if (error.critical) throw error;
  log.warn(`Non-critical: ${error.message}`);
  // Continue with defaults
}
```

---

## Usage Examples

### Via CLI (orchestrator)
```bash
node scripts/orchestrate-ad-arcadia.js /tmp/brief.txt \
  --brand=creator \
  --batch  # ← Enables batch workflow
```

### Via Batch Script (auto-detected)
```bash
node scripts/batch-generate-ads.js content/campaign.json
# Automatically uses batch workflow
```

### Programmatic
```javascript
const workflow = await loadWorkflow('generate-ad-batch');
const result = await workflow.execute({
  brief_path: '/tmp/brief.txt',
  brand: 'creator',
  output_dir: './output/batch-test'
});
```

---

## Comparison: Interactive vs Batch

| Aspect | Interactive | Batch |
|--------|-------------|-------|
| Template Selection | Shows 3 options | Auto-selects |
| CTA Verb | Asks preference | Heuristic |
| Tone Adjustment | Prompts for feedback | Keyword-based |
| Validation | Offers to fix | Reports only |
| Token Usage | ~15K | ~6K |
| Time | ~120s | ~50s |
| Elicitation Points | 5+ | 0 |

---

## Related Files

- Interactive workflow: `.arcadia-core/workflows/generate-ad.md`
- Batch tasks: `ateliers/carousel/tasks/ads/*-batch.md`
- Orchestrator: `scripts/orchestrate-ad-arcadia.js`

---

**Version**: 1.0
**Story**: 010.19 - Dual-Workflow Batch Optimization
**Last Updated**: 2025-01-24
