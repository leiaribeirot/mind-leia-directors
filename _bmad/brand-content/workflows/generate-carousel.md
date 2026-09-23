# Generate Carousel Workflow

**Workflow ID:** generate-carousel
**Description:** Complete Instagram carousel (4:5) generation pipeline
**Estimated Time:** < 60s (with AI image generation)

---

## Workflow Overview

Transform long-form content into professional Instagram carousel (1080x1350) with 5-10 slides.

**Flow:**
```
User Input (long text + num_slides)
  → Story Strategist (break into slides)
  → Copywriter (optimize each slide copy)
  → Creative Director (plan visual theme + templates)
  → [FOR EACH SLIDE]:
      → Image Curator (generate AI image with safe zones)
      → Template Selector (choose from 10 templates)
      → Layout Composer (build HTML 4:5)
      → Export Specialist (render PNG 1080x1350)
      → Visual QA Feed (validate with retry loop)
  → Return all PNGs to user
```

---

## Workflow Steps

### Step 1: Elicit User Inputs

**Prompt:**
```
🎨 CREATIVE GENERATOR - Instagram Carousel Creator

1. Cole o texto longo (500-2000 palavras):
```

**Accept:** `content_input` (string, required)

**Then:**
```
2. Quantos slides? (5-10 recomendado, padrão: 7):
```

**Accept:** `num_slides` (number, default: 7)

**Then:**
```
3. Modo de imagem:
   [1] ✨ IA Generation (DALL-E 3) - Imagens únicas e específicas
   [2] 🔍 Unsplash Search - Fotos profissionais (API)

   Escolha (1 ou 2, padrão: 1):
```

**Accept:** `image_mode` (number, default: 1)

---

### Step 2: Break Content Into Slides

**Execute:**
```yaml
CALL: story-strategist-agent
TASK: break-into-carousel.md
INPUTS:
  content: {{content_input}}
  num_slides: {{num_slides}}
  format: "carousel"
  dimensions: "1080x1350"
  safe_zones: {top: 100, bottom: 140, sides: 60}

OUTPUTS: slides_breakdown
  - slides: array[{position, type, title, subtitle, body}]
  - total_slides: number
  - visual_theme: object
```

---

### Step 3: Optimize Copy for Each Slide

**Execute:**
```yaml
CALL: copywriter-agent
TASK: optimize-carousel-copy.md
INPUTS:
  slides: {{slides_breakdown.slides}}
  format: "carousel"

OUTPUTS: optimized_slides
  - slides: array[{...slide, optimized_copy}]
```

---

### Step 4: Plan Visual Theme & Templates

**Execute:**
```yaml
CALL: creative-director-agent
TASK: plan-carousel.md
INPUTS:
  slides_copy: {{optimized_slides.slides}}
  total_slides: {{slides_breakdown.total_slides}}

OUTPUTS: carousel_plan
  - template_sequence: array[string] (which template for each slide)
  - visual_theme: object (unified colors, mood, filters)
  - image_briefings: array[{prompt, style, mood}]
```

---

### Step 5: Generate Each Slide (Loop)

**Initialize:**
```yaml
slide_results: []
current_slide: 1
max_attempts_per_slide: 2
```

**FOR EACH slide in optimized_slides:**

#### Step 5.1: Generate/Analyze Image

**Execute:**
```yaml
IF image_mode == 1:  # AI Generation
  CALL: image-curator-agent
  TASK: generate-image.md
  INPUTS:
    prompt: {{carousel_plan.image_briefings[current_slide - 1].prompt}}
    style: {{carousel_plan.image_briefings[current_slide - 1].style}}
    mood: {{carousel_plan.visual_theme.mood}}
    dimensions: "1024x1024"

  OUTPUTS: image_result
    - image_path: string (local file)
    - safe_zones: object (3x3 grid analysis via Claude Vision)

ELSE IF image_mode == 2:  # Unsplash Search
  CALL: image-curator-agent
  TASK: search-unsplash-image.md
  INPUTS:
    query: {{extract_keywords(slide.title, slide.subtitle)}}
    orientation: "portrait"

  OUTPUTS: image_result
    - image_path: string (downloaded local)
    - safe_zones: object (3x3 grid analysis via Claude Vision)
```

#### Step 5.2: Select Template

**Execute:**
```yaml
CALL: creative-director-agent
TASK: select-carousel-template.md
INPUTS:
  slide_content: {{slide}}
  slide_type: {{slide.type}}
  template_suggestion: {{carousel_plan.template_sequence[current_slide - 1]}}
  image_analysis: {{image_result.safe_zones}}
  visual_theme: {{carousel_plan.visual_theme}}

OUTPUTS: template_selection
  - template_choice: "type-01" to "type-10"
  - customizations: object
```

#### Step 5.3: Compose Layout

**Execute:**
```yaml
CALL: layout-composer-agent
TASK: design-carousel-layout.md
INPUTS:
  slide_copy: {{slide}}
  image_path: {{image_result.image_path}}
  safe_zones: {{image_result.safe_zones}}
  template_choice: {{template_selection.template_choice}}
  visual_theme: {{carousel_plan.visual_theme}}
  customizations: {{template_selection.customizations}}
  qa_feedback: {{qa_feedback}} # If retry

OUTPUTS: composition_result
  - html_composition: string (1080x1350)
  - metadata: object
```

#### Step 5.4: Export to PNG

**Execute:**
```yaml
CALL: export-specialist-agent
TASK: export-visual.md
INPUTS:
  html_composition: {{composition_result.html_composition}}
  format: "png"
  dimensions: {width: 1080, height: 1350}
  output_path: "output/{{project_name}}/slide-{{current_slide}}.png"

OUTPUTS: export_result
  - file_path: string
  - metadata_file: string
```

