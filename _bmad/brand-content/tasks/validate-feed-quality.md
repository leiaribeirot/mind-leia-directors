# Task: Validate Feed Quality

```yaml
task:
  name: Validate Feed Post Quality
  id: validate-feed-quality
  agent: visual-qa-feed-specialist
  description: "Valida qualidade visual de feed post 4:5 usando Claude Vision API"
  timeout: 30000

inputs:
  exported_jpg_path:
    type: string
    required: true
    description: "Caminho absoluto do JPG gerado (1080x1350)"

  metadata:
    type: object
    required: false
    description: "Metadata do post (template usado, configs)"

  template_used:
    type: string
    required: false
    description: "Template ID (01-06)"

  attempt_number:
    type: integer
    required: false
    default: 1
    description: "Número da tentativa (para retry logic)"

outputs:
  decision:
    type: string
    enum: ["APPROVE", "REJECT", "APPROVE_WITH_NOTES"]
    description: "Decisão do QA"

  validation_report:
    type: object
    description: "Report completo com scores"

  suggestions:
    type: array
    description: "Sugestões de melhoria (se REJECT)"

execution:
  step_1_load_jpg:
    description: "Carrega JPG do disco"
    code: |
      const fs = require('fs');
      const path = require('path');

      if (!fs.existsSync(exported_jpg_path)) {
        throw new Error(`JPG not found: ${exported_jpg_path}`);
      }

      const stats = fs.statSync(exported_jpg_path);
      console.log(`✓ JPG loaded: ${Math.round(stats.size / 1024)}KB`);

  step_2_analyze_with_claude_vision:
    description: "Analisa com Claude Vision API"
    code: |
      const { getVisionAPI } = require('../utils/vision-api.js');
      const visionAPI = getVisionAPI();

      const prompt = `
      Você é Maya, Visual QA Specialist para Instagram Feed Posts (4:5).

      Analise este feed post JPG (1080x1350px) com rigor crítico editorial.

      ## 1. TECHNICAL VALIDATION (CRITICAL)
      - Dimensions: 1080x1350px exact?
      - Safe zones: 40px all sides?
      - Contrast: > 4.5:1?

      ## 2. CRAFT QUALITY (Score 0-100)
      - Editorial feel: 85+ (professional, not amateur)
      - Artisanal feel: 85+ (handmade, not template)
      - Typography balance: 90+ (3 levels clear)
      - Spacing quality: 85+ (breathable)
      - Visual harmony: 85+ (colors/fonts harmonious)

      ## 3. NARRATIVE QUALITY
      - Text density: 5-10 lines ideal
      - Readability: 10-15s
      - Emphasis: strategic

      Return JSON:
      {
        "technical_validation": {...},
        "craft_validation": {
          "overall_score": number,
          "editorial_feel_score": number,
          "artisanal_score": number,
          "typography_balance_score": number,
          "spacing_quality_score": number,
          "visual_harmony_score": number
        },
        "narrative_validation": {...},
        "overall_decision": "APPROVE|REJECT",
        "reasoning": "...",
        "suggestions_if_reject": [...]
      }
      `;

      const result = await visionAPI.analyzeImage(exported_jpg_path, prompt);
      const parsed = visionAPI.parseJSON(result.text);

      validation_report = parsed;

  step_3_make_decision:
    description: "Decide APPROVE/REJECT/APPROVE_WITH_NOTES"
    code: |
      const technical_pass = validation_report.technical_validation.pass;
      const craft_score = validation_report.craft_validation.overall_score;
      const narrative_pass = validation_report.narrative_validation.pass;

      let decision;

      if (!technical_pass) {
        decision = "REJECT";
        console.log("❌ REJECT: Technical validation failed");
      } else if (craft_score >= 85 && narrative_pass) {
        decision = "APPROVE";
        console.log(`✅ APPROVE: Craft ${craft_score}/100, all checks pass`);
      } else if (craft_score >= 70 && attempt_number < 2) {
        decision = "REJECT";
        console.log(`🔄 REJECT: Craft ${craft_score}/100, retry possible`);
      } else if (craft_score >= 70 && attempt_number >= 2) {
        decision = "APPROVE_WITH_NOTES";
        console.log(`⚠️ APPROVE_WITH_NOTES: Max attempts, craft ${craft_score}/100`);
      } else {
        decision = "REJECT";
        console.log(`❌ REJECT: Craft ${craft_score}/100, below minimum`);
      }

      return {
        decision,
        validation_report,
        suggestions: validation_report.suggestions_if_reject || []
      };
```

---

**Task Status:** ✅ Complete
**Reuses:** vision-api.js utility (from stories)
**Performance:** ~5-10s per feed post
