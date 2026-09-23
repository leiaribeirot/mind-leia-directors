# Render Carousel HTML Task

**Task ID:** render-carousel-html
**Agent:** craft-specialist
**Elicit:** false
**Description:** GENERATES dynamic HTML/CSS from layout design specs (NO TEMPLATES)

---

## Task Configuration

```yaml
task:
  name: Render Carousel HTML
  id: render-carousel-html
  agent: craft-specialist
  elicit: false
  timeout: 20s

inputs:
  - name: layout_design
    type: object
    required: true
    description: Complete layout specs from Creative Director

  - name: optimized_copy
    type: object
    required: true
    description: Crafted copy from Copywriter

  - name: image_path
    type: string
    required: true
    description: Path to generated image (relative)

outputs:
  - name: html_code
    type: string
    description: Complete HTML document ready to render
```

---

## Your Role

You are **Taylor**, Senior Front-End Developer specializing in pixel-perfect Instagram content.

**Your job:** GENERATE clean, production-ready HTML/CSS from design specs.

**NO TEMPLATES** - you write code from scratch based on what Creative Director and Copywriter decided.

---

## HTML Generation Process

### Step 1: Build Base Structure

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1080">
  <title>Carousel Slide</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: 1080px;
      height: 1080px;
      overflow: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      position: relative;
    }

    .slide-container {
      width: 100%;
      height: 100%;
      position: relative;
    }
  </style>
</head>
<body>
  <div class="slide-container">
    <!-- DYNAMIC CONTENT GOES HERE -->
  </div>
</body>
</html>
```

### Step 2: Generate Image Layer

```python
image_treatment = layout_design.image_treatment

# Build image CSS
image_css = f"""
.image-layer {{
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}}

.image-layer img {{
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  filter: {image_treatment.get('filter', 'none')};
  {f'clip-path: {image_treatment["clip_path"]};' if image_treatment.get('clip_path') != 'none' else ''}
}}

.image-layer::after {{
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: {image_treatment.get('overlay', 'none')};
  z-index: 2;
}}
"""

# Build image HTML
image_html = f"""
<div class="image-layer">
  <img src="{image_path}" alt="Visual">
</div>
"""
```

### Step 3: Generate Text Zones

```python
text_zones_css = ""
text_zones_html = ""

for i, zone in enumerate(layout_design.text_zones):
    zone_id = f"text-zone-{i}"
    element = zone["element"]  # "title" or "subtitle"

    # Get copy and typography
    if element == "title":
        content = optimized_copy.title
        typography = optimized_copy.title_typography
    else:
        content = optimized_copy.subtitle
        typography = optimized_copy.subtitle_typography

    if not content:
        continue

    # Extract position
    pos = zone["position"]
    top = pos.get("top", "auto")
    left = pos.get("left", "auto")
    width = pos.get("width", "auto")
    bottom = pos.get("bottom", "auto")
    right = pos.get("right", "auto")

    # Build zone CSS
    text_zones_css += f"""
.{zone_id} {{
  position: absolute;
  top: {top};
  left: {left};
  width: {width};
  {f'bottom: {bottom};' if bottom != 'auto' else ''}
  {f'right: {right};' if right != 'auto' else ''}
  z-index: 10;

  color: {zone.get('color', '#FFFFFF')};
  background: {zone.get('background', 'none')};
  padding: {zone.get('padding', '0')};

  font-size: {typography['font_size']};
  font-weight: {typography['font_weight']};
  line-height: {typography['line_height']};
  letter-spacing: {typography.get('letter_spacing', '0em')};
  text-align: {zone.get('alignment', 'left')};
  {f'text-transform: {typography.get("text_transform", "none")};' if typography.get('text_transform') != 'none' else ''}
  {f'text-shadow: {zone.get("text_shadow", "none")};' if zone.get('text_shadow') else ''}

  display: flex;
  flex-direction: column;
  justify-content: center;
}}
"""

    # Handle line breaks
    if "line_breaks" in typography and typography["line_breaks"]:
        # Use explicit line breaks
        lines_html = "<br>".join(typography["line_breaks"])
        text_zones_html += f'<div class="{zone_id}">{lines_html}</div>\n'
    else:
        # No explicit breaks
        text_zones_html += f'<div class="{zone_id}">{content}</div>\n'
```

### Step 4: Add Brand Element (Optional)

```python
# Only add brand if layout has space (not for heavy text compositions)
if layout_design.composition_type not in ["text-bottom-zone-full", "text-left-column-full"]:
    brand_css = """
.brand {{
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;

  font-size: 18px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.05em;
}}
"""

    brand_html = '<div class="brand">@seuperfil</div>'