#### Step 5.5: Visual QA Validation

**Initialize:**
```yaml
attempt_counter: 1
max_attempts: 2
```

**Execute:**
```yaml
CALL: visual-qa-feed-specialist-agent
TASK: validate-carousel-quality.md
INPUTS:
  image_path: {{export_result.file_path}}
  slide_number: {{current_slide}}
  total_slides: {{total_slides}}
  expected_content: {
    has_image: {{slide.use_photo}},
    has_title: true,
    has_subtitle: {{!!slide.subtitle}}
  }
  attempt_number: {{attempt_counter}}

OUTPUTS: qa_validation_result
  - decision: "APPROVE" | "REJECT" | "APPROVE_WITH_NOTES"
  - overall_score: number (0-100)
  - validation: object
  - issues: array
  - recommendation: string
```

#### Step 5.6: Handle QA Result

**If APPROVE or APPROVE_WITH_NOTES:**
```yaml
DISPLAY: "✅ Slide {{current_slide}}/{{total_slides}}: {{qa_validation_result.decision}}"
slide_results.push({
  slide_number: current_slide,
  file_path: export_result.file_path,
  qa_decision: qa_validation_result.decision,
  qa_score: qa_validation_result.overall_score
})
current_slide += 1
CONTINUE TO NEXT SLIDE
```

**If REJECT:**
```yaml
attempt_counter += 1

IF attempt_counter > max_attempts:
  FORCE: "APPROVE_WITH_NOTES"
  DISPLAY: "⚠️ Slide {{current_slide}}/{{total_slides}}: Aprovado após {{max_attempts}} tentativas"
  slide_results.push({...})
  current_slide += 1
  CONTINUE TO NEXT SLIDE
ELSE:
  DISPLAY: "❌ Slide {{current_slide}}/{{total_slides}}: REJEITADO (Tentativa {{attempt_counter}}/{{max_attempts}})"
  DISPLAY: "Problemas: {{qa_validation_result.issues}}"

  # Re-compose with feedback
  GOTO: Step 5.3 (with qa_feedback = qa_validation_result.issues)
```

**END FOR EACH SLIDE**

---

### Step 6: Return Results

**Output:**
```
✅ Carousel gerado com sucesso!
═════════════════════════════════════

📊 {{total_slides}} slides criados:

{{FOR EACH slide_result}}
  Slide {{slide_result.slide_number}}: {{slide_result.qa_decision}}
    Score: {{slide_result.qa_score}}/100
    Arquivo: {{slide_result.file_path}}
{{END FOR}}

📁 Pasta de saída: output/{{project_name}}/

👁️ Resumo Visual QA:
   Aprovados: {{count(APPROVE)}}
   Com ressalvas: {{count(APPROVE_WITH_NOTES)}}
   Média de qualidade: {{average(qa_score)}}/100

⏱️ Tempo total: {{workflow_duration}}s

🎉 Pronto para postar no Instagram!
```

---

## Performance Targets

**MVP:** < 90s (with 7 slides + AI generation)
**Optimized:** < 60s (with 7 slides + AI generation)

**Breakdown per slide:**
- Image Generation (DALL-E 3): ~8s
- Safe Zones Analysis (Claude Vision): ~3s
- Template Selection: ~1s
- Layout Composition: ~2s
- Export Specialist: ~3s
- Visual QA: ~4s
- Retry (if needed): +15s

**Total per slide:** ~21s (without retry), ~36s (with retry)

**For 7 slides:**
- Best case (no retries): ~147s (~2.5min)
- Expected (20% retry rate): ~168s (~2.8min)
- Worst case (all retry once): ~252s (~4.2min)

---

## Success Criteria

- ✅ All slides generated without critical errors
- ✅ All PNGs are 1080x1350 exact
- ✅ Visual QA approves all (APPROVE or APPROVE_WITH_NOTES)
- ✅ Average quality score >= 80/100
- ✅ No slide numbers visible in designs
- ✅ Unified visual theme across slides
- ✅ All images displaying correctly (no broken icons)
- ✅ Metadata saved with QA reports

---

## Error Handling

### If Image Generation Fails
```yaml
RETRY: 1 time
IF still fails:
  FALLBACK: Use Unsplash search with extracted keywords
  CONTINUE workflow
```

### If Visual QA Rejects Repeatedly
```yaml
AFTER max_attempts:
  FORCE APPROVE with notes
  LOG: Persistent issues for manual review
  CONTINUE workflow (don't block entire carousel)
```

### If Template Not Found
```yaml
FALLBACK: Use type-01 (full-background-overlay)
LOG: Template fallback occurred
CONTINUE workflow
```

---

## Workflow Status

**Status:** ✅ Ready for implementation
**Version:** 1.0.0
**Dependencies:**
- ✅ All agents documented (.arcadia-core/agents/)
- ✅ All tasks documented (.arcadia-core/tasks/)
- ✅ Templates ready (templates/carousel/type-01 to type-10)
- ❌ Task runner implementation (PENDING)
- ❌ API integrations (DALL-E, Claude Vision, Unsplash) (PENDING)

---

## Integration Points

**Requires:**
1. Task Runner (scripts/task-runner.js)
2. Agent Executor (scripts/execute-agent.js)
3. API Services:
   - DALL-E 3 API client
   - Claude Vision API client (for safe zones)
   - Unsplash API client
4. Template Renderer (Handlebars + Puppeteer)

**Next Steps:**
1. Implement task runner core
2. Integrate DALL-E 3 API
3. Integrate Claude Vision for safe zones
4. Test complete workflow end-to-end
5. Optimize performance (parallel processing where possible)

---

**Created:** 2025-10-05
**Author:** Arcadia-Master workflow design
