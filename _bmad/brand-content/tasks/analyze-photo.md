# Analyze Photo Task

**Task ID:** analyze-photo
**Agent:** image-curator
**Elicit:** true
**Description:** Analyze photo to detect mood, safe zones, contrast, and quality

---

## Task Configuration

```yaml
task:
  name: Analyze Photo
  id: analyze-photo
  agent: image-curator
  elicit: true
  timeout: 45s

inputs:
  - name: photo_path
    type: string
    required: true
    description: Path to photo file (absolute or relative)

outputs:
  - name: mood
    type: string
    description: casual|profissional|atmosférico|editorial
  - name: safe_zones
    type: object
    description: 3x3 grid with SAFE/UNSAFE zones
  - name: quality_score
    type: number
    description: 0-100 quality rating
  - name: contrast
    type: object
    description: Contrast analysis for text overlay
  - name: recommendations
    type: object
    description: Text position, overlay, colors
```

---

## Execution Steps

### Step 1: Elicit Photo Path
```
PROMPT: "Cole o caminho (path) da foto que você quer usar:"
ACCEPT: photo_path
VALIDATE: File exists
IF not exists → OFFER fallback: "Posso gerar uma imagem com IA. Quer tentar?"
```

### Step 2: Load and Analyze with Vision API
```python
# Use Claude Vision ou GPT-4 Vision
response = await claude_vision.analyze(
    image_path=photo_path,
    prompt="""
    Analise esta foto e retorne JSON com:

    1. mood: casual|profissional|atmosférico|editorial
       - casual: selfie, iluminação natural, informal
       - profissional: studio, traje formal, composição controlada
       - atmosférico: dramático, bokeh, cinematográfico
       - editorial: alta produção, conceitual, artístico

    2. safe_zones: Grid 3x3 identificando áreas seguras para texto
       [["SAFE", "UNSAFE (face)", "SAFE"], ...]
       - UNSAFE se: faces, elementos importantes, objetos
       - SAFE se: céu, áreas vazias, backgrounds uniformes

    3. quality_score: 0-100
       - Fatores: resolução, nitidez, exposição, composição

    4. contrast:
       - level: high|medium|low (>80%, 50-80%, <50%)
       - recommended_text_color: white|black
       - recommended_overlay: rgba(0,0,0,X) ou "none"

    5. composition:
       - subject: descrição do elemento principal
       - dominant_colors: array de hex codes
       - recommended_text_position: top-third|center|bottom-third
    """
)
```

### Step 3: Return Structured Output
```json
{
  "mood": "casual",
  "quality_score": 88,
  "safe_zones": {
    "grid_3x3": [
      ["SAFE", "UNSAFE (face)", "SAFE"],
      ["SAFE", "UNSAFE (face)", "SAFE"],
      ["SAFE", "SAFE", "SAFE"]
    ],
    "recommended_text_position": "top-third",
    "recommended_overlay": "rgba(0,0,0,0.35)"
  },
  "contrast": {
    "level": "medium",
    "percentage": 65,
    "recommended_text_color": "white"
  },
  "composition": {
    "subject": "person close-up portrait",
    "dominant_colors": ["#2C3E50", "#ECF0F1"],
    "lighting": "soft natural light"
  }
}
```

---

## Error Handling

**File not found:**
```
OFFER: "Foto não encontrada. Posso gerar uma imagem com DALL-E baseada na sua copy. Quer?"
IF yes → REDIRECT to generate-image.md task
IF no → RE-ELICIT path
```

**API Error:**
```
RETRY: 3 attempts with 2s delay
IF all fail → RETURN default analysis:
  mood="casual", quality_score=70, safe_zones=all SAFE, recommend manual review
```

---

**Task Status:** ✅ Ready
**Version:** 1.0.0 (MVP - Simplified)
