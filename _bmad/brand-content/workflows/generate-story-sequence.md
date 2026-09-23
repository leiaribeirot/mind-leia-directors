# Workflow: Generate Story Sequence

**Workflow ID:** `generate-story-sequence`
**Purpose:** Gerar sequência coerente de múltiplos stories a partir de texto longo
**Agents Involved:** Story Strategist + 5 agents do generate-story
**Estimated Time:** ~2-3 minutos (4 stories)

---

## 📋 Workflow Overview

Este workflow orquestra a criação de múltiplos stories sequenciais que funcionam de forma independente mas juntos contam uma história completa. É como transformar um manifesto em uma mini-série de Instagram Stories.

**Use Cases:**
- Newsletters longas → 4-6 stories
- Manifestos/artigos → 3-5 stories
- Threads do Twitter → 2-4 stories
- Conteúdo educacional → 5-8 stories

---

## 📥 Inputs

```yaml
inputs:
  long_text:
    type: string
    required: true
    elicit: true
    prompt: |
      🎬 STORY SEQUENCE GENERATOR

      Cole o texto completo que deseja transformar em sequência de stories:
      (Recomendado: 1000-2000 palavras)

  num_stories:
    type: integer
    required: false
    default: "auto"
    elicit: true
    prompt: |
      📊 Quantos stories deseja gerar?

      1. Auto-detect (recomendado - Alex decide baseado no texto)
      2. 2 stories
      3. 3 stories
      4. 4 stories
      5. 5-6 stories

      Digite o número ou Enter para auto-detect:

  photo_mode:
    type: string
    required: false
    default: "generate_all"
    elicit: true
    prompt: |
      🖼️ Como quer as imagens?

      1. Gerar todas com IA (recomendado - consistência visual garantida)
      2. Fornecer fotos (você fornece 4 fotos)
      3. Mix (você fornece algumas, IA gera o restante)

      Digite o número ou Enter para gerar com IA:
    options:
      - generate_all
      - user_provided
      - mix

  template_mode:
    type: string
    required: false
    default: "auto"
    elicit: false
    description: "Auto-select templates baseado no arco narrativo"
```

---

## 📤 Outputs

```yaml
outputs:
  stories:
    type: array
    description: Array de stories gerados
    schema:
      - sequence_number: 1-N
        main_file: "output/stories/story-seq-001.png"
        variations: ["v1.png", "v2.png", "v3.png", "v4.png"]
        metadata: {object}

  sequence_metadata:
    type: object
    description: Metadata da sequência completa
    schema:
      total_stories: 4
      narrative_arc: "manifesto-educacional"
      visual_consistency: "high"
      total_time: "2m 34s"

  consolidated_json:
    type: file
    path: "output/stories/sequence-{timestamp}.json"
    description: JSON consolidado com todos os 4 stories
```

---

## 🔄 Execution Steps

### **Step 1: Elicit User Inputs**

```yaml
ELICIT:
  - long_text
  - num_stories (default: auto)
  - photo_mode (default: generate_all)

DISPLAY:
  "✅ Inputs recebidos:
   - Texto: {word_count} palavras
   - Stories: {num_stories or 'auto-detect'}
   - Imagens: {photo_mode}

   Iniciando análise..."
```

---

### **Step 2: Story Strategist - Quebra do Texto**

```yaml
AGENT: story-strategist (Alex)
TASK: break-into-stories

INPUTS:
  long_text: {user_input.long_text}
  num_stories: {user_input.num_stories}

OUTPUTS:
  segments: array[{copy, tone, template_hint, narrative_role, keywords}]
  narrative_arc: {arc_type, emotional_flow, tone_shifts}
  visual_consistency_guide: {palette, mood_progression, image_style}

DISPLAY:
  "✅ Texto analisado por Alex (Story Strategist)

   📖 Arco narrativo: {arc_type}
   🎬 Stories a gerar: {segments.length}

   Story 1: {segments[0].narrative_role} ({segments[0].tone})
   Story 2: {segments[1].narrative_role} ({segments[1].tone})
   ...

   Iniciando geração sequencial..."

SAVE:
  .arcadia-core/temp/current-sequence-{timestamp}.json
```

---

### **Step 3: Loop - Gerar Cada Story**

