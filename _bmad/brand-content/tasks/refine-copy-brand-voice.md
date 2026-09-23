# Task: Refine Copy with Brand Voice

## Metadata
- **Agent:** copywriter
- **Type:** brand-voice-refinement
- **Version:** 1.0.0
- **Created:** 2025-11-04 (Story 015.3)

## Purpose
Refine carousel slide copy to match brand voice standards with high fidelity. Takes initial copy from Story Strategist and applies rigorous brand voice consistency checks, improving tone match, phrase usage, and CTA verb compliance.

## Inputs

```javascript
{
  slide_number: number,          // Slide position (1-N)
  slide_type: string,            // 'Cover', 'Problem', 'Insight', 'CTA', etc.
  original_copy: {               // Original slide content
    title: string,
    subtitle?: string,
    body?: string,
    items?: string[]
  },
  brand_context: {               // From Story 015.1
    voice: {
      tone: string,
      personality: string[],
      language_style: string,
      preferred_phrases: string[],
      avoid_terms: string[]
    },
    content_preferences: {
      emoji_usage: string,
      headline_style: string,
      cta_verbs: string[]
    }
  }
}
```

## Process

1. **Analyze Current Copy Against Brand Voice**
   - Extract all text from slide (title + subtitle + body + items)
   - Check tone match against brand voice.tone
   - Identify preferred_phrases present
   - Detect avoid_terms violations
   - Verify CTA verb compliance (for CTA slides)

2. **Identify Improvements**
   - **Tone strengthening:** Adjust word choices to match brand tone
   - **Phrase incorporation:** Add 1-2 preferred_phrases if missing
   - **Term removal:** Replace any avoid_terms with brand-appropriate alternatives
   - **CTA verb replacement:** Replace generic CTAs with brand cta_verbs
   - **Headline style:** Ensure headline matches brand headline_style

3. **Refine Copy**
   - Apply improvements while preserving:
     - Original message/meaning
     - Copy length (±10%)
     - Slide structure (title/body/CTA hierarchy)
   - Maintain authenticity and natural flow
   - Don't force phrases - incorporate organically

4. **Score Refined Copy**
   - Use same scoring algorithm from Story 015.2
   - Calculate brand_voice_score (0-10)
   - Document changes made

## Quality Standards

### Must Preserve:
- ✅ Original message and core meaning
- ✅ Copy length within ±10% of original
- ✅ Natural language flow (not forced/awkward)
- ✅ Slide hierarchy (title → body → CTA)

### Must Improve:
- ✅ Tone match (align with brand tone)
- ✅ Preferred phrase usage (incorporate 1-2 if missing)
- ✅ Avoid term compliance (zero violations)
- ✅ CTA verb compliance (for CTA slides)

### Target Metrics:
- Brand voice score: ≥8.0/10
- Individual slide scores: ≥7.0/10 (no outliers)
- Changes should be minimal but impactful

## Outputs

```javascript
{
  content: {                     // Refined slide content
    title: string,
    subtitle?: string,
    body?: string,
    items?: string[]
  },
  brand_voice_score: number,     // 0-10 score for refined copy
  score_breakdown: {             // Detailed scoring
    tone: number,                // 0-3 points
    preferred_phrases: number,   // 0-3 points
    avoid_terms: number,         // 0-2 points
    cta_verbs: number            // 0-2 points
  },
  changes_made: string[],        // List of improvements applied
  original_score: number         // Score before refinement (for comparison)
}
```

## Example Execution

### Input:
```javascript
{
  slide_number: 3,
  slide_type: 'CTA',
  original_copy: {
    title: 'Ready to get started?',
    body: 'Click here to learn more about our amazing program!'
  },
  brand_context: {
    voice: {
      tone: 'mystical-tech',
      preferred_phrases: ['ancestral wisdom', 'quantum leap', 'cosmic bridge'],
      avoid_terms: ['click', 'amazing', 'get started']
    },
    content_preferences: {
      cta_verbs: ['Discover', 'Transform', 'Unlock']
    }
  }
}
```

### Output:
```javascript
{
  content: {
    title: 'Ready to transform?',
    body: 'Discover your cosmic bridge to ancestral wisdom today!'
  },
  brand_voice_score: 8.5,
  score_breakdown: {
    tone: 2.5,
    preferred_phrases: 3.0,
    avoid_terms: 2.0,
    cta_verbs: 2.0
  },
  changes_made: [
    "Replaced 'get started' (avoid term) with 'transform' (CTA verb)",
    "Replaced 'Click here' (avoid term) with 'Discover' (CTA verb)",
    "Removed 'amazing' (avoid term)",
    "Incorporated 'cosmic bridge' and 'ancestral wisdom' (preferred phrases)"
  ],
  original_score: 4.5
}
```

## Error Handling

- If `brand_context.voice` is undefined: Return original copy with neutral score (5.0)
- If refinement fails: Return original copy with error note
- If copy becomes too long (>110% original): Trim while preserving meaning
- If copy becomes too short (<90% original): Expand with brand-appropriate content

## Performance Targets

- Execution time: <5 seconds per slide
- API calls: 1 per slide (efficient)
- Token usage: <2000 tokens per refinement

## Integration Notes

This task is called from `scripts/orchestrate-carousel-arcadia.js` in the `invokeCopywriter()` step (Story 015.3), which runs after Story Strategist but before Typography Specialist.

**Workflow Position:**
```
Step 3: Story Strategist → generates initial copy
Step 3.5: Copywriter (this task) → refines copy with brand voice
Step 4: Typography Specialist → applies typography
```

## Prompt Template

```
You are Marcus, the Copywriter agent for Arcadia Instagram Carousel Generator.

**TASK:** Refine slide copy to match brand voice standards with high fidelity.

**BRAND VOICE:**
- Tone: ${brand_context.voice.tone}
- Personality: ${brand_context.voice.personality.join(', ')}
- Language Style: ${brand_context.voice.language_style}
- Preferred Phrases: ${brand_context.voice.preferred_phrases.join(', ')}
- Avoid Terms: ${brand_context.voice.avoid_terms.join(', ')}

**COPY PREFERENCES:**
- Emoji Usage: ${brand_context.content_preferences.emoji_usage}
- Headline Style: ${brand_context.content_preferences.headline_style}
- CTA Verbs (use ONLY these): ${brand_context.content_preferences.cta_verbs.join(', ')}

**ORIGINAL SLIDE COPY (Slide ${slide_number} - ${slide_type}):**
Title: ${original_copy.title}
${original_copy.subtitle ? 'Subtitle: ' + original_copy.subtitle : ''}
${original_copy.body ? 'Body: ' + original_copy.body : ''}
${original_copy.items ? 'Items:\n' + original_copy.items.map((item, i) => `${i+1}. ${item}`).join('\n') : ''}

**REFINEMENT INSTRUCTIONS:**
1. Strengthen tone match to "${brand_context.voice.tone}"
2. Incorporate 1-2 preferred phrases naturally if missing
3. Remove ANY avoid terms if present
4. For CTA slides: use ONLY approved CTA verbs
5. Match headline style: ${brand_context.content_preferences.headline_style}
6. Preserve original message and length (±10%)
7. Keep natural flow - don't force phrases

**OUTPUT FORMAT:**
{
  "content": {
    "title": "refined title here",
    "subtitle": "refined subtitle here (if applicable)",
    "body": "refined body here (if applicable)"
  },
  "changes_made": [
    "Description of change 1",
    "Description of change 2"
  ]
}

Provide ONLY the JSON output, no additional commentary.
```
