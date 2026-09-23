# Generate Multi-Carousel V3 Workflow (Parallel)

**Workflow ID:** generate-multi-carousel-v3
**Description:** Generate 3 complete Instagram carousels in parallel from a single long-form content source
**Estimated Time:** ~8-12 min (3 carousels with AI image generation)
**Script:** `scripts/orchestrate-carousel-v3-full.js --num-carousels=3`

---

## Workflow Overview

For long blog posts, transcripts, or rich content sources, this workflow generates **3 complete carousels** in parallel. The V3 text pipeline naturally produces 3 scored texts — this workflow uses all 3 instead of just the winner.

**Architecture:**
```
Content (long blog / transcript / article)
  → PHASE 1: V3 Text Pipeline (single run)
      → Briefing Splitter → 5-10 ideas
      → Text Writer → 3 complete texts
      → Text Evaluator → score all 3
      → Slide Divider → divide winner into slides
  → Quality Gate: all 3 texts score > 65/100?
  → Slide Divider × 2 (for texts #2 and #3)
  → PHASE 2: Bridge × 3
      → 3 × carousel-specs.json (one per carousel)
  → PHASE 3: Visual Pipeline × 3
      → Images: SEQUENTIAL (API rate limits)
      → HTML + PNG: PARALLEL (no API calls)
  → Output: 3 complete carousel directories
```

---

## Workflow Configuration

```yaml
workflow:
  name: V3 Multi-Carousel Generation (Parallel)
  id: generate-multi-carousel-v3
  version: 1.0.0
  entry_point: elicit_inputs
  timeout: 600s

  agents:
    - briefing-splitter
    - text-writer
    - text-evaluator
    - slide-divider
    - image-curator
    - craft-specialist
    - export-specialist

  flags:
    --auto: Skip approval gate
    --brand: Brand configuration ID
    --num-carousels: Number of carousels (default: 3)

  script: scripts/orchestrate-carousel-v3-full.js --num-carousels=3
```

---

## Workflow Steps

### Step 1: Elicit User Inputs

**Prompt:**
```
🎬 V3 MULTI-CAROUSEL GENERATOR (3 Carousels in Parallel)

1. Content path (long blog, transcript, article):
```

**Accept:** `content_path` (string, required — should be 1000+ words for good results)

**Then:**
```
2. Brand ID (e.g., itafx, taypuri, aitelier):
```

**Accept:** `brand_id` (string, default: "default")

---

### Step 2: V3 Text Pipeline (Phase 1)

Same as single carousel — runs `orchestrate-carousel-v3.js` once. Produces 3 texts.

**Execute:**
```yaml
CALL: scripts/orchestrate-carousel-v3.js
INPUTS:
  content: {{content_path}}
  brand: {{brand_id}}

OUTPUTS: v3_output_dir/
  - 01-briefing-splitter.json
  - 02-text-writer.json (3 texts)
  - 03-text-evaluator.json (3 scores)
  - 04-slide-divider.json (winner only)
```

---

### Step 3: Quality Gate

**Check:** All 3 texts have `score_total >= 65/100`

**If all pass:**
```
✓ All 3 texts meet quality threshold (65/100)
  #1: "Title" (85/100)
  #2: "Title" (72/100)
  #3: "Title" (68/100)
→ Proceeding with 3 carousels
```

**If some fail:**
```
⚠ 1 text(s) below quality threshold (65/100):
  "Title" (52/100)
→ Proceeding with warning (low-scoring carousel may have issues)
```

---

### Step 4: Slide Divider × 2 (for texts #2 and #3)

