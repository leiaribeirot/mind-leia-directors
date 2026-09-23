# Task: Generate Taypuri Ad Image

**Purpose:** Generate a custom Taypuri portrait image for Instagram ads using Gemini Imagen 4, following the Tech+Ancestral aesthetic and maintaining facial identity consistency.

## When to Use This Task

- Brand is `taypuri`
- Generating a new ad (not using library photo)
- Need a custom portrait with specific mood/scene alignment

## Input Context Required

```json
{
  "ad_brief": {
    "primary_message": "String - Main message of the ad",
    "key_benefit": "String - Primary value proposition",
    "emotion_tone": "String - Target emotional response (e.g., 'reflection + hope', 'urgency + conviction')",
    "objective": "String - Campaign goal (conversion|awareness|engagement)",
    "urgency_level": "String - low|medium|high"
  },
  "brand_config": {
    "id": "taypuri",
    "colors": {
      "primary": "#000000",
      "accent": "#8dc75e"
    }
  },
  "output_dir": "String - Directory to save generated image"
}
```

## Task Steps

### Step 1: Call Photo Director Agent

Call `taypuri-photo-director` agent with ad context to generate optimized Imagen prompt.

**Agent Input:**
```json
{
  "ad_context": {
    "primary_message": "{{ad_brief.primary_message}}",
    "emotion_tone": "{{ad_brief.emotion_tone}}",
    "objective": "{{ad_brief.objective}}",
    "urgency_level": "{{ad_brief.urgency_level}}"
  }
}
```

**Expected Agent Output:**
```json
{
  "imagen_prompt": "Complete Gemini Imagen prompt",
  "scene_selected": "visionary-speaker|architect-ideas|cyber-ritual",
  "palette_selected": "cyber-green|warmshift|neo-noir|bi-color",
  "aspect_ratio": "9:16",
  "reasoning": "Why this combination was chosen"
}
```

### Step 2: Generate Image with Gemini Imagen

Use the `imagen_prompt` from Step 1 to generate image via Gemini Imagen 4 API.

**API Configuration:**
- Model: `imagen-4.0-generate-001` (Gemini Imagen 4)
- Aspect Ratio: `9:16`
- Output Format: PNG
- Safety Settings: Default (allow artistic content)

**Error Handling:**
- If Imagen API fails → retry once after 2s
- If retry fails → return error with context
- Log generation metadata (prompt used, timestamp, model version)

### Step 3: Save Generated Image

Save image to output directory with metadata:

**Filename:** `taypuri-ad-image-{timestamp}.png`

**Metadata File:** `taypuri-ad-image-{timestamp}-metadata.json`
```json
{
  "generated_at": "ISO timestamp",
  "model": "imagen-4.0-generate-001",
  "prompt": "Full prompt used",
  "scene": "Scene option selected",
  "palette": "Color palette selected",
  "aspect_ratio": "9:16",
  "file_size_mb": 0.0,
  "dimensions": {
    "width": 1080,
    "height": 1920
  }
}
```

### Step 4: Return Image Info

Return structured response for orchestrator:

```json
{
  "success": true,
  "image_path": "full/path/to/taypuri-ad-image-{timestamp}.png",
  "image_url": "file:///full/path/to/taypuri-ad-image-{timestamp}.png",
  "metadata": {
    "scene": "visionary-speaker",
    "palette": "cyber-green",
    "generation_time_ms": 4500
  },
  "prompt_used": "Full Imagen prompt for reference"
}
```

## Success Criteria

✅ Image generated with correct 9:16 aspect ratio
✅ Bottom 40-45% has dark void for copy overlay
✅ Face features match Taypuri identity (as per Face DNA)
✅ Neck tattoo is visible and prominent
✅ Selected palette matches ad emotional tone
✅ Image saved with metadata for audit trail
✅ Response includes usable image path/URL

## Error Cases

- **Imagen API Error:** Return error with last known working config
- **Prompt Generation Failed:** Fallback to default "Architect of Ideas + Cyber-Green"
- **File Save Error:** Log error but continue (image in memory can still be used)

## Integration Notes

This task is called from `orchestrate-ad-arcadia.js` in the `planAdVisual()` method when:
1. `brand_id === 'taypuri'`
2. `use_dalle === false` (we want generated image, not library)
3. No suitable library match found OR explicitly generating new image

## Example Usage

```javascript
const result = await executeTask('generate-taypuri-ad-image', {
  ad_brief: {
    primary_message: "Feeling empty despite success? Reclaim your life.",
    key_benefit: "Redefine success and find meaning",
    emotion_tone: "reflection + hope",
    objective: "conversion",
    urgency_level: "medium"
  },
  brand_config: brandTaypuri,
  output_dir: "/path/to/output"
});

console.log(`Image generated: ${result.image_path}`);
```

---

**Performance Target:** < 8 seconds total (2s prompt generation + 5s Imagen API + 1s save)

**Cost:** ~$0.08 per image (Gemini Imagen pricing)
