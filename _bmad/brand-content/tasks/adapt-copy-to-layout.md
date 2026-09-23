# Adapt Copy to Layout Task

**Task ID:** adapt-copy-to-layout
**Agent:** copywriter
**Elicit:** false
**Description:** Adapta copy original para caber perfeitamente no layout já montado (template + imagem)

---

## Task Configuration

```yaml
task:
  name: Adapt Copy to Layout
  id: adapt-copy-to-layout
  agent: copywriter
  elicit: false
  timeout: 20s

inputs:
  - name: original_copy
    type: object
    required: true
    fields:
      title: string
      subtitle: string

  - name: template_name
    type: string
    required: true
    description: Template sendo usado

  - name: image_safe_zones
    type: object
    required: false
    description: Safe zones da imagem (se disponível)

outputs:
  - name: adapted_title
    type: string

  - name: adapted_subtitle
    type: string

  - name: typography
    type: object
    fields:
      title_size: string (px)
      subtitle_size: string (px)
```

---

## Your Role

You are **Jordan**, Senior Copywriter.

**Your job:** ADAPTAR sua copy original para caber PERFEITAMENTE no layout que foi montado.

**You receive:**
- Original copy que você escreveu
- Template que Creative Director escolheu
- Safe zones da imagem (onde não colocar texto)

**You adapt:**
- Mantém MENSAGEM CORE (não muda sentido!)
- Ajusta COMPRIMENTO para caber
- Adiciona LINE BREAKS estratégicos
- Calcula font size ideal

---

## Template Capacities

```python
PATTERN_SPECS = {
    # Pattern 1: Imagem topo, MUITO texto embaixo
    "pattern-image-top-text-bottom": {
        "title": {"min_chars": 20, "max_chars": 70, "max_lines": 2},
        "subtitle": {"min_chars": 150, "max_chars": 400, "max_lines": 8},  # MUITO TEXTO
        "title_size_token": "var(--carousel-text-xl)",  # 48-56px
        "subtitle_size_token": "var(--carousel-text-base)",  # 22-26px
        "use_case": "Educacional - precisa explicar conceito em detalhe"
    },

    # Pattern 2: MUITO texto topo, imagem embaixo como apoio
    "pattern-text-top-image-bottom": {
        "title": {"min_chars": 25, "max_chars": 75, "max_lines": 2},
        "subtitle": {"min_chars": 200, "max_chars": 500, "max_lines": 10},  # MUITO TEXTO
        "title_size_token": "var(--carousel-text-lg)",  # 32-38px
        "subtitle_size_token": "var(--carousel-text-base)",  # 22-26px
        "use_case": "Listas, frameworks, muito conteúdo educacional"
    },

    # Pattern 3: Texto sobre imagem (safe zones)
    "pattern-text-over-image": {
        "title": {"min_chars": 20, "max_chars": 65, "max_lines": 2},
        "subtitle": {"min_chars": 100, "max_chars": 300, "max_lines": 6},
        "title_size_token": "var(--cover-title-size)",  # 64-76px
        "subtitle_size_token": "var(--carousel-text-base)",  # 22-26px
        "use_case": "Cover, impacto visual + mensagem clara"
    },

    # Pattern 4: TEXTO PESADO, fundo minimalista
    "pattern-text-heavy-minimal-bg": {
        "title": {"min_chars": 30, "max_chars": 90, "max_lines": 3},
        "subtitle": {"min_chars": 250, "max_chars": 600, "max_lines": 12},  # MÁXIMO TEXTO
        "title_size_token": "var(--carousel-text-xl)",  # 48-56px
        "subtitle_size_token": "var(--carousel-text-base)",  # 22-26px
        "use_case": "Manifesto, reflexão, conteúdo denso sem distração visual"
    },

    # Pattern 5: Lado a lado (50/50 ou 60/40)
    "pattern-side-by-side": {
        "title": {"min_chars": 20, "max_chars": 70, "max_lines": 3},
        "subtitle": {"min_chars": 120, "max_chars": 350, "max_lines": 7},
        "title_size_token": "var(--content-title-size)",  # 48-56px
        "subtitle_size_token": "var(--carousel-text-base)",  # 22-26px
        "use_case": "Stats, balanceado visual + conteúdo"
    }
}

# IMPORTANTE: Carrosséis do Instagram são EDUCACIONAIS
# - Title: frase impactante (20-90 chars)
# - Subtitle: MUITO TEXTO (150-600 chars) explicando conceito
# - Nunca ter menos de 150 chars no subtitle (carrossel precisa educar!)
```

---

## Adaptation Process

### Step 1: Get Pattern Specs

```python
specs = PATTERN_SPECS[pattern_name]

title_capacity = specs["title"]
subtitle_capacity = specs["subtitle"]

# Get design token references for output
title_size_token = specs["title_size_token"]
subtitle_size_token = specs["subtitle_size_token"]
```

### Step 2: Adapt Title

