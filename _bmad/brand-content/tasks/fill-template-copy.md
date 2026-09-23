# Fill Template Copy Task

**Task ID:** fill-template-copy
**Agent:** copywriter
**Elicit:** false
**Description:** Fills template with OPTIMIZED copy - uses ALL available space effectively

---

## Task Configuration

```yaml
task:
  name: Fill Template Copy
  id: fill-template-copy
  agent: copywriter
  elicit: false
  timeout: 20s

inputs:
  - name: original_content
    type: object
    required: true
    fields:
      title: string
      subtitle: string (optional)
      body: string (optional)

  - name: selected_template
    type: string
    required: true
    description: Template name (determines space available)

  - name: slide_position
    type: number
    required: true

  - name: total_slides
    type: number
    required: true

outputs:
  - name: optimized_title
    type: string
    description: Title optimized for template space

  - name: optimized_subtitle
    type: string or null
    description: Subtitle - MUST use available space (multiple sentences OK)

  - name: typography
    type: object
    fields:
      title_size: string (px)
      title_weight: number
      title_line_height: number
      subtitle_size: string (px)
      subtitle_weight: number
      subtitle_line_height: number
```

---

## Your Role

You are **Jordan**, Senior Copywriter.

**Your job:** FILL the template zones with impactful copy that uses **ALL available space**.

**CRITICAL RULES:**
1. **DON'T waste space** - If subtitle zone exists, USE IT FULLY
2. **Multiple sentences OK** - 2-3 sentences in subtitle is GOOD
3. **Expand short content** - Add context, detail, emphasis
4. **Hierarchy matters** - Title = core message, Subtitle = supporting detail

---

## Template Space Guide

```python
template_capacities = {
    "image-background-overlay": {
        "title_chars": "30-60",  # 1-2 lines, large font
        "subtitle_chars": "60-120",  # 2-3 lines, medium font
        "title_size": "72-96px",
        "subtitle_size": "28-36px"
    },
    "text-top-image-bottom": {
        "title_chars": "35-65",  # 2 lines max
        "subtitle_chars": "80-150",  # 3-4 lines available!
        "title_size": "64-84px",
        "subtitle_size": "26-32px"
    },
    "image-top-text-bottom": {
        "title_chars": "40-70",  # 2 lines
        "subtitle_chars": "80-140",  # 3 lines
        "title_size": "64-82px",
        "subtitle_size": "28-34px"
    },
    "split-vertical": {
        "title_chars": "30-55",  # Narrower column
        "subtitle_chars": "70-130",  # 4-5 lines possible
        "title_size": "56-76px",
        "subtitle_size": "24-30px"
    },
    "split-diagonal": {
        "title_chars": "30-55",
        "subtitle_chars": "65-120",
        "title_size": "58-78px",
        "subtitle_size": "24-30px"
    }
}
```

---

## Copy Optimization Process

### Step 1: Get Template Capacity

```python
capacity = template_capacities[selected_template]

title_target = capacity["title_chars"].split("-")  # e.g., ["30", "60"]
subtitle_target = capacity["subtitle_chars"].split("-")  # e.g., ["80", "150"]

# We want to AIM HIGH (use more space, not less)
title_ideal = int(title_target[1]) * 0.7  # 70% of max
subtitle_ideal = int(subtitle_target[1]) * 0.7  # 70% of max
```

### Step 2: Optimize Title

```python
original_title = original_content.title
original_length = len(original_title)

if original_length < title_ideal * 0.5:
    # TOO SHORT - expand with emphasis
    if slide_position == 1:
        # Cover slide - make it punchy and bold
        optimized_title = original_title.upper()  # Add emphasis
    else:
        # Add context
        optimized_title = original_title + " [contextual addition based on subtitle]"

elif original_length > int(title_target[1]):
    # TOO LONG - condense to essentials
    optimized_title = condense(original_title, int(title_target[1]))

else:
    # GOOD LENGTH - polish
    optimized_title = original_title

# Calculate font size (longer text = smaller font)
title_length = len(optimized_title)
size_range = capacity["title_size"].split("-")
min_size = int(size_range[0].replace("px", ""))
max_size = int(size_range[1].replace("px", ""))

# If title is short, use larger font. If long, use smaller font.
size_ratio = 1 - (title_length / int(title_target[1]))
title_size = min_size + int((max_size - min_size) * size_ratio)
```

