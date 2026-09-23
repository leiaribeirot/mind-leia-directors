# Task: Plan Template Layout

**Agent:** template-strategist
**Version:** 1.0
**Story Reference:** 020.1

---

## Purpose

Analyze ad-01-hero-overlay as reference gold standard, document 5 layout strategies (A-E), create decision tree for layout selection, define typography hierarchy rules, and output comprehensive Template Strategy JSON.

---

## Inputs

**Required:**
- `template_objective` (object): Output from analyze-template-objective task
  - primary_goal
  - target_audience
  - emotional_tone
  - key_message
  - visual_metaphor

**Optional:**
- `layout_preferences` (string, optional): User preference for specific layout (A, B, C, D, E)
- `brand_context` (object, optional): Brand visual system constraints

---

## Process

### Step 1: Reference Analysis (ad-01-hero-overlay)

**Extract design principles from gold standard:**

```
TEMPLATE: ad-01-hero-overlay.html
LOCATION: ateliers/carousel/templates/stories-ads/

KEY PRINCIPLES LEARNED:
1. EXPERT PHOTO DOMINATES
   - Full 1080x1920 background
   - Professional photography = authority + trust
   - High-quality image essential

2. DARK OVERLAY FOR READABILITY
   - 40-50% opacity gradient
   - Transition: transparent 0-40% → black 85-100%
   - Ensures text legibility over any image

3. STRATEGIC TEXT POSITIONING
   - Title: upper-middle (384px from top)
   - Body: centered with perfect spacing
   - CTA button: 300px from bottom
   - Respects safe zones (250px top, 300px bottom)

4. TYPOGRAPHY HIERARCHY
   - Title: 42px bold (font-weight 700-800)
   - Body: 24px regular (font-weight 400)
   - CTA: 28px bold in button
   - Line heights: 1.2-1.5 for readability

5. HIGHLIGHT WORDS
   - Brand color (#FF6B35) for emphasis
   - Strategic bold on key phrases
   - Max 30% of text bolded

6. FULL SPACE UTILIZATION
   - Every pixel purposeful
   - Breathing room maintained
   - No cramming or waste

7. CLEAR ACTION PATH
   - Visual flow: image → title → body → CTA
   - CTA button impossible to miss
   - Single primary action

WHAT MAKES IT WORK:
- Positions expert as authority figure
- Creates trust through professional photography
- Directs attention to compelling offer
- Clear conversion path with prominent CTA
```

### Step 2: Layout Strategy Decision Tree

**Select optimal layout based on objective:**

```
DECISION TREE:

IF objective.primary_goal == "trust":
  IF image_available AND image_quality > 80:
    → STRATEGY A (full-bleed-overlay)
    REASONING: Trust requires human connection - professional photo with overlay
  ELSE:
    → STRATEGY D (text-focused)
    REASONING: No strong image = focus on message and credentials

ELSE IF objective.primary_goal == "conversion":
  IF objective.emotional_tone == "urgency":
    → STRATEGY D (text-focused)
    REASONING: Urgency requires bold, impossible-to-miss text
  ELSE IF product_showcase:
    → STRATEGY B (hero-top-text-bottom)
    REASONING: Product needs visual dominance in top section

ELSE IF objective.primary_goal == "education":
  IF data_heavy OR stats:
    → STRATEGY D (text-focused)
    REASONING: Educational content needs text prominence
  ELSE IF visual_demonstration:
    → STRATEGY B (hero-top-text-bottom)
    REASONING: Show and tell format

ELSE IF objective.visual_metaphor == "transformation":
  → STRATEGY C (split-50-50)
  REASONING: Before/after needs side-by-side comparison

ELSE IF objective.visual_metaphor == "social-proof":
  → STRATEGY A (full-bleed-overlay)
  REASONING: Testimonials need human face for authenticity

ELSE:
  → STRATEGY A (full-bleed-overlay)
  REASONING: Most versatile strategy for majority of cases
```