```yaml
FOR EACH segment IN segments:

  sequence_num = segment.sequence_number

  DISPLAY:
    "
    ═══════════════════════════════════════
    🎨 Gerando Story {sequence_num} de {total}
    ═══════════════════════════════════════
    Função: {segment.narrative_role}
    Tom: {segment.tone}
    Template sugerido: {segment.template_hint}
    "

  # ─────────────────────────────────────
  # 3.1: Copywriter - Otimizar Segmento
  # ─────────────────────────────────────

  AGENT: copywriter (Marcus)
  TASK: optimize-copy

  INPUTS:
    copy: segment.copy
    context:
      sequence_position: "{sequence_num} of {total}"
      narrative_role: segment.narrative_role
      previous_segment: segments[sequence_num - 2] if exists

  OUTPUTS:
    optimized_copy: {headline, body, cta, tone, keywords}

  DISPLAY:
    "  ✍️ Copy otimizada por Marcus (Copywriter)
         Headline: {headline}
         Tom confirmado: {tone}"

  # ─────────────────────────────────────
  # 3.2: Image Curator - Gerar/Analisar Imagem
  # ─────────────────────────────────────

  AGENT: image-curator (Isabella)

  IF photo_mode == "generate_all":
    TASK: generate-image

    INPUTS:
      copy_context: optimized_copy
      mood_target: visual_consistency_guide.mood_progression[sequence_num - 1]
      consistency_context:
        palette: visual_consistency_guide.shared_palette
        previous_images: [image_paths from previous iterations]
        base_style: visual_consistency_guide.dall_e_base_style
        sequence_position: "{sequence_num} of {total}"

    OUTPUTS:
      generated_image: "assets/generated/story-{sequence_num}-{timestamp}.png"
      prompt_used: "..."

    DISPLAY:
      "  🖼️ Imagem gerada por Isabella (Image Curator)
           Mood: {mood_target}
           Consistência: paleta {palette} aplicada"

  ELIF photo_mode == "user_provided":
    ELICIT from user:
      "  📸 Forneça o caminho da foto para Story {sequence_num}:"

    TASK: analyze-photo
    OUTPUTS:
      analysis: {mood, quality_score, safe_zones}

  # ─────────────────────────────────────
  # 3.3: Template Selector - Escolher Template
  # ─────────────────────────────────────

  AGENT: template-selector (Sofia)
  TASK: select-template

  INPUTS:
    tone: optimized_copy.tone
    mood: image_mood
    template_hint: segment.template_hint

  OUTPUTS:
    template_selected: "educacional-framework"
    customizations: {overlay_opacity, accent_color, etc}

  DISPLAY:
    "  🎨 Template selecionado por Sofia (Template Selector)
         Template: {template_selected}
         Confiança: {confidence}%"

  # ─────────────────────────────────────
  # 3.4: Layout Composer - Montar HTML
  # ─────────────────────────────────────

  AGENT: layout-composer (Viktor)
  TASK: compose-layout

  INPUTS:
    copy: optimized_copy
    image_path: generated_image or user_photo
    template: template_selected
    customizations: customizations

  OUTPUTS:
    html_path: "output/html/story-seq-{sequence_num}.html"

  DISPLAY:
    "  🏗️ HTML montado por Viktor (Layout Composer)
         Dimensões: 1080x1920
         Safe zones: respeitadas"

  # ─────────────────────────────────────
  # 3.5: Export Specialist - Renderizar PNG
  # ─────────────────────────────────────

  AGENT: export-specialist (Chen)
  TASK: export-visual

  INPUTS:
    html_path: html_path
    output_name: "story-seq-{sequence_num}"
    quality: 100

  OUTPUTS:
    main_file: "output/stories/story-seq-{sequence_num}.png"
    variations: [v1, v2, v3, v4]

  DISPLAY:
    "  💾 PNG exportado por Chen (Export Specialist)
         Main: {main_file}
         Variações: 4 geradas

    ✅ Story {sequence_num} completo!
    ═══════════════════════════════════════
    "

  # ─────────────────────────────────────
  # 3.6: Salvar Metadata Individual
  # ─────────────────────────────────────

  story_metadata = {
    sequence_number: sequence_num,
    narrative_role: segment.narrative_role,
    tone: optimized_copy.tone,
    template: template_selected,
    copy: optimized_copy,
    image_analysis: image_analysis,
    file_paths: {
      main: main_file,
      variations: variations,
      html: html_path
    }
  }

  APPEND story_metadata TO stories_array

  # Continue to next segment...
```

---

### **Step 4: Consolidar Metadata**