```python
original_title = original_copy.title
title_length = len(original_title)

if title_length <= title_capacity["max_chars"]:
    # Fits! Keep it
    adapted_title = original_title

elif title_length > title_capacity["max_chars"]:
    # Too long, need to shorten BUT KEEP MESSAGE
    # Option 1: Remove filler words
    adapted_title = remove_fillers(original_title)

    # Option 2: If still too long, abbreviate
    if len(adapted_title) > title_capacity["max_chars"]:
        adapted_title = abbreviate_smartly(adapted_title, title_capacity["max_chars"])

    # IMPORTANT: Never change core message!
    # "MARKETING DIGITAL MUDOU PARA SEMPRE E NÃO VOLTA MAIS" (54 chars)
    # → "MARKETING DIGITAL MUDOU" (23 chars) if max is 25
    # Core message = "mudou" ✓

# Calculate font size (longer = smaller)
chars_ratio = len(adapted_title) / title_capacity["max_chars"]
size_range = specs["title_size_range"].split("-")
min_size = int(size_range[0].replace("px", ""))
max_size = int(size_range[1].replace("px", ""))

title_size = max_size - int((max_size - min_size) * chars_ratio)
```

### Step 3: Adapt Subtitle

```python
original_subtitle = original_copy.subtitle
subtitle_length = len(original_subtitle)

if subtitle_length < subtitle_capacity["min_chars"]:
    # Too short! Fill space
    adapted_subtitle = expand_subtitle(original_subtitle, subtitle_capacity["min_chars"])
    # Add context, detail, or rephrase for clarity

elif subtitle_length > subtitle_capacity["max_chars"]:
    # Too long, trim
    adapted_subtitle = trim_subtitle(original_subtitle, subtitle_capacity["max_chars"])
    # Keep essential info only

else:
    # Perfect length
    adapted_subtitle = original_subtitle

# Calculate font size
chars_ratio = len(adapted_subtitle) / subtitle_capacity["max_chars"]
sub_size_range = specs["subtitle_size_range"].split("-")
sub_min = int(sub_size_range[0].replace("px", ""))
sub_max = int(sub_size_range[1].replace("px", ""))

subtitle_size = sub_max - int((sub_max - sub_min) * chars_ratio)
```

### Step 4: Return Adapted Copy

```json
{
  "adapted_title": "MARKETING DIGITAL MUDOU",
  "adapted_subtitle": "78% das empresas ainda fazem do jeito antigo e perdem dinheiro todos os dias. A nova era exige conteúdo que educa, transparência e comunidade genuína.",
  "typography": {
    "title_size": "var(--cover-title-size)",
    "title_weight": "var(--cover-title-weight)",
    "subtitle_size": "var(--content-subtitle-size)",
    "subtitle_weight": "var(--weight-regular)"
  }
}
```

---

## Adaptation Examples

### Example 1: Title Fits Perfectly

**Original:** "MARKETING DIGITAL MUDOU COMPLETAMENTE E NÃO VOLTA MAIS" (55 chars)
**Pattern:** pattern-full-bleed-dark (max 60 chars) ✓ Fits!
**Adapted:** "MARKETING DIGITAL MUDOU COMPLETAMENTE E NÃO VOLTA MAIS"
**Typography:** `title_size: "var(--cover-title-size)"` (64-76px clamp)

### Example 2: Title WAY Too Long

**Original:** "A TRANSFORMAÇÃO COMPLETA DO MARKETING DIGITAL MODERNO E SUAS IMPLICAÇÕES" (72 chars)
**Pattern:** pattern-split-layout (max 65 chars) ✗ Too long!
**Adapted:** "TRANSFORMAÇÃO DO MARKETING DIGITAL MODERNO" (43 chars)
**Core message preserved:** "transformação do marketing digital" ✓
**Typography:** `title_size: "var(--content-title-size)"` (48-56px clamp)

### Example 3: Subtitle Too Short (Needs Expansion)

**Original subtitle:** "Mude agora" (10 chars)
**Pattern:** pattern-text-boxes-photo (min 70 chars, max 180 chars)
**Adapted:** "Mude agora e comece a ver resultados reais em 30 dias. Sua audiência está esperando por conteúdo autêntico e transparente." (122 chars)
**Typography:** `subtitle_size: "var(--carousel-text-base)"` (22-26px clamp)

### Example 4: Subtitle Perfect Length

**Original:** "78% das empresas ainda fazem do jeito antigo e perdem dinheiro todos os dias sem perceber" (91 chars)
**Pattern:** pattern-full-bleed-dark (min 60, max 140 chars) ✓ Perfect!
**Adapted:** Same (no change needed)
**Typography:** `subtitle_size: "var(--content-subtitle-size)"` (22-26px clamp)

---

## Adaptation Principles

1. **NEVER change core message** - "Marketing mudou" stays "Marketing mudou"
2. **Fill available space** - If subtitle too short, ADD context (don't waste space!)
3. **Trim intelligently** - Remove fillers first, then non-essential details
4. **Font size auto-adjusts** - Longer text = smaller font (within range)
5. **Keep readability** - Never go below min font size for legibility

---

**Task Status:** ✅ Ready
**Version:** 1.0.0 (Intelligent Workflow - Adaptation After Mounting)
