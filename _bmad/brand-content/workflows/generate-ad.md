# Generate Instagram Stories Ad

**Workflow ID:** `generate-ad`
**Type:** Interactive Workflow
**Agent Team:** Instagram Content Creator
**Output:** Single Instagram Stories Ad (1080x1920px PNG)

---

## Description

Generate a single high-converting Instagram Stories Ad from a brief text file.

This workflow orchestrates multiple AI agents to:
1. Analyze your ad brief
2. Select optimal template
3. Create typography hierarchy
4. Design components (badge, CTA, etc.)
5. Validate quality (safe zones, CTA, typography)
6. Export final PNG

---

## Prerequisites

- ✅ Brief file (`.txt` or `.md`)
- ✅ Anthropic API key (Claude for agents)
- ✅ Optional: OpenAI API key (DALL-E for images)

---

## Usage

### Command
```bash
*workflow generate-ad
```

### Or Direct Script
```bash
node scripts/orchestrate-ad-arcadia.js <brief-file> [options]
```

---

## Elicitation (Interactive Mode)

The workflow will ask:

### 1. Brief File Path
**Prompt:** "Path to your ad brief file:"
**Example:** `content/lendaria-launch-brief.txt`

### 2. Brand Selection
**Prompt:** "Select your brand:"
**Options:** (auto-detected from `ateliers/carousel/config/brands/`)
- `creator` - Creator / LendárIA
- `academia-lendaria` - Academia LendárIA
- (other configured brands)

### 3. Template Selection
**Prompt:** "Select ad template:"
**Options:**
- `ad-06-badge-headline-cta` - Badge + Headline + Body + CTA (most versatile)
- `ad-07-stats-impact` - Stats-focused (social proof)
- `ad-08-testimonial` - Customer testimonial

### 4. Visual Theme
**Prompt:** "Select visual theme:"
**Options:**
- `corporativo-elegante` (default) - Professional, gold accents
- `minimalist` - Clean, modern
- `bold` - High contrast, attention-grabbing

### 5. CTA Text
**Prompt:** "Enter CTA button text (max 25 chars):"
**Examples:**
- "Garanta sua vaga!"
- "Quero participar!"
- "Comece agora"

**Validation:** Max 25 characters, action verb recommended

### 6. Use DALL-E Images?
**Prompt:** "Generate images with DALL-E? (recommended for no-photo campaigns)"
**Options:**
- `yes` - Generate AI images (costs ~$0.04-0.08 per image)
- `no` - Use existing images or solid backgrounds (faster, free)

---

## Execution Steps

### Step 1: Analyze Brief (5s)
**Agent:** Creative Director (Elena)
**Task:** `analyze-ad-brief`
**Output:** `brief-analysis.json`

Extracts:
- Key messages
- Headlines
- Value propositions
- Emotional hooks

### Step 2: Plan Layout (10s)
**Agent:** Layout Composer (Elena)
**Task:** `design-ad-layout`
**Output:** `layout-spec.json`

Creates:
- Component positioning
- Visual hierarchy
- Safe zone compliance

### Step 3: Typography (5s)
**Agent:** Typography Specialist (Marcus)
**Task:** `create-ad-typography`
**Output:** `typography-spec.json`

Defines:
- Font sizes (18-48px range)
- Font weights (400, 600, 700)
- Line heights (1.1-1.6)
- Character limits

### Step 4: Design Components (15s)
**Agents:** Creative Director + Typography Specialist
**Tasks:**
- `design-badge-component`
- `design-cta-component`
- `design-text-components`

**Output:** Component specs

Creates:
- Badge pill (top 280px)
- CTA button (300px from bottom, 280x56px)
- Headline, body, stat text

### Step 5: Render HTML (5s)
**Agent:** Craft Specialist (Viktor)
**Task:** `render-ad-html`
**Output:** `ad.html`

Renders final HTML with all components

### Step 6: Validate Quality (10s)
**Agent:** Visual QA Specialist (Taylor)
**Task:** `validate-ad-quality`
**Output:** `qa-validation-report.json`

Validates against 3 checklists:
1. **Typography** - Sizes, weights, readability
2. **CTA** - Contrast, size, action verbs
3. **Safe Zones** - Top/bottom clearance (250px)

**Quality Gates:**
- ❌ **Critical violations:** Blocks export
- ⚠️ **High violations:** Warning, manual review
- ℹ️ **Medium violations:** Info only

### Step 7: Export PNG (10s)
**Agent:** Export Specialist (Chen)
**Task:** `export-ad-png`
**Output:** `ad.png` (1080x1920px)

