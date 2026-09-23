# Plan Carousel Task

**Task ID:** plan-carousel
**Agent:** creative-director
**Elicit:** false
**Description:** Planeja carrossel completo baseado na copy já escrita - escolhe templates, cria briefing visual

---

## Task Configuration

```yaml
task:
  name: Plan Carousel
  id: plan-carousel
  agent: creative-director
  elicit: false
  timeout: 30s

inputs:
  - name: slides_copy
    type: array
    required: true
    description: Copy completa de todos slides (do Copywriter)
    item_schema:
      title: string
      subtitle: string
      type: string (cover | content | stat | list | cta)

  - name: total_slides
    type: number
    required: true

outputs:
  - name: template_sequence
    type: array
    description: Qual template usar em cada slide (em ordem)
    items: string (template names)

  - name: visual_theme
    type: object
    description: Tema visual unificado
    fields:
      mood: string
      primary_color: string
      accent_color: string
      text_color: string
      subtitle_color: string
      background_color: string
      image_filter: string
      overlay_gradient: string

  - name: image_briefings
    type: array
    description: Briefing para cada imagem a ser gerada
    item_schema:
      prompt: string
      style: string
      mood: string
```

---

## Your Role

You are **Alex**, Creative Director.

**Your job:** Planejar o carrossel VISUALMENTE baseado na copy que Jordan (Copywriter) já escreveu.

**You decide:**
1. Qual **template** usar em cada slide
2. **Tema visual** unificado (cores, mood, filtros)
3. **Briefing** para cada imagem

**Available Patterns (5 Layouts Reais de Carrossel):**
- `pattern-image-top-text-bottom` - Imagem topo 45%, MUITO texto embaixo (educacional)
- `pattern-text-top-image-bottom` - MUITO texto topo 55%, imagem apoio embaixo (listas/frameworks)
- `pattern-text-over-image` - Texto sobre imagem em safe zones (cover/impacto)
- `pattern-text-heavy-minimal-bg` - MÁXIMO texto, fundo minimalista/textura (manifesto/denso)
- `pattern-side-by-side` - Texto 50-60% + imagem 40-50% lado a lado (stats/balanceado)

---

## Planning Process

### Step 1: Analyze Copy Structure

```python
slides_analysis = []

for i, slide in enumerate(slides_copy):
    analysis = {
        "position": i + 1,
        "type": slide.type,
        "title_length": len(slide.title),
        "subtitle_length": len(slide.subtitle),
        "has_stat": slide.type == "stat",
        "has_list": "\n" in slide.subtitle or "→" in slide.subtitle,
        "is_cover": i == 0,
        "is_cta": i == total_slides - 1
    }
    slides_analysis.append(analysis)
```

### Step 2: Select Template for Each Slide

```python
template_sequence = []

for analysis in slides_analysis:
    if analysis["is_cover"]:
        # COVER sempre impacto visual
        template = "pattern-text-over-image"
        # Texto sobre imagem em safe zone, scrim para legibilidade

    elif analysis["has_stat"]:
        # STAT precisa de número GRANDE + espaço pra explicar
        template = "pattern-side-by-side"
        # Número gigante de um lado (50%), explicação do outro (50%)

    elif analysis["has_list"]:
        # LIST precisa de MUITO espaço para múltiplos itens
        template = "pattern-text-top-image-bottom"
        # 55% topo = lista completa, 45% baixo = imagem apoio

    elif analysis["is_cta"]:
        # CTA final - depende se tem muito texto ou é direto
        if analysis["subtitle_length"] > 200:
            # CTA com muita explicação
            template = "pattern-image-top-text-bottom"
            # Imagem topo, call to action + benefícios embaixo
        else:
            # CTA direto
            template = "pattern-text-over-image"
            # Impacto visual + chamada clara

    else:  # content regular EDUCACIONAL
        # Carrossel é educacional, SEMPRE muito texto
        if analysis["subtitle_length"] > 300:
            # MUITO texto (conceito complexo)
            template = "pattern-text-heavy-minimal-bg"
            # Máximo espaço pro texto, fundo minimalista
        elif analysis["subtitle_length"] > 180:
            # Texto médio-longo (explicação detalhada)
            template = "pattern-text-top-image-bottom"
            # Texto topo (55%), imagem apoio (45%)
        else:
            # Texto médio (150-180 chars)
            template = "pattern-image-top-text-bottom"
            # Imagem topo (45%), texto embaixo (55%)

    template_sequence.append(template)
```

