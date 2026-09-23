# Regras de Composição Adaptativa
## A IA NÃO deve copiar templates - deve ADAPTAR ao conteúdo!

---

## 🚨 PROBLEMA CRÍTICO

**❌ ERRADO:**
```
IA pega template → Copia estrutura → Cola texto → Vaza do 9:16
```

**✅ CORRETO:**
```
IA analisa espaço disponível → Calcula quanto texto cabe → Ajusta font-size/gaps/linhas → Garante que cabe no 9:16
```

---

## 📐 MATEMÁTICA DO 9:16

```
Total height: 1920px (100%)
Safe zones:   384px top + 384px bottom (40% total)
Área útil:    1152px (60%)

Se Layout 2 (foto elemento topo):
  Foto elemento:  ~460px (40vh de 1152px) + margens
  Espaço texto:   ~650px restantes

Se 6 caixinhas:
  Cada caixinha:  ~100px altura (texto + padding + gap)
  6 caixinhas:    ~600px

  ✅ CABE? SIM (650px disponíveis)

Se 8 caixinhas:
  8 caixinhas:    ~800px

  ❌ CABE? NÃO! (só 650px disponíveis)
  → IA DEVE REDUZIR font-size OU reduzir quantidade de caixinhas
```

---

## 🎯 REGRAS DE ADAPTAÇÃO

### Regra 1: Calcular Espaço Disponível PRIMEIRO

```javascript
// ANTES de compor, calcular:
const totalHeight = 1920;
const safeZones = 384 * 2; // top + bottom
const usableHeight = totalHeight - safeZones; // 1152px

if (layout === "LAYOUT_2_FOTO_TOPO") {
  const photoHeight = usableHeight * 0.40; // ~460px
  const textSpaceAvailable = usableHeight * 0.56; // ~650px (deixa margem)

  // Agora calcular quantas caixinhas cabem:
  const numBoxes = copyBlocks.length; // ex: 6
  const avgBoxHeight = 100; // estimativa
  const totalTextHeight = numBoxes * avgBoxHeight;

  if (totalTextHeight > textSpaceAvailable) {
    // ❌ NÃO CABE! Precisa ADAPTAR:
    adaptText(numBoxes, textSpaceAvailable);
  }
}
```

### Regra 2: Estratégias de Adaptação

Quando texto NÃO cabe no espaço disponível:

**Opção A: Reduzir font-size**
```css
/* Normal: */
font-size: clamp(22px, 2.8vh, 28px);
line-height: 1.45;
padding: 2vh 3.5vh;
gap: 2.5vh;

/* Compacto (quando tem 6+ caixinhas): */
font-size: clamp(19px, 2.3vh, 23px); /* -3px */
line-height: 1.35; /* -0.1 */
padding: 1.8vh 3vh; /* -0.2vh, -0.5vh */
gap: 1.8vh; /* -0.7vh */
```

**Opção B: Reduzir quantidade de caixinhas**
```javascript
// Se tinha 8 caixinhas:
// → Mesclar 2 caixinhas em 1 → 7 caixinhas
// → Ou remover linha menos importante → 7 caixinhas
```

**Opção C: Encurtar textos**
```javascript
// Linha original:
"Se você tem uma ideia parada há meses esperando o 'momento perfeito'..."

// Linha encurtada:
"Se você tem uma ideia parada há meses..."

// Economia: ~30 caracteres = ~1 linha
```

### Regra 3: Priorizar Legibilidade

```yaml
limites_minimos:
  font_size_min: 18px # Nunca menor que isso (ilegível)
  line_height_min: 1.3 # Nunca menor que isso (comprimido demais)
  padding_min: 1.5vh # Caixinhas precisam respirar
  gap_min: 1.5vh # Espaço entre caixinhas

se_atingir_limites:
  action: REDUZIR quantidade de caixinhas (Opção B)
  ou: MUDAR layout (ex: Layout 1 suporta mais texto)
```

---

## 📊 TABELA DE CAPACIDADES POR LAYOUT

| Layout | Espaço Texto | Caixinhas Recomendado | Font Normal | Font Compacto |
|--------|--------------|----------------------|-------------|---------------|
| Layout 1 (foto apagada) | ~900px (80%) | 8-12 | 22-28px | 19-23px |
| Layout 2 (foto topo) | ~650px (56%) | 4-6 | 22-28px | 19-23px |
| Layout 3 (foto embaixo) | ~700px (60%) | 5-7 | 22-28px | 19-23px |
| Layout 4 (foto forte) | ~800px (70%) | 3-5 (texto maior) | 28-35px | 24-30px |
| Layout 5 (minimal) | ~1000px (85%) | 1-3 (hero text) | 32-42px | 28-38px |

---

## 🔧 ALGORITMO DE DECISÃO