### Step 3: Define Layout Strategies (A-E)

**STRATEGY A: Full-Bleed Background + Overlay**
```yaml
name: "Full-Bleed Background + Overlay"
reference: "ad-01-hero-overlay"
use_case: "Expert authority, testimonials, high-trust content"
structure:
  background:
    image: "Full 1080x1920 background"
    position: "center"
    size: "cover"
  overlay:
    gradient: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,1) 100%)"
    opacity: "30-50%"
  content:
    positioning: "centered, overlaid on image"
    safe_zones:
      top: "250px minimum"
      bottom: "300px minimum"
  text:
    color: "white"
    alignment: "center"
typography:
  title:
    size: "48-72px"
    weight: "700-800"
    line_height: "0.95-1.1"
  body:
    size: "24-32px"
    weight: "400"
    line_height: "1.4-1.6"
  cta:
    size: "24-32px"
    weight: "700"
    style: "button"
best_for:
  - "Professional photos showcasing expertise"
  - "Expert positioning and authority building"
  - "High-quality photography backgrounds"
  - "Testimonials with human faces"
```

**STRATEGY B: Hero Image Top 60% + Text Bottom 40%**
```yaml
name: "Hero Image Top + Text Bottom"
use_case: "Product showcase, visual storytelling, before/after"
structure:
  image:
    position: "top"
    height: "60% (1152px)"
    overlay: "optional (0-20%)"
  text_area:
    position: "bottom"
    height: "40% (768px)"
    background: "solid color or gradient"
typography:
  title:
    size: "56-64px"
    weight: "700"
  body:
    size: "28-32px"
    weight: "400"
  cta:
    size: "28-32px"
    weight: "700"
best_for:
  - "Product photography"
  - "Before/after transformations (stacked)"
  - "Visual demonstrations"
  - "Image-driven storytelling"
```

**STRATEGY C: Split Screen 50/50**
```yaml
name: "Split Screen 50/50"
use_case: "Comparison, dual message, contrasts"
structure:
  layout: "vertical split"
  image:
    width: "50% (540px)"
    position: "left or right"
  text_area:
    width: "50% (540px)"
    position: "opposite side"
    background: "solid color"
typography:
  title:
    size: "52-60px"
    weight: "700"
  body:
    size: "26-30px"
    weight: "400"
  cta:
    size: "26-30px"
    weight: "700"
best_for:
  - "Before/after comparisons (side-by-side)"
  - "Problem/solution messaging"
  - "Dual concepts or contrasts"
```

**STRATEGY D: Text-Focused + Subtle Background**
```yaml
name: "Text-Focused with Minimal Imagery"
use_case: "Data-heavy, statistics, educational content, urgency"
structure:
  background:
    type: "gradient or solid color"
    imagery: "none or subtle pattern"
  text:
    dominance: "primary visual element"
    emphasis: "large typography"
  accents:
    type: "small logos or icons only"
    role: "supporting, not dominant"
typography:
  title:
    size: "64-72px"
    weight: "800-900"
    emphasis: "all-caps or mixed-case"
  body:
    size: "32-36px"
    weight: "400-600"
  cta:
    size: "28-32px"
    weight: "700"
best_for:
  - "Statistics and data presentation"
  - "Educational content"
  - "Urgency/scarcity messaging"
  - "Fact-based communication"
```

**STRATEGY E: Symbolic Elements Scattered**
```yaml
name: "Symbolic Elements Scattered"
use_case: "Brand-heavy, abstract concepts, artistic expression"
structure:
  background: "solid color or gradient"
  elements:
    type: "logos, icons, shapes"
    arrangement: "scattered artistically"
    integration: "text flows with elements"
typography:
  title:
    size: "56-68px"
    weight: "700"
  body:
    size: "28-32px"
    weight: "400"
  cta:
    size: "26-30px"
    weight: "700"
best_for:
  - "Brand awareness campaigns"
  - "Abstract concept communication"
  - "Artistic/creative expression"
```

