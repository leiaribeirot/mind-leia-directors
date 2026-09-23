# Generate Carousel V3 Workflow (Text-First)

**Workflow ID:** generate-carousel-v3
**Description:** V3 end-to-end Instagram carousel generation — text-first pipeline + visual rendering
**Estimated Time:** ~3-5 min (with AI image generation)
**Script:** `scripts/orchestrate-carousel-v3-full.js`

---

## Workflow Overview

Transform long-form content into a professional Instagram carousel (1080x1350) using the V3 text-first architecture. Unlike V1/V2 which condense text directly into slides, V3 first writes complete texts, evaluates them, then divides the winner into slides.

**Architecture:**
```
Content (long text / blog / transcript)
  → PHASE 1: V3 Text Pipeline
      → Briefing Splitter (identify 5-10 carousel ideas)
      → Text Writer (write 3 complete texts, 400-550 words each)
      → Text Evaluator (score and rank texts, pick winner)
      → Slide Divider (divide winner into 7-9 slides)
  → PHASE 2: Bridge V3 → Specs
      → Convert carousel_copy → carousel-specs.json
      → Map templates from brand template_strategy
      → Apply {{highlights}} and formatting
  → PHASE 3: Visual Pipeline
      → Image Curator (Gemini Imagen 3)
      → Craft Specialist (HTML rendering)
      → Export Specialist (PNG 1080x1350)
  → Output: Complete carousel PNGs
```

---

## Workflow Configuration

```yaml
workflow:
  name: V3 Carousel Generation (Text-First)
  id: generate-carousel-v3
  version: 1.0.0
  entry_point: elicit_inputs
  timeout: 300s

  agents:
    - briefing-splitter
    - text-writer
    - text-evaluator
    - slide-divider
    - image-curator
    - craft-specialist
    - export-specialist

  flags:
    --auto: Skip approval gate, run all phases automatically
    --brand: Brand configuration ID (default: "default")

  script: scripts/orchestrate-carousel-v3-full.js
```

---

## Workflow Steps

### Step 1: Elicit User Inputs

**Prompt:**
```
🎬 V3 CAROUSEL GENERATOR (Text-First Pipeline)

1. Content path (text file, blog, transcript):
```

**Accept:** `content_path` (string, required)

**Then:**
```
2. Brand ID (e.g., itafx, taypuri, aitelier):
```

**Accept:** `brand_id` (string, default: "default")

**Then:**
```
3. Auto mode? (skip text approval, run everything)
   [1] ✅ Auto (run full pipeline)
   [2] 🔍 Interactive (review texts before visual)

   Choose (1 or 2, default: 2):
```

**Accept:** `auto_mode` (boolean, default: false)

---

### Step 2: V3 Text Pipeline (Phase 1)

**Execute:**
```yaml
CALL: scripts/orchestrate-carousel-v3.js
INPUTS:
  content: {{content_path}}
  brand: {{brand_id}}

OUTPUTS: v3_output_dir
  - 01-briefing-splitter.json (5-10 carousel ideas)
  - 02-text-writer.json (3 complete texts)
  - 03-text-evaluator.json (scores and ranking)
  - 04-slide-divider.json (winner divided into slides)
```

**Sub-phases:**

| Phase | Agent | Input | Output |
|-------|-------|-------|--------|
| 1.1 | Briefing Splitter | Raw content | 5-10 carousel ideas |
| 1.2 | Text Writer | Top 3 ideas | 3 complete texts (400-550 words) |
| 1.3 | Text Evaluator | 3 texts | Scores + ranking |
| 1.4 | Slide Divider | Winner text | 7-9 slides |

**Rate Limiting:** 15s delay between Gemini API calls to avoid rate limits.

---

### Step 3: Approval Gate

**Skip if:** `auto_mode == true`

**Display:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
APPROVAL: Review V3 Evaluated Texts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

★ WINNER: "Title" (85/100)
  #2: "Title" (72/100)
  #3: "Title" (68/100)