```yaml
AFTER all segments processed:

consolidated_metadata = {
  workflow: "generate-story-sequence",
  timestamp: current_timestamp,
  inputs: {
    long_text_preview: first_200_chars,
    num_stories: segments.length,
    photo_mode: photo_mode
  },
  narrative_arc: narrative_arc,
  visual_consistency: visual_consistency_guide,
  stories: stories_array,
  performance: {
    total_time: elapsed_time,
    avg_time_per_story: elapsed_time / segments.length,
    agents_executed: 6 (strategist + 5 per story)
  }
}

SAVE consolidated_metadata TO:
  "output/stories/sequence-{timestamp}.json"

DISPLAY:
  "
  ═══════════════════════════════════════
  ✅ SEQUÊNCIA COMPLETA GERADA!
  ═══════════════════════════════════════

  📊 Resumo:
     Stories gerados: {segments.length}
     Arco narrativo: {arc_type}
     Tempo total: {total_time}
     Tempo médio/story: {avg_time}

  📁 Outputs:
     Main files:
       - output/stories/story-seq-001.png
       - output/stories/story-seq-002.png
       - output/stories/story-seq-003.png
       - output/stories/story-seq-004.png

     Variações: 16 arquivos (4 variações × 4 stories)

     Metadata consolidada:
       - output/stories/sequence-{timestamp}.json

  🎨 Consistência Visual:
     Paleta: {palette}
     Mood progression: {mood_progression}
     Estilo: {image_style}

  ═══════════════════════════════════════
  "
```

---

### **Step 5: Validation (Optional)**

```yaml
IF user wants validation:

  PROMPT:
    "
    Quer abrir todos os 4 stories no browser para validar? [Y/n]
    "

  IF yes:
    FOR EACH html_file IN html_files:
      OPEN html_file IN browser

    PROMPT:
      "
      Qualidade visual OK? [Y/n]

      Se quiser ajustar algum story específico, digite o número (1-4)
      ou Enter para finalizar.
      "

    IF user_input == number:
      RE-RUN generate-story for that specific segment
      WITH manual_override options

ELSE:
  "Stories prontos! 🎉"
```

---

## 🎨 Visual Consistency Logic

**Como o sistema garante coerência visual entre os 4 stories:**

### **1. Paleta Compartilhada**

```javascript
// Definida pelo Story Strategist no Step 2
shared_palette = ["#FF6B35", "#1A1A1A", "#F7931E"]

// Aplicada em TODOS os stories
FOR EACH story:
  template_customizations.accent_color = shared_palette[0]
  dall_e_prompt += f"color palette: {shared_palette}"
```

### **2. Mood Progression**

```javascript
// Story Strategist define mood progression
mood_progression = [
  "dark atmospheric",
  "vibrant educational",
  "dynamic action",
  "warm empowering"
]

// Image Curator usa o mood específico de cada story
FOR story IN [1,2,3,4]:
  dall_e_prompt = f"{mood_progression[story-1]}, {base_style}"
```

### **3. Consistency Context**

```javascript
// Cada geração de imagem recebe contexto das anteriores
consistency_context = {
  palette: shared_palette,
  previous_images: [story1_image, story2_image],
  base_style: "cinematic editorial photography",
  theme: "fire transformation"
}

// DALL-E prompt engineering
prompt = f"""
{mood_progression[current_story]}
{base_style}
maintaining visual consistency with previous images
using color palette: {palette}
theme: {theme}
lighting: {lighting_style}
"""
```

### **4. Template Adaptation**

```javascript
// Templates diferentes mas com customizações que mantém coerência
story_1: authority-intelectual + accent_color=#FF6B35
story_2: educacional-framework + accent_color=#FF6B35
story_3: educacional-framework + accent_color=#FF6B35
story_4: pessoal-intimo + accent_color=#FF6B35

// Mesma família tipográfica base
all_stories: font_family = "Playfair Display" (headlines)
```

---

## 🚨 Error Handling

### **Erro: Story Strategist falha**

```yaml
IF break-into-stories fails:

  ERROR:
    "❌ Não foi possível analisar estrutura do texto.

     Possíveis causas:
     - Texto muito curto (< 300 palavras)
     - Estrutura narrativa muito fragmentada
     - API timeout

     💡 Opções:
       1. Tentar novamente
       2. Usar workflow generate-story (1 story único)
       3. Editar texto e tentar novamente

     Escolha [1-3]:"

  HANDLE user_choice
```

### **Erro: Image generation falha em 1 story**

```yaml
IF story_2.image_generation fails:

  WARN:
    "⚠️ Falha ao gerar imagem para Story 2

     Tentando retry (1/3)..."

  RETRY with adjusted_prompt

  IF retry_fails_3x:
    FALLBACK:
      "❌ Não foi possível gerar imagem. Opções:

       1. Fornecer foto manualmente
       2. Usar imagem genérica placeholder
       3. Skip este story e continuar com restantes

       Escolha [1-3]:"
```

### **Erro: Export falha (Puppeteer)**

```yaml
IF export fails:

  ERROR:
    "❌ Falha no render HTML→PNG

     Possível causa: Puppeteer não instalado

     💡 Opções:
       1. Instalar Puppeteer (npm install puppeteer)
       2. Usar HTMLs (abrir no browser e screenshot manual)
       3. Cancelar workflow

     Escolha [1-3]:"
```