The V3 pipeline only divides the winner (text #1). For multi-carousel, we need to divide all 3.

**Execute:**
```yaml
FOR i IN [2, 3]:
  WAIT: 15s (rate limit)
  CALL: Gemini API (slide-divider agent prompt)
  INPUTS:
    texto: {{textos_escritos[i]}}
    brand_config: {{brand_config}}
  OUTPUTS:
    carousel_copy.slides[] (7-9 slides per text)
```

---

### Step 5: Bridge × 3 (Phase 2)

Create `carousel-specs.json` for each carousel in its own directory.

**Execute:**
```yaml
FOR i IN [1, 2, 3]:
  MKDIR: {{v3_output_dir}}/carousel-{{i}}/
  CALL: bridgeV3ToSpecs()
  INPUTS:
    divider_result: {{divider_results[i]}}
    brand_config: {{brand_config}}
    output_dir: {{v3_output_dir}}/carousel-{{i}}/
    index: {{i}}

OUTPUTS:
  v3_output_dir/carousel-1/carousel-specs.json
  v3_output_dir/carousel-2/carousel-specs.json
  v3_output_dir/carousel-3/carousel-specs.json
```

---

### Step 6: Visual Pipeline × 3 (Phase 3)

**Image generation runs SEQUENTIALLY** to respect Gemini API rate limits.
**HTML rendering + PNG export run in PARALLEL** (no API calls needed).

```yaml
# Step 6.1: Images - SEQUENTIAL
FOR i IN [1, 2, 3]:
  CALL: scripts/generate-carousel-images.js {{carousel_dir[i]}}

# Step 6.2+3: HTML + PNG - PARALLEL (Promise.allSettled)
PARALLEL:
  - CALL: scripts/generate-slides-from-specs.js {{carousel_dir[1]}}
    THEN: scripts/export-slides-to-png.js {{carousel_dir[1]}}
  - CALL: scripts/generate-slides-from-specs.js {{carousel_dir[2]}}
    THEN: scripts/export-slides-to-png.js {{carousel_dir[2]}}
  - CALL: scripts/generate-slides-from-specs.js {{carousel_dir[3]}}
    THEN: scripts/export-slides-to-png.js {{carousel_dir[3]}}
```

**Promise.allSettled** ensures that if one carousel fails, the others still complete.

---

### Step 7: Return Results

**Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Multi-Carousel Pipeline Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Carousel 1: output/v3-{timestamp}/carousel-1/
✓ Carousel 2: output/v3-{timestamp}/carousel-2/
✓ Carousel 3: output/v3-{timestamp}/carousel-3/

📁 Base: output/v3-{timestamp}/
📸 3/3 carousels generated
⏱  Time: 480.2s
```

---

## CLI Usage

```bash
# Multi-carousel auto mode
node scripts/orchestrate-carousel-v3-full.js content.txt --brand=itafx --num-carousels=3 --auto

# Multi-carousel interactive (review texts first)
node scripts/orchestrate-carousel-v3-full.js content.txt --brand=itafx --num-carousels=3
```

---

## Output Directory Structure

```
output/v3-{timestamp}/
├── 01-briefing-splitter.json    # V3: 5-10 carousel ideas
├── 02-text-writer.json          # V3: 3 complete texts
├── 03-text-evaluator.json       # V3: scores and ranking
├── 04-slide-divider.json        # V3: winner slides
├── carousel-copy.json           # V3: readable copy
├── carousel-copy.md             # V3: markdown version
├── carousel-1/                  # Winner carousel
│   ├── carousel-specs.json
│   ├── slide-01-bg.png          # Generated images
│   ├── slide-01.html            # Rendered HTML
│   ├── slide-01.png             # Final PNG (1080x1350)
│   └── ...
├── carousel-2/                  # 2nd text carousel
│   ├── carousel-specs.json
│   ├── slide-01-bg.png
│   ├── slide-01.html
│   ├── slide-01.png
│   └── ...
└── carousel-3/                  # 3rd text carousel
    ├── carousel-specs.json
    ├── slide-01-bg.png
    ├── slide-01.html
    ├── slide-01.png
    └── ...
```

---

## Rate Limit Strategy

| Operation | Concurrency | Reason |
|-----------|-------------|--------|
| V3 Text Pipeline | Sequential | Gemini rate limits (15s delay between calls) |
| Slide Divider × 2 | Sequential | Gemini rate limits (15s delay) |
| Image Generation × 3 | Sequential | Gemini Imagen rate limits (2s per slide) |
| HTML Rendering × 3 | Parallel | No API calls, local rendering only |
| PNG Export × 3 | Parallel | No API calls, Playwright local |

**Estimated API calls:**
- Text pipeline: ~6 calls (1 splitter + 3 writer + 1 evaluator + 1 divider)
- Additional dividers: 2 calls
- Image generation: ~24 calls (8 slides × 3 carousels)
- **Total: ~32 Gemini API calls**

---

## Success Criteria

- 3 complete carousel directories with PNGs
- All PNGs are 1080x1350
- Each carousel uses brand template_strategy
- Promise.allSettled handles partial failures gracefully
- Brand voice and language rules consistent across all 3
- Quality gate warns about low-scoring texts

---

## Error Handling

### If a carousel fails in visual pipeline
```yaml
CONTINUE: Other carousels unaffected (Promise.allSettled)
REPORT: Failed carousel in final summary
```

### If fewer than 3 texts available
```yaml
WARN: "Only N texts available (requested 3)"
PROCEED: Generate N carousels instead of 3
```

### If rate limits hit
```yaml
RETRY: Image generation script has built-in 2s delay per slide
FALLBACK: Library → DALL-E for failed Gemini calls
```

---

## Dependencies

Same as `generate-carousel-v3.md` plus:
- Gemini API key with sufficient quota for ~32 calls
- Sufficient disk space for 3 × carousel images

---

**Created:** 2026-02-13
**Author:** Arcadia-Master workflow design
