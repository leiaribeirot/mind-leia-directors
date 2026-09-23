# Task: Analyze Template Objective

**Agent:** template-strategist
**Version:** 1.0
**Story Reference:** 020.1

---

## Purpose

Analyze design objective from user input (reference image, description, or objective keyword) and extract core design intent, target audience, emotional tone, and key message.

---

## Inputs

**Required (at least ONE):**
- `reference_image` (string, optional): Path to reference image showing desired visual style
- `description` (string, optional): Text description of template purpose/goal
- `objective` (string, optional): Keyword objective (e.g., "trust-building", "urgency", "social-proof")

**Optional:**
- `brand_context` (object, optional): Brand visual system for context

---

## Process

### Step 1: Validate Inputs

```
IF no inputs provided:
  RETURN error: "At least one input required (reference_image, description, or objective)"

IF multiple inputs provided:
  SYNTHESIZE all inputs together
  PRIORITIZE: reference_image > description > objective
```

### Step 2: Extract Design Intent

**From Reference Image:**
```
ANALYZE visual elements:
- Layout structure (overlay, split, text-focused, etc.)
- Color palette and mood
- Typography emphasis (bold, large, minimal)
- Image prominence (dominant, supporting, accent)
- Emotional tone conveyed

INFER objective from visual patterns:
- Professional photo + overlay → authority/trust
- Bold text + minimal image → urgency/scarcity
- Product showcase → conversion/demonstration
- Data/stats heavy → education/awareness
```

**From Description:**
```
PARSE text for keywords indicating:
- Objective: "convert", "build trust", "educate", "create urgency"
- Audience: "entrepreneurs", "beginners", "professionals"
- Tone: "urgent", "trustworthy", "inspirational", "educational"
- Visual metaphor: "before/after", "testimonial", "data proof"
```

**From Objective Keyword:**
```
MAP keyword to design intent:
- "trust" | "social-proof" | "testimonial" → Trust-building
- "urgency" | "scarcity" | "limited" → Conversion urgency
- "education" | "awareness" | "teach" → Educational
- "authority" | "expert" | "professional" → Authority positioning
- "product" | "showcase" | "demo" → Product demonstration
```

### Step 3: Define Target Audience

```
BASED ON objective, infer audience:
- Trust/authority → Entrepreneurs, professionals seeking proven methods
- Urgency/scarcity → Action-takers, decision-makers ready to commit
- Education → Learners, students, beginners seeking knowledge
- Product showcase → Buyers, consumers evaluating solutions
```

### Step 4: Determine Emotional Tone

```
MAP objective to emotion:
- Trust → "trust", "confidence", "credibility"
- Urgency → "urgency", "fomo", "scarcity"
- Education → "curiosity", "inspiration", "empowerment"
- Authority → "respect", "admiration", "aspiration"
- Product → "desire", "interest", "excitement"
```

### Step 5: Extract Key Message

```
SUMMARIZE in one sentence:
- What is this template trying to communicate?
- What action should viewer take?
- What benefit does viewer receive?

FORMULA: "[Target audience] can [achieve benefit] by [taking action]"

EXAMPLES:
- "Entrepreneurs can build authority by showcasing expert credentials"
- "Action-takers can secure limited spots by committing now"
- "Learners can master new skills by following proven framework"
```

---

## Output Format

```json
{
  "template_objective": {
    "primary_goal": "conversion | awareness | engagement | education | trust",
    "target_audience": "Detailed description of who this template targets",
    "emotional_tone": "urgency | trust | inspiration | curiosity | fomo | respect",
    "key_message": "One sentence summary of core message",
    "visual_metaphor": "authority-figure | transformation | data-proof | social-proof | product-showcase"
  },
  "analysis_metadata": {
    "input_source": "reference_image | description | objective | multiple",
    "confidence": "high | medium | low",
    "reasoning": "Brief explanation of how objective was determined"
  }
}
```

---

## Examples

### Example 1: Reference Image Input

**Input:**
```javascript
{
  reference_image: "/path/to/premium-ad.jpg"
  // Image shows: professional headshot with dark overlay, large title text, CTA button
}
```

**Analysis Process:**
```
VISUAL ANALYSIS:
- Professional photo (high-quality headshot) → Authority/trust
- Dark overlay (40% opacity) → Text readability priority
- Large bold title → Emphasis on message
- Prominent CTA button → Conversion focus
- Minimal distractions → Professional tone

INFERRED OBJECTIVE: Trust-building through authority positioning
```

**Output:**
```json
{
  "template_objective": {
    "primary_goal": "trust",
    "target_audience": "Entrepreneurs and professionals seeking credible expertise and proven results",
    "emotional_tone": "trust",
    "key_message": "Established experts can build authority by showcasing professional credentials and results",
    "visual_metaphor": "authority-figure"
  },
  "analysis_metadata": {
    "input_source": "reference_image",
    "confidence": "high",
    "reasoning": "Professional photography with overlay indicates authority positioning. Large title and CTA suggest trust-building with conversion intent."
  }
}
```