---

## ⏱️ Performance Targets

| Métrica | Target | Atual |
|---------|--------|-------|
| Tempo total (4 stories) | <3 min | TBD |
| Tempo por story | <45s | TBD |
| Story Strategist (análise) | <10s | TBD |
| Image generation (por story) | <15s | TBD |
| Export (por story) | <10s | TBD |

**Breakdown estimado (4 stories):**
```
Step 2: Story Strategist         10s
Step 3: Loop (4 iterations)      160s (40s × 4)
  - Copywriter                   2s
  - Image Curator (generate)     15s
  - Template Selector            1s
  - Layout Composer              3s
  - Export Specialist            10s
Step 4: Consolidate metadata     5s

TOTAL: ~2min 55s
```

---

## 📊 Success Metrics

| Métrica | Target | Como Medir |
|---------|--------|------------|
| Coerência narrativa | >90% | User approval rating |
| Consistência visual | >85% | Visual similarity score |
| Template matching accuracy | >90% | Confidence scores |
| Stories funcionam standalone | >80% | A/B test (mostrar 1 vs sequência) |
| Engagement sequencial | >70% | % que veem story 2 após story 1 |
| User satisfaction | >85% | Post-generation survey |

---

## 🧪 Test Scenarios

### **Test 1: Manifesto 1900 palavras (Obesidade Mental)**

```yaml
inputs:
  long_text: "Obesidade Mental ou Como a Escola..."
  num_stories: 4
  photo_mode: generate_all

expected_outputs:
  stories: 4
  narrative_arc: "manifesto-educacional"
  templates: ["authority-intelectual", "educacional-framework", "educacional-framework", "pessoal-intimo"]
  consistency: high
  total_time: <3min
```

### **Test 2: Thread Twitter (curto)**

```yaml
inputs:
  long_text: "[15 tweets concatenados, ~600 palavras]"
  num_stories: auto

expected_outputs:
  stories: 2 ou 3 (auto-detect)
  narrative_arc: "insight-takeaway"
  total_time: <2min
```

### **Test 3: Mix (user photos + AI)**

```yaml
inputs:
  long_text: "[1500 palavras]"
  num_stories: 4
  photo_mode: mix
  user_photos: [story1.jpg, story3.jpg]

expected_behavior:
  - Use user photo for story 1
  - Generate AI for story 2
  - Use user photo for story 3
  - Generate AI for story 4
  - Maintain visual consistency despite mix
```

---

## 🔗 Integration Points

### **Calls:**
- Story Strategist Agent → break-into-stories
- Copywriter Agent → optimize-copy (loop)
- Image Curator Agent → generate-image or analyze-photo (loop)
- Template Selector Agent → select-template (loop)
- Layout Composer Agent → compose-layout (loop)
- Export Specialist Agent → export-visual (loop)

### **Dependencies:**
- All 6 agents must exist
- break-into-stories task must work
- generate-image must support consistency_context
- Templates (educacional-framework) must exist

### **State Management:**
```
.arcadia-core/temp/
  current-sequence-{timestamp}.json  # Working state during execution
  story-{seq}-analysis.json          # Per-story metadata

output/stories/
  story-seq-001.png                  # Main outputs
  story-seq-001-v1.png               # Variations
  sequence-{timestamp}.json          # Consolidated metadata

output/html/
  story-seq-001.html                 # Intermediate HTMLs
```

---

## 📝 Usage Examples

### **Example 1: Via Arcadia Master**

```bash
@arcadia-master

> *task generate-story-sequence

[Workflow executes with elicitation]
```

### **Example 2: Direct Activation**

```bash
# Cola texto em arquivo
echo "Obesidade Mental..." > input.txt

# Executa workflow
*generate-story-sequence input.txt 4 generate_all
```

### **Example 3: Programmatic**

```javascript
const workflow = require('.arcadia-core/workflows/generate-story-sequence')

const result = await workflow.execute({
  long_text: longTextString,
  num_stories: 4,
  photo_mode: 'generate_all'
})

console.log(result.stories) // Array[4]
```

---

## 📚 Related Workflows

- **generate-story.md** - Gera 1 story único (usado internamente no loop)
- **batch-generate.md** (futuro) - Gera N stories de N textos diferentes

---

**Workflow Status:** ✅ Ready for Implementation
**Next Steps:**
1. Create educacional-framework template
2. Enhance Image Curator with consistency_context
3. Test complete workflow end-to-end
4. Implement Puppeteer export (if not done)

---

**Notes:**
- Este workflow é a JUNÇÃO de Story Strategist + generate-story loop
- Prioridade: Consistência visual > Velocidade
- User pode intervir em qualquer ponto do loop se detectar problemas
