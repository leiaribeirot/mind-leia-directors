# Adapt Template with Safe Zones Task

**Task ID:** adapt-template-with-safezones
**Agent:** creative-director
**Elicit:** false
**Description:** Selects QUALITY template as base, then adapts colors/overlays based on image safe zones

---

## Task Configuration

```yaml
task:
  name: Adapt Template with Safe Zones
  id: adapt-template-with-safezones
  agent: creative-director
  elicit: false
  timeout: 30s

inputs:
  - name: slide_content
    type: object
    required: true
    fields:
      title: string
      subtitle: string (optional)
      type: string (cover | content | stat | list | cta)

  - name: safe_zones
    type: object
    required: true
    description: Safe zone analysis from Image Curator
    fields:
      grid_analysis: object
      recommended_text_positions: array
      image_concentration: string
      dominant_colors: array
      suggested_overlays: array

  - name: slide_position
    type: number
    required: true

  - name: total_slides
    type: number
    required: true

  - name: templates_already_used
    type: array
    required: false
    description: Templates used in previous slides for variety

outputs:
  - name: selected_template
    type: string
    description: Template name (e.g., "image-background-overlay", "text-top-image-bottom")

  - name: layout_adaptations
    type: object
    description: Adaptations based on safe zones
    fields:
      image_filter: string (e.g., "brightness(0.7) contrast(1.1)")
      overlay_gradient: string or null
      title_color: string (HEX)
      subtitle_color: string (HEX)
      background_color: string (HEX for text zones)
      text_shadow: string or null
      accent_color: string (HEX)

  - name: reasoning
    type: string
    description: Why this template + these adaptations work
```

---

## Your Role

You are **Alex**, Creative Director.

**Your job:**
1. **SELECT** a proven quality template (not create from scratch)
2. **ADAPT** colors, filters, overlays based on image safe zones
3. **ENSURE** text will be readable and impactful

**Templates are QUALITY STANDARDS** - they work! But you adapt them to each image.

---

## Process

### Step 1: Analyze Safe Zones

```python
safe_areas = [zone for zone, density in safe_zones.grid_analysis.items() if density < 30]
image_focus = safe_zones.image_concentration
dominant_colors = safe_zones.dominant_colors
```

### Step 2: Select Template (Quality Base)

```python
# Available templates (PROVEN quality):
templates = {
    "image-background-overlay": "Full image background, text overlays center/bottom with gradient",
    "text-top-image-bottom": "Text zone top 45%, image bottom 55%",
    "image-top-text-bottom": "Image top 60%, text zone bottom 40%",
    "split-vertical": "Image 50% right, text 50% left OR vice versa",
    "split-diagonal": "Diagonal split for dynamic look"
}

# Selection logic (same as before - choose template that fits content + position)
if slide_content.type == "cover":
    template = "image-background-overlay"  # Maximum impact
elif slide_content.type == "stat":
    if "top" in safe_areas:
        template = "text-top-image-bottom"  # Big number on top
    else:
        template = "image-top-text-bottom"  # Number at bottom
elif slide_content.type == "cta":
    template = "image-background-overlay"  # CTA needs full visual
else:
    # Content slides - choose based on safe zones
    if len(safe_areas) >= 4:
        template = "image-background-overlay"  # Lots of safe space, can overlay
    elif "bottom" in str(safe_areas):
        template = "image-top-text-bottom"  # Bottom is safe
    elif "top" in str(safe_areas):
        template = "text-top-image-bottom"  # Top is safe
    else:
        template = "split-vertical"  # Split if no clear safe zone

# Variety check
if templates_already_used and len(templates_already_used) >= 2:
    # After 2 slides, prefer different template
    if template in templates_already_used[-2:]:
        # Find alternative
        alternatives = [t for t in templates.keys() if t != template]
        template = alternatives[0]
```

### Step 3: Adapt Based on Safe Zones

