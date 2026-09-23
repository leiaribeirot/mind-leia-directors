# Layout Composition Options
## Sistema Adaptativo de Composição (não templates fixos!)

**Filosofia:** Templates são REFERÊNCIA, não prisão. A IA deve CRIAR livremente baseada em opções claras.

---

## 🎨 PRINCÍPIOS FUNDAMENTAIS

### 1. Templates = Referência
❌ **ERRADO:** "Use Pattern 5 exatamente como definido"
✅ **CORRETO:** "Veja as opções e crie baseado na copy + imagem"

### 2. IA Cria, Não Preenche
❌ **ERRADO:** Preencher campos {{box_1_content}}, {{box_2_content}}
✅ **CORRETO:** Ler copy → analisar imagem → decidir layout → criar HTML

### 3. Adaptação Inteligente
- Copy longa? Mais caixinhas (3-4)
- Copy curta? Menos caixinhas (1-2) + imagem maior
- Foto forte? Menos scrim, mais visibilidade
- Foto fraca? Mais scrim, foco no texto

---

## 📐 OS 5 LAYOUTS FUNDAMENTAIS DO INSTAGRAM STORIES

### LAYOUT 1: Foto Apagada + Caixinhas Por Cima 📦
**Mais comum, mais versátil**

```
Foto 1080x1920 full bleed (z-index: 0)
Scrim sutil 0.25-0.40 (z-index: 1) ← Foto apagada
3-4 caixinhas empilhadas (z-index: 10) ← Por cima
```

**Quando usar:**
- Foto interessante mas não dramática
- Copy médio-longo (8-12 linhas, 3-4 blocos)
- Tom: narrativo, manifesto, pessoal, educacional
- Pode ocupar página inteira com texto espalhado

**Características:**
- Caixinhas podem estar mais espalhadas ou concentradas
- Mix: 2-3 pretas + 1 branca final
- Texto bem legível (scrim ajuda contraste)

**Referência:** Lei do Fogo, @soudaviribas stories, ref 1

**Decisão IA:**
```javascript
if (photo.strength === "medium-strong" && copy.length > 500) {
  return "LAYOUT_1_APAGADA_CAIXINHAS";
}
```

---

### LAYOUT 2: Foto Elemento Topo + Texto Embaixo 🖼️⬇️
**Foto como ELEMENTO (16:9) no topo, texto embaixo no preto**

```
Fundo PRETO 1080x1920
Foto ELEMENTO topo (~45% altura, 16:9 landscape) ← Como imagem inserida
Texto embaixo no preto (~55%) com/sem caixinha
```

**CRITICAL:** Foto NÃO é full bleed! É um **elemento <img> inserido** tipo slide!

**Quando usar:**
- Foto landscape/horizontal (16:9)
- Copy médio (5-8 linhas)
- Tom: statement, quote, pessoal, educacional

**VARIAÇÕES:**
- **2A: COM caixinha** - 2-3 caixinhas embaixo da foto
- **2B: SEM caixinha** - texto branco direto no preto

**Características:**
- Foto tem `border-radius: 16px` (arredondada)
- Foto tem `box-shadow` (parece elemento inserido)
- Fundo preto sólido, não gradient
- Texto embaixo com boa legibilidade (fundo preto)

**⚠️ CRÍTICO - Safe Zones:**
- Padding-top: 2vh mínimo (evita invasão da safe zone superior 384px)
- max-height: 40vh (NÃO 45vh) - respeita limites verticais dentro dos 1152px úteis

**CSS estrutura:**
```css
.story {
  background: #000;
  display: flex;
  flex-direction: column;
  padding: 384px 0 384px 0; /* Safe zones obrigatórias */
}

.photo-container {
  padding: 2vh 4vh 4vh 4vh; /* 2vh topo = margem de segurança */
}

.photo-element {
  width: 100%;
  max-height: 40vh; /* MÁXIMO 40vh - respeita safe zones! */
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  object-fit: cover;
}
```

**Referência:** Newsletter guy (ref com pessoa sorrindo)

**Decisão IA:**
```javascript
if (photo.aspectRatio === "landscape" && copy.length < 500) {
  return {
    type: "LAYOUT_2_FOTO_ELEMENTO_TOPO",
    photoPosition: "top",
    photoHeight: "45vh",
    textPosition: "bottom",
    background: "#000" // Preto sólido
  };
}
```

---

### LAYOUT 3: Texto Topo + Foto Elemento Embaixo 🔼🖼️
**INVERTIDO do Layout 2 - Texto topo, foto elemento embaixo**

```
Fundo PRETO 1080x1920
Texto topo no preto (~50-60%) com/sem caixinha
Foto ELEMENTO embaixo (~40-50% altura, 16:9) ← Como imagem inserida
```