Exports final PNG using Puppeteer

---

## Output Structure

```
output/ad-{brief-name}-{timestamp}/
├── ad.html                      # Rendered HTML
├── ad.png                       # Final PNG (1080x1920) ✨
├── ad-spec.json                 # Complete ad specification
├── brief-analysis.json          # Brief analysis
├── layout-spec.json             # Layout specification
├── typography-spec.json         # Typography specification
├── badge-component.json         # Badge component spec
├── cta-component.json           # CTA component spec
├── text-components.json         # Text components
└── qa-validation-report.json   # Quality validation
```

---

## Examples

### Example 1: Simple Ad (No DALL-E)
```bash
*workflow generate-ad

# Prompts:
Brief path: content/workshop-promo.txt
Brand: creator
Template: ad-06-badge-headline-cta
Theme: corporativo-elegante
CTA: Garanta sua vaga!
Use DALL-E: no
```

**Output:** `output/ad-workshop-promo-2025-10-24/ad.png`

### Example 2: Stats Ad (With DALL-E)
```bash
*workflow generate-ad

# Prompts:
Brief path: content/results-campaign.txt
Brand: academia-lendaria
Template: ad-07-stats-impact
Theme: bold
CTA: Ver resultados
Use DALL-E: yes
```

**Output:** `output/ad-results-campaign-2025-10-24/ad.png`

### Example 3: Testimonial Ad
```bash
*workflow generate-ad

# Prompts:
Brief path: content/client-testimonial.txt
Brand: creator
Template: ad-08-testimonial
Theme: minimalist
CTA: Quero essa transformação
Use DALL-E: no
```

**Output:** `output/ad-client-testimonial-2025-10-24/ad.png`

---

## Non-Interactive Mode (CLI)

Skip elicitation with CLI flags:

```bash
node scripts/orchestrate-ad-arcadia.js \
  content/brief.txt \
  --brand=creator \
  --template=ad-06-badge-headline-cta \
  --theme=corporativo-elegante \
  --cta-text="Garanta agora!" \
  --use-dalle=false
```

---

## Validation Checklists

### Typography Checklist
✅ Font sizes 18-48px
✅ Font weights 400/600/700
✅ Line heights 1.1-1.6
✅ Character limits (headline 60, body 150, CTA 25)
✅ Contrast ratio ≥ 4.5:1 (WCAG AA)

### CTA Checklist
✅ Button size ≥ 280x44px
✅ Contrast ratio ≥ 4.5:1
✅ Action verb used (Garanta, Descubra, Participe, etc.)
✅ Position 300px+ from bottom (safe zone)
✅ Clear value proposition

### Safe Zones Checklist
✅ Top 250px clear (except badge at 280px)
✅ Bottom 250px clear (except CTA at 300px)
✅ All critical content within 250-1670px
✅ No overlapping elements

---

## Troubleshooting

### Issue: Template Not Found
**Error:** `Template ad-99 not found`
**Fix:** Use valid template IDs: `ad-06`, `ad-07`, `ad-08`

### Issue: CTA Too Long
**Error:** `CTA exceeds 25 characters`
**Fix:** Shorten CTA text (e.g., "Garanta sua vaga!" instead of "Garanta sua vaga agora mesmo!")

### Issue: Safe Zone Violation
**Error:** `Headline in top safe zone (< 250px)`
**Fix:** Auto-adjusted by system, or manually review layout

### Issue: Missing Brief File
**Error:** `Brief file not found: content/missing.txt`
**Fix:** Check file path is correct and file exists

---

## Related Workflows

- **`generate-batch-ads`** - Generate hundreds of ads from CSV/JSON
- **`generate-carousel`** - Generate Instagram carousel posts
- **`generate-story`** - Generate Instagram stories (non-ads)

---

## Performance

⏱️ **Average time:** ~60 seconds per ad

**Breakdown:**
- Brief analysis: 5s
- Layout planning: 10s
- Typography: 5s
- Components: 15s
- HTML rendering: 5s
- QA validation: 10s
- PNG export: 10s

---

## Best Practices

1. **Brief Quality** - Clear, concise briefs produce better ads
2. **CTA Action Verbs** - Use approved verbs (Garanta, Descubra, Comece)
3. **Character Limits** - Stay within limits to prevent text overflow
4. **Test Templates** - Try different templates for A/B testing
5. **Validate First** - Always review QA report before publishing

---

**Created:** 2025-10-24
**Story:** 010.10 - Batch Ad Generation System
**Version:** 1.0
