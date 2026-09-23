# Análise de fala — Léia Ribeiro

Primeira medida da voz **falada e publicada**. Toda a seção `COMO ELA SOA` do prompt
foi medida em texto que ela **digitou em privado** (`ANALISE-VOZ.md`); isto é o outro
lado. Base: os 7 vídeos de `@leiaribeirot`, transcritos com whisper local
(`ggml-small`, `-mc 0`) e limpos de loop por `limpar-transcricao.py`.

Reproduzir: `python analisar-fala.py` (números) — as amostras citadas abaixo foram
abertas à mão, e o número de casos abertos está dito em cada uma.

## Base

| registro | vídeos | palavras | palavras/frase* | perguntas/1k* |
|---|---:|---:|---:|---:|
| **espiritual** | 4 (Ovelha Negra, Conhece-te, Unção de Governo, Estados Infernais) | 11.173 | 14,5 | 14,8 |
| **trading** | 3 (Aula 1, Aula 2, Trader x Profº) | 24.893 | 8,6 | 22,1 |

\* Pontuação é do whisper, não dela: frase e pergunta dependem de onde ele pôs o
ponto. Servem para comparar os dois registros entre si, não para comparar com o escrito.

"Estados Infernais" foi classificado pelo **conteúdo**, não pelo título: 108× "Deus",
zero "trade / gráfico / mercado / stop / setup".

## O que NÃO foi medido, de propósito

Nenhum marcador ortográfico. `n`, `pq`, `tbm`, `tou`, minúscula — o whisper normaliza
grafia, escreve "não", "porque", "estou". Contar isso na fala daria número **falso e
falso para baixo**, parecendo que ela muda de voz ao falar.

## Marcadores (por 1k palavras)

| marcador | espiritual | trading | escrito (ANALISE-VOZ) |
|---|---:|---:|---:|
| Deus / Senhor / Jesus | **21,84** | 0,16 | — |
| profetizo / profecia / unção | 0,36 | 0 | — |
| você / vocês | **23,99** | 10,85 | |
| nós / a gente | **17,27** | 7,67 | |
| eu | 14,23 | **27,08** | |
| testar / teste | 0,09 | 1,25 | 1,99 |
| erro / errei / errar | 0,09 | 0,76 | 1,63 |
| "o que acha" | **0** | **0** | 1,24 |
| "eu acho" | 0 | 0,72 | |
| "não sei" | 0,27 | 0,84 | |
| beleza | 0,09 | **5,82** | |
| gente | 4,12 | 10,00 | |
| vamos / bora | 1,25 | 6,75 | |
| número em algarismo** | 1,88 | 33,06 | |

\*\* O whisper escolhe entre algarismo e palavra ("meia, três, três, oito"). Mede
densidade numérica só de forma aproximada.

A coluna do escrito usa regex parecido, não idêntico — compara ordem de grandeza.

## O que a base evidencia

### 1. O registro espiritual é um modo inteiro, e a lente não o conhece

Não é vocabulário trocado. Muda a **pessoa**: no devocional ela fala **para** e
**com** quem ouve — você 2,2× e nós 2,3× mais que na aula. Muda o **gênero**: abre
com *"Graças e Paz!"*, argumenta por exemplo bíblico (Davi, Moisés, Lucas 15) e
histórico (Galileu, Martin Luther King), e fecha em oração. E muda a **certeza**:
*"eu profetizo na sua vida isso"*.

O vocabulário que mais separa os dois registros, do lado espiritual: processo,
caminhos, sabedoria, inveja, consciência, eterno, medo, palavra.

O prompt tem **zero** ocorrência de Deus, devocional, bíblia ou unção.

### 2. O traço que atravessa os dois registros: ela marca o que não sabe

Mesmo pregando — o registro de maior certeza que ela tem — ela nomeia a dúvida, e
nomeia inclusive sobre si mesma. Os 3 casos de "não sei" no devocional, todos abertos:

