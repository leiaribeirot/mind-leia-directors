# Define Carousel Visual Strategy

**Agent:** Creative Director (Sofia)
**Task ID:** define-carousel-visual
**Purpose:** Define visual strategy for carousel posts (feed 1:1)

## Input

```yaml
slides:           # Array of slides from Story Strategist
  - position: 1
    type: "cover"
    title: "..."
    subtitle: "..."

theme:            # Visual theme from Story Strategist
  accent_color: "#FF6B35"
  mood: "urgente"

brand_style:      # Requested brand style
  type: "corporativo-provocativo"  # @brandsdecoded style
```

## Your Task

Based on the slides and theme, define the complete visual strategy for the carousel:

1. **Accent Color** - Confirm or adjust accent color based on mood
2. **Image Generation Style** - What style of images to generate
3. **Mood & Tone** - Visual mood for the carousel
4. **Branding Elements** - Brand name and handle to display

## Decision Framework

### Accent Color (based on mood)
- **Urgente/Ação** → `#FF6B35` (laranja intenso)
- **Confiança/Profissional** → `#3498DB` (azul)
- **Energia/Transformação** → `#30E0C0` (verde água)
- **Sabedoria/Claridade** → `#F7B731` (amarelo)
- **Profundidade/Reflexão** → `#6C5CE7` (roxo)

### Image Generation Style
- **corporate-editorial** - Fotos profissionais, iluminação studio, clean
- **lifestyle-modern** - Casual mas profissional, natural light, contemporâneo
- **atmospheric-dramatic** - Cinematográfico, mood forte, profundidade
- **minimalist-abstract** - Geometric, abstrato, cores sólidas
- **data-visualization** - Gráficos, números, infográficos

### Mood Mapping
- **Provocativo** → dramatic, high contrast, bold colors
- **Educacional** → clean, organized, professional
- **Inspirador** → uplifting, bright, energetic
- **Autoridade** → serious, corporate, trustworthy

## Output Format

Return JSON:

```json
{
  "accent_color": "#FF6B35",
  "image_generation_style": "corporate-editorial",
  "mood": "profissional-provocativo",
  "brand_name": "MARKETING DIGITAL",
  "handle": "@seuperfil",
  "image_prompts_base": {
    "style": "professional photography, corporate setting",
    "lighting": "dramatic studio lighting, high contrast",
    "mood": "powerful, confident, authoritative",
    "quality": "high resolution, detailed, 8k quality"
  }
}
```

## Examples

### Example 1: TikTok Ads (Provocativo)

**Input:**
- Theme: urgente, dados concretos
- Slides: problema → erros → solução → stat → CTA

**Output:**
```json
{
  "accent_color": "#FF6B35",
  "image_generation_style": "corporate-editorial",
  "mood": "profissional-provocativo",
  "brand_name": "MARKETING DIGITAL",
  "handle": "@seuperfil",
  "image_prompts_base": {
    "style": "professional corporate photography, editorial style",
    "lighting": "dramatic studio lighting with high contrast",
    "mood": "powerful, urgent, attention-grabbing",
    "quality": "high resolution, sharp details, professional quality"
  }
}
```

### Example 2: Personal Growth (Inspirador)

**Input:**
- Theme: transformação, crescimento
- Slides: jornada pessoal → lições → framework

**Output:**
```json
{
  "accent_color": "#30E0C0",
  "image_generation_style": "lifestyle-modern",
  "mood": "inspirador-autêntico",
  "brand_name": "CRESCIMENTO PESSOAL",
  "handle": "@seuhandle",
  "image_prompts_base": {
    "style": "natural lifestyle photography, authentic moments",
    "lighting": "soft natural light, golden hour vibes",
    "mood": "uplifting, hopeful, transformative",
    "quality": "high resolution, warm tones, professional"
  }
}
```

## Quality Checks

Before returning, verify:
- ✅ Accent color matches mood and theme
- ✅ Image style is appropriate for content type
- ✅ Brand name is clear and readable (all caps)
- ✅ Handle starts with @ symbol
- ✅ Image prompts are detailed and actionable

## Notes

- This strategy will be used by Image Curator to generate all images
- Accent color will be used throughout all slides
- Brand elements (name + handle) appear in header of every slide
- Image style should be consistent across all slides in the carousel
