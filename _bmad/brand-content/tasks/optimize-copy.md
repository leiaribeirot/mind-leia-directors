# Optimize Copy Task

**Task ID:** optimize-copy
**Agent:** copywriter
**Elicit:** true
**Description:** Analyze and optimize copy for maximum social media impact, detecting tone and restructuring for visual hierarchy

---

## Task Configuration

```yaml
task:
  name: Optimize Copy
  id: optimize-copy
  agent: copywriter
  elicit: true
  timeout: 30s

inputs:
  - name: copy
    type: string
    required: true
    description: Raw copy text from user
  - name: context
    type: string
    required: false
    description: Optional context (story|feed, audience, objective)

outputs:
  - name: optimized_copy
    type: object
    description: Structured copy with headline, body, CTA
  - name: tone
    type: string
    description: Detected tone (pessoal|authority|educacional|narrativo)
  - name: keywords
    type: array
    description: Extracted keywords and impact words
  - name: emotional_trigger
    type: string
    description: Primary emotional trigger identified
```

---

## Execution Steps

### Step 1: Elicit Copy from User
```
PROMPT user:
"Cole aqui a copy que você quer otimizar para o story:"

ACCEPT input as: copy_input
VALIDATE: copy_input não vazio, min 10 characters
```

### Step 2: Analyze Tone

**Decision Tree:**
```
IF copy contains:
  - Primeira pessoa ("Eu", "Vou", "Meu")
  - Linguagem conversacional
  - Vulnerabilidade/autenticidade
→ CLASSIFY as "pessoal"

ELSE IF copy contains:
  - Números/dados ("10 anos", "97%", "estudos")
  - Referências históricas ou expertise
  - Tom assertivo/confiante
→ CLASSIFY as "authority"

ELSE IF copy contains:
  - Estrutura de framework/fórmula
  - Pergunta → Resposta pattern
  - Linguagem didática
→ CLASSIFY as "educacional"

ELSE IF copy contains:
  - Storytelling elements (diálogos, cenas)
  - Suspense/cliffhanger
  - Formato narrativo
→ CLASSIFY as "narrativo"

DEFAULT: CLASSIFY as "pessoal" (mais comum)
```

### Step 3: Extract Keywords

**Process:**
```
1. REMOVE stopwords (e, o, a, de, para, etc)
2. IDENTIFY impact words:
   - Números e dados
   - Superlativos
   - Verbos de ação
   - Palavras únicas/marcantes
3. RANK by importance
4. RETURN top 5-8 keywords
```

**Example:**
```
Input: "Vou começar uma newsletter sobre IA. Já escrevi duas edições."
Keywords: ["newsletter", "IA", "duas edições", "começar"]
```

### Step 4: Restructure Copy

**Format:**
```json
{
  "headline": "Palavra/frase de impacto máximo",
  "body": "Desenvolvimento/contexto (1-3 frases)",
  "cta": "Chamada para ação clara"
}
```

**Rules:**
- **Headline:** Max 60 chars, impacto imediato
- **Body:** Max 200 chars, contexto essencial
- **CTA:** Max 40 chars, ação específica

**Restructuring Logic:**

**For tone="pessoal":**
```
headline: Frase principal do criador
body: Contexto pessoal
cta: Convite direto ("Me manda DM", "Comenta aqui")
```

**For tone="authority":**
```
headline: Afirmação bold ou dado impactante
body: Credencial + insight
cta: Educacional ("Salva esse post", "Leia até o fim")
```

**For tone="educacional":**
```
headline: Pergunta ou conceito
body: Definição/fórmula
cta: Implementação ("Testa isso", "Aplica hoje")
```

**For tone="narrativo":**
```
headline: Setup da história
body: Desenvolvimento/diálogo
cta: Cliffhanger ("Desliza pra ver", "Continua...")
```

### Step 5: Identify Emotional Trigger

**Categories:**
- **curiosity:** "O que ninguém te conta..."
- **fomo:** "Enquanto você não sabe..."
- **authority:** "10 anos estudando..."
- **scarcity:** "Só funciona se..."
- **social_proof:** "97% das pessoas..."
- **transformation:** "De X para Y..."

**Detection:**
```python
if copy contains ["não te contam", "segredo", "descobri"]:
    trigger = "curiosity"
elif copy contains ["enquanto", "ainda", "já"]:
    trigger = "fomo"
elif copy contains numbers + time references:
    trigger = "authority"
# etc
```

### Step 6: Validate Length

**Check:**
```
headline_length <= 60 chars
body_length <= 200 chars
cta_length <= 40 chars

IF any exceeds:
  SHORTEN preserving essence
  PRIORITIZE impact words
  REMOVE filler words
```

### Step 7: Preserve Voice