**CRITICAL:** Foto NÃO é full bleed! É um **elemento <img> inserido** embaixo do texto!

**Quando usar:**
- Foto landscape/horizontal (16:9)
- Copy médio-longo (6-10 linhas)
- Tom: conceitual, statement, educacional
- Foto é ILUSTRAÇÃO do conceito (não protagonista)

**VARIAÇÕES:**
- **3A: COM caixinha** - 2-3 caixinhas brancas + texto direto topo
- **3B: SEM caixinha** - todo texto branco direto no preto

**Características:**
- Texto vem PRIMEIRO (hierarquia: texto > foto)
- Foto tem `border-radius: 16px` (arredondada)
- Foto tem `box-shadow`
- Fundo preto sólido
- Menos comum que Layout 2, mas forte impacto

**⚠️ CRÍTICO - Safe Zones:**
- Padding-bottom: 2vh mínimo (evita invasão da safe zone inferior 384px)
- max-height: 45vh (NÃO 50vh) - respeita limites verticais

**CSS estrutura:**
```css
.story {
  background: #000;
  display: flex;
  flex-direction: column;
  padding: 384px 0 384px 0; /* Safe zones obrigatórias */
}

.text-area {
  flex: 0 0 auto; /* Topo */
  padding: 0 6vh 4vh 6vh;
}

.photo-container {
  flex: 1 1 auto; /* Embaixo */
  display: flex;
  align-items: flex-end;
  padding: 0 4vh 2vh 4vh; /* 2vh embaixo = margem de segurança */
}

.photo-element {
  width: 100%;
  max-height: 45vh; /* MÁXIMO 45vh - respeita safe zones! */
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
```

**Referência:** Ref "Padrões de gênios" (texto + caixinhas + foto biblioteca embaixo)

**Decisão IA:**
```javascript
if (photo.aspectRatio === "landscape" && copy.length > 500) {
  return {
    type: "LAYOUT_3_TEXTO_TOPO_FOTO_ELEMENTO",
    textPosition: "top",
    photoPosition: "bottom",
    photoHeight: "45-50vh",
    background: "#000" // Preto sólido
  };
}
```

---

### LAYOUT 4: Foto Forte + Texto Inteligente 🎨✨
**MAIS DIFÍCIL - Texto acompanha composição da foto**

```
Foto 1080x1920 full bleed (z-index: 0)
Scrim MUITO leve 0.1-0.2 (z-index: 1) ← Foto aparece forte
Texto posicionado estrategicamente (z-index: 10)
```

**Quando usar:**
- Foto MUITO forte, dramática, alta qualidade
- Copy BREVE (3-5 linhas, 1-2 blocos)
- Tom: impactante, statement, artsy
- Texto ou é pouco OU acompanha bem a foto

**CRITICAL - IA PRECISA:**
1. Analisar composição da foto (onde estão elementos visuais)
2. Identificar "espaços vazios" na foto
3. Posicionar texto onde NÃO compete com foto
4. Usar caixinha MÍNIMA ou nenhuma (text-shadow se necessário)

**Características:**
- Texto pequeno/breve para não competir
- Foto é a ESTRELA, texto é complemento
- Scrim quase nenhum (foto aparece 80-90%)
- Posicionamento adaptativo (esquerda, direita, topo, canto)

**Exemplo:**
- Foto pessoa olhando esquerda → Texto posiciona direita
- Foto céu limpo topo → Texto posiciona topo-centro
- Foto objeto centro → Texto posiciona inferior

**Referência:** Stories artísticos, campanhas de marca

**Decisão IA:**
```javascript
if (photo.strength === "very-strong" && copy.length < 300) {
  const composition = analyzePhotoComposition(photo); // ← NOVO
  const textPosition = findBestTextPosition(composition); // ← NOVO
  return {
    type: "LAYOUT_4_FOTO_FORTE",
    textPosition: textPosition, // "top-right", "bottom-left", etc
    scrim: 0.15,
    boxes: 0, // Sem caixinha ou 1 mínima
    textShadow: "strong" // Para legibilidade
  };
}
```

**⚠️ NOTA:** Este é o layout MAIS COMPLEXO. Precisa de análise visual avançada da foto.

---

### LAYOUT 5: Texto Impactante + Fundo Dramático 💥
**Minimal, statement, máximo impacto**

```
Fundo: Foto dramática OU preto sólido (z-index: 0)
Scrim: Nenhum ou muito leve (z-index: 1)
Texto: Centro, grande, sem caixinha (z-index: 10)
```

**Quando usar:**
- Copy MUITO BREVE (1-3 linhas)
- Frase impactante, statement, quote
- Tom: dramático, minimalista, brand

