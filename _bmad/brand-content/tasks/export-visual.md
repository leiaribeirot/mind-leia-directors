# Export Visual Task

**Task ID:** export-visual
**Agent:** export-specialist
**Elicit:** false
**Description:** Render HTML to PNG and generate variations

---

## Task Configuration

```yaml
task:
  name: Export Visual
  id: export-visual
  agent: export-specialist
  elicit: false
  timeout: 60s

inputs:
  - name: html_composition
    type: string
    required: true
    description: Complete HTML from layout-composer
  - name: format
    type: string
    required: false
    default: "png"
    description: png|jpeg
  - name: quality
    type: number
    required: false
    default: 100
    description: Export quality (1-100)

outputs:
  - name: main_file_path
    type: string
    description: Path to exported PNG
  - name: variations
    type: array
    description: Array of variation file paths
  - name: metadata_file
    type: string
    description: JSON metadata file path
```

---

## Execution Steps

### Step 1: Render HTML to Image
```python
# Using Puppeteer/Playwright
async def render(html):
    browser = await launch()
    page = await browser.new_page()
    await page.set_viewport_size(width=1080, height=1920)
    await page.set_content(html)
    await page.wait_for_selector('body')

    screenshot = await page.screenshot(type='png', full_page=True)
    await browser.close()
    return screenshot
```

### Step 2: Save Main Export
```python
timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
filename = f"story-{timestamp}.png"
filepath = f"output/stories/{filename}"

write_file(filepath, screenshot_buffer)
```

### Step 3: Generate 4 Variations
```python
variations = []

# V1: Original (copy)
copy_file(filepath, f"{filepath_base}-v1.png")

# V2: Text bottom instead of top
html_v2 = modify_text_position(html, position="bottom")
render_and_save(html_v2, f"{filepath_base}-v2.png")

# V3: Headline emphasis (+20% size)
html_v3 = emphasize_headline(html, scale=1.2)
render_and_save(html_v3, f"{filepath_base}-v3.png")

# V4: Alternative color (blue accent)
html_v4 = swap_color(html, accent="#3498DB")
render_and_save(html_v4, f"{filepath_base}-v4.png")
```

### Step 4: Save Metadata
```json
{
  "timestamp": "2025-10-02T14:30:22Z",
  "main_file": "output/stories/story-20251002-143022.png",
  "variations": ["...-v1.png", "...-v2.png", "...-v3.png", "...-v4.png"],
  "template": "pessoal-intimo",
  "copy": {...},
  "total_render_time": "8.2s"
}
```

### Step 5: Return Paths
```json
{
  "main_file_path": "output/stories/story-20251002-143022.png",
  "variations": [
    "output/stories/story-20251002-143022-v1.png",
    "output/stories/story-20251002-143022-v2.png",
    "output/stories/story-20251002-143022-v3.png",
    "output/stories/story-20251002-143022-v4.png"
  ],
  "metadata_file": "output/stories/story-20251002-143022.json"
}
```

---

**Task Status:** ✅ Ready
**Version:** 1.0.0 (MVP - Simplified)