```python
layout_adaptations = {}

# IMAGE ADAPTATIONS
# If image is too bright and text needs to overlay
if template in ["image-background-overlay", "image-top-text-bottom"]:
    avg_brightness = estimate_brightness(dominant_colors)

    if avg_brightness > 70:  # Bright image
        layout_adaptations["image_filter"] = "brightness(0.75) contrast(1.1)"  # Darken
        layout_adaptations["overlay_gradient"] = safe_zones.suggested_overlays[0]  # Use AI suggestion
    elif avg_brightness < 30:  # Dark image
        layout_adaptations["image_filter"] = "brightness(1.2) contrast(1.05)"  # Lighten
        layout_adaptations["overlay_gradient"] = "none"
    else:  # Medium
        layout_adaptations["image_filter"] = "brightness(1) contrast(1.05)"
        layout_adaptations["overlay_gradient"] = safe_zones.suggested_overlays[0]

# TEXT COLOR ADAPTATIONS
# Choose text color based on dominant image colors
if avg_brightness > 60:
    # Bright background → dark text OR strong overlay
    if layout_adaptations.get("overlay_gradient"):
        layout_adaptations["title_color"] = "#FFFFFF"  # White on dark overlay
        layout_adaptations["subtitle_color"] = "rgba(255,255,255,0.9)"
        layout_adaptations["text_shadow"] = "0 2px 8px rgba(0,0,0,0.6)"
    else:
        layout_adaptations["title_color"] = "#1A1A1A"  # Dark on bright
        layout_adaptations["subtitle_color"] = "#333333"
        layout_adaptations["text_shadow"] = "none"
else:
    # Dark background → light text
    layout_adaptations["title_color"] = "#FFFFFF"
    layout_adaptations["subtitle_color"] = "rgba(255,255,255,0.9)"
    layout_adaptations["text_shadow"] = "0 2px 8px rgba(0,0,0,0.4)"

# BACKGROUND COLOR (for text zones in split/zone templates)
if template in ["text-top-image-bottom", "split-vertical"]:
    # Text zone needs solid background
    if avg_brightness > 50:
        layout_adaptations["background_color"] = "#FFFFFF"  # White zone
        layout_adaptations["title_color"] = "#1A1A1A"
        layout_adaptations["subtitle_color"] = "#333333"
    else:
        layout_adaptations["background_color"] = "#1A1A1A"  # Dark zone
        layout_adaptations["title_color"] = "#FFFFFF"
        layout_adaptations["subtitle_color"] = "rgba(255,255,255,0.9)"

# ACCENT COLOR (from image dominant colors)
layout_adaptations["accent_color"] = dominant_colors[1] if len(dominant_colors) > 1 else "#FF0050"
```

### Step 4: Return Selection + Adaptations

```json
{
  "selected_template": "image-background-overlay",
  "layout_adaptations": {
    "image_filter": "brightness(0.75) contrast(1.1)",
    "overlay_gradient": "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)",
    "title_color": "#FFFFFF",
    "subtitle_color": "rgba(255,255,255,0.9)",
    "background_color": "#000000",
    "text_shadow": "0 2px 12px rgba(0,0,0,0.7)",
    "accent_color": "#FF0050"
  },
  "reasoning": "Cover slide needs maximum impact - full background overlay. Image is bright (avg 75%), so darkened with brightness(0.75) and added strong bottom gradient for text readability. White text with shadow on dark overlay ensures contrast. Template proven to work for covers."
}
```

---

## Quality Principles

1. **Templates = Quality Standards** - They work! Don't reinvent the wheel.
2. **Adapt = Smart AI** - Adjust colors/filters based on actual image
3. **Contrast = Readability** - Text MUST be readable (light on dark, dark on light)
4. **Variety = Engagement** - Don't use same template 3 times in a row
5. **Image Treatment = Professional** - Subtle filters (brightness 0.7-1.2, contrast 1.0-1.15)

---

**Task Status:** ✅ Ready
**Version:** 3.0.0 (Hybrid: Template Quality + Safe Zone Adaptation)