**Critical:**
- Manter linguagem original (formal/informal)
- Preservar palavras únicas do criador
- Não adicionar jargão se não havia
- Manter autenticidade

**Example of GOOD preservation:**
```
Original: "Vou começar uma newsletter"
Optimized: "Vou começar uma newsletter sobre IA"
✅ Mantém "Vou", voz pessoal

NOT: "Estou lançando uma newsletter profissional"
❌ Mudou voz de casual para corporativo
```

### Step 8: Return Structured Output

```json
{
  "optimized_copy": {
    "headline": "Vou começar uma newsletter sobre IA",
    "body": "Já escrevi duas edições.",
    "cta": "Quer entrar na lista?"
  },
  "tone": "pessoal",
  "keywords": ["newsletter", "IA", "edições"],
  "emotional_trigger": "curiosity",
  "improvements_summary": "Estrutura já ótima - preservada voz autêntica",
  "length_validation": {
    "headline": "41/60 chars ✓",
    "body": "24/200 chars ✓",
    "cta": "23/40 chars ✓"
  }
}
```

---

## Error Handling

### Error: Copy muito curta (< 10 chars)
```
ACTION: RE-ELICIT
MESSAGE: "A copy precisa ter pelo menos 10 caracteres. Tente novamente:"
```

### Error: Copy sem CTA clara
```
ACTION: ADD default CTA based on tone
  pessoal → "Me conta nos comentários"
  authority → "Salva esse post"
  educacional → "Aplica isso hoje"
  narrativo → "Desliza para continuar"
```

### Error: Text overflow (headline > 60)
```
ACTION: SMART TRUNCATE
  - Identify core message
  - Remove adjectives first
  - Preserve impact words
  - Add "..." if needed
```

---

## Examples

### Example 1: Pessoal

**Input:**
```
"Vou começar uma newsletter sobre IA e inovação. Já escrevi duas edições bem legais. Se quiser receber, me manda uma DM."
```

**Output:**
```json
{
  "optimized_copy": {
    "headline": "Vou começar uma newsletter sobre IA",
    "body": "Já escrevi duas edições.",
    "cta": "Me manda DM pra receber"
  },
  "tone": "pessoal",
  "keywords": ["newsletter", "IA", "edições", "DM"],
  "emotional_trigger": "curiosity"
}
```

---

### Example 2: Authority

**Input:**
```
"Estudei os padrões de sucesso dos maiores gênios da história por 10 anos. O que descobri não foi sorte, foram sistemas replicáveis."
```

**Output:**
```json
{
  "optimized_copy": {
    "headline": "Os padrões de sucesso dos maiores gênios",
    "body": "não foram sorte.\n\n10 anos de estudo me mostraram sistemas replicáveis.",
    "cta": "Salva esse post."
  },
  "tone": "authority",
  "keywords": ["padrões", "gênios", "10 anos", "sistemas"],
  "emotional_trigger": "authority",
  "improvements_summary": "Destacado credencial (10 anos), estruturado em setup→payoff"
}
```

---

### Example 3: Educacional

**Input:**
```
"Como escrever uma copy que vende? É simples: Gancho + Valor + CTA. Essa fórmula funciona sempre."
```

**Output:**
```json
{
  "optimized_copy": {
    "headline": "Como escrever copy que vende?",
    "body": "Gancho + Valor + CTA\n\nEssa fórmula funciona sempre.",
    "cta": "Testa agora"
  },
  "tone": "educacional",
  "keywords": ["copy", "vende", "fórmula", "gancho", "valor", "CTA"],
  "emotional_trigger": "transformation"
}
```

---

### Example 4: Narrativo

**Input:**
```
"Estava na fila do café quando ouvi a conversa. — 'Ninguém vai te pagar pra fazer o que ama' — disse ela. Eu discordei em silêncio. Continua no próximo story."
```

**Output:**
```json
{
  "optimized_copy": {
    "headline": "Estava na fila do café",
    "body": "— 'Ninguém vai te pagar pra fazer o que ama'\n\nEu discordei em silêncio.",
    "cta": "Desliza pra continuar →"
  },
  "tone": "narrativo",
  "keywords": ["café", "conversa", "pagar", "ama"],
  "emotional_trigger": "curiosity"
}
```

---

## Success Criteria

Task is successful when:
- ✅ Tone detected correctly (validate against copy characteristics)
- ✅ Copy structured in headline/body/CTA format
- ✅ Length constraints respected (60/200/40)
- ✅ Voice preserved (original language style maintained)
- ✅ Keywords extracted (5-8 impact words)
- ✅ Emotional trigger identified
- ✅ Output is valid JSON

---

**Task Status:** ✅ Ready for execution
**Version:** 1.0.0
**Created:** 2025-10-02
