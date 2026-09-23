# Generate Batch Instagram Stories Ads

**Workflow ID:** `generate-batch-ads`
**Type:** Interactive Workflow
**Agent Team:** Instagram Content Creator (Batch Mode)
**Output:** Multiple Instagram Stories Ads (1080x1920px PNGs)

---

## Description

Generate hundreds of Instagram Stories Ads from a single CSV or JSON data file.

Perfect for:
- 🎯 **A/B Testing** - 20 variations of the same ad
- 📦 **Product Catalogs** - 100 ads for different products
- 🌍 **Localization** - Same ad in 10 languages
- 👥 **Retargeting** - Personalized ads for different segments

This workflow processes ads in parallel (3-10 concurrent processes) with:
- Progress tracking (ETA display)
- Error resilience (continue on failure)
- Batch reports (success/failure stats)
- Retry mechanism (failed ads export)

---

## Prerequisites

- ✅ Data file (`.csv` or `.json`)
- ✅ Anthropic API key (Claude for agents)
- ✅ Optional: OpenAI API key (DALL-E for images)
- ✅ Optional: Image files (if using custom images)

---

## Usage

### Command
```bash
*workflow generate-batch-ads
```

### Or Direct Script
```bash
node scripts/batch-generate-ads.js <data-file> [options]
```

---

## Elicitation (Interactive Mode)

The workflow will ask:

### 1. Data File Path
**Prompt:** "Path to your data file (CSV or JSON):"
**Examples:**
- `examples/batch-ads-example.csv`
- `campaign-data.json`
- `content/lendaria-launch-ads.csv`

**Auto-detection:** Format detected from file extension

### 2. Number of Parallel Processes
**Prompt:** "How many ads to process in parallel? (3-10)"
**Options:**
- `3` (default) - Safe, balanced
- `5` - Good for 50+ ads
- `8` - High performance
- `10` - Maximum parallelism

**Recommendation:**
- 1-10 ads: 3 concurrent
- 10-50 ads: 5 concurrent
- 50-100 ads: 8 concurrent
- 100+ ads: 10 concurrent

### 3. Brand Override (Optional)
**Prompt:** "Override brand for all ads? (leave empty to use data file)"
**Examples:**
- `creator`
- `academia-lendaria`
- *(empty)* - Use brand from data file

### 4. Theme Override (Optional)
**Prompt:** "Override theme for all ads? (leave empty to use data file)"
**Options:**
- `corporativo-elegante`
- `minimalist`
- `bold`
- *(empty)* - Use theme from data file

### 5. Skip QA Validation? (Advanced)
**Prompt:** "Skip quality validation for faster generation?"
**Options:**
- `no` (default) - Validate all ads (recommended)
- `yes` - Skip validation (faster, but risky)

**⚠️ Warning:** Skipping validation may produce ads with safe zone violations or CTA issues

### 6. Continue on Error?
**Prompt:** "Continue if one ad fails?"
**Options:**
- `yes` (default) - Continue processing other ads
- `no` - Stop on first error

**Recommended:** `yes` for large batches

### 7. Dry Run?
**Prompt:** "Preview without generating? (dry run)"
**Options:**
- `no` (default) - Generate all ads
- `yes` - Preview data, don't generate

---

## Data File Formats

### CSV Format

**File:** `campaign-ads.csv`

```csv
ad_id,template_id,badge_text,headline,body,cta_text,image_path,brand_id,theme
ad-001,ad-06-badge-headline-cta,NOVO,Headline,Body text,CTA!,image.jpg,creator,corporativo-elegante
ad-002,ad-07-stats-impact,RESULTADOS,2500+,Alunos,Comece,img.jpg,creator,bold
ad-003,ad-08-testimonial,DEPOIMENTO,Great product!,John,Quero isso,photo.jpg,brand-id,minimalist
```

**Required Fields (All Templates):**
- `ad_id` - Unique ID
- `template_id` - Template (`ad-06`, `ad-07`, `ad-08`)

**Template-Specific Fields:**

**ad-06-badge-headline-cta:**
- `badge_text`, `headline`, `body`, `cta_text`

**ad-07-stats-impact:**
- `badge_text`, `stat_number`, `stat_label`, `headline`, `cta_text`

**ad-08-testimonial:**
- `badge_text`, `quote`, `customer_name`, `cta_text`
- Optional: `customer_role`, `customer_photo`

**Optional Fields (All):**
- `image_path`, `brand_id`, `theme`, `typography_style`, `use_dalle`

### JSON Format

**File:** `campaign-ads.json`

```json
{
  "campaign_name": "lendaria-launch-2025",
  "brand_id": "creator",
  "theme": "corporativo-elegante",
  "ads": [
    {
      "ad_id": "ad-001",
      "template_id": "ad-06-badge-headline-cta",
      "badge_text": "NOVO",
      "headline": "Headline Here",
      "body": "Body text",
      "cta_text": "CTA Text",
      "image_path": "path/to/image.jpg"
    },
    {
      "ad_id": "ad-002",
      "template_id": "ad-07-stats-impact",
      "badge_text": "RESULTADOS",
      "stat_number": "2500+",
      "stat_label": "Alunos",
      "headline": "Resultados",
      "cta_text": "Comece"
    }
  ]
}
```

