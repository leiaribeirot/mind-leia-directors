# Compose Layout Task

**Task ID:** compose-layout
**Agent:** layout-composer
**Elicit:** false
**Description:** Assemble final HTML/CSS composition from template, copy, and image

---

## Task Configuration

```yaml
task:
  name: Compose Layout
  id: compose-layout
  agent: layout-composer
  elicit: false
  timeout: 15s

inputs:
  - name: optimized_copy
    type: object
    required: true
    description: {headline, body, cta} from copywriter
  - name: image_analysis
    type: object
    required: true
    description: Image data from curator
  - name: template_choice
    type: string
    required: true
    description: Template filename
  - name: customizations
    type: object
    required: true
    description: CSS variables from selector

outputs:
  - name: html_composition
    type: string
    description: Complete HTML with inline CSS
  - name: metadata
    type: object
    description: Dimensions, fonts, adjustments made
```

---

## Execution Steps

### Step 1: Load Template
```python
template_path = f".arcadia-core/templates/{template_choice}"
template_html = read_file(template_path)
```

### Step 2: Inject Copy
```python
html = template_html
html = html.replace("{{headline}}", optimized_copy['headline'])
html = html.replace("{{body}}", optimized_copy['body'])
html = html.replace("{{cta}}", optimized_copy['cta'])
```

### Step 3: Inject Image & Customizations
```python
html = html.replace("{{image_path}}", image_analysis['source_path'])
html = html.replace("{{overlay_opacity}}", customizations['overlay_opacity'])
html = html.replace("{{accent_color}}", customizations['accent_color'])
# etc...
```

### Step 4: Auto-Adjust Font Sizes
```python
# If text too long, reduce font-size
headline_length = len(optimized_copy['headline'])
if headline_length > 50:
    font_size = 36  # Smaller
elif headline_length > 30:
    font_size = 42  # Medium
else:
    font_size = 48  # Default

html = html.replace("{{headline_font_size}}", f"{font_size}px")
```

### Step 5: Return Composition
```json
{
  "html_composition": "<!DOCTYPE html><html>...",
  "metadata": {
    "dimensions": "1080x1920",
    "template": "pessoal-intimo",
    "fonts_used": ["Playfair Display"],
    "filesize_estimate": "12KB",
    "adjustments_made": [
      "Reduced headline to 42px (text length: 45 chars)"
    ]
  }
}
```

---

**Task Status:** ✅ Ready
**Version:** 1.0.0 (MVP - Simplified)