else:
    brand_css = ""
    brand_html = ""
```

### Step 5: Assemble Complete HTML

```python
complete_html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1080">
  <title>Carousel Slide</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {{
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }}

    body {{
      width: 1080px;
      height: 1080px;
      overflow: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      position: relative;
      background: #000000;
    }}

    .slide-container {{
      width: 100%;
      height: 100%;
      position: relative;
    }}

    {image_css}

    {text_zones_css}

    {brand_css}
  </style>
</head>
<body>
  <div class="slide-container">
    {image_html}

    {text_zones_html}

    {brand_html}
  </div>
</body>
</html>
"""

return {
    "html_code": complete_html
}
```

---

## Example Output

### Input Specs:
```json
{
  "layout_design": {
    "composition_type": "text-bottom-zone",
    "text_zones": [
      {
        "element": "title",
        "position": {"top": "55%", "left": "5%", "width": "90%"},
        "alignment": "left",
        "color": "#FFFFFF",
        "background": "rgba(0,0,0,0.85)",
        "padding": "40px"
      },
      {
        "element": "subtitle",
        "position": {"top": "calc(55% + 140px)", "left": "5%", "width": "90%"},
        "alignment": "left",
        "color": "rgba(255,255,255,0.9)",
        "background": "rgba(0,0,0,0.85)",
        "padding": "40px 40px 60px 40px"
      }
    ],
    "image_treatment": {
      "overlay": "none",
      "clip_path": "polygon(0 0, 100% 0, 100% 55%, 0 55%)",
      "filter": "brightness(1) contrast(1.05)"
    }
  },
  "optimized_copy": {
    "title": "MARKETING DIGITAL\nMUDOU PARA SEMPRE",
    "title_typography": {
      "font_size": "76px",
      "font_weight": 800,
      "line_height": 1.1,
      "text_transform": "uppercase",
      "line_breaks": ["MARKETING DIGITAL", "MUDOU PARA SEMPRE"]
    },
    "subtitle": "78% das empresas ainda fazem do jeito antigo e perdem dinheiro",
    "subtitle_typography": {
      "font_size": "32px",
      "font_weight": 400,
      "line_height": 1.4
    }
  },
  "image_path": "generated-2025-10-03.png"
}
```

### Generated HTML:
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1080">
  <title>Carousel Slide</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: 1080px;
      height: 1080px;
      overflow: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      position: relative;
      background: #000000;
    }

    .slide-container {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .image-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .image-layer img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      filter: brightness(1) contrast(1.05);
      clip-path: polygon(0 0, 100% 0, 100% 55%, 0 55%);
    }

    .text-zone-0 {
      position: absolute;
      top: 55%;
      left: 5%;
      width: 90%;
      z-index: 10;

      color: #FFFFFF;
      background: rgba(0,0,0,0.85);
      padding: 40px;

      font-size: 76px;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.02em;
      text-align: left;
      text-transform: uppercase;

      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .text-zone-1 {
      position: absolute;
      top: calc(55% + 140px);
      left: 5%;
      width: 90%;
      z-index: 10;

      color: rgba(255,255,255,0.9);
      background: rgba(0,0,0,0.85);
      padding: 40px 40px 60px 40px;

      font-size: 32px;
      font-weight: 400;
      line-height: 1.4;
      letter-spacing: 0em;
      text-align: left;

      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .brand {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;

      font-size: 18px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.8);
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="slide-container">
    <div class="image-layer">
      <img src="generated-2025-10-03.png" alt="Visual">
    </div>

    <div class="text-zone-0">MARKETING DIGITAL<br>MUDOU PARA SEMPRE</div>

    <div class="text-zone-1">78% das empresas ainda fazem do jeito antigo e perdem dinheiro</div>

    <div class="brand">@seuperfil</div>
  </div>
</body>
</html>
```

---

## Code Principles

1. **Absolute positioning**: All elements positioned absolutely for pixel-perfect control
2. **Z-index layers**: Image (1) → Overlay (2) → Text (10) → Brand (20)
3. **Flexbox for text**: Use flex for vertical centering within zones
4. **Web fonts**: Always load Inter from Google Fonts
5. **Clean CSS**: No unused classes, inline critical styles only
6. **Responsive units**: Use % for layout, px for typography
7. **Color formats**: RGBA for transparency, HEX for solid colors

---

**Task Status:** ✅ Ready
**Version:** 2.0.0 (Dynamic HTML Generation)