**Advantages:**
- Campaign-level defaults (brand, theme)
- Per-ad overrides possible
- Structured metadata

📖 **Full format guide:** `examples/BATCH-DATA-GUIDE.md`

---

## Execution Flow

### Step 1: Load & Parse Data File (1s)
- Read CSV or JSON file
- Auto-detect format
- Parse data into ads array

**Output:** `adsData` array

### Step 2: Validate Data (1s)
- Check required fields per template
- Validate field values
- Report missing/invalid data

**Validation Errors Stop Execution**

### Step 3: Create Output Directory (1s)
```
output/batch-{campaign-name}-{timestamp}/
├── ads/
└── (reports created later)
```

### Step 4: Process Ads in Parallel (varies)
**Concurrency Control:** p-limit library

**For each ad:**
1. Create temporary brief file
2. Call `ArcadiaAdOrchestrator` (from `orchestrate-ad-arcadia.js`)
3. Generate ad (same workflow as single ad)
4. Track success/failure
5. Update progress bar

**Progress Display:**
```
Progress |████████████░░░░░░░░| 60% || 30/50 ads || ETA: 45s
```

### Step 5: Generate Batch Report (1s)
**Output:** `batch-report.json`

Contains:
- Total ads processed
- Success count
- Failure count
- Average time per ad
- Total generation time
- Failed ads details

### Step 6: Show Summary (1s)
Console summary:
```
📊 BATCH GENERATION SUMMARY

Total ads:     50
✅ Successful: 48
❌ Failed:     2
⏱️  Total time:  8.2 min
⏱️  Avg/ad:      9.8s
📁 Output:      output/batch-lendaria-launch-2025-20251024/
```

---

## Output Structure

```
output/batch-{campaign}-{timestamp}/
├── ads/
│   ├── ad-001/
│   │   ├── ad.html
│   │   ├── ad.png               # Final PNG ✨
│   │   └── ad-spec.json
│   ├── ad-002/
│   │   ├── ad.html
│   │   ├── ad.png               # Final PNG ✨
│   │   └── ad-spec.json
│   └── ad-003/
│       └── ...
├── batch-report.json            # Success/failure summary ✨
├── batch-config.json            # Configuration used
└── failed-ads.json              # Failed ads for retry ✨
```

### Batch Report Format

```json
{
  "campaign_name": "lendaria-launch-2025",
  "total_ads": 50,
  "successful": 48,
  "failed": 2,
  "generation_time_ms": 492000,
  "avg_time_per_ad_ms": 10250,
  "concurrency": 5,
  "timestamp": "2025-10-24T14:30:22Z",
  "results": [
    {
      "ad_id": "ad-001",
      "index": 1,
      "status": "success",
      "output_path": "output/.../ads/ad-001/ad.png",
      "generation_time_ms": 9845
    },
    {
      "ad_id": "ad-042",
      "index": 42,
      "status": "failed",
      "error": "Template not found: ad-99-invalid",
      "generation_time_ms": 234
    }
  ],
  "failed_ads": [
    {
      "ad_id": "ad-042",
      "reason": "Template not found",
      "data": { ... }
    }
  ]
}
```

---

## Examples

### Example 1: Generate 10 Ads from CSV
```bash
*workflow generate-batch-ads

# Prompts:
Data file: examples/batch-ads-example.csv
Parallel processes: 3
Brand override: (empty)
Theme override: (empty)
Skip validation: no
Continue on error: yes
Dry run: no
```

**Output:** `output/batch-batch-ads-example-2025-10-24/`
**Time:** ~2 minutes

### Example 2: High-Performance 100 Ads
```bash
*workflow generate-batch-ads

# Prompts:
Data file: campaign-100-ads.json
Parallel processes: 10
Brand override: creator
Theme override: corporativo-elegante
Skip validation: no
Continue on error: yes
Dry run: no
```

**Output:** `output/batch-campaign-100-ads-2025-10-24/`
**Time:** ~15 minutes

### Example 3: Dry Run Preview
```bash
*workflow generate-batch-ads

# Prompts:
Data file: large-campaign.csv
Parallel processes: 5
Brand override: (empty)
Theme override: (empty)
Skip validation: no
Continue on error: yes
Dry run: yes  # ← Preview only
```

**Output:** Console preview, no files created

---

## Non-Interactive Mode (CLI)

Skip elicitation with CLI flags:

```bash
node scripts/batch-generate-ads.js campaign-data.csv \
  --concurrency=5 \
  --brand=creator \
  --theme=corporativo-elegante \
  --continue-on-error \
  --dry-run
```

**All CLI Options:**
```
--format=<csv|json>           Input format (auto-detect if omitted)
--brand=<brand-id>            Override brand ID for all ads
--theme=<theme-name>          Override theme for all ads
--concurrency=<number>        Parallel processes (default: 3, max: 10)
--output-dir=<path>           Custom output directory
--skip-validation             Skip QA validation (faster)
--continue-on-error           Continue if one ad fails
--dry-run                     Preview without generating
```

