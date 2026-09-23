# Unified Carousel Generation Workflow

**Workflow ID:** `unified-carousel-generation`
**Version:** 1.0.0
**Created:** 2025-10-06
**Status:** Active
**Owner:** Arcadia Orchestrator

---

## 📋 Overview

Automated workflow for generating Instagram carousels from long-form content through a single command. Orchestrates Story Strategist, Image Curator, Craft Specialist, and Export Specialist agents.

**Goal:** Transform text content → 8-slide Instagram carousel in ~90 seconds

---

## 🎯 Workflow Configuration

```yaml
workflow:
  name: Unified Carousel Generation
  id: unified-carousel-generation
  entry_point: elicit_inputs
  timeout: 120s

  agents:
    - story-strategist      # Break content into slides
    - image-curator         # Generate DALL-E images
    - craft-specialist      # Render HTML from specs
    - export-specialist     # Export to PNG format

  outputs:
    - carousel-specs.json   # Slide structure
    - slide-XX-bg.png      # Background images (if DALL-E used)
    - slide-XX.html        # Rendered HTML files
    - slide-XX.png         # Final PNG exports (1080x1350px)
```

---

## 🔄 Workflow Steps

### Step 1: ELICIT Inputs

**Agent:** Arcadia Orchestrator
**Duration:** ~30s (user interaction)

**Elicitation Points:**

```yaml
elicitation:
  - name: content_path
    prompt: "📄 Forneça o caminho do arquivo de conteúdo (.txt ou .md)"
    type: file_path
    required: true
    validation:
      - file_exists
      - readable
    examples:
      - "workshop.txt"
      - "content/article.md"
      - "test/fixtures/sample-medium.txt"

  - name: num_slides
    prompt: "📊 Quantos slides deseja? (Recomendado: 8)"
    type: integer
    required: false
    default: 8
    validation:
      range: [5, 10]
    description: "Entre 5-10 slides. Mais slides = menos conteúdo por slide."

  - name: theme
    prompt: "🎨 Tema visual"
    type: select
    required: false
    default: minimalist
    options:
      - value: minimalist
        label: "Minimalist (Editorial vintage, high contrast)"
      - value: bold
        label: "Bold (Dynamic colorful, high energy)"
      - value: editorial
        label: "Editorial (Classic magazine, dramatic lighting)"
    description: "Define estética fotográfica e layout"

  - name: colors
    prompt: "🌈 Paleta de cores (formato: cor1/cor2/cor3)"
    type: string
    required: false
    default: "preto/branco/dourado"
    examples:
      - "preto/branco/dourado"
      - "azul/branco/laranja"
      - "vermelho/creme/verde"
    description: "Formato: primária/secundária/destaque"

  - name: use_dalle
    prompt: "🖼️ Gerar imagens com DALL-E?"
    type: boolean
    required: false
    default: true
    description: "true = gera imagens contextualizadas | false = sem imagens de fundo"
```

**Validation Rules:**
- Content file must exist and be readable
- Slide count must be 5-10
- Theme must be one of: minimalist, bold, editorial
- Colors must follow pattern: word/word/word
- use_dalle must be boolean

---

### Step 2: VALIDATE Inputs

**Agent:** Orchestrator
**Duration:** < 1s

**Validations:**

```javascript
validate_inputs() {
  // Check file exists
  if (!fs.existsSync(config.content_path)) {
    throw new ValidationError('FILE_NOT_FOUND', `Content file not found: ${config.content_path}`);
  }

  // Check file is readable
  try {
    fs.readFileSync(config.content_path, 'utf-8');
  } catch (error) {
    throw new ValidationError('FILE_NOT_READABLE', `Cannot read file: ${error.message}`);
  }

  // Check content length
  const content = fs.readFileSync(config.content_path, 'utf-8');
  if (content.length < 500) {
    throw new ValidationError('CONTENT_TOO_SHORT', 'Content must be at least 500 characters');
  }
  if (content.length > 50000) {
    throw new ValidationError('CONTENT_TOO_LONG', 'Content must be less than 50000 characters');
  }

  // Check slide count range
  if (config.num_slides < 5 || config.num_slides > 10) {
    throw new ValidationError('INVALID_SLIDE_COUNT', 'Slide count must be between 5 and 10');
  }

  // Check theme
  const validThemes = ['minimalist', 'bold', 'editorial'];
  if (!validThemes.includes(config.theme)) {
    throw new ValidationError('INVALID_THEME', `Theme must be one of: ${validThemes.join(', ')}`);
  }

  // Check colors format
  const colorPattern = /^[a-zA-Z]+\/[a-zA-Z]+\/[a-zA-Z]+$/;
  if (!colorPattern.test(config.colors)) {
    throw new ValidationError('INVALID_COLOR_FORMAT', 'Colors must follow pattern: word/word/word');
  }

  return { valid: true };
}
```