### Step 4: Typography Hierarchy Rules

**Define precise specifications:**

```yaml
TYPOGRAPHY HIERARCHY STANDARDS:

title:
  size_range: "48-72px"
  weight_range: "700-900"
  line_height_range: "0.95-1.2"
  emphasis_styles:
    - "bold" (weight 700-800)
    - "mixed-case" (strategic capitalization)
    - "all-caps" (for urgency/impact)
  color_strategies:
    - "white" (overlay layouts)
    - "brand-primary" (brand-heavy)
    - "high-contrast" (text-focused)
  max_characters: 60
  rules:
    - Must be larger than body
    - Must be immediately readable
    - Emphasis words use brand accent color
    - Never sacrifice readability for style

body:
  size_range: "24-32px"
  weight: "400" (regular)
  line_height_range: "1.4-1.6"
  emphasis_words:
    - Bold key phrases (max 30%)
    - Use brand accent for highlights
  max_characters: 150
  max_lines: 4
  rules:
    - Clear hierarchy below title
    - Maintain readability over image
    - Line height ensures breathing room

cta:
  size_range: "24-32px"
  weight: "700" (bold)
  line_height: "1.3"
  styles:
    - "button" (rounded, filled, prominent)
    - "text-link" (underline, accent color)
    - "badge" (pill shape, small)
  max_characters: 25
  rules:
    - Must be visually distinct
    - Clear action verb
    - Impossible to miss
    - Single primary CTA only

badge_optional:
  size: "12-14px"
  weight: "700"
  text_transform: "uppercase"
  letter_spacing: "0.5px"
  max_characters: 30
```

### Step 5: Image Integration Patterns

```yaml
IMAGE INTEGRATION:

full_bleed:
  position: "absolute, 0,0"
  size: "100% width, 100% height"
  object_fit: "cover"
  overlay_needed: true
  overlay_opacity: "30-50%"
  filter: "brightness(0.95) contrast(1.05)"

hero_top:
  position: "top of canvas"
  size: "100% width, 60% height (1152px)"
  object_fit: "cover"
  overlay_needed: false
  overlay_opacity: "0-20%"

split_side:
  position: "left or right 50%"
  size: "50% width (540px), 100% height"
  object_fit: "cover"
  overlay_needed: false
  overlay_opacity: "0-10%"

accent_icons:
  position: "scattered throughout"
  size: "small (64-128px)"
  role: "decorative only"
  overlay_needed: false
```

### Step 6: Space Utilization Calculation

```javascript
function calculateSpaceUtilization(layout_strategy, content) {
  const CANVAS = {
    width: 1080,
    height: 1920,
    safe_zone_top: 250,
    safe_zone_bottom: 300
  };

  const usable_height = CANVAS.height - CANVAS.safe_zone_top - CANVAS.safe_zone_bottom; // 1370px

  const layout_spaces = {
    "full-bleed-overlay": {
      content_area: usable_height * 0.85, // 1165px
      breathing_room: "15%"
    },
    "hero-top-text-bottom": {
      image_area: CANVAS.height * 0.60, // 1152px
      content_area: (CANVAS.height * 0.40) - CANVAS.safe_zone_bottom, // 468px
      breathing_room: "10%"
    },
    "split-50-50": {
      content_area: usable_height * 0.90, // 1233px
      breathing_room: "10%"
    },
    "text-focused": {
      content_area: usable_height * 0.95, // 1302px
      breathing_room: "5%"
    },
    "symbolic-elements": {
      content_area: usable_height * 0.88, // 1206px
      breathing_room: "12%"
    }
  };

  return {
    safe_zone_top: CANVAS.safe_zone_top + "px",
    safe_zone_bottom: CANVAS.safe_zone_bottom + "px",
    content_distribution: layout_spaces[layout_strategy],
    usable_height: usable_height + "px"
  };
}
```

