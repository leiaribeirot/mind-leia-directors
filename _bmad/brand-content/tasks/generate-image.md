# Generate Image Task

**Task ID:** generate-image
**Agent:** image-curator
**Elicit:** false
**Description:** Generate AI image with DALL-E based on copy context

---

## Task Configuration

```yaml
task:
  name: Generate Image
  id: generate-image
  agent: image-curator
  elicit: false
  timeout: 30s

inputs:
  - name: copy_context
    type: object
    required: true
    description: {headline, body} from optimized copy
  - name: tone
    type: string
    required: true
    description: Tone from copywriter
  - name: consistency_context
    type: object
    required: false
    description: Visual consistency guidelines for multi-story sequences
    fields:
      palette: array of HEX colors
      previous_images: array of image paths from previous stories
      base_style: string (e.g., "cinematic editorial photography")
      mood_target: string (specific mood for this story)
      sequence_position: string (e.g., "2 of 4")

outputs:
  - name: generated_image_path
    type: string
    description: Path to generated image file
  - name: mood
    type: string
    description: Mood of generated image
  - name: prompt_used
    type: string
    description: DALL-E prompt for reference
  - name: safe_zones
    type: object
    description: Visual analysis of where text can safely be placed
    fields:
      grid_analysis: "3x3 grid showing visual density (0-100%) in each zone"
      recommended_text_positions: array of zones safe for text (e.g., ["top-left", "center", "bottom-right"])
      image_concentration: string (e.g., "center-right", "bottom-full", "diagonal-left")
      dominant_colors: array of HEX colors for text contrast
      suggested_overlays: array (e.g., ["dark-gradient-bottom", "none", "light-blur-top"])
```

---

## Execution Steps

### Step 1: Map Tone → Visual Style
```python
style_map = {
    "pessoal": "close-up portrait, natural lighting, warm tones, casual selfie style",
    "authority": "dramatic historical scene, epic composition, cinematic lighting",
    "educacional": "clean minimal background, geometric shapes, soft gradients",
    "narrativo": "atmospheric urban or nature scene, bokeh, cinematic depth of field"
}

visual_style = style_map[tone]
```

### Step 2: Extract Visual Keywords from Copy
```python
# Analyze headline + body for visual cues
keywords = extract_visual_keywords(copy_context)
# Example: "newsletter sobre IA" → ["technology", "modern", "professional"]
```

### Step 3: Craft DALL-E Prompt

```python
# Base prompt
prompt_parts = [
    f"Professional photography, {visual_style}.",
    f"Subject: {keywords joined}.",
    "High resolution, detailed, 8k quality.",
    "Instagram story format (9:16 vertical)."
]

# Add consistency context if provided (multi-story sequence)
if consistency_context:
    palette_colors = ", ".join(consistency_context.palette)

    prompt_parts.extend([
        f"Style: {consistency_context.base_style}.",
        f"Mood: {consistency_context.mood_target}.",
        f"Color palette: {palette_colors}.",
        "Maintain visual consistency with previous images in the sequence.",
        f"This is story {consistency_context.sequence_position} in a narrative sequence."
    ])

    # If previous images exist, reference their style
    if consistency_context.previous_images:
        prompt_parts.append(
            "Continue the established visual language: dramatic lighting, cohesive composition, unified theme."
        )

prompt = "\n".join(prompt_parts)

# Example WITH consistency (Story 2 of 4):
# "Professional photography, vibrant educational style.
#  Subject: three types of fire - campfire, forge, ashes.
#  High resolution, detailed, 8k quality.
#  Instagram story format (9:16 vertical).
#  Style: cinematic editorial photography.
#  Mood: vibrant educational.
#  Color palette: #FF6B35, #1A1A1A, #F7931E.
#  Maintain visual consistency with previous images in the sequence.
#  This is story 2 of 4 in a narrative sequence.
#  Continue the established visual language: dramatic lighting, cohesive composition, fire theme."
```

### Step 4: Call DALL-E API
```python
response = await openai.images.generate(
    model="dall-e-3",
    prompt=prompt,
    size="1024x1792",  # Closest to 9:16
    quality="hd",
    n=1
)

image_url = response.data[0].url
```

### Step 5: Download and Save
```python
image_data = download(image_url)
timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
filename = f"generated-{timestamp}.png"
filepath = f"assets/generated/{filename}"

write_file(filepath, image_data)
```

### Step 6: Analyze Safe Zones with Claude Vision
```python
# Read generated image
image_data = read_base64(filepath)

# Call Claude Vision to analyze safe zones
vision_prompt = """
Analyze this Instagram carousel image (1080x1080px) for text placement.

Divide into 3x3 grid and rate each zone's visual density (0-100%):
- 0% = empty/clean (SAFE for text)
- 100% = visually busy (AVOID text)

Return JSON:
{
  "grid_analysis": {
    "top_left": 20,
    "top_center": 80,
    "top_right": 15,
    "middle_left": 40,
    "center": 90,
    "middle_right": 35,
    "bottom_left": 10,
    "bottom_center": 5,
    "bottom_right": 60
  },
  "recommended_text_positions": ["top-left", "top-right", "bottom-left", "bottom-center"],
  "image_concentration": "center",
  "dominant_colors": ["#1A1A1A", "#F7931E", "#FFFFFF"],
  "suggested_overlays": ["dark-gradient-bottom", "none"]
}
"""

safe_zones = await claude_vision_analyze(image_data, vision_prompt)
```

### Step 7: Return Complete Analysis
```json
{
  "generated_image_path": "assets/generated/generated-20251002-143022.png",
  "mood": "casual",
  "prompt_used": "Close-up portrait, natural lighting...",
  "safe_zones": {
    "grid_analysis": {
      "top_left": 20,
      "top_center": 80,
      "top_right": 15,
      "middle_left": 40,
      "center": 90,
      "middle_right": 35,
      "bottom_left": 10,
      "bottom_center": 5,
      "bottom_right": 60
    },
    "recommended_text_positions": ["top-left", "top-right", "bottom-left", "bottom-center"],
    "image_concentration": "center",
    "dominant_colors": ["#1A1A1A", "#F7931E", "#FFFFFF"],
    "suggested_overlays": ["dark-gradient-bottom"]
  }
}
```

---

## Error Handling

**API Error:**
```
RETRY: 2 attempts
IF fail → USE placeholder image from assets/samples/
LOG: "Failed to generate image, using placeholder"
```

---

**Task Status:** ✅ Ready
**Version:** 1.0.0 (MVP - Simplified)
