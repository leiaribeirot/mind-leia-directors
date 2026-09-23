# Instagram Story Design Rules
## Regras FUNDAMENTAIS de Layout e Composição

**Data:** 2025-10-02
**Status:** MANDATORY - Todos os agentes DEVEM seguir

---

## ⚠️ ERRO CRÍTICO IDENTIFICADO E CORRIGIDO

### ❌ O QUE ESTAVA ERRADO:
- Layout dividido 50% foto + 50% texto (QUEBRA o formato 9:16!)
- Texto jogado em área preta separada da foto
- Visual não-nativo, parece PowerPoint

### ✅ O QUE É CORRETO:
- **FOTO FULL BLEED 1080x1920** (9:16 completo)
- **CAIXINHAS DE TEXTO POR CIMA DA FOTO**
- **Caixinhas PEQUENAS e PERTINHO do texto** (width: fit-content)

---

## 🎯 REGRAS OBRIGATÓRIAS

### 1. DIMENSÕES E ASPECT RATIO
```css
.instagram-story {
  width: 1080px;
  height: 1920px;
  aspect-ratio: 9/16; /* NUNCA quebrar isso! */
}
```

✅ **SEMPRE:** 1080x1920px (9:16)
❌ **NUNCA:** Dividir em metades (50%/50%)

---

### 2. LAYOUT FUNDAMENTAL

**Estrutura Z-Index:**
```
z-index: 0  → Foto full bleed (1080x1920)
z-index: 1  → Scrim opcional (rgba overlay sutil)
z-index: 10 → Caixinhas de texto
z-index: 100 → Tag UI / elementos fixos
```

**Foto de fundo:**
```css
.photo-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
}
```

---

### 3. CAIXINHAS DE TEXTO

**CRITICAL:** Caixinhas devem ser **PEQUENAS** e **PERTINHO** do texto!

```css
.text-box {
  width: fit-content; /* ← CRÍTICO! */
  max-width: 90%;
  padding: 2.5vh 4vh; /* Compacto, não exagerado */
  border-radius: 12px;
  font-size: clamp(22px, 2.8vh, 28px);
  line-height: 1.5;
}
```

**Tipos de caixinha:**
- **Preta:** `background: rgba(0, 0, 0, 0.88-0.92)` + `backdrop-filter: blur(8px)`
- **Branca:** `background: rgba(255, 255, 255, 0.95-0.98)`

**Quando usar:**
- ✅ 3-4 caixinhas empilhadas verticalmente
- ✅ Mix: 2 pretas + 1 branca final (destaque)
- ✅ Alinhamento left por padrão
- ❌ NÃO usar `width: 100%` - isso deixa as caixinhas largas demais!

---

### 4. DENSIDADE DE TEXTO

**MINIMUM:** 5-7 linhas de texto por slide
**IDEAL:** 8-12 linhas de texto por slide
**REJECT:** Menos de 5 linhas (parece PowerPoint!)

**Font-size:**
```css
--text-size-base: clamp(22px, 2.8vh, 28px); /* Era 19-20px antes - ERRADO! */
--text-size-large: clamp(26px, 3.2vh, 32px);
--text-size-title: clamp(30px, 3.8vh, 38px);
```

**Line-height:**
```css
line-height: 1.5; /* Respirável mas não exagerado */
```

---

### 5. SAFE ZONES

**CRITICAL:** Instagram UI corta 20% superior e inferior!

```css
.content-area {
  padding-top: 384px; /* 20% de 1920 */
  padding-bottom: 384px; /* 20% de 1920 */
  padding-left: 6vh;
  padding-right: 6vh;
}
```

**Tag UI (Lei do Fogo style):**
```css
.tag-ui {
  position: absolute;
  top: 4vh; /* Dentro da safe zone */
  left: 4vh;
  z-index: 100;
}
```

---

### 6. FOTO TREATMENT

**Grayscale + brightness ajustado:**
```css
filter: grayscale(100%) brightness(0.45-0.55) contrast(1.1);
```

**Scrim opcional (sutil):**
```css
.photo-scrim {
  background: rgba(0,0,0,0.25-0.35); /* Leve! */
}
```

❌ **NUNCA:** Scrim pesado demais (>0.6) - mata a foto

---

### 7. EMPILHAMENTO VERTICAL

**Caixinhas empilhadas:**
```css
.boxes-container {
  display: flex;
  flex-direction: column;
  justify-content: center; /* ou flex-start */
  gap: 3vh; /* Espaçamento entre caixinhas */
}
```

