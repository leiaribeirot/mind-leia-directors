# Select Template Task

**Task ID:** select-template
**Agent:** template-selector
**Elicit:** false
**Description:** Match copy tone and image mood to perfect template with customizations

---

## Task Configuration

```yaml
task:
  name: Select Template
  id: select-template
  agent: template-selector
  elicit: false
  timeout: 10s

inputs:
  - name: tone
    type: string
    required: true
    description: From copywriter (pessoal|authority|educacional|narrativo)
  - name: mood
    type: string
    required: true
    description: From image-curator (casual|profissional|atmosférico|editorial)
  - name: content_type
    type: string
    required: true
    description: story|feed

outputs:
  - name: template_choice
    type: string
    description: Template filename (e.g., "pessoal-intimo.html")
  - name: customizations
    type: object
    description: CSS variables and adjustments
  - name: confidence
    type: number
    description: 0-100 confidence score
```

---

## Execution Steps

### Step 1: Primary Match (Tone → Template)
```python
template_map = {
    "pessoal": "pessoal-intimo.html",
    "authority": "authority-intelectual.html",
    "educacional": "educacional-framework.html",
    "narrativo": "narrativo-reflexivo.html"
}

template_choice = template_map[tone]
confidence = 95  # High confidence on tone match
```

### Step 2: Validate Mood Compatibility
```python
# Mood validation adjusts confidence
compatibility = {
    "pessoal-intimo": ["casual", "profissional"],
    "authority-intelectual": ["editorial", "atmosférico"],
    "educacional-framework": ["any"],  # No photo
    "narrativo-reflexivo": ["atmosférico"]
}

if mood not in compatibility[template_choice]:
    confidence -= 20  # Still use but warn
    warnings.append(f"Mood '{mood}' não ideal para template '{template_choice}'")
```

### Step 3: Generate Customizations
```python
customizations = {
    "overlay_opacity": calculate_overlay(contrast_level),
    "accent_color": select_accent_color(dominant_colors),
    "text_alignment": recommend_alignment(safe_zones),
    "font_weights": adjust_weights(quality_score)
}

# Example logic:
def calculate_overlay(contrast):
    if contrast == "high": return 0
    elif contrast == "medium": return 0.3
    else: return 0.5

def select_accent_color(colors):
    if "warm" in colors: return "#FF6B35"  # Orange
    elif "cool" in colors: return "#3498DB"  # Blue
    else: return "#F7B731"  # Yellow
```

### Step 4: Return Selection
```json
{
  "template_choice": "pessoal-intimo",
  "confidence": 95,
  "reasoning": "Tone 'pessoal' + mood 'casual' = perfect match",
  "customizations": {
    "overlay_opacity": 0.4,
    "accent_color": "#FF6B35",
    "text_alignment": "center",
    "text_position": "top-third"
  },
  "warnings": []
}
```

---

**Task Status:** ✅ Ready
**Version:** 1.0.0 (MVP - Simplified)
