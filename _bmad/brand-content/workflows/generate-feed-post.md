# Generate Feed Post Workflow

**Workflow ID:** generate-feed-post
**Description:** Complete feed post (4:5) generation pipeline
**Estimated Time:** < 30s (MVP), < 20s (optimized)

---

## Workflow Overview

Transform copy + photo into professional Instagram feed post (1080x1350) with 4:5 format.

**Flow:**
```
User Input (copy + photo)
  → Copywriter (optimize)
  → Image Curator (analyze OR generate)
  → Template Selector Feed (choose 1 of 6)
  → Layout Composer Feed (build HTML 4:5)
  → Export Specialist (render JPG 1080x1350)
  → Visual QA Feed (validate with retry loop)
  → Return JPG to user
```

---

## Workflow Steps

### Step 1: Elicit User Inputs

**Prompt:**
```
🎨 CREATIVE GENERATOR - Feed Post Creator

1. Cole a copy (texto):
```

**Accept:** `copy_input` (string, required)

**Then:**
```
2. Foto (opcional):
   - Caminho da foto OU
   - Enter para gerar com IA
```

**Accept:** `photo_input` (string, optional)

---

### Step 2-3: Call Copywriter + Image Curator

**Reusa agentes existentes (sem mudanças):**
- Copywriter: optimize-copy.md
- Image Curator: analyze-photo.md OR generate-image.md

---

### Step 4: Call Template Selector Feed

**Execute:**
```yaml
CALL: template-selector-feed-agent
TASK: select-feed-template.md
INPUTS:
  tone: {{tone}}
  mood: {{image_analysis.mood}}
  content_type: "feed"

OUTPUTS: template_selection_result
  - template_choice: "01" to "06"
  - customizations: object
```

---

### Step 5: Call Layout Composer Feed

**Execute:**
```yaml
CALL: layout-composer-feed-agent
TASK: compose-feed-layout.md
INPUTS:
  optimized_copy: {{optimized_copy}}
  image_analysis: {{image_analysis_result}}
  template_choice: {{template_selection_result.template_choice}}
  customizations: {{customizations}}
  qa_feedback: {{qa_feedback}} # If retry

OUTPUTS: composition_result
  - html_composition: string (1080x1350)
  - metadata: object
```

---

### Step 6: Call Export Specialist

**Execute:**
```yaml
CALL: export-specialist-agent
TASK: export-feed.md
INPUTS:
  html_composition: {{composition_result.html_composition}}
  format: "jpg"
  quality: 90
  dimensions: { width: 1080, height: 1350 }

OUTPUTS: export_result
  - main_file_path: string
  - metadata_file: string
```

---

### Step 6.5: Visual QA Feed Validation

**Initialize:**
```yaml
attempt_counter: 1
max_attempts: 2
```

**Execute:**
```yaml
CALL: visual-qa-feed-specialist-agent
TASK: validate-feed-quality.md
INPUTS:
  exported_jpg_path: {{export_result.main_file_path}}
  metadata: {{export_result.metadata}}
  template_used: {{template_selection_result.template_choice}}
  attempt_number: {{attempt_counter}}

OUTPUTS: qa_validation_result
  - decision: "APPROVE" | "REJECT" | "APPROVE_WITH_NOTES"
  - validation_report: object
  - suggestions: array
```

---

### Step 6.6: Handle QA Result

**If APPROVE:**
```yaml
DISPLAY: "✅ Visual QA: APROVADO"
PROCEED TO: Step 7 (Return Results)
```

**If APPROVE_WITH_NOTES:**
```yaml
DISPLAY: "⚠️ Visual QA: APROVADO COM RESSALVAS"
PROCEED TO: Step 7
```

**If REJECT:**
```yaml
attempt_counter += 1

IF attempt_counter > max_attempts:
  FORCE: "APPROVE_WITH_NOTES"
  PROCEED TO: Step 7
ELSE:
  DISPLAY: "❌ Visual QA: REJEITADO (Tentativa {{attempt_counter - 1}}/{{max_attempts}})"

  # Re-compose with feedback
  CALL: layout-composer-feed-agent
  INPUTS:
    qa_feedback: {{qa_validation_result.suggestions}}

  # Re-export
  CALL: export-specialist-agent

  # Retry QA
  GOTO: Step 6.5 (with attempt_counter incremented)
```

---

### Step 7: Return Results

**Output:**
```
✅ Feed post gerado com sucesso!
═══════════════════════════

📁 Arquivo: {{export_result.main_file_path}}

👁️ Visual QA:
   Decisão: {{qa_validation_result.decision}}
   Editorial Feel: {{craft.editorial_feel_score}}/100
   Craft Quality: {{craft.overall_score}}/100
   {{IF attempt_counter > 1}}
   Tentativas: {{attempt_counter}}/{{max_attempts}}
   {{END IF}}

📋 Metadata: {{export_result.metadata_file}}

⏱️ Tempo total: {{workflow_duration}}s

🎉 Pronto para postar!
```

---

## Performance Targets

**MVP:** < 40s (with QA)
**Optimized:** < 30s (with QA)

**Breakdown:**
- Copywriter: ~2s
- Image Curator: ~15s (if generate), ~1s (if analyze)
- Template Selector: ~1s
- Layout Composer: ~2s
- Export Specialist: ~5s (JPG render)
- Visual QA: ~6s
- Retry (if needed): +15s

---

## Success Criteria

- ✅ All agents execute without errors
- ✅ Final JPG is 1080x1350 exact
- ✅ Visual QA approves (APPROVE or APPROVE_WITH_NOTES)
- ✅ Editorial feel >= 85 (or 70+ with notes)
- ✅ Total time < 40s
- ✅ Metadata saved with QA report

---

**Workflow Status:** ✅ Ready
**Version:** 1.0.0
**Reuses:** Copywriter, Image Curator, Export Specialist (adapted)
**New:** Template Selector Feed, Layout Composer Feed, Visual QA Feed