```javascript
function composeStory(copy, photo, layout) {
  // 1. CALCULAR ESPAÇO
  const space = calculateAvailableSpace(layout);

  // 2. ESTIMAR ALTURA DO CONTEÚDO
  const numBoxes = copy.blocks.length;
  const estimatedHeight = estimateContentHeight(copy, "normal");

  // 3. VERIFICAR SE CABE
  if (estimatedHeight <= space.textArea) {
    // ✅ CABE! Usar font normal
    return composeWithNormalFont(copy, layout);
  }

  // 4. NÃO CABE - TENTAR COMPACTAR
  const compactHeight = estimateContentHeight(copy, "compact");

  if (compactHeight <= space.textArea) {
    // ✅ CABE compactado! Usar font compacto
    return composeWithCompactFont(copy, layout);
  }

  // 5. AINDA NÃO CABE - REDUZIR CONTEÚDO
  if (numBoxes > 6) {
    // Opção: Mesclar caixinhas
    copy = mergeBoxes(copy, targetBoxes: 5);
    return composeWithCompactFont(copy, layout);
  }

  // 6. ÚLTIMA OPÇÃO - MUDAR LAYOUT
  console.warn(`Layout ${layout} não suporta ${numBoxes} caixinhas`);
  return suggestAlternativeLayout(copy, photo);
}
```

---

## 💡 EXEMPLOS PRÁTICOS

### Exemplo 1: Layout 2 com 6 caixinhas

```javascript
Input:
  layout: "LAYOUT_2_FOTO_TOPO"
  copy: {
    blocks: 6, // 6 caixinhas
    avgCharsPerBlock: 80 // ~2-3 linhas cada
  }

Cálculo:
  spaceAvailable: 650px
  estimatedNormal: 6 * 110px = 660px ❌ NÃO CABE
  estimatedCompact: 6 * 95px = 570px ✅ CABE

Decisão:
  ✅ Usar font compacto (19-23px)
  ✅ Line-height 1.35
  ✅ Gap 1.8vh
  ✅ Justify flex-start (aproveita espaço topo)
```

### Exemplo 2: Layout 2 com 8 caixinhas

```javascript
Input:
  layout: "LAYOUT_2_FOTO_TOPO"
  copy: {
    blocks: 8, // MUITAS caixinhas
    avgCharsPerBlock: 60
  }

Cálculo:
  spaceAvailable: 650px
  estimatedCompact: 8 * 95px = 760px ❌ NÃO CABE

Decisão:
  ❌ Não cabe nem compactado

  Opções:
  A) Mesclar 2 caixinhas → 7 caixinhas (7*95 = 665px) ⚠️ Apertado
  B) Mesclar 3 caixinhas → 6 caixinhas (6*95 = 570px) ✅ CABE
  C) Sugerir Layout 1 (suporta 8-12 caixinhas)

  ✅ ESCOLHER: Opção B ou C
```

### Exemplo 3: Layout 1 com 10 caixinhas

```javascript
Input:
  layout: "LAYOUT_1_FOTO_APAGADA"
  copy: {
    blocks: 10,
    avgCharsPerBlock: 70
  }

Cálculo:
  spaceAvailable: 900px (layout 1 suporta mais!)
  estimatedNormal: 10 * 110px = 1100px ❌ NÃO CABE
  estimatedCompact: 10 * 95px = 950px ⚠️ Apertado mas possível

Decisão:
  ✅ Usar font compacto
  ✅ Justify: space-between (distribui verticalmente)
  ✅ Pode usar área inteira (foto apagada = fundo)
```

---

## 🎨 CSS VARIABLES PARA ADAPTAÇÃO

```css
:root {
  /* FONT SIZES - Normal vs Compact */
  --text-size-normal: clamp(22px, 2.8vh, 28px);
  --text-size-compact: clamp(19px, 2.3vh, 23px);
  --text-size-minimal: clamp(18px, 2.1vh, 21px);

  /* LINE HEIGHTS */
  --line-height-normal: 1.45;
  --line-height-compact: 1.35;
  --line-height-minimal: 1.3;

  /* PADDING */
  --padding-normal: 2vh 3.5vh;
  --padding-compact: 1.8vh 3vh;
  --padding-minimal: 1.5vh 2.5vh;

  /* GAPS */
  --gap-normal: 2.5vh;
  --gap-compact: 1.8vh;
  --gap-minimal: 1.5vh;
}

/* Aplicar classes adaptativas */
.story.mode-normal .text-box {
  font-size: var(--text-size-normal);
  line-height: var(--line-height-normal);
  padding: var(--padding-normal);
}

.story.mode-compact .text-box {
  font-size: var(--text-size-compact);
  line-height: var(--line-height-compact);
  padding: var(--padding-compact);
}
```

---

## ✅ CHECKLIST FINAL

Antes de gerar HTML, a IA deve:

- [ ] Calcular espaço disponível no layout escolhido
- [ ] Estimar altura total do conteúdo (num caixinhas * altura média)
- [ ] Verificar se cabe com font normal
- [ ] Se não cabe: tentar font compact
- [ ] Se ainda não cabe: reduzir conteúdo OU mudar layout
- [ ] NUNCA gerar HTML que vaza do 9:16
- [ ] SEMPRE respeitar limites mínimos de legibilidade
- [ ] Testar: justify-content (center vs flex-start vs space-between)

---

## 🚀 IMPLEMENTAÇÃO NOS AGENTS

### Layout Composer Agent

```yaml
step_1_analyze_space:
  input: {layout, copy, photo}
  calculate: available_text_space

step_2_estimate_content:
  input: {copy.blocks, mode: "normal"}
  estimate: total_content_height

step_3_adapt_if_needed:
  if content_height > available_space:
    try: mode="compact"
    if still_too_big:
      try: merge_boxes OR suggest_different_layout

step_4_compose:
  with: adapted_settings
  ensure: content fits in 9:16
```

---

**REGRA DE OURO:**
> "Template é sugestão. Espaço 9:16 é LEI."