---

## Performance Benchmarks

| Ads | Concurrency | Estimated Time | Notes |
|-----|-------------|----------------|-------|
| 10  | 3           | ~2 min         | Safe default |
| 50  | 5           | ~8 min         | Good balance |
| 100 | 8           | ~15 min        | High performance |
| 100 | 10          | ~12 min        | Maximum speed |
| 500 | 10          | ~75 min        | Large campaign |

**Factors Affecting Speed:**
- DALL-E image generation (adds ~30s per ad)
- QA validation (adds ~10s per ad)
- System resources (CPU, RAM)
- Network latency (API calls)

**Optimization Tips:**
1. Use `--skip-validation` for trusted data (saves ~10s/ad)
2. Avoid DALL-E for photo-based campaigns (saves ~30s/ad)
3. Increase concurrency on powerful machines
4. Run during off-hours (less API congestion)

---

## Retry Failed Ads

If some ads fail, use the generated retry file:

```bash
*workflow generate-batch-ads

# Prompts:
Data file: output/batch-xyz/failed-ads.json  # ← Retry file
Parallel processes: 3
... (other prompts)
```

**Or CLI:**
```bash
node scripts/batch-generate-ads.js output/batch-xyz/failed-ads.json
```

---

## A/B Testing Workflow

**Scenario:** Test 3 headline variations

**Data File:** `ab-test-headlines.csv`
```csv
ad_id,template_id,badge_text,headline,body,cta_text
ad-variant-a,ad-06,NOVO,Domine IA em 90 dias,Metodologia comprovada,Começar
ad-variant-b,ad-06,NOVO,Aprenda IA rapidamente,Metodologia comprovada,Começar
ad-variant-c,ad-06,NOVO,IA do zero ao avançado,Metodologia comprovada,Começar
```

**Generate:**
```bash
*workflow generate-batch-ads
# Data file: ab-test-headlines.csv
```

**Output:** 3 ads with different headlines, same everything else

**Deploy to Instagram, measure CTR, pick winner! 🎯**

---

## Quality Validation (Batch)

Each ad validated against 3 checklists:

1. **Typography Checklist**
   - Font sizes 18-48px
   - Character limits (headline 60, body 150, CTA 25)
   - Contrast ratio ≥ 4.5:1

2. **CTA Checklist**
   - Button size ≥ 280x44px
   - Action verb used
   - Position 300px+ from bottom

3. **Safe Zones Checklist**
   - Top 250px clear
   - Bottom 250px clear
   - All content within safe area

**Batch-Specific:**
- QA runs for EACH ad individually
- Failed validation → ad marked as failed
- Batch continues processing (if `--continue-on-error`)

---

## Troubleshooting

### Issue: Data Validation Errors
**Error:**
```
Data validation errors:
  Ad #3: Missing required field 'headline'
  Ad #7: Missing required field 'cta_text'
```

**Fix:** Add missing fields to CSV/JSON

### Issue: Too Many Parallel Processes
**Error:** System slow, crashes

**Fix:** Reduce `--concurrency` to 3 or 5

### Issue: API Rate Limits
**Error:** `429 Too Many Requests`

**Fix:** Reduce concurrency or wait between batches

### Issue: Out of Memory
**Error:** `JavaScript heap out of memory`

**Fix:**
- Reduce concurrency
- Process in smaller batches (100 ads at a time)
- Increase Node.js heap: `NODE_OPTIONS=--max-old-space-size=4096`

### Issue: Some Ads Failed
**Solution:** Use retry mechanism
```bash
node scripts/batch-generate-ads.js output/batch-xyz/failed-ads.json
```

---

## Best Practices

### 1. Start Small
Test with 5-10 ads before generating hundreds
```bash
*workflow generate-batch-ads
# Dry run: yes  ← Preview first!
```

### 2. Use Dry Run
Always preview large batches:
```bash
node scripts/batch-generate-ads.js campaign.csv --dry-run
```

### 3. Organize by Campaign
Use descriptive campaign names (JSON):
```json
{
  "campaign_name": "lendaria-q1-2025-conversion-ads",
  "ads": [...]
}
```

### 4. Version Control Data
Track data files in git:
```bash
git add campaign-data.csv
git commit -m "feat: Q1 2025 ad campaign data"
```

### 5. Monitor First Few Ads
Check quality of first 3 ads before processing all 100

### 6. Backup Outputs
```bash
cp -r output/batch-xyz/ backups/
```

---

## Related Workflows

- **`generate-ad`** - Generate single Instagram Stories Ad
- **`generate-carousel`** - Generate Instagram carousel posts
- **`generate-story`** - Generate Instagram stories (non-ads)

---

## Documentation

📖 **Batch Data Guide:** `examples/BATCH-DATA-GUIDE.md`
📖 **Example CSV:** `examples/batch-ads-example.csv`
📖 **Example JSON:** `examples/batch-ads-example.json`
📖 **Story 010.10:** `docs/stories/010.10-batch-ad-generation.md`

---

**Created:** 2025-10-24
**Story:** 010.10 - Batch Ad Generation System
**Version:** 1.0