**VARIAÇÕES:**
- **5A: Foto dramática** - Foto forte + texto breve centro
- **5B: Preto sólido** - Fundo preto + texto branco centro
- **5C: Gradiente** - Fundo gradiente suave + texto

**Características:**
- SEM caixinha
- Texto GRANDE (32-40px)
- Máximo 3 linhas
- Centralizado
- Font-weight 700-900 (bold/black)

**Referência:** Quotes, anúncios, CTA forte

**Decisão IA:**
```javascript
if (copy.length < 150 && copy.blocks === 1) {
  if (photo.mood === "dramatic" || photo.strength === "very-strong") {
    return "LAYOUT_5A_FOTO_DRAMATICA";
  } else {
    return "LAYOUT_5B_PRETO_SOLIDO"; // Sem foto
  }
}
```

---

## 🔧 OPÇÕES DE CAIXINHA (mix conforme necessário)

### Tipo A: Caixinha Preta Arredondada
```css
background: rgba(0, 0, 0, 0.82-0.88)
padding: 2vh 3.5vh
border-radius: 18-22px
backdrop-filter: blur(10px)
width: fit-content
max-width: 85%
```

**Uso:** Texto corpo, parágrafos principais

---

### Tipo B: Caixinha Branca Arredondada
```css
background: rgba(255, 255, 255, 0.95-0.98)
padding: 2vh 3.5vh
border-radius: 18-22px
width: fit-content
max-width: 85%
```

**Uso:** Destaque final, CTA, headline importante

---

### Tipo C: Caixinha Título Maior
```css
background: rgba(0 ou 255, 0.95)
padding: 2.5vh 4vh
border-radius: 20-24px
font-size: 26-32px
font-weight: 700
width: fit-content
max-width: 80%
```

**Uso:** Headline primeira caixinha

---

### Tipo D: Sem Caixinha (texto direto)
```css
color: #fff
text-shadow: 0 2px 8px rgba(0,0,0,0.6)
font-size: 24-30px
line-height: 1.4
```

**Uso:** Raro, quando foto é muito escura

---

## 🎯 DECISÃO ADAPTATIVA

### Input do Copywriter:
```json
{
  "slides": [
    {
      "blocks": [
        {"type": "headline", "text": "...", "emphasis": true},
        {"type": "body", "text": "...", "length": "medium"},
        {"type": "body", "text": "...", "length": "long"},
        {"type": "cta", "text": "...", "emphasis": true}
      ]
    }
  ]
}
```

### Input do Image Curator:
```json
{
  "photo_strength": "strong", // strong, medium, weak
  "focal_point": "center", // top, center, bottom
  "mood": "dark", // dark, light, neutral
  "needs_scrim": true
}
```

### Decisão do Layout Composer:
```
SE photo_strength = "strong" E copy length = "long":
  → OPÇÃO 1: Foto full bleed + 4 caixinhas centralizadas
  → Scrim leve (0.3)
  → 3 caixinhas pretas + 1 branca final

SE photo_strength = "medium" E copy length = "medium":
  → OPÇÃO 2: Foto full bleed + 3 caixinhas inferior
  → Scrim gradient bottom
  → 2 caixinhas pretas + 1 branca

SE photo_strength = "weak" E copy length = "very long":
  → OPÇÃO 4: Foto 50% + área preta 50%
  → Sem scrim (foto já é pequena)
  → Texto direto na área preta
```

---

## 💡 EXEMPLOS DE COMPOSIÇÃO ADAPTATIVA

### Exemplo 1: "Lei do Fogo" (narrativo, 12 linhas)
**Input:**
- Copy: 4 blocos (headline + 2 body + cta)
- Foto: Fire close-up (strong, center, dark)

**Decisão IA:**
```html
<foto-full-bleed brightness="0.5" />
<scrim opacity="0.3" />
<caixinha-branca position="center-top">
  Todo fogo tem uma função
</caixinha-branca>
<caixinha-preta position="center">
  Seja na fogueira da tribo ou na forja...
</caixinha-preta>
<caixinha-preta position="center">
  Mas tem um terceiro tipo de fogo...
</caixinha-preta>
<caixinha-branca position="center-bottom">
  Que tipo de fogo você é?
</caixinha-branca>
```

**Justificativa:**
- Foto forte → full bleed
- 4 blocos → 4 caixinhas
- Tom narrativo → caixinhas centralizadas
- Ênfase headline + CTA → brancas

---

### Exemplo 2: "Newsletter Substack" (curto, 6 linhas)
**Input:**
- Copy: 3 blocos (headline + body + cta)
- Foto: Pessoa sorrindo (strong, top, light)