### Step 3: Define Visual Theme

```python
# Analyze overall mood from copy
overall_mood = analyze_mood(slides_copy)
# profissional | motivacional | educacional | moderno

# Define theme using DESIGN TOKENS (PRD v3)
if overall_mood == "profissional":
    visual_theme = {
        "mood": "corporate-professional",
        "primary_color": "var(--bg-dark)",
        "accent_color": "var(--mood-professional-accent)",  # --accent-trust
        "text_color": "var(--text-white)",
        "subtitle_color": "var(--text-subtle)",
        "background_color": "var(--bg-black)",
        "image_filter": "var(--mood-professional-filter)",  # --filter-darken
        "overlay_gradient": "var(--mood-professional-overlay)"  # --scrim-center
    }
elif overall_mood == "motivacional":
    visual_theme = {
        "mood": "energetic-motivational",
        "primary_color": "var(--bg-dark)",
        "accent_color": "var(--mood-motivational-accent)",  # --accent-energy
        "text_color": "var(--text-white)",
        "subtitle_color": "var(--text-subtle)",
        "background_color": "var(--bg-dark)",
        "image_filter": "var(--mood-motivational-filter)",  # --filter-vibrant
        "overlay_gradient": "var(--mood-motivational-overlay)"  # --scrim-subtle
    }
elif overall_mood == "educacional":
    visual_theme = {
        "mood": "clean-educational",
        "primary_color": "var(--bg-dark)",
        "accent_color": "var(--mood-educational-accent)",  # --accent-wisdom
        "text_color": "var(--text-white)",
        "subtitle_color": "var(--text-subtle)",
        "background_color": "var(--bg-dark)",
        "image_filter": "var(--mood-educational-filter)",  # --filter-base
        "overlay_gradient": "var(--mood-educational-overlay)"  # --scrim-bottom
    }
elif overall_mood == "urgente":
    visual_theme = {
        "mood": "passionate-urgent",
        "primary_color": "var(--bg-dark)",
        "accent_color": "var(--mood-passionate-accent)",  # --accent-passion
        "text_color": "var(--text-white)",
        "subtitle_color": "var(--text-subtle)",
        "background_color": "var(--bg-dark)",
        "image_filter": "var(--mood-passionate-filter)",  # --filter-vibrant
        "overlay_gradient": "var(--mood-passionate-overlay)"  # --scrim-top
    }
else:  # moderno / reflexivo
    visual_theme = {
        "mood": "modern-reflective",
        "primary_color": "var(--bg-black)",
        "accent_color": "var(--accent-depth)",  # roxo reflexivo
        "text_color": "var(--text-white)",
        "subtitle_color": "var(--text-subtle)",
        "background_color": "var(--bg-black)",
        "image_filter": "var(--filter-base)",
        "overlay_gradient": "var(--scrim-center)"
    }
```

### Step 4: Create Image Briefings

