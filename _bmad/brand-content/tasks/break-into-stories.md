# Task: Break Into Stories

**Task ID:** break-into-stories
**Agent:** Story Strategist (Alex)
**Purpose:** Break content into 5-15 Instagram Stories with narrative flow

---

## Input Schema

```json
{
  "brief_text": "Content briefing or narrative to break into stories",
  "brand_context": {
    "brand_id": "taypuri",
    "voice": { "tone": "direto", "style": "provocativo" },
    "image_style": "Neo-brutalist graphic design..."
  },
  "num_stories": 10
}
```

## Output Schema

```json
{
  "brand_id": "taypuri",
  "total_stories": 10,
  "input_type": "briefing",
  "narrative_arc": {
    "intro": [1],
    "build_up": [2, 3, 4],
    "climax": [5, 6],
    "resolution": [7, 8],
    "cta": [9, 10]
  },
  "stories": [
    {
      "story_number": 1,
      "type": "text-only",
      "text": "semana passada comecei as entrevistas...",
      "visual_concept": "Dark minimalist opening",
      "template_suggestion": "story-01-text-only-dark",
      "background_color": "#000000",
      "requires_image": false
    }
  ]
}
```

## Execution Logic

### Step 1: Analyze Content & Classify Types

Classify each story into one of 8 types:
- **text-only**: Pure text, no image needed
- **text-image**: Requires background image
- **quote-emphasis**: Quotation or testimonial
- **question-cta**: Question or call-to-action
- **split-comparison**: Side-by-side comparison
- **minimal-centered**: Very short, impactful statement
- **list-vertical**: Multiple items/bullets
- **statement-bold**: Bold declaration

### Step 2: Determine Narrative Arc

Assign stories to narrative phases:
- **Intro**: Hook (1-2 stories)
- **Build-up**: Develop tension (2-4 stories)
- **Climax**: Peak moment (2-3 stories)
- **Resolution**: Conclusion (1-3 stories)
- **CTA**: Engagement (1-2 stories)

### Step 3: Generate Visual Concepts

For stories requiring images, create Gemini prompts using brand image_style.
Extract search keywords for semantic search fallback.

---

## Output Requirements

1. **Narrative Coherence**: Logical flow from intro to CTA
2. **Type Diversity**: Mix at least 3 different types
3. **Visual Balance**: 30-50% max with images
4. **Engagement**: Include 1-2 question-cta types
5. **Brand Voice**: Match brand tone and style