---

## Output Format

```json
{
  "template_objective": {
    "primary_goal": "from input",
    "target_audience": "from input",
    "emotional_tone": "from input",
    "key_message": "from input"
  },
  "layout_strategy": {
    "strategy_type": "A | B | C | D | E",
    "strategy_name": "full-bleed-overlay | hero-top-text-bottom | split-50-50 | text-focused | symbolic-elements",
    "rationale": "Why this layout best serves the objective - reference decision tree reasoning"
  },
  "image_integration": {
    "image_role": "dominant | supporting | accent | none",
    "image_position": "full-bleed | top-60-percent | left-50-percent | right-50-percent | scattered-icons | none",
    "overlay_needed": true | false,
    "overlay_opacity": 0-100,
    "filter_treatment": "brightness() contrast() saturate() values"
  },
  "typography_hierarchy": {
    "title": {
      "font_size": "48-72px specific value",
      "font_weight": "700-900 specific value",
      "line_height": "0.95-1.2 specific value",
      "emphasis_style": "bold | mixed-case | all-caps",
      "color_strategy": "white | brand-primary | high-contrast",
      "max_characters": 60
    },
    "body": {
      "font_size": "24-32px specific value",
      "font_weight": "400",
      "line_height": "1.4-1.6 specific value",
      "emphasis_words": ["keyword1", "keyword2", "keyword3"],
      "max_characters": 150,
      "max_lines": 4
    },
    "cta": {
      "font_size": "24-32px specific value",
      "font_weight": "700",
      "line_height": "1.3",
      "style": "button | text-link | badge",
      "max_characters": 25
    }
  },
  "color_palette": {
    "primary_color": "#hex value",
    "secondary_color": "#hex value",
    "text_color": "#hex value",
    "cta_color": "#hex value",
    "background_color": "#hex value or gradient string"
  },
  "space_utilization": {
    "safe_zone_top": "250px minimum",
    "safe_zone_bottom": "300px minimum",
    "content_distribution": "Description of how vertical space is allocated",
    "breathing_room": "Percentage of space left for visual comfort"
  },
  "design_inspiration_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}
```

---

## Examples

### Example 1: Trust-Building (Social Proof)

**Input:**
```json
{
  "template_objective": {
    "primary_goal": "trust",
    "target_audience": "Entrepreneurs seeking proven results",
    "emotional_tone": "trust",
    "key_message": "Real people achieving real results with this system",
    "visual_metaphor": "social-proof"
  }
}
```

**Output:**
```json
{
  "template_objective": { ... },
  "layout_strategy": {
    "strategy_type": "A",
    "strategy_name": "full-bleed-overlay",
    "rationale": "Social proof requires authentic human face for trust. Full-bleed professional photo with overlay allows text readability while showcasing testimonial credibility. Learned from ad-01-hero-overlay: dark gradient overlay (40%) ensures text legibility over any background."
  },
  "image_integration": {
    "image_role": "dominant",
    "image_position": "full-bleed",
    "overlay_needed": true,
    "overlay_opacity": 45,
    "filter_treatment": "brightness(0.95) contrast(1.05) saturate(1.0)"
  },
  "typography_hierarchy": {
    "title": {
      "font_size": "56px",
      "font_weight": "800",
      "line_height": "1.05",
      "emphasis_style": "bold",
      "color_strategy": "white",
      "max_characters": 60
    },
    "body": {
      "font_size": "28px",
      "font_weight": "400",
      "line_height": "1.5",
      "emphasis_words": ["real results", "proven", "transformed"],
      "max_characters": 150,
      "max_lines": 4
    },
    "cta": {
      "font_size": "28px",
      "font_weight": "700",
      "line_height": "1.3",
      "style": "button",
      "max_characters": 25
    }
  },
  "color_palette": {
    "primary_color": "#1a1a1a",
    "secondary_color": "#ffffff",
    "text_color": "#ffffff",
    "cta_color": "#FF6B35",
    "background_color": "rgba(0,0,0,0.45)"
  },
  "space_utilization": {
    "safe_zone_top": "250px",
    "safe_zone_bottom": "300px",
    "content_distribution": "Title at upper-third (384px from top), testimonial quote mid-section, CTA button at lower-third (300px from bottom). Follows ad-01-hero-overlay positioning.",
    "breathing_room": "15%"
  },
  "design_inspiration_keywords": ["authentic", "professional", "trust", "testimonial", "credibility"]
}
```

