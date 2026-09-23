# Generate Story Workflow

**Workflow ID:** generate-story
**Description:** Complete story generation pipeline orchestrating all 5 agents
**Estimated Time:** < 30s (MVP), < 10s (optimized)

---

## Workflow Overview

This workflow coordinates 5 specialized agents to transform a simple copy + photo into a professional Instagram story with 4 variations.

**Flow:**
```
User Input (copy + photo)
  → Copywriter (optimize)
  → Image Curator (analyze OR generate)
  → Template Selector (match)
  → Layout Composer (build HTML)
  → Export Specialist (render PNG + variations)
  → Return files to user
```

---

## Workflow Steps

### Step 1: Elicit User Inputs

**Prompt User:**
```
🎨 CREATIVE GENERATOR - Story Creator

Vamos criar seu story profissional!

1. Cole a copy (texto) do seu story:
```

**Accept:**
- `copy_input` (string, required)

**Then Prompt:**
```
2. Você tem uma foto para usar? (opcional)
   - Digite o caminho da foto (ex: ./photos/selfie.jpg)
   - OU deixe em branco para eu gerar uma imagem com IA

Caminho da foto (ou Enter para gerar):
```

**Accept:**
- `photo_input` (string, optional)

**Optional:**
```
3. Quer escolher o template manualmente? (opcional)
   - pessoal: Estilo íntimo/newsletter
   - authority: Estilo educacional/épico
   - educacional: Framework/fórmula
   - narrativo: Storytelling/história

Template (ou Enter para auto-seleção):
```

**Accept:**
- `template_override` (string, optional)

---

### Step 2: Call Copywriter Agent → optimize-copy

**Execute:**
```yaml
CALL: copywriter-agent
TASK: optimize-copy.md
INPUTS:
  copy: {{copy_input}}
  context: "story"

OUTPUTS: optimized_copy_result
  - optimized_copy: {headline, body, cta}
  - tone: string
  - keywords: array
  - emotional_trigger: string
```

**Display to User:**
```
✍️ Copy otimizada:
───────────────────
📌 Headline: {{optimized_copy.headline}}
📝 Body: {{optimized_copy.body}}
💬 CTA: {{optimized_copy.cta}}

🎭 Tom detectado: {{tone}}
🔑 Palavras-chave: {{keywords.join(", ")}}
```

---

### Step 3: Call Image Curator Agent

**Decision:**
```python
IF photo_input provided:
    CALL: analyze-photo.md
ELSE:
    CALL: generate-image.md
```

#### Branch A: Analyze Existing Photo

**Execute:**
```yaml
CALL: image-curator-agent
TASK: analyze-photo.md
INPUTS:
  photo_path: {{photo_input}}

OUTPUTS: image_analysis_result
  - mood: string
  - safe_zones: object
  - quality_score: number
  - contrast: object
  - recommendations: object
```

**Display:**
```
🖼️ Foto analisada:
───────────────────
📊 Qualidade: {{quality_score}}/100
🎨 Mood: {{mood}}
💡 Recomendação: Texto na {{recommendations.text_position}}
```

#### Branch B: Generate Image with AI

**Execute:**
```yaml
CALL: image-curator-agent
TASK: generate-image.md
INPUTS:
  copy_context: {{optimized_copy}}
  tone: {{tone}}

OUTPUTS: generated_image_result
  - generated_image_path: string
  - mood: string
  - prompt_used: string
```

**Display:**
```
🤖 Imagem gerada com IA:
───────────────────
✨ Prompt: {{prompt_used}}
🎨 Mood: {{mood}}
📁 Salva em: {{generated_image_path}}
```

**Then Analyze Generated Image:**
```yaml
CALL: image-curator-agent
TASK: analyze-photo.md
INPUTS:
  photo_path: {{generated_image_path}}

OUTPUTS: image_analysis_result
```

---

### Step 4: Call Template Selector Agent

**Execute:**
```yaml
CALL: template-selector-agent
TASK: select-template.md
INPUTS:
  tone: {{tone}}
  mood: {{image_analysis_result.mood}}
  content_type: "story"
  template_override: {{template_override}}  # If user specified

OUTPUTS: template_selection_result
  - template_choice: string
  - customizations: object
  - confidence: number
  - warnings: array
```

**Display:**
```
🎨 Template selecionado:
───────────────────
📄 Template: {{template_choice}}
🎯 Confiança: {{confidence}}%
⚙️ Customizações: {{customizations}}
{{IF warnings}} ⚠️ Avisos: {{warnings}} {{END}}
```

---

### Step 5: Call Layout Composer Agent

**Execute:**
```yaml
CALL: layout-composer-agent
TASK: compose-layout.md
INPUTS:
  optimized_copy: {{optimized_copy}}
  image_analysis: {{image_analysis_result}}
  template_choice: {{template_selection_result.template_choice}}
  customizations: {{template_selection_result.customizations}}

OUTPUTS: composition_result
  - html_composition: string
  - metadata: object
```