### Step 3: Optimize Subtitle (CRITICAL - USE SPACE!)

```python
original_subtitle = original_content.subtitle or original_content.body or ""
original_sub_length = len(original_subtitle)

# IMPORTANT: We have 80-150 chars available - USE THEM!
if original_sub_length < subtitle_ideal:
    # EXPAND to fill space
    expanded = original_subtitle

    # Add detail from body if available
    if original_content.body and original_content.body != original_subtitle:
        additional_context = original_content.body[:100]
        expanded += ". " + additional_context

    # Still too short? Add emphasis or rephrasing
    if len(expanded) < subtitle_ideal:
        # Add more context or rephrase for clarity
        expanded = rephrase_for_detail(expanded, target_length=subtitle_ideal)

    optimized_subtitle = expanded[:int(subtitle_target[1])]  # Cap at max

elif original_sub_length > int(subtitle_target[1]):
    # TOO LONG - trim
    optimized_subtitle = condense(original_subtitle, int(subtitle_target[1]))

else:
    # GOOD LENGTH
    optimized_subtitle = original_subtitle

# Calculate font size
subtitle_length = len(optimized_subtitle)
sub_size_range = capacity["subtitle_size"].split("-")
sub_min = int(sub_size_range[0].replace("px", ""))
sub_max = int(sub_size_range[1].replace("px", ""))

size_ratio = 1 - (subtitle_length / int(subtitle_target[1]))
subtitle_size = sub_min + int((sub_max - sub_min) * size_ratio)
```

### Step 4: Return Optimized Copy

```json
{
  "optimized_title": "MARKETING DIGITAL MUDOU PARA SEMPRE",
  "optimized_subtitle": "78% das empresas ainda fazem do jeito antigo e perdem dinheiro todos os dias. A nova era exige conteúdo que educa, transparência total e comunidade antes de vendas.",
  "typography": {
    "title_size": "78px",
    "title_weight": 800,
    "title_line_height": 1.1,
    "subtitle_size": "30px",
    "subtitle_weight": 400,
    "subtitle_line_height": 1.4
  }
}
```

---

## Examples

### Example 1: Short Content → Expand

**Input:**
```
title: "Eduque"
subtitle: "Não venda"
template: "text-top-image-bottom"
capacity: 35-65 title chars, 80-150 subtitle chars
```

**Output:**
```
optimized_title: "EDUQUE, NÃO SÓ VENDA"  (25 chars - good)
optimized_subtitle: "A nova era do marketing digital exige conteúdo que educa sua audiência primeiro. Transparência total nos processos e resultados constrói confiança antes da conversão."  (145 chars - USES SPACE!)
```

### Example 2: Good Length → Polish

**Input:**
```
title: "Marketing digital mudou"
subtitle: "78% das empresas ainda fazem do jeito antigo"
template: "image-background-overlay"
capacity: 30-60 title, 60-120 subtitle
```

**Output:**
```
optimized_title: "MARKETING DIGITAL MUDOU"  (23 chars)
optimized_subtitle: "78% das empresas ainda fazem do jeito antigo e perdem dinheiro. A nova era exige autenticidade e comunidade."  (110 chars - FILLS SPACE!)
```

### Example 3: Too Long → Condense

**Input:**
```
title: "A transformação completa do marketing digital moderno e suas implicações"
subtitle: "..."
template: "split-vertical"
capacity: 30-55 title
```

**Output:**
```
optimized_title: "TRANSFORMAÇÃO DO MARKETING DIGITAL"  (38 chars - condensed)
```

---

## Quality Principles

1. **USE ALL SPACE** - Don't leave subtitle zones empty
2. **Multiple sentences = GOOD** - 2-3 sentences in subtitle is professional
3. **Hierarchy** - Title bold/large, subtitle detailed/smaller
4. **Expand short content** - Add context, not fluff
5. **Typography scales** - Longer text = slightly smaller font (automatic)

---

**Task Status:** ✅ Ready
**Version:** 3.0.0 (Space-Filling Copy Optimization)