### Example 2: Urgency/Scarcity

**Input:**
```json
{
  "template_objective": {
    "primary_goal": "conversion",
    "target_audience": "Action-takers ready to commit now",
    "emotional_tone": "urgency",
    "key_message": "Limited spots available - act now or miss out",
    "visual_metaphor": "data-proof"
  }
}
```

**Output:**
```json
{
  "template_objective": { ... },
  "layout_strategy": {
    "strategy_type": "D",
    "strategy_name": "text-focused",
    "rationale": "Urgency demands bold, impossible-to-miss text. Minimal imagery keeps focus on scarcity message and countdown. Large typography creates visual impact that commands attention."
  },
  "image_integration": {
    "image_role": "accent",
    "image_position": "scattered-icons",
    "overlay_needed": false,
    "overlay_opacity": 0,
    "filter_treatment": "none"
  },
  "typography_hierarchy": {
    "title": {
      "font_size": "72px",
      "font_weight": "900",
      "line_height": "0.95",
      "emphasis_style": "all-caps",
      "color_strategy": "high-contrast",
      "max_characters": 60
    },
    "body": {
      "font_size": "32px",
      "font_weight": "400",
      "line_height": "1.4",
      "emphasis_words": ["limited", "only", "now", "last chance"],
      "max_characters": 150,
      "max_lines": 4
    },
    "cta": {
      "font_size": "32px",
      "font_weight": "700",
      "line_height": "1.3",
      "style": "button",
      "max_characters": 25
    }
  },
  "color_palette": {
    "primary_color": "#FF4D4D",
    "secondary_color": "#FFFFFF",
    "text_color": "#FFFFFF",
    "cta_color": "#FF4D4D",
    "background_color": "linear-gradient(180deg, #1a1a1a 0%, #000000 100%)"
  },
  "space_utilization": {
    "safe_zone_top": "250px",
    "safe_zone_bottom": "300px",
    "content_distribution": "Large title dominates upper-third, urgency details in middle, prominent CTA at bottom. Maximum text size for impact.",
    "breathing_room": "5%"
  },
  "design_inspiration_keywords": ["urgent", "scarcity", "bold", "immediate", "action"]
}
```

---

## Quality Criteria

**Output must include:**
- ✅ Layout strategy selected from valid set (A, B, C, D, E)
- ✅ Clear rationale referencing decision tree logic
- ✅ Image integration fully specified (role, position, overlay)
- ✅ Typography hierarchy with EXACT values (not ranges)
- ✅ Color palette with hex codes
- ✅ Space utilization respecting safe zones
- ✅ Design inspiration keywords for reference

**Validation checks:**
- Layout strategy aligns with objective (trust→A, urgency→D, etc.)
- Typography sizes within valid ranges
- Safe zones respected (250px top, 300px bottom minimum)
- Image overlay only when needed (Strategy A primarily)
- CTA prominent and impossible to miss

---

## Success Criteria

- ✅ Analyzes ad-01-hero-overlay and extracts 7+ design principles
- ✅ Documents all 5 layout strategies (A-E) with complete specs
- ✅ Recommends optimal layout using decision tree
- ✅ Defines typography hierarchy with exact measurements
- ✅ Specifies image integration patterns
- ✅ Calculates space utilization and validates 9:16 fit
- ✅ Returns complete Template Strategy JSON
- ✅ Provides clear rationale for all design decisions