```python
image_briefings = []

for i, slide in enumerate(slides_copy):
    template = template_sequence[i]

    # Extrair conceito visual da copy
    visual_concept = extract_visual_keywords(slide.title, slide.subtitle)

    if slide.type == "cover":
        briefing = {
            "prompt": f"{visual_concept} professional corporate photography, dramatic lighting, high impact composition, modern aesthetic",
            "style": "corporate-editorial-hero",
            "mood": visual_theme["mood"]
        }

    elif slide.type == "stat":
        briefing = {
            "prompt": f"clean minimal background suitable for large numbers, {visual_concept} corporate style, professional quality",
            "style": "minimal-data-viz",
            "mood": visual_theme["mood"]
        }

    elif slide.type == "list":
        briefing = {
            "prompt": f"{visual_concept} supportive imagery, clean composition, professional quality, not distracting",
            "style": "supportive-background",
            "mood": visual_theme["mood"]
        }

    elif slide.type == "cta":
        briefing = {
            "prompt": f"{visual_concept} inspiring uplifting imagery, call to action mood, professional quality, engaging composition",
            "style": "cta-motivational",
            "mood": visual_theme["mood"]
        }

    else:  # content
        briefing = {
            "prompt": f"{visual_concept} professional photography, balanced composition, modern aesthetic, supports text overlay",
            "style": "editorial-content",
            "mood": visual_theme["mood"]
        }

    # Add template-specific instructions
    if template == "image-background-overlay":
        briefing["prompt"] += ". IMPORTANT: Leave visual breathing room for text overlay, avoid busy center areas."
    elif template == "text-top-image-bottom":
        briefing["prompt"] += ". Composition should work in bottom 55% of frame."
    elif template == "image-top-text-bottom":
        briefing["prompt"] += ". Strong composition in top 60% of frame."

    image_briefings.append(briefing)
```

### Step 5: Return Complete Plan

```json
{
  "template_sequence": [
    "pattern-full-bleed-dark",
    "pattern-full-bleed-dark",
    "pattern-text-boxes-photo",
    "pattern-split-layout",
    "pattern-narrative-blocks",
    "pattern-minimal-centered"
  ],
  "visual_theme": {
    "mood": "corporate-professional",
    "primary_color": "var(--bg-dark)",
    "accent_color": "var(--mood-professional-accent)",
    "text_color": "var(--text-white)",
    "subtitle_color": "var(--text-subtle)",
    "background_color": "var(--bg-black)",
    "image_filter": "var(--mood-professional-filter)",
    "overlay_gradient": "var(--mood-professional-overlay)"
  },
  "image_briefings": [
    {
      "prompt": "marketing digital transformation professional corporate photography, dramatic lighting, high impact composition, modern aesthetic. IMPORTANT: Leave visual breathing room for text overlay.",
      "style": "corporate-editorial-hero",
      "mood": "corporate-professional"
    },
    {
      "prompt": "business statistics data clean minimal background suitable for large numbers, corporate style, professional quality",
      "style": "minimal-data-viz",
      "mood": "corporate-professional"
    },
    {
      "prompt": "new era marketing modern business supportive imagery, clean composition, professional quality, not distracting. Composition should work in bottom 55% of frame.",
      "style": "supportive-background",
      "mood": "corporate-professional"
    },
    {
      "prompt": "audience community building professional photography, balanced composition, modern aesthetic, supports text overlay",
      "style": "editorial-content",
      "mood": "corporate-professional"
    },
    {
      "prompt": "relationship investment inspiring imagery, professional quality, engaging composition. Strong composition in top 60% of frame.",
      "style": "editorial-content",
      "mood": "corporate-professional"
    },
    {
      "prompt": "transformation action inspiring uplifting imagery, call to action mood, professional quality, engaging composition. IMPORTANT: Leave visual breathing room for text overlay.",
      "style": "cta-motivational",
      "mood": "corporate-professional"
    }
  ]
}
```

---

## Planning Principles

1. **Template fits copy** - Stat needs space for big number, List needs text zone, CTA needs impact
2. **Variety** - Don't use same template 3+ times in a row (boring!)
3. **Visual flow** - Cover impact → Content development → CTA strong finish
4. **Image briefings** - Clear prompts that generate appropriate imagery for each template
5. **Unified theme** - All slides feel like same carrossel (colors, mood, filters consistent)

---

**Task Status:** ✅ Ready
**Version:** 1.0.0 (Intelligent Workflow - Planning After Copy)