**Decisão IA:**
```html
<foto-full-bleed brightness="0.6" focal="top" />
<scrim-gradient from="transparent" to="rgba(0,0,0,0.7)" />
<caixinha-preta position="center-bottom">
  Vou começar uma newsletter/substack
</caixinha-preta>
<caixinha-preta position="center-bottom">
  Já escrevi duas e vou liberar para as primeiras pessoas receberem
</caixinha-preta>
<caixinha-branca position="center-bottom">
  Quer entrar na lista? Me manda aqui
</caixinha-branca>
```

**Justificativa:**
- Foto com rosto → foco top, caixinhas embaixo
- 3 blocos curtos → 3 caixinhas compactas
- Gradient bottom → protege texto, mostra foto
- CTA final → caixinha branca destaque

---

### Exemplo 3: "Padrões de Gênios" (conceitual, 8 linhas)
**Input:**
- Copy: 2 blocos + 2 caixinhas destaque
- Foto: Biblioteca/meeting (medium, center, neutral)

**Decisão IA:**
```html
<foto-full-bleed brightness="0.45" />
<scrim opacity="0.4" />
<texto-direto position="top" shadow="strong">
  A grande verdade é que isso não foi sorte.
  Muito menos um prompt mágico.
  E isso só confirma o que eu venho estudando há mais de 10 anos:
</texto-direto>
<caixinha-branca position="center">
  Os padrões de sucesso dos maiores gênios da história.
</caixinha-branca>
<caixinha-branca position="center">
  E o que REALMENTE fez eles terem tanto sucesso.
</caixinha-branca>
```

**Justificativa:**
- Copy conceitual → texto direto (sem caixinha) + 2 caixinhas ênfase
- Foto biblioteca → scrim médio para legibilidade
- 2 caixinhas brancas → destaque máximo nos conceitos-chave

---

## 🚀 IMPLEMENTAÇÃO NO LAYOUT COMPOSER

### Passo 1: Analisar Inputs
```javascript
function analyzeInputs(copy, photo) {
  const copyLength = calculateLines(copy.blocks);
  const photoStrength = photo.strength; // strong, medium, weak
  const copyBlocks = copy.blocks.length;

  return { copyLength, photoStrength, copyBlocks };
}
```

### Passo 2: Decidir Layout Option
```javascript
function selectLayoutOption(analysis) {
  if (analysis.photoStrength === "strong" && analysis.copyLength > 8) {
    return "OPTION_1_CENTERED_BOXES";
  }
  if (analysis.photoStrength === "strong" && analysis.copyLength < 8) {
    return "OPTION_2_BOTTOM_BOXES";
  }
  if (analysis.photoStrength === "weak" && analysis.copyLength > 12) {
    return "OPTION_4_PARTIAL_PHOTO";
  }
  // ... mais regras
}
```

### Passo 3: Compor HTML Adaptativo
```javascript
function composeHTML(layoutOption, copy, photo) {
  const html = createBaseStructure(photo);

  if (layoutOption === "OPTION_1_CENTERED_BOXES") {
    html.addScrim(0.3);
    copy.blocks.forEach((block, i) => {
      const boxType = block.emphasis ? "white" : "black";
      const boxStyle = i === 0 ? "title" : "body";
      html.addBox(block.text, boxType, boxStyle, "center");
    });
  }

  return html.render();
}
```

---

## ✅ CAIXINHAS ORGÂNICAS (ajustadas!)

### Mudanças de Design:
```css
/* ANTES (retangular demais): */
border-radius: 12px;
padding: 3vh 5vh;

/* AGORA (orgânico): */
border-radius: 18-22px; /* MAIS ARREDONDADO */
padding: 2vh 3.5vh; /* MAIS APERTADO */
```

### Variação por tipo:
- **Caixinha pequena:** border-radius: 18px
- **Caixinha média:** border-radius: 20px
- **Caixinha título:** border-radius: 22-24px

### Width adaptável:
```css
width: fit-content; /* Sempre! */
max-width: 85%; /* Não muito larga */
```

---

## 📊 DECISÃO FLOWCHART

```
START
  ↓
Analisar Copy (linhas, blocos, tom)
  ↓
Analisar Foto (força, focal point, mood)
  ↓
┌─────────────────────┐
│ Copy > 10 linhas?   │
└─────────────────────┘
  ↓ SIM              ↓ NÃO
OPÇÃO 1/4         OPÇÃO 2/3
  ↓
┌─────────────────────┐
│ Foto strength?      │
└─────────────────────┘
  ↓ Strong      ↓ Weak
Full bleed    Partial
  ↓
┌─────────────────────┐
│ Quantas caixinhas?  │
└─────────────────────┘
  ↓
N° blocos = N° caixinhas
  ↓
Compor HTML
  ↓
END
```

---

**Última atualização:** 2025-10-02 v3
**Filosofia:** Templates são guias, não prisões. A IA decide!