---

### Step 3: CREATE Output Directory

**Agent:** Orchestrator
**Duration:** < 1s

```javascript
create_output_directory() {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, -5);

  const contentName = path.basename(config.content_path, path.extname(config.content_path));
  const dirname = `${contentName}-${timestamp}`;
  const outputDir = path.join('output', dirname);

  fs.mkdirSync(outputDir, { recursive: true });

  return outputDir;
}
```

---

### Step 4: CALL Story Strategist → Generate Specs

**Agent:** Story Strategist (Alex)
**Task:** `break-into-carousel`
**Duration:** ~10-15s

**Input:**
- Content text
- Number of slides
- Theme
- Color palette

**Process:**
```javascript
async generate_specs() {
  // Read content
  const content = fs.readFileSync(config.content_path, 'utf-8');

  // Call Story Strategist agent (via break-into-carousel.js)
  const specs = await breakIntoCarousel(
    content,
    config.num_slides,
    config.theme,
    config.colors
  );

  // Validate specs structure
  const validation = validateSpecs(specs);
  if (!validation.valid) {
    throw new ValidationError('INVALID_SPECS', validation.errors.join(', '));
  }

  // Save to output directory
  const specsPath = path.join(outputDir, 'carousel-specs.json');
  fs.writeFileSync(specsPath, JSON.stringify(specs, null, 2));

  return specs;
}
```

**Output:**
- `carousel-specs.json` with complete slide structure

**Validation:**
- Specs must have carousel_id
- Specs must have slides array
- Each slide must have: slide_number, type, template, content
- Slide types must be valid (Cover, Problem, Insight, Solution, etc.)
- Templates must exist in ateliers/carousel/templates/

---

### Step 5: CALL Image Curator → Generate Images (optional)

**Agent:** Image Curator (Sophia)
**Task:** `generate-carousel-images`
**Duration:** ~30-45s (depends on num_slides with images)
**Condition:** Only if `use_dalle === true`

**Input:**
- carousel-specs.json
- Output directory path

**Process:**
```javascript
async generate_images() {
  if (!config.use_dalle) {
    console.log('⏭️  Skipping image generation (use_dalle=false)');
    return { skipped: true };
  }

  // Call Image Curator (via generate-carousel-images.js)
  const { execSync } = await import('child_process');
  const cmd = `node scripts/generate-carousel-images.js "${outputDir}"`;

  execSync(cmd, {
    stdio: 'inherit',
    timeout: 60000 // 60s timeout
  });

  // Validate images were created
  const validation = validateImages(outputDir, specs);
  if (!validation.valid) {
    throw new ValidationError('MISSING_IMAGES', `Missing images: ${validation.missing.join(', ')}`);
  }

  return { success: true, images: validation.existing };
}
```

**Output:**
- `slide-XX-bg.png` for each slide with `image_required: true`

**Validation:**
- All required images exist
- Images are valid PNG files
- Images are approximately 1024x1024px (DALL-E output)

---

### Step 6: CALL Craft Specialist → Render HTML

**Agent:** Craft Specialist (Marcus)
**Task:** `render-carousel-slides`
**Duration:** ~5-10s

**Input:**
- carousel-specs.json
- Background images (if generated)
- Output directory path

**Process:**
```javascript
async render_html() {
  // Call Craft Specialist (via render-carousel-from-specs.cjs)
  const { execSync } = await import('child_process');
  const cmd = `node scripts/render-carousel-from-specs.cjs "${outputDir}"`;

  execSync(cmd, {
    stdio: 'inherit',
    timeout: 30000 // 30s timeout
  });

  // Validate HTML files were created
  const validation = validateHTMLFiles(outputDir, specs);
  if (!validation.valid) {
    throw new ValidationError('MISSING_HTML', `Missing HTML files: ${validation.missing.join(', ')}`);
  }

  return { success: true, htmlFiles: validation.existing };
}
```

**Output:**
- `slide-XX.html` for each slide

**Validation:**
- All HTML files exist (one per slide)
- HTML files are valid (can be parsed)

---

### Step 7: CALL Export Specialist → Export PNG

**Agent:** Export Specialist (Nina)
**Task:** `export-slides-to-png`
**Duration:** ~15-20s

