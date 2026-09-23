# Task: Break Into Carousel

**Task ID:** break-into-carousel
**Agent:** Story Strategist (Alex)
**Purpose:** Break long content into 5-10 carousel slides for Instagram feed

---

## Input Schema

```json
{
  "content": "Long text to break into slides (500-2000 words)",
  "num_slides": 6,
  "format": "1:1"
}
```

## Output Schema

```json
{
  "slides": [
    {
      "position": 1,
      "type": "cover",
      "title": "Hook Title",
      "subtitle": "Subtitle opcional",
      "body": null,
      "use_photo": true
    },
    {
      "position": 2,
      "type": "content",
      "title": "Título do slide",
      "body": "Conteúdo do slide...",
      "use_photo": false
    },
    {
      "position": 3,
      "type": "list",
      "title": "Tópicos",
      "list_items": [
        "Item 1 com explicação",
        "Item 2 com explicação",
        "Item 3 com explicação"
      ],
      "use_photo": false
    },
    {
      "position": 4,
      "type": "stat",
      "stat_value": "75%",
      "stat_label": "dos profissionais",
      "body": "Explicação do dado",
      "use_photo": false
    },
    {
      "position": 6,
      "type": "cta",
      "title": "Título final",
      "body": "Mensagem final",
      "cta": "Me siga para mais",
      "use_photo": true
    }
  ],
  "total_slides": 6,
  "visual_theme": {
    "accent_color": "#30E0C0",
    "backgrounds": ["#ffffff", "#f5f5f5", "#1a1a1a"],
    "text_colors": ["#1a1a1a", "#ffffff"]
  }
}
```

---

## Execution Logic

### Step 1: Analyze Content

```javascript
function analyzeContent(content) {
  return {
    total_length: content.length,
    num_paragraphs: content.split('\n\n').length,
    has_lists: /[-•]\s/.test(content),
    has_stats: /\d+%/.test(content),
    tone: detectTone(content) // "educacional", "motivacional", etc
  };
}
```

### Step 2: Determine Slide Structure

**Estrutura padrão (6 slides):**

1. **Slide 1 (Cover)** - Hook + visual impactante
2. **Slide 2-3 (Content)** - Desenvolvimento do conceito
3. **Slide 4 (List ou Stat)** - Tópicos ou dados
4. **Slide 5 (Content)** - Continuação/conclusão
5. **Slide 6 (CTA)** - Call to action

**Para 8-10 slides:**
- Adicionar mais slides de content/list
- Manter 1 cover + 1 CTA
- Variar tipos (content, list, stat, highlight)

### Step 3: Extract Slide Content

```javascript
function extractSlides(content, numSlides) {
  const slides = [];

  // Slide 1: Cover (sempre)
  slides.push({
    position: 1,
    type: 'cover',
    title: extractHook(content),
    subtitle: extractSubhook(content),
    use_photo: true
  });

  // Slides intermediários
  const mainContent = content.split('\n\n').slice(1, -1);
  const chunksPerSlide = Math.ceil(mainContent.length / (numSlides - 2));

  for (let i = 0; i < numSlides - 2; i++) {
    const chunk = mainContent.slice(i * chunksPerSlide, (i + 1) * chunksPerSlide);

    // Detectar tipo do slide
    if (chunk.some(p => p.includes('•') || p.includes('-'))) {
      slides.push({
        position: i + 2,
        type: 'list',
        title: extractTitle(chunk[0]),
        list_items: extractListItems(chunk),
        use_photo: false
      });
    } else if (chunk.some(p => /\d+%/.test(p))) {
      slides.push({
        position: i + 2,
        type: 'stat',
        stat_value: extractStat(chunk),
        stat_label: extractStatLabel(chunk),
        body: chunk.join('\n'),
        use_photo: false
      });
    } else {
      slides.push({
        position: i + 2,
        type: 'content',
        title: extractTitle(chunk[0]),
        body: chunk.join('\n\n'),
        use_photo: false
      });
    }
  }

  // Último slide: CTA (sempre)
  slides.push({
    position: numSlides,
    type: 'cta',
    title: 'Quer saber mais?',
    body: 'Acompanhe para mais insights como este',
    cta: 'Me siga @usuario',
    use_photo: true
  });

  return slides;
}
```

