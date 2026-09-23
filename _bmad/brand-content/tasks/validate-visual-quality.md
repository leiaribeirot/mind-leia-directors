# Validate Visual Quality

```yaml
task:
  name: Validate Visual Quality
  id: validate-visual-quality
  agent: visual-qa-specialist
  version: 1.0.0
  elicit: false  # automated task
  timeout: 30000  # 30 seconds

description: |
  Valida visualmente um Instagram Story PNG usando Claude Vision API.
  Verifica technical compliance, craft quality, e narrative quality.
  Retorna decision estruturada: APPROVE / REJECT / APPROVE_WITH_NOTES.

inputs:
  exported_png_path:
    type: string
    required: true
    description: "Absolute path to exported PNG file"
    example: "./output/stories/story-20251002-1634.png"

  metadata:
    type: object
    required: false
    description: "Metadata from export step (pattern, dimensions, etc)"

  pattern_used:
    type: string
    required: false
    description: "Pattern used (full-bleed-dark, narrative-blocks, etc)"

  attempt_number:
    type: integer
    required: true
    default: 1
    description: "Current attempt number (1 or 2)"

outputs:
  decision:
    type: string
    enum: ["APPROVE", "REJECT", "APPROVE_WITH_NOTES"]
    description: "Final validation decision"

  validation_report:
    type: object
    description: "Complete validation report with scores"

  suggestions:
    type: array
    description: "Actionable suggestions if rejected"

execution:
  step_1_load_image:
    description: "Load and validate PNG file exists"

    actions:
      - name: "Check file exists"
        code: |
          const fs = require('fs');
          const path = require('path');

          if (!fs.existsSync(exported_png_path)) {
            throw new Error(`PNG file not found: ${exported_png_path}`);
          }

          const stats = fs.statSync(exported_png_path);
          if (stats.size === 0) {
            throw new Error(`PNG file is empty: ${exported_png_path}`);
          }

          console.log(`✓ PNG file loaded: ${path.basename(exported_png_path)} (${Math.round(stats.size / 1024)}KB)`);

      - name: "Read image as base64"
        code: |
          const imageBuffer = fs.readFileSync(exported_png_path);
          const imageBase64 = imageBuffer.toString('base64');

    output: ${image_data}

  step_2_analyze_with_claude_vision:
    description: "Analyze PNG with Claude Vision API"

    prompt_template: |
      Você é Maya, Visual QA Specialist. Analise este Instagram Story PNG com rigor crítico.

      **CONTEXTO:**
      - Pattern usado: {{pattern_used}}
      - Tentativa: {{attempt_number}} de 2
      - Este story deve parecer NATIVO do Instagram, feito à mão, não template genérico

      **INSTRUÇÕES DE ANÁLISE:**

      ## 1. TECHNICAL VALIDATION (CRITICAL - Auto-reject if fail)

      ### Dimensions Check
      - Dimensões devem ser EXATAMENTE 1080x1920 pixels
      - Aspect ratio deve ser EXATAMENTE 9:16 (0.5625)
      - Se diferente: REJECT imediatamente

      ### Safe Zones Check
      - Top 20% (384px do topo): deve estar CLEAR de texto crítico
      - Bottom 20% (384px do fundo): deve estar CLEAR de texto crítico
      - Motivo: Instagram UI sobrepõe essas áreas
      - Se violado: REJECT imediatamente

      ### Contrast Check
      - Texto deve ter contrast ratio > 4.5:1 com background (WCAG AA)
      - Preferível: > 7:1 (WCAG AAA)
      - Se legibilidade ruim: REJECT imediatamente

      ### HTML Escaped Check (CRÍTICO)
      - **VERIFICAR SE HÁ HTML ESCAPADO VISÍVEL** no texto
      - Procurar por: `&lt;`, `&gt;`, `&quot;`, `&#x3D;`, `<span`, `<strong>`, `<br>` etc.
      - Se encontrar HTML literal no texto: **REJECT IMEDIATAMENTE**
      - Motivo: HTML deve ser RENDERIZADO, não aparecer como código
      - Exemplos de REJEIÇÃO:
        - "Texto com &lt;strong&gt;palavra&lt;/strong&gt;" ❌
        - "Destaque <span class=\"highlight\">amarelo</span>" ❌
        - "Quebra <br> de linha" ❌

      ## 2. CRAFT QUALITY VALIDATION (Score 0-100 cada)

      ### Artisanal Feel (target: 85+)
      Pergunta: "Parece feito à mão por designer humano?"

      Score alto (85-100) se:
      - Não parece template genérico
      - Tem variações sutis (line breaks estratégicos, spacing customizado)
      - Tipografia não é robótica
      - Elementos posicionados com "eye", não grid perfeito

      Score baixo (0-70) se:
      - Parece template automático
      - Tudo muito simétrico/perfeito/rígido
      - Falta "human touch"

      ### Native Instagram Feel (target: 90+)
      Pergunta: "Parece story nativo orgânico de criador?"

      Score alto (90-100) se:
      - Estética moderna do Instagram (clean, minimal)
      - Não parece propaganda corporativa
      - Usuário não perceberia que foi gerado por IA
      - Segue tendências visuais atuais (grayscale, system fonts, accent colors)

      Score baixo (0-75) se:
      - Parece ad genérico
      - Estética datada ou corporativa
      - "Cheira" a gerado por máquina

      ### Typography Hierarchy (target: 90+)
      Pergunta: "Hierarquia tipográfica é clara?"

      Score alto (90-100) se:
      - Máximo 3 níveis de hierarquia
      - Diferenciação clara (size, weight, color)
      - Fácil identificar headline → body → detail

      Score baixo (0-70) se:
      - Tudo mesmo tamanho/peso
      - Mais de 3 níveis (confuso)
      - Hierarquia não óbvia

      ### Spacing Quality (target: 85+)
      Pergunta: "Spacing é respirável, não apertado?"

      Score alto (85-100) se:
      - Line height adequado (1.3-1.6)
      - Padding generoso (não grudado nas bordas)
      - Gaps visíveis entre elementos
      - Respira, não sufoca

      Score baixo (0-65) se:
      - Texto apertado (line-height < 1.2)
      - Pouco padding
      - Elementos muito próximos

      ### Visual Balance (target: 85+)
      Pergunta: "Composição é balanceada?"

      Score alto (85-100) se:
      - Texto e imagem não competem
      - Peso visual distribuído
      - Olho não é puxado só pra um lado

      Score baixo (0-70) se:
      - Muito pesado em um lado
      - Texto sobrepõe imagem importante
      - Desequilíbrio óbvio

      ## 3. NARRATIVE QUALITY VALIDATION (Pass/Fail)

      ### Text Density
      - Ideal: 2-5 linhas de texto por slide
      - Se < 2 linhas: muito vazio (fail)
      - Se > 5 linhas: muito denso (fail)

      ### Readability (3s rule)
      - Deve ser legível em 3 segundos
      - Estimativa: 150-300 caracteres ideal
      - Se muito texto: fail

      ### Emphasis Strategic
      - Bold: 10-20% do texto (não mais)
      - Highlights: 1-2 por story (não mais)
      - Se exagerado: fail

      **DECISION LOGIC:**

      IF technical_validation tem QUALQUER falha crítica:
        → REJECT (critical)

      ELIF craft_quality média < 85 E attempt_number < 2:
        → REJECT (craft quality - retry possível)

      ELIF craft_quality média >= 70 E attempt_number >= 2:
        → APPROVE_WITH_NOTES (atingiu max attempts, quality aceitável)

      ELSE:
        → APPROVE (tudo passou!)

      **OUTPUT JSON:**

      Return APENAS JSON válido (sem markdown, sem explicações fora do JSON):

      {
        "technical_validation": {
          "pass": true/false,
          "issues": ["issue description if any"],
          "details": {
            "dimensions": {
              "width": number,
              "height": number,
              "correct": true/false
            },
            "safe_zones": {
              "top_clear": true/false,
              "bottom_clear": true/false
            },
            "contrast": {
              "ratio_estimate": "4.5:1" or "insufficient",
              "pass": true/false
            }
          }
        },
        "craft_validation": {
          "pass": true/false,
          "overall_score": number (0-100, média dos 5 scores),
          "artisanal_score": number (0-100),
          "native_feel_score": number (0-100),
          "typography_score": number (0-100),
          "spacing_score": number (0-100),
          "balance_score": number (0-100),
          "issues": ["specific issue if score < target"]
        },
        "narrative_validation": {
          "pass": true/false,
          "issues": ["issue if any"],
          "details": {
            "density": {"lines_count": number, "pass": true/false},
            "readability": {"estimated_chars": number, "pass": true/false},
            "emphasis": {"bold_usage": "appropriate/excessive", "pass": true/false}
          }
        },
        "overall_decision": "APPROVE" | "REJECT" | "APPROVE_WITH_NOTES",
        "reasoning": "Clear 2-3 sentence explanation of decision",
        "suggestions_if_reject": [
          {
            "suggestion": "Specific actionable improvement",
            "priority": "critical" | "high" | "medium",
            "how_to_fix": "Exact steps to fix"
          }
        ],
        "metadata": {
          "attempt_number": {{attempt_number}},
          "pattern_validated": "{{pattern_used}}",
          "validation_timestamp": "ISO timestamp"
        }
      }

      **IMPORTANTE:**
      - Seja crítica mas justa
      - Scores devem ser honestos (não infle artificialmente)
      - Suggestions devem ser ESPECÍFICAS e ACIONÁVEIS
      - Se aprovar, explique POR QUÊ merece aprovação
      - Se rejeitar, dê caminho claro para melhorar

    actions:
      - name: "Call Claude Vision API"
        code: |
          const Anthropic = require('@anthropic-ai/sdk');
          const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
          });

          const startTime = Date.now();

          const message = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 4000,
            messages: [{
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: imageBase64
                  }
                },
                {
                  type: "text",
                  text: promptTemplate
                    .replace(/\{\{pattern_used\}\}/g, pattern_used || 'unknown')
                    .replace(/\{\{attempt_number\}\}/g, attempt_number)
                }
              ]
            }]
          });

          const visionTime = Date.now() - startTime;
          console.log(`✓ Claude Vision analysis completed in ${visionTime}ms`);

          const responseText = message.content[0].text;

      - name: "Parse JSON response"
        code: |
          // Extract JSON from response (handle markdown code blocks)
          let jsonText = responseText;

          // Remove markdown code blocks if present
          const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
                           responseText.match(/```\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1];
          }

          let validationReport;
          try {
            validationReport = JSON.parse(jsonText);
          } catch (error) {
            console.error('Failed to parse Claude Vision response as JSON');
            console.error('Response:', responseText);
            throw new Error(`Invalid JSON response from Claude Vision: ${error.message}`);
          }

          // Add metadata
          validationReport.metadata = {
            ...validationReport.metadata,
            validation_timestamp: new Date().toISOString(),
            total_validation_time_ms: Date.now() - startTime
          };

    output: ${validation_report}

  step_3_make_decision:
    description: "Process validation report and make final decision"

    actions:
      - name: "Extract decision"
        code: |
          const decision = validationReport.overall_decision;
          const suggestions = validationReport.suggestions_if_reject || [];

          console.log(`\n${'='.repeat(60)}`);
          console.log(`VISUAL QA DECISION: ${decision}`);
          console.log(`${'='.repeat(60)}`);

          if (decision === 'APPROVE') {
            console.log('✅ Story APPROVED');
            console.log(`Craft Quality: ${validationReport.craft_validation.overall_score}/100`);
            console.log(`Native Feel: ${validationReport.craft_validation.native_feel_score}/100`);
            console.log(`\nReasoning: ${validationReport.reasoning}`);
          }
          else if (decision === 'REJECT') {
            console.log('❌ Story REJECTED');
            console.log(`\nReasoning: ${validationReport.reasoning}`);
            console.log(`\nSuggestions (${suggestions.length}):`);
            suggestions.forEach((s, i) => {
              console.log(`  ${i+1}. [${s.priority.toUpperCase()}] ${s.suggestion}`);
              console.log(`     → ${s.how_to_fix}`);
            });
          }
          else if (decision === 'APPROVE_WITH_NOTES') {
            console.log('⚠️  Story APPROVED WITH NOTES (max attempts reached)');
            console.log(`Craft Quality: ${validationReport.craft_validation.overall_score}/100`);
            console.log(`\nReasoning: ${validationReport.reasoning}`);
          }

          console.log(`${'='.repeat(60)}\n`);

      - name: "Validate decision format"
        code: |
          const validDecisions = ['APPROVE', 'REJECT', 'APPROVE_WITH_NOTES'];
          if (!validDecisions.includes(decision)) {
            throw new Error(`Invalid decision: ${decision}. Must be one of: ${validDecisions.join(', ')}`);
          }

          // Ensure suggestions exist if rejected
          if (decision === 'REJECT' && suggestions.length === 0) {
            console.warn('⚠️  REJECT decision but no suggestions provided');
          }

    output: ${final_decision}

  step_4_return:
    description: "Return structured output"

    output:
      decision: ${decision}
      validation_report: ${validationReport}
      suggestions: ${suggestions}

error_handling:
  file_not_found:
    message: "PNG file not found"
    action: "Throw error with file path"

  api_error:
    message: "Claude Vision API error"
    action: "Retry up to 3 times with exponential backoff"
    retry_delays: [1000, 3000, 5000]

  invalid_json:
    message: "Failed to parse validation response"
    action: "Log raw response and throw error"

  timeout:
    message: "Validation timeout (30s)"
    action: "Throw error - may need to increase timeout"

performance:
  target_time: "< 10s"
  breakdown:
    image_load: "< 100ms"
    claude_vision: "< 5s"
    decision_logic: "< 100ms"

  monitoring:
    log_execution_time: true
    log_decision: true
    log_scores: true

examples:
  example_1_approve:
    input:
      exported_png_path: "./output/html/lei-do-fogo-01.png"
      pattern_used: "full-bleed-dark"
      attempt_number: 1

    expected_output:
      decision: "APPROVE"
      validation_report:
        technical_validation:
          pass: true
        craft_validation:
          overall_score: 92
          artisanal_score: 90
          native_feel_score: 95
        overall_decision: "APPROVE"
        reasoning: "Excellent craft quality. Grayscale aesthetic with accent color creates authentic Instagram feel."

  example_2_reject_critical:
    input:
      exported_png_path: "./test/wrong-dimensions.png"
      pattern_used: "test"
      attempt_number: 1

    expected_output:
      decision: "REJECT"
      validation_report:
        technical_validation:
          pass: false
          issues: ["Dimensions are 1080x1080 (should be 1080x1920)"]
        overall_decision: "REJECT"
        reasoning: "Critical failure: Wrong dimensions."
        suggestions_if_reject:
          - suggestion: "Ensure body has width: 1080px and height: 1920px"
            priority: "critical"

  example_3_reject_craft:
    input:
      exported_png_path: "./test/template-feel.png"
      pattern_used: "test"
      attempt_number: 1

    expected_output:
      decision: "REJECT"
      validation_report:
        technical_validation:
          pass: true
        craft_validation:
          overall_score: 72
          artisanal_score: 68
        overall_decision: "REJECT"
        reasoning: "Technical OK but feels template-y. Needs craft refinements."

notes:
  - "This task is critical for quality assurance"
  - "Uses Claude Vision (claude-3-5-sonnet-20241022) for analysis"
  - "Returns structured decision for workflow to handle"
  - "Suggestions must be specific and actionable"
  - "Max 30s timeout to prevent workflow stalls"
```

## 🧪 Testing

### Unit Test
```bash
# Test with existing lei-do-fogo PNG
arcadia task validate-visual-quality --input exported_png_path="./output/html/lei-do-fogo-01.png" pattern_used="full-bleed-dark" attempt_number=1
```

### Expected: APPROVE (craft quality high)

### Integration Test
```bash
# Test with intentionally bad dimensions
arcadia task validate-visual-quality --input exported_png_path="./test/bad-dimensions.png" attempt_number=1
```

### Expected: REJECT (critical - dimensions)

---

**Task Status:** ✅ Ready for execution
**Owner:** Visual QA System
**Last Updated:** 2025-10-02
