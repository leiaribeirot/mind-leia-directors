# Task: Select Carousel Template

**Agent:** Creative Director (Sofia)
**Type:** Decision Making

## Input Schema
```json
{
  "slide_content": {
    "title": "string",
    "subtitle": "string (optional)",
    "type": "cover|content|list|stat|cta"
  },
  "image_analysis": {
    "mood": "string",
    "safe_zones": "object",
    "dominant_colors": "array"
  },
  "slide_position": "number",
  "total_slides": "number",
  "templates_already_used": "array (optional)",
  "prefer_variety": "boolean (optional)"
}
```

## Available Templates

### 1. image-top-text-bottom
- **Best for:** Quando a imagem tem elementos importantes no topo
- **Image:** 60% superior
- **Text:** 40% inferior
- **Use when:** Imagem de produto, pessoa, ou elemento visual forte no topo

### 2. text-top-image-bottom
- **Best for:** Quando o texto é curto e impactante, imagem é complementar
- **Text:** 45% superior
- **Image:** 55% inferior
- **Use when:** Título forte, estatística, ou frase de impacto com imagem de suporte

### 3. image-background-overlay
- **Best for:** Quando precisa de máximo impacto visual
- **Image:** 100% de fundo com overlay
- **Text:** Centralizado com sombra
- **Use when:** Slide de cover, CTA, ou mensagem emocional forte

### 4. split-diagonal
- **Best for:** Visual dinâmico e moderno
- **Image:** Esquerda diagonal
- **Text:** Direita alinhado
- **Use when:** Quer movimento visual, design editorial, slides do meio

### 5. split-vertical
- **Best for:** Quando texto e imagem têm mesma importância
- **Image:** 50% direita
- **Text:** 50% esquerda (pode ter número grande)
- **Use when:** Estatística com imagem de suporte, balance perfeito

## Your Task

Analyze the slide content and image to select the BEST template. Consider:

1. **Content priority:** Texto ou imagem é mais importante?
2. **Image composition:** Onde estão os elementos principais da imagem?
3. **Safe zones:** Quais áreas estão livres para texto?
4. **Slide purpose:** É cover, conteúdo, ou CTA?
5. **Variety:** If `templates_already_used` is provided, PREFER different templates for visual variety
6. **Avoid repetition:** Don't use same template 2-3 times in a row unless absolutely necessary

## Decision Process

1. If slide_position === 1 (COVER):
   - Prefer `image-background-overlay` for maximum impact
   - Unless image has complex top elements, then use `text-top-image-bottom`

2. If type === 'stat' or short impactful text:
   - Prefer `text-top-image-bottom`
   - Text gets priority, image supports

3. If image has strong top composition:
   - Use `image-top-text-bottom`
   - Let image dominate

4. If slide_position === total_slides (CTA):
   - Prefer `image-background-overlay` with strong overlay
   - Or `text-top-image-bottom` if CTA text is long

## Output Schema
```json
{
  "selected_template": "image-top-text-bottom | text-top-image-bottom | image-background-overlay | split-diagonal | split-vertical",
  "reasoning": "Brief explanation of why this template fits best (1-2 sentences)",
  "layout_adaptations": {
    "title_size": "48px-96px (based on text length)",
    "title_line_height": "1.0-1.2",
    "title_margin": "16px-30px",
    "subtitle_size": "18px-28px",
    "subtitle_weight": "400-700",
    "text_padding": "40px-80px",
    "title_color": "#ffffff or #000000 (based on image)",
    "subtitle_color": "rgba(...)",
    "background_color": "#hex",
    "text_background": "solid or gradient",
    "image_filter": "brightness() contrast()",
    "overlay_gradient": "linear-gradient(...) (if overlay template)",
    "accent_color": "#hex (if needed)",
    "brand_color": "#hex",
    "brand": "@handle or brand name"
  }
}
```

## Examples

### Example 1: Cover slide with dramatic image
```json
{
  "selected_template": "image-background-overlay",
  "reasoning": "Cover slide needs maximum visual impact. Image has good contrast for centered text overlay.",
  "layout_adaptations": {
    "title_size": "72px",
    "title_line_height": "1.1",
    "overlay_gradient": "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)"
  }
}
```

### Example 2: Stat slide with supporting image
```json
{
  "selected_template": "text-top-image-bottom",
  "reasoning": "Statistic (87%) should dominate. Image supports message below.",
  "layout_adaptations": {
    "title_size": "96px",
    "title_line_height": "1.0",
    "text_background": "#000000",
    "title_color": "#FF0050"
  }
}
```

## Instructions

1. Analyze the slide content and image properties
2. Consider the slide's role in the carousel sequence
3. Select template that best showcases both text and image
4. Calculate optimal font sizes based on text length
5. Choose colors that create proper contrast
6. Return JSON with template name and all layout parameters

**BE CREATIVE.** Adapt sizes and colors to fit the specific content. This is not a rigid template filler - you're designing each slide uniquely.