Proceed with visual generation? (y/n):
```

**Accept:** `proceed` (boolean)

**If NO:** Pipeline pauses, V3 text output is saved for later use.

---

### Step 4: Bridge V3 → Specs (Phase 2)

**Execute:**
```yaml
CALL: bridgeV3ToSpecs()
INPUTS:
  divider_result: {{04-slide-divider.json}}
  brand_config: {{loaded brand config}}
  output_dir: {{v3_output_dir}}

OUTPUTS: carousel-specs.json
  - carousel_id: v3-full-{timestamp}
  - brand_id: {{brand_id}}
  - slides[]: slide_number, type, template, image_required, content
```

**Bridge Logic:**
1. Read `04-slide-divider.json` output
2. Load brand `template_strategy` (preferred_templates, cover_template, cta_template)
3. Map templates via round-robin from preferred_templates
4. Set `image_required: true` for all slides (if brand strategy = 100%)
5. Map V3 slide types (CHOQUE→Cover, CONTEXTO→Context, etc.)
6. Generate `carousel-specs.json`

---

### Step 5: Visual Pipeline (Phase 3)

**Execute sequentially:**

#### Step 5.1: Generate Images
```yaml
CALL: scripts/generate-carousel-images.js
INPUTS:
  output_dir: {{v3_output_dir}}
  # Reads carousel-specs.json from output_dir
  # Uses Gemini Imagen 3 (primary) → Library → DALL-E (fallback)
```

#### Step 5.2: Render HTML Slides
```yaml
CALL: scripts/generate-slides-from-specs.js
INPUTS:
  output_dir: {{v3_output_dir}}
  # Reads carousel-specs.json + generated images
  # Renders Handlebars templates with brand styling
```

#### Step 5.3: Export to PNG
```yaml
CALL: scripts/export-slides-to-png.js
INPUTS:
  input_dir: {{v3_output_dir}}
  # Uses Playwright to capture 1080x1350 PNGs
```

---

### Step 6: Return Results

**Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ V3 Full Pipeline Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Output: output/v3-{timestamp}/
⏱  Time:   180.5s
📸 8 PNG slides (1080x1350):
   slide-01.png
   slide-02.png
   ...
```

---

## CLI Usage

```bash
# Interactive mode (review texts before visual)
node scripts/orchestrate-carousel-v3-full.js content.txt --brand=itafx

# Auto mode (run everything without stopping)
node scripts/orchestrate-carousel-v3-full.js content.txt --brand=itafx --auto
```

---

## Success Criteria

- All slides generated without critical errors
- All PNGs are 1080x1350 exact
- Template mapping follows brand `template_strategy`
- Brand voice and language rules respected (e.g., English for ITA)
- V3 text pipeline produces scored and ranked texts
- Bridge correctly maps V3 slide types to carousel-specs format

---

## Error Handling

### If V3 Text Pipeline Fails
```yaml
ABORT: Cannot proceed without text
DISPLAY: Error message and V3 output location
```

### If Image Generation Fails for a Slide
```yaml
CONTINUE: Skip failed slide, generate remaining
LOG: Failed slide numbers
```

### If HTML/PNG Export Fails
```yaml
ABORT: Visual pipeline requires all HTML to export
DISPLAY: Error and suggest running visual steps manually
```

---

## Dependencies

- `scripts/orchestrate-carousel-v3.js` — V3 text pipeline
- `scripts/generate-carousel-images.js` — Gemini Imagen 3 image generation
- `scripts/generate-slides-from-specs.js` — Handlebars HTML rendering
- `scripts/export-slides-to-png.js` — Playwright PNG export
- `scripts/utils/brand-loader.js` — Brand configuration loading
- `ateliers/carousel/agents/` — Agent prompts (Splitter, Writer, Evaluator, Divider)

---

**Created:** 2026-02-13
**Author:** Arcadia-Master workflow design