- *"tem a parábola, não sei se é uma parábola, é um conceito da ovelha perdida"*
- *"não sei se eu sou uma ovelha negra ou não, já me considerei no termo pejorativo"*
- *"não sei se todos conhecem"*

O segundo é a lente inteira em uma frase: a autodescrição como **hipótese datada**
("já me considerei"), que é exatamente o que `O QUE ELA NÃO VÊ EM SI` diz dela. Só
que dita em voz alta, em público, no meio de uma oração.

A forma do registro é certeza sobre a mensagem; a dúvida fica reservada a fato e a si.

### 3. Na aula, ela testa ao vivo em vez de mostrar resultado pronto

Dos 4 casos de "testar" abertos (3 trechos distintos — dois caem na mesma fala):

- *"eu ainda não testei. Então, por isso que eu estou fazendo aqui. Bora ver o que
  vai acontecer."*
- *"Então você vai ter que testar. O ruim de fazer um robô sozinho é que você tem que
  testar várias coisas."*

É o *"ela nunca soa como quem já sabia a resposta antes de investigar"* do prompt,
acontecendo na câmera. A lente **se confirma** na fala.

### 4. Duas coisas do escrito que NÃO atravessam para a fala pública

**"O que acha?" some.** No escrito é 35 ocorrências (1,24/1k) e é auditoria — ela
pede o contraditório. Na fala: **zero** em 36.066 palavras. No lugar aparece
**"beleza?"** (145×, 5,82/1k na aula), mas a função é outra. Nos 4 casos abertos,
"beleza?" confere se o aluno **acompanhou** — *"Os conceitos que você precisa.
Beleza?"*, *"Combinados assim? Beleza."* Não pede crítica. Tratar um como tradução do
outro seria errado.

**A confissão de erro vira pedagogia do erro.** O prompt diz que na voz publicada
atravessa a *"confissão de erro em primeira pessoa, sem drama e sem desculpa"*. Nos 5
casos de "erro" que abri na aula, **nenhum** é ela confessando um erro dela:

- *"Cada erro, cada certo, ele te valida como alguém que sabe o que está fazendo."*
- *"nada é erro, gente, é tudo investimento no trade"*
- *"Entrou, errou. Beleza, vai fazer outra coisa."*

É erro na segunda pessoa, reenquadrado como investimento para quem aprende. (O único
"eu errei" é hipotético — *"para caso eu errei"* — e um é o robô que errou.)

**Isso contradiz uma frase do prompt**, que foi inferida do escrito privado e nunca
tinha sido medida em material publicado. São 5 casos de ~19 — suficiente para dizer
que não aparece nesses 5, não para dizer que nunca aparece.

## O que esta análise NÃO autoriza dizer

- **"eu" 2× maior na aula não é traço de personalidade.** Aula com tela narra ação
  ("eu vou colocar aqui", "eu vou abrir no Profit"). Grande parte é gênero.
- **Frase mais longa no devocional** depende da pontuação do whisper, que acompanha
  pausa. Pode ser ritmo de pregação, pode ser como ele pontua fala contínua.
- **7 vídeos, 1 pessoa, 1 ano.** O devocional tem 4 vídeos e 11 mil palavras — é
  base para dizer que o registro existe e como se parece, não para medir sutileza.
- O whisper erra nome próprio e troca palavra parecida (*"deitrade"*, *"Leirebeira"*).
  **Nenhuma citação daqui deve ir para o prompt como verbatim sem ouvir o trecho.**

## O que isso pede da lente (decisão dela)

1. **Registro espiritual** — a maior ausência. Entra como modo, não como tema: a
   pessoa muda (você/nós), a certeza muda (profetiza), e a dúvida sobre si continua.
2. **Corrigir a frase da confissão de erro** em `COMO ELA SOA`: na fala publicada,
   o que atravessa é a **pedagogia** do erro, não a confissão.
3. **Registrar que "o que acha?" é privado.** Em público, a pergunta vira
   "beleza?" — conferência, não auditoria.