### Step 4: Define Visual Theme

```javascript
function defineVisualTheme(tone, numSlides) {
  const themes = {
    'educacional': {
      accent_color: '#F7B731', // Amarelo conhecimento
      backgrounds: ['#ffffff', '#f8f9fa', '#1a1a1a'],
      text_colors: ['#1a1a1a', '#ffffff']
    },
    'motivacional': {
      accent_color: '#30E0C0', // Verde transformação
      backgrounds: ['#ffffff', '#f5f5f5', '#000000'],
      text_colors: ['#1a1a1a', '#ffffff']
    },
    'corporativo': {
      accent_color: '#3498DB', // Azul confiança
      backgrounds: ['#ffffff', '#ecf0f1', '#2c3e50'],
      text_colors: ['#2c3e50', '#ffffff']
    }
  };

  return themes[tone] || themes['educacional'];
}
```

---

## Slide Type Guidelines

### Cover Slide (Position 1)
```yaml
purpose: "Hook que para o scroll"
elements:
  - title: "Frase de impacto (5-8 palavras)"
  - subtitle: "Complemento opcional"
  - photo: true (sempre usar foto)
style:
  - text_align: center
  - title_size: 52px
  - bold_weight: 900
```

### Content Slide
```yaml
purpose: "Explicação de conceito"
elements:
  - title: "Tópico principal"
  - body: "2-4 parágrafos curtos"
style:
  - text_align: left
  - title_size: 36px
  - body_size: 20px
```

### List Slide
```yaml
purpose: "Tópicos ou passos"
elements:
  - title: "Título da lista"
  - list_items: [3-5 items]
style:
  - numbered: true
  - item_icon: "circled number"
```

### Stat Slide
```yaml
purpose: "Dados que impressionam"
elements:
  - stat_value: "75%"
  - stat_label: "dos profissionais"
  - body: "Contexto do dado"
style:
  - stat_size: 72px
  - accent_color: highlight stat
```

### CTA Slide (Last)
```yaml
purpose: "Call to action"
elements:
  - title: "Mensagem final"
  - body: "Incentivo"
  - cta: "Me siga @usuario"
  - photo: true (sempre)
style:
  - button_style: rounded
  - accent_bg: true
```

---

## Example Execution

**Input:**
```
Content: "Você sabia que 75% dos profissionais falham em X?

O motivo é simples: eles focam em A quando deveriam focar em B.

Aqui estão os 3 passos:
• Passo 1: Fazer X
• Passo 2: Fazer Y
• Passo 3: Fazer Z

Quando você aplica isso, os resultados aparecem em semanas.

Quer dominar isso? Me segue!"

num_slides: 5
```

**Output:**
```json
{
  "slides": [
    {
      "position": 1,
      "type": "cover",
      "title": "75% dos profissionais falham nisso",
      "subtitle": "E você pode estar cometendo o mesmo erro",
      "use_photo": true
    },
    {
      "position": 2,
      "type": "content",
      "title": "O erro que você não percebe",
      "body": "O motivo é simples: eles focam em A quando deveriam focar em B.",
      "use_photo": false
    },
    {
      "position": 3,
      "type": "list",
      "title": "Os 3 passos para acertar",
      "list_items": [
        "Passo 1: Fazer X",
        "Passo 2: Fazer Y",
        "Passo 3: Fazer Z"
      ],
      "use_photo": false
    },
    {
      "position": 4,
      "type": "content",
      "title": "Resultados em semanas",
      "body": "Quando você aplica isso, os resultados aparecem rapidamente.",
      "use_photo": false
    },
    {
      "position": 5,
      "type": "cta",
      "title": "Quer dominar isso?",
      "body": "Acompanhe para mais insights práticos",
      "cta": "Me siga @usuario",
      "use_photo": true
    }
  ],
  "total_slides": 5,
  "visual_theme": {
    "accent_color": "#30E0C0",
    "backgrounds": ["#ffffff", "#f5f5f5", "#1a1a1a"],
    "text_colors": ["#1a1a1a", "#ffffff"]
  }
}
```

---

**Task Status:** ✅ Ready for execution
**Agent:** Story Strategist (Alex)
**Priority:** High (carousel is popular format)