### Example 2: Description Input

**Input:**
```javascript
{
  description: "Template for urgency-driven flash sale with countdown timer and limited availability message"
}
```

**Analysis Process:**
```
KEYWORD EXTRACTION:
- "urgency-driven" → Primary emotion is urgency
- "flash sale" → Conversion goal with time pressure
- "countdown timer" → Visual scarcity indicator
- "limited availability" → FOMO driver

INFERRED OBJECTIVE: Conversion through urgency and scarcity
```

**Output:**
```json
{
  "template_objective": {
    "primary_goal": "conversion",
    "target_audience": "Action-takers and decision-makers ready to commit immediately to avoid missing out",
    "emotional_tone": "urgency",
    "key_message": "Act now to secure limited offer before time runs out",
    "visual_metaphor": "data-proof"
  },
  "analysis_metadata": {
    "input_source": "description",
    "confidence": "high",
    "reasoning": "Keywords 'urgency', 'flash sale', 'countdown', 'limited' all indicate scarcity-driven conversion objective."
  }
}
```

### Example 3: Objective Keyword Input

**Input:**
```javascript
{
  objective: "social-proof"
}
```

**Analysis Process:**
```
KEYWORD MAPPING:
- "social-proof" → Testimonial, reviews, user results
- PRIMARY GOAL: Trust-building through peer validation
- VISUAL METAPHOR: Real people, quotes, results
- TONE: Trust, credibility, authenticity
```

**Output:**
```json
{
  "template_objective": {
    "primary_goal": "trust",
    "target_audience": "Prospective customers evaluating credibility through peer experiences and reviews",
    "emotional_tone": "trust",
    "key_message": "Real people are achieving real results with this proven system",
    "visual_metaphor": "social-proof"
  },
  "analysis_metadata": {
    "input_source": "objective",
    "confidence": "high",
    "reasoning": "Social proof keyword directly maps to trust-building through testimonials and peer validation."
  }
}
```

### Example 4: Multi-Input Synthesis

**Input:**
```javascript
{
  reference_image: "/path/to/before-after.jpg",
  description: "Showcase transformation results from program"
}
```

**Analysis Process:**
```
IMAGE ANALYSIS:
- Before/after split screen → Transformation visual metaphor
- Side-by-side comparison → Product demonstration

DESCRIPTION ANALYSIS:
- "Showcase transformation" → Results-focused
- "from program" → Educational/training context

SYNTHESIS:
- PRIMARY: Visual proof of transformation
- GOAL: Trust through demonstrated results
- METAPHOR: Transformation
```

**Output:**
```json
{
  "template_objective": {
    "primary_goal": "trust",
    "target_audience": "Prospective program participants seeking visible proof of transformation results",
    "emotional_tone": "inspiration",
    "key_message": "Visible transformation results prove program effectiveness",
    "visual_metaphor": "transformation"
  },
  "analysis_metadata": {
    "input_source": "multiple",
    "confidence": "high",
    "reasoning": "Reference image shows before/after comparison. Description confirms transformation showcase. Combined inputs create clear trust-through-results objective."
  }
}
```

---

## Edge Cases

### No Input Provided
```
ACTION: Return error
MESSAGE: "At least one input required: reference_image, description, or objective"
```

### Conflicting Inputs
```
INPUT:
  reference_image: (shows professional authority figure)
  description: "Create urgency for flash sale"

ACTION: Ask user to clarify priority
MESSAGE: "Inputs suggest different objectives. Reference image indicates authority/trust, but description suggests urgency/scarcity. Which objective should take priority?"
```

### Invalid Reference Image
```
ACTION: Fallback to other inputs if available
MESSAGE: "Could not process reference image. Analyzing description/objective instead."
```

### Ambiguous Description
```
INPUT: "Make it look good and convert well"

ACTION: Ask for clarification
MESSAGE: "Description is too vague. Please specify: What is the core objective (trust, urgency, education)? Who is the target audience? What emotion should it evoke?"
```

---

## Quality Criteria

**Output must include:**
- ✅ Primary goal from valid set (conversion, awareness, engagement, education, trust)
- ✅ Detailed target audience description (not generic)
- ✅ Emotional tone aligned with objective
- ✅ Key message in one clear sentence
- ✅ Visual metaphor appropriate for objective
- ✅ Confidence level and reasoning documented

**Validation checks:**
- Primary goal matches emotional tone (trust→trust, urgency→urgency)
- Visual metaphor supports primary goal
- Key message is actionable and clear
- Target audience is specific (not just "users" or "people")

---

## Success Criteria

- ✅ Analyzes at least one input type (image, description, objective)
- ✅ Extracts clear design objective with high confidence
- ✅ Defines specific target audience (not generic)
- ✅ Documents emotional tone aligned with objective
- ✅ Provides one-sentence key message
- ✅ Returns valid JSON matching schema
- ✅ Includes reasoning for analysis decisions