**Display:**
```
🧩 Layout montado:
───────────────────
📐 Dimensões: {{metadata.dimensions}}
🔤 Fontes: {{metadata.fonts_used.join(", ")}}
⚙️ Ajustes: {{metadata.adjustments_made.join(", ")}}
```

---

### Step 6: Call Export Specialist Agent

**Execute:**
```yaml
CALL: export-specialist-agent
TASK: export-visual.md
INPUTS:
  html_composition: {{composition_result.html_composition}}
  format: "png"
  quality: 100

OUTPUTS: export_result
  - main_file_path: string
  - variations: array
  - metadata_file: string
```

**Display:**
```
💾 Exportando...
───────────────────
⏱️ Renderizando HTML → PNG...
```

---

### Step 6.5: Visual QA Validation (NEW)

**Initialize:**
```yaml
attempt_counter: 1
max_attempts: 2
```

**Execute:**
```yaml
CALL: visual-qa-specialist-agent
TASK: validate-visual-quality.md
INPUTS:
  exported_png_path: {{export_result.main_file_path}}
  metadata: {{export_result.metadata}}
  pattern_used: {{template_selection_result.template_choice}}
  attempt_number: {{attempt_counter}}

OUTPUTS: qa_validation_result
  - decision: "APPROVE" | "REJECT" | "APPROVE_WITH_NOTES"
  - validation_report: object
  - suggestions: array
```

**Display:**
```
👁️ Validando qualidade visual...
───────────────────
🤖 Maya (Visual QA) analisando...
```

---

### Step 6.6: Handle QA Result (NEW)

**Decision Logic:**

#### If APPROVED:
```yaml
IF qa_validation_result.decision == "APPROVE":
  DISPLAY:
    ✅ Visual QA: APROVADO
    ═══════════════════════════
    🎨 Craft Quality: {{qa_validation_result.validation_report.craft_validation.overall_score}}/100
    ⭐ Native Feel: {{qa_validation_result.validation_report.craft_validation.native_feel_score}}/100

    📝 {{qa_validation_result.validation_report.reasoning}}

  PROCEED TO: Step 7 (Return Results)
```

#### If APPROVED WITH NOTES:
```yaml
ELIF qa_validation_result.decision == "APPROVE_WITH_NOTES":
  DISPLAY:
    ⚠️ Visual QA: APROVADO COM RESSALVAS
    ═══════════════════════════
    🎨 Craft Quality: {{qa_validation_result.validation_report.craft_validation.overall_score}}/100
    ⚠️ Max tentativas atingido ({{attempt_counter}}/{{max_attempts}})

    📝 {{qa_validation_result.validation_report.reasoning}}

    💡 Melhorias sugeridas:
    {{FOR EACH suggestion IN qa_validation_result.suggestions}}
      - [{{suggestion.priority}}] {{suggestion.suggestion}}
    {{END FOR}}

  PROCEED TO: Step 7 (Return Results with notes)
```

#### If REJECTED:
```yaml
ELIF qa_validation_result.decision == "REJECT":

  # Increment attempt counter
  attempt_counter += 1

  # Check if max attempts reached
  IF attempt_counter > max_attempts:
    DISPLAY:
      ⚠️ Visual QA: Max tentativas atingido
      ═══════════════════════════
      Aprovando story mesmo com issues para evitar loop infinito.

    # Force approve with notes
    qa_validation_result.decision = "APPROVE_WITH_NOTES"
    PROCEED TO: Step 7

  ELSE:
    DISPLAY:
      ❌ Visual QA: REJEITADO (Tentativa {{attempt_counter - 1}}/{{max_attempts}})
      ═══════════════════════════

      📝 {{qa_validation_result.validation_report.reasoning}}

      🔧 Issues encontrados:
      {{FOR EACH issue IN qa_validation_result.validation_report.craft_validation.issues}}
        • {{issue}}
      {{END FOR}}

      💡 Sugestões para corrigir:
      {{FOR EACH suggestion IN qa_validation_result.suggestions}}
        {{suggestion.priority.toUpperCase()}}: {{suggestion.suggestion}}
        → Como corrigir: {{suggestion.how_to_fix}}
      {{END FOR}}

      🔄 Tentando novamente com feedback...

    # Re-compose with QA feedback
    CALL: layout-composer-agent
    TASK: compose-layout.md
    INPUTS:
      optimized_copy: {{optimized_copy}}
      image_analysis: {{image_analysis_result}}
      template_choice: {{template_selection_result.template_choice}}
      customizations: {{template_selection_result.customizations}}
      qa_feedback: {{qa_validation_result.suggestions}}  # NEW: Pass feedback

    OUTPUTS: composition_result_retry

    # Re-export
    CALL: export-specialist-agent
    TASK: export-visual.md
    INPUTS:
      html_composition: {{composition_result_retry.html_composition}}
      format: "png"
      quality: 100

    OUTPUTS: export_result_retry

    # Retry Visual QA validation
    GOTO: Step 6.5 (with attempt_counter incremented)
```

---

### Step 7: Return Results to User