**Input:**
- HTML files
- Output directory path

**Process:**
```javascript
async export_png() {
  // Call Export Specialist (via export-slides-to-png.js)
  const { execSync } = await import('child_process');
  const cmd = `node scripts/export-slides-to-png.js "${outputDir}"`;

  execSync(cmd, {
    stdio: 'inherit',
    timeout: 45000 // 45s timeout
  });

  // Validate PNG files were created
  const validation = validatePNGs(outputDir, specs);
  if (!validation.valid) {
    throw new ValidationError('MISSING_PNGS', `Missing PNG files: ${validation.missing.join(', ')}`);
  }

  return { success: true, pngFiles: validation.existing };
}
```

**Output:**
- `slide-XX.png` (1080x1350px, Instagram format)

**Validation:**
- All PNG files exist (one per slide)
- PNG dimensions are 1080x1350px
- File sizes are reasonable (50KB-500KB)

---

### Step 8: VALIDATE Outputs

**Agent:** Orchestrator
**Duration:** < 1s

**Final Validation:**

```javascript
async validate_outputs() {
  const validations = [];

  // Check carousel-specs.json
  const specsPath = path.join(outputDir, 'carousel-specs.json');
  validations.push({
    name: 'carousel-specs.json',
    exists: fs.existsSync(specsPath),
    valid: validateSpecs(JSON.parse(fs.readFileSync(specsPath))).valid
  });

  // Check images (if used)
  if (config.use_dalle) {
    const imageValidation = validateImages(outputDir, specs);
    validations.push({
      name: 'background-images',
      exists: imageValidation.valid,
      count: imageValidation.existing?.length
    });
  }

  // Check HTML files
  const htmlValidation = validateHTMLFiles(outputDir, specs);
  validations.push({
    name: 'html-files',
    exists: htmlValidation.valid,
    count: htmlValidation.existing?.length
  });

  // Check PNG files
  const pngValidation = validatePNGs(outputDir, specs);
  validations.push({
    name: 'png-files',
    exists: pngValidation.valid,
    count: pngValidation.existing?.length
  });

  // Check all validations passed
  const allValid = validations.every(v => v.exists && v.valid !== false);

  if (!allValid) {
    const failed = validations.filter(v => !v.exists || v.valid === false);
    throw new ValidationError('OUTPUT_VALIDATION_FAILED', `Failed validations: ${failed.map(f => f.name).join(', ')}`);
  }

  return { valid: true, validations };
}
```

---

### Step 9: RETURN Results

**Agent:** Orchestrator
**Duration:** < 1s

**Return Structure:**

```javascript
{
  success: true,
  output_dir: "output/workshop-2025-10-06-12-30-45",
  specs_file: "output/workshop-2025-10-06-12-30-45/carousel-specs.json",

  slide_count: 8,

  files: {
    specs: "carousel-specs.json",
    images: [
      "slide-01-bg.png",
      "slide-02-bg.png",
      // ...
    ],
    html: [
      "slide-01.html",
      "slide-02.html",
      // ...
    ],
    png: [
      "slide-01.png",
      "slide-02.png",
      // ...
    ]
  },

  timing: {
    total_seconds: 87,
    steps: {
      elicit: 30,
      validate: 1,
      specs: 12,
      images: 38,
      html: 8,
      png: 18,
      validate_outputs: 1
    }
  },

  message: "✅ Carousel generated successfully in output/workshop-2025-10-06-12-30-45"
}
```

---

## ⚠️ Error Handling

### Error Types

```javascript
class WorkflowError extends Error {
  constructor(code, message, context = {}) {
    super(message);
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

class ValidationError extends WorkflowError {
  constructor(code, message) {
    super(code, message, { type: 'validation' });
  }
}

class AgentError extends WorkflowError {
  constructor(agent, message, originalError) {
    super(
      `AGENT_ERROR_${agent.toUpperCase()}`,
      message,
      { agent, originalError }
    );
  }
}
```

### Error Codes

| Code | Description | Recovery |
|------|-------------|----------|
| `FILE_NOT_FOUND` | Content file doesn't exist | Check path, provide valid file |
| `FILE_NOT_READABLE` | Cannot read content file | Check permissions |
| `CONTENT_TOO_SHORT` | Content < 500 chars | Provide more content |
| `CONTENT_TOO_LONG` | Content > 50000 chars | Split into multiple carousels |
| `INVALID_SLIDE_COUNT` | Slide count outside 5-10 | Adjust slide count |
| `INVALID_THEME` | Theme not recognized | Use: minimalist, bold, editorial |
| `INVALID_COLOR_FORMAT` | Colors don't match pattern | Use format: word/word/word |
| `INVALID_SPECS` | Generated specs invalid | Check Story Strategist output |
| `MISSING_IMAGES` | Required images not generated | Check DALL-E API key, retry |
| `MISSING_HTML` | HTML files not rendered | Check templates exist |
| `MISSING_PNGS` | PNG files not exported | Check Puppeteer, retry |
| `AGENT_ERROR_*` | Agent execution failed | Check logs, retry |