**Ordem comum:**
1. Caixinha título/headline (preta ou branca)
2. Caixinha corpo 1 (preta)
3. Caixinha corpo 2 (preta) - opcional
4. Caixinha CTA/destaque (branca) - final

---

### 8. ACCENT COLOR

**Lei do Fogo:** `#30E0C0` (teal)
**Uso estratégico:** 2-3 palavras-chave por slide

```html
<span class="accent">palavra-chave</span>
```

❌ **NUNCA:** Abusar do accent (>20% do texto)

---

## 📐 TEMPLATES DISPONÍVEIS

### Pattern 1: Narrative Blocks
- Foto FULL BLEED + caixinhas brancas de destaque
- Fundo preto opcional se sem foto

### Pattern 2: Text Boxes Over Photo
- Foto FULL BLEED + 3-4 caixinhas pretas empilhadas + 1 branca final
- Mais usado, mais versátil

### Pattern 3: Split Layout
- 40% texto (superior) + 60% foto (inferior)
- OU vice-versa
- Usado para educacional/framework

### Pattern 4: Minimal Centered
- Gradiente suave + logo opcional + texto centralizado
- Menos caixinhas, mais limpo

### Pattern 5: Full Bleed Dark (Lei do Fogo)
- Foto FULL BLEED grayscale + caixinhas com accent teal
- Tag UI "LEI DO FOGO" no topo
- Estilo signature

---

## 🚫 ERROS COMUNS A EVITAR

### ❌ ERRO 1: Dividir layout em metades
```css
/* ERRADO! */
.photo-container { height: 50%; }
.text-container { height: 50%; background: black; }
```

### ❌ ERRO 2: Caixinhas muito largas
```css
/* ERRADO! */
.text-box { width: 100%; } /* Ocupa tudo */
```

### ❌ ERRO 3: Texto muito pequeno/pouco
```
2-3 linhas apenas ← RUIM! Parece slide!
```

### ❌ ERRO 4: Safe zones ignoradas
```css
/* ERRADO! */
padding-top: 50px; /* IG UI vai cortar! */
```

### ❌ ERRO 5: Scrim muito pesado
```css
/* ERRADO! */
background: rgba(0,0,0,0.8); /* Mata a foto! */
```

---

## ✅ CHECKLIST VISUAL QA

Antes de aprovar um story, verificar:

- [ ] Dimensões 1080x1920 exatas?
- [ ] Foto FULL BLEED (não dividida)?
- [ ] Caixinhas com `width: fit-content`?
- [ ] 5+ linhas de texto?
- [ ] Safe zones respeitadas (384px top/bottom)?
- [ ] Font-size 22-28px?
- [ ] Scrim sutil (<0.4)?
- [ ] Accent color estratégico (<20%)?
- [ ] Visual nativo do IG?

---

## 🎨 REFERÊNCIAS VISUAIS

**Exemplo CORRETO (ref 1):**
- Foto full bleed com pessoa
- 3 caixinhas pretas empilhadas no centro
- 1 caixinha branca final
- Caixinhas PEQUENAS e PERTINHO do texto
- ~10 linhas de texto total

**Exemplo CORRETO (ref 2):**
- Fundo preto puro
- Texto branco em blocos
- 2 caixinhas brancas de destaque
- Foto 40% inferior (opcional)
- ~8 linhas de texto

**Exemplo CORRETO (ref 3):**
- Foto full bleed biblioteca
- Texto branco direto sobre foto (topo)
- 2 caixinhas brancas grandes (centro)
- Foto visível embaixo
- ~7 linhas de texto

---

## 📝 PARA AGENTES

### Copywriter (Marcus):
- Gerar 8-12 linhas de texto por slide (não 2-3!)
- Dividir em 3-4 blocos para caixinhas separadas
- Marcar palavras-chave para accent color

### Layout Composer:
- SEMPRE usar foto full bleed 1080x1920
- Caixinhas com `width: fit-content`
- Padding 2.5vh 4vh (compacto)
- Gap 3vh entre caixinhas

### Visual QA (Maya):
- REJEITAR se <5 linhas de texto
- REJEITAR se caixinhas width: 100%
- REJEITAR se layout dividido em metades
- APROVAR apenas se nativo do IG

---

**Última atualização:** 2025-10-02
**Versão:** 2.0 (pós-correção crítica)