**Final Output:**
```
✅ Story gerado com sucesso!
═══════════════════════════

📁 Arquivo principal:
   {{export_result.main_file_path}}

🎨 Variações (4):
   1. {{variations[0]}} (original)
   2. {{variations[1]}} (texto inferior)
   3. {{variations[2]}} (headline destacado)
   4. {{variations[3]}} (esquema de cores alternativo)

👁️ Visual QA:
   Decisão: {{qa_validation_result.decision}}
   Craft Quality: {{qa_validation_result.validation_report.craft_validation.overall_score}}/100
   Native Feel: {{qa_validation_result.validation_report.craft_validation.native_feel_score}}/100
   {{IF attempt_counter > 1}}
   Tentativas: {{attempt_counter}}/{{max_attempts}}
   {{END IF}}

📋 Metadata:
   {{export_result.metadata_file}}
   QA Report: {{export_result.metadata_file.replace('.json', '-qa.json')}}

⏱️ Tempo total: {{workflow_duration}}s (incluindo Visual QA)

🎉 Pronto para postar! Abre os arquivos para revisar.
```

---

## Error Handling

### At Any Step

**IF agent returns error:**
```
DISPLAY: "❌ Erro em {{agent_name}}: {{error_message}}"
OFFER: "Quer tentar novamente? (s/n)"
IF yes → RETRY step (max 2 retries)
IF no → ABORT workflow, SAVE partial results
```

### Specific Errors

**Photo not found (Step 3):**
```
OFFER: "Foto não encontrada. Posso gerar uma com IA?"
IF yes → SWITCH to generate-image branch
IF no → RE-ELICIT photo path
```

**Template rendering fails (Step 6):**
```
RETRY: 3 attempts
IF all fail:
  SAVE HTML to: output/debug/failed-{timestamp}.html
  DISPLAY: "Não consegui renderizar. HTML salvo para debug."
  SUGGEST: "Tente com outra foto ou copy mais simples"
```

---

## Performance Tracking

**Log Timing:**
```json
{
  "workflow_start": "2025-10-02T14:30:00Z",
  "step_timings": {
    "copywriter": "2.1s",
    "image_curator": "15.3s",
    "template_selector": "0.5s",
    "layout_composer": "1.2s",
    "export_specialist": "8.4s",
    "visual_qa": "6.8s",
    "retry_if_needed": "0s or 15s"
  },
  "workflow_end": "2025-10-02T14:30:34Z",
  "total_duration": "34.3s"
}
```

**Performance Targets (with Visual QA):**
- MVP: < 40s (includes QA + potential retry)
- Optimized: < 25s (QA only, no retry needed)
- QA Approval Rate: 80%+ on first attempt

---

## Workflow Metadata

**Save alongside exports:**
```json
{
  "workflow_id": "generate-story",
  "workflow_version": "1.0.0",
  "timestamp": "2025-10-02T14:30:27Z",
  "duration": "27.5s",
  "agents_called": [
    "copywriter",
    "image-curator",
    "template-selector",
    "layout-composer",
    "export-specialist"
  ],
  "user_inputs": {
    "copy": "...",
    "photo": "...",
    "template_override": null
  },
  "outputs": {
    "main_file": "...",
    "variations": [...],
    "metadata": "..."
  },
  "success": true
}
```

---

## Success Criteria

Workflow is successful when:
- ✅ All 6 agents execute without errors (including Visual QA)
- ✅ Final PNG exists and is valid (can be opened)
- ✅ Dimensions are exactly 1080x1920 (validated by Visual QA)
- ✅ Visual QA approves story (APPROVE or APPROVE_WITH_NOTES)
- ✅ Craft Quality score >= 85 (target) or >= 70 (acceptable with notes)
- ✅ Native Feel score >= 90 (target) or >= 75 (acceptable with notes)
- ✅ 4 variations generated
- ✅ Metadata JSON saved (includes QA report)
- ✅ Total time < 40s (with QA)
- ✅ User can visually confirm quality matches QA assessment

---

## Example Execution

**User Input:**
```
Copy: "Vou começar uma newsletter sobre IA. Já escrevi duas edições. Quer entrar na lista?"
Photo: ./assets/samples/portrait-casual.jpg
```

**Workflow Execution:**
```
1. Copywriter → tone="pessoal", headline="Vou começar uma newsletter sobre IA"
2. Image Curator → mood="casual", quality=88, safe_zones identified
3. Template Selector → template="pessoal-intimo", confidence=98%
4. Layout Composer → HTML built with centered text, overlay=0.4
5. Export Specialist → PNG rendered + 4 variations

Total: 24.2s ✅
```

**Output Files:**
```
output/stories/story-20251002-143022.png (main)
output/stories/story-20251002-143022-v1.png
output/stories/story-20251002-143022-v2.png
output/stories/story-20251002-143022-v3.png
output/stories/story-20251002-143022-v4.png
output/stories/story-20251002-143022.json (metadata)
```

---

**Workflow Status:** ✅ Ready for execution
**Version:** 1.0.0
**Created:** 2025-10-02
