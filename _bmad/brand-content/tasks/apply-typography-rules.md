---
task:
  id: apply-typography-rules
  title: Apply Advanced Typography Transformations
  category: ads
  agent: typography-specialist
  elicit: false

inputs:
  - name: headline
    type: string
    required: true
    max_length: 60

  - name: body
    type: string
    required: true
    max_length: 150

  - name: cta
    type: string
    required: true
    max_length: 25

  - name: style
    type: string
    required: false
    default: "creative"
    options: [creative, conservative, bold]

steps:
  - step: 1
    action: Activate Typography Specialist
    agent_command: *transform

  - step: 2
    action: Apply mixed case transformations
    process:
      - Identify brand keywords (IA, Lendária, etc.)
      - Apply creative capitalization
      - Generate positions array
    output: Transformed headline

  - step: 3
    action: Apply bold emphasis to body
    process:
      - Identify numbers
      - Identify value propositions
      - Apply strategic bold (max 30% of text)
    output: Transformed body with **bold** markers

  - step: 4
    action: Generate hierarchy specifications
    output:
      headline: { font_size: "42px", font_weight: "700" }
      body: { font_size: "24px", font_weight: "400" }
      cta: { font_size: "28px", font_weight: "700" }

outputs:
  - name: typography_spec
    type: object
    format: JSON
    schema:
      headline:
        text: string
        font_size: string
        font_weight: string
        mixed_case_positions: array
      body:
        text: string
        font_size: string
        font_weight: string
        bold_phrases: array
      cta:
        text: string
        font_size: string
        font_weight: string

error_handling:
  - error: headline_too_long
    recovery: Truncate to 60 characters with ellipsis

  - error: excessive_bold
    recovery: Reduce bold phrases to < 30% of text

examples:
  - description: Creative typography for event ad
    inputs:
      headline: "Comunidade Lendária de IA"
      body: "Aprenda IA em 3 horas com expert"
      cta: "Quero participar"
      style: "creative"
    expected_output:
      headline:
        text: "Comunidade LendárI[IA]"
        font_size: "42px"
        font_weight: "700"
        mixed_case_positions: [11, 14, 15, 16, 17]
      body:
        text: "Aprenda IA em **3 horas** com expert"
        font_size: "24px"
        font_weight: "400"
        bold_phrases: ["3 horas"]
      cta:
        text: "Quero participar"
        font_size: "28px"
        font_weight: "700"
---

# Task: Apply Advanced Typography Transformations

## Purpose

Transform ad copy (headline, body, CTA) using advanced typography techniques from the Typography Specialist agent (Sofia). Applies mixed case, bold emphasis, and hierarchy specifications.

## When to Use

- After `craft-ad-copy` task completes
- Before `design-ad-layout` task
- When you need sophisticated typography for Stories Ads

## Workflow

### Step 1: Activate Typography Specialist
Call Typography Specialist agent (Sofia) with *transform command.

### Step 2: Apply Mixed Case Transformations
Identify brand keywords and apply creative capitalization:
- **"Lendária"** → **"LendárI[IA]"**
- **"Inteligência Artificial"** → **"I[IA]"**
- **"Comunidade"** → **"CoMunidade"**

Returns positions array for highlighting specific characters.

### Step 3: Apply Bold Emphasis
Identify and bold key phrases in body text:
- **Numbers**: "apenas **50 vagas**"
- **Value props**: "**dominar IA** na prática"
- **Key benefits**: "**3 horas** para criar"

Maximum 30% of text can be bolded to avoid over-emphasis.

### Step 4: Generate Hierarchy Specifications
Define font sizes and weights per ad standards:
- **Headline**: 42px, bold (700)
- **Body**: 24px, regular (400)
- **CTA**: 28px, bold (700)

## Integration

**Called by**: Ad orchestration workflow
**Calls**: Typography Specialist agent (Story 010.1)
**Outputs to**: `design-ad-layout`

## Example Execution

```javascript
const typography = await executeTask('apply-typography-rules', {
  headline: "Comunidade Lendária de IA",
  body: "Aprenda a dominar IA em apenas 3 horas intensivas",
  cta: "Garanta sua vaga!",
  style: "creative"
});

console.log(typography);
// {
//   headline: {
//     text: "Comunidade LendárI[IA]",
//     font_size: "42px",
//     font_weight: "700",
//     mixed_case_positions: [11, 14, 15, 16, 17]
//   },
//   body: {
//     text: "Aprenda a **dominar IA** em apenas **3 horas** intensivas",
//     font_size: "24px",
//     font_weight: "400",
//     bold_phrases: ["dominar IA", "3 horas"]
//   },
//   cta: {
//     text: "Garanta sua vaga!",
//     font_size: "28px",
//     font_weight: "700"
//   }
// }
```

## Typography Rules Reference

### Mixed Case Keywords
- **IA**: Uppercase always
- **Lendária**: LendárI[IA]
- **Artificial**: I[A]
- **Comunidade**: CoMunidade (optional)

### Bold Heuristics
- Numbers (1-999)
- Time expressions (3 horas, 2 dias)
- Value phrases (dominar, transformar, criar)
- Scarcity (apenas, limitado, exclusivo)

### Hierarchy Standards
```css
.ad-headline { font-size: 42px; font-weight: 700; line-height: 1.2; }
.ad-body { font-size: 24px; font-weight: 400; line-height: 1.5; }
.ad-cta { font-size: 28px; font-weight: 700; }
```
