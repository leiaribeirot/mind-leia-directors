# Feed QA Checklist (4:5 Format)

**Purpose:** Quality standards for Instagram Feed Posts (1080x1350)
**Used by:** Visual QA Feed Specialist (Maya)
**Version:** 1.0.0

---

## ✅ Technical Validation (Critical - Auto-Reject)

### 1. Dimensions ⚠️ CRITICAL
**Requirement:** 1080x1350px exact

**Check:**
- Width = 1080px ✓
- Height = 1350px ✓
- Aspect ratio = 4:5 (0.8) ✓

**Auto-Reject:** YES

### 2. Safe Zones ⚠️ CRITICAL
**Requirement:** 40px margin on all sides

**Check:**
- Top 40px clear ✓
- Bottom 40px clear ✓
- Left 40px clear ✓
- Right 40px clear ✓

**Auto-Reject:** YES

### 3. Contrast ⚠️ CRITICAL
**Requirement:** > 4.5:1 (WCAG AA)

**Check:**
- All text legible ✓
- Minimum 4.5:1 ratio ✓

**Auto-Reject:** YES

---

## 🎨 Craft Quality (Scored 0-100)

### 4. Editorial Feel (Target: 85+)
**Question:** "Parece publicação profissional/editorial?"

**85-100 (Excellent):**
- ✅ Estética revista/editorial
- ✅ Qualidade visual profissional
- ✅ Não parece amador

**70-84 (Acceptable):**
- ⚠️ Profissional mas poderia ser mais refinado

**0-69 (Poor):**
- ❌ Parece amador

### 5. Typography Balance (Target: 90+)
**Question:** "Hierarquia de 3 níveis é clara?"

**90-100:**
- ✅ H1 dominante (56-72px)
- ✅ H2 complementar (28-36px)
- ✅ Body legível (18-24px)
- ✅ Máximo 3 níveis

**70-89:**
- ⚠️ Hierarquia ok mas poderia ser mais clara

**0-69:**
- ❌ Hierarquia confusa

### 6. Spacing Quality (Target: 85+)
**Question:** "Espaçamento é respirável?"

**85-100:**
- ✅ Line-height 1.4-1.6
- ✅ Padding generoso
- ✅ Gaps visíveis (60-100px)

**65-84:**
- ⚠️ Um pouco apertado

**0-64:**
- ❌ Cramped (line-height < 1.3)

### 7. Visual Harmony (Target: 85+)
**Question:** "Cores e fontes harmoniosas?"

**85-100:**
- ✅ Accent color estratégico (10-20%)
- ✅ Máximo 2 famílias tipográficas
- ✅ Cores não conflitam

**70-84:**
- ⚠️ Harmonia ok mas poderia melhorar

**0-69:**
- ❌ Cores conflitam

---

## 📝 Narrative Quality (Pass/Fail)

### 8. Text Density
**Requirement:** 5-10 lines ideal

**Pass:** 3-10 lines ✓
**Fail:** < 3 or > 10 lines ❌

### 9. Readability
**Requirement:** 10-15s reading time

**Pass:** ≤ 800 chars ✓
**Fail:** > 800 chars ❌

### 10. Emphasis
**Requirement:** Strategic usage

**Pass:** 10-20% bold, 1-3 accents ✓
**Fail:** Over/under emphasis ❌

---

## 🎯 Decision Matrix

| Technical | Craft Score | Attempt | Decision |
|-----------|-------------|---------|----------|
| ✅ Pass | ≥ 85 | Any | ✅ APPROVE |
| ✅ Pass | 70-84 | 1 | ❌ REJECT (retry) |
| ✅ Pass | 70-84 | 2+ | ⚠️ APPROVE_WITH_NOTES |
| ❌ Fail | Any | Any | ❌ REJECT (critical) |

---

## 📊 Scoring

**Overall Craft Score:**
```
(editorial_feel + artisanal_feel + typography_balance +
 spacing_quality + visual_harmony) / 5
```

**Thresholds:**
- 90-100: Excellent
- 85-89: Good ✅ APPROVE
- 70-84: Acceptable ⚠️ (retry or approve with notes)
- 0-69: Poor ❌ REJECT

---

**Checklist Status:** ✅ Complete
**Version:** 1.0.0
**Format:** Feed Posts 4:5 (1080x1350)