### Rollback Mechanism

```javascript
async rollback() {
  console.log(chalk.yellow('⚠️  Error detected. Rolling back...'));

  try {
    // 1. Remove output directory
    if (this.outputDir && fs.existsSync(this.outputDir)) {
      console.log(chalk.yellow(`  Removing ${this.outputDir}`));
      fs.rmSync(this.outputDir, { recursive: true, force: true });
    }

    // 2. Log error details
    const errorLog = {
      timestamp: new Date().toISOString(),
      workflow: 'unified-carousel-generation',
      config: this.config,
      outputDir: this.outputDir,
      lastSuccessfulStep: this.currentStep,
      error: {
        code: this.lastError?.code,
        message: this.lastError?.message,
        stack: this.lastError?.stack
      }
    };

    const errorLogPath = `output/errors/error-${Date.now()}.json`;
    fs.mkdirSync('output/errors', { recursive: true });
    fs.writeFileSync(errorLogPath, JSON.stringify(errorLog, null, 2));

    console.log(chalk.red(`  Error log saved: ${errorLogPath}`));

    // 3. Provide recovery suggestions
    const suggestions = this.getRecoverySuggestions(this.lastError);
    if (suggestions) {
      console.log(chalk.cyan('\n💡 Recovery suggestions:'));
      suggestions.forEach(s => console.log(chalk.cyan(`  - ${s}`)));
    }

  } catch (rollbackError) {
    console.error(chalk.red(`Error during rollback: ${rollbackError.message}`));
  }
}

getRecoverySuggestions(error) {
  const suggestions = {
    'FILE_NOT_FOUND': [
      'Verify the file path is correct',
      'Use absolute path or path relative to current directory',
      'Check file exists: ls -la <path>'
    ],
    'MISSING_IMAGES': [
      'Check OPENAI_API_KEY is set in .env',
      'Verify OpenAI account has credits',
      'Try running with use_dalle=false to skip images'
    ],
    'AGENT_ERROR_STORY_STRATEGIST': [
      'Check ANTHROPIC_API_KEY is set in .env',
      'Verify Claude API access',
      'Check content is not too long (< 50000 chars)'
    ]
  };

  return suggestions[error?.code] || null;
}
```

---

## 📊 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Total Time** | < 90s | For 8 slides with DALL-E images |
| **Total Time (no images)** | < 30s | Without DALL-E generation |
| **Elicitation** | < 30s | User input time |
| **Specs Generation** | < 15s | Claude API call |
| **Image Generation** | < 45s | Depends on slide count (5-10s per image) |
| **HTML Rendering** | < 10s | Template processing |
| **PNG Export** | < 20s | Puppeteer screenshots |

---

## 🧪 Testing

### Unit Tests
- Test each step in isolation
- Mock agent calls
- Test error handling
- Test validation logic

### Integration Tests
- Test step sequences
- Test with real agents (using test API keys)
- Test rollback mechanism

### End-to-End Tests
- Test complete workflow
- Measure timing
- Validate outputs
- Test with different configs

---

## 📝 Usage Examples

### Via Orchestrator Script

```bash
# Full parameters
node scripts/orchestrate-carousel.js \
  content.txt \
  8 \
  minimalist \
  "preto/branco/dourado" \
  true

# Minimal (uses defaults)
node scripts/orchestrate-carousel.js content.txt

# Without images
node scripts/orchestrate-carousel.js content.txt 6 bold "azul/branco/laranja" false
```

### Via Arcadia Command

```
*generate-carousel
```

### Via Slash Command

```
/instagram:carousel
```

---

## 🔗 Related Files

- `scripts/orchestrate-carousel.js` - Main orchestrator implementation
- `scripts/break-into-carousel.js` - Story Strategist executable
- `scripts/utils/validate-carousel.js` - Validation utilities
- `.arcadia-core/agents/story-strategist.md` - Story Strategist agent definition
- `ateliers/carousel/` - Instagram-specific agents and templates

---

**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2025-10-06
