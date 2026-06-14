# Script para Claude Code — Sistema Pedagógico com Dual API (Anthropic + Gemini)

## Contexto

Este script é uma **atualização incremental** do sistema pedagógico de relatórios.
O objetivo é adicionar suporte à API do Google Gemini como alternativa à API da Anthropic,
com seletor de provedor visível na interface. O restante do sistema (HTML, CSS, lógica de
estado, PDF, chat) permanece intacto.

Leia este script inteiro antes de tocar em qualquer arquivo.

---

## O que NÃO mudar

- Estrutura do `index.html` (exceto a adição do seletor de API na toolbar)
- Todo o `style.css` (exceto os estilos novos do seletor)
- As funções: `renderTabs`, `renderChat`, `renderPDF`, `renderStars`, `showToast`,
  `collectPDFEdits`, `saveReport`, `downloadPDF`, `addStudent`, `selectStudent`,
  `setupStars`, `getActiveStudent`, `generateId`, `getCurrentDate`, `parseReportJSON`

---

## O que ADICIONAR / MODIFICAR

### 1. `index.html` — adicionar seletor de API na toolbar do PDF

Localize a `div.pdf-toolbar-right` (onde ficam os botões Salvar e Baixar PDF).
Adicione o seletor **antes** dos botões existentes:

```html
<!-- ADICIONAR antes de btn-save -->
<div class="api-selector" id="api-selector">
  <label class="api-selector-label" for="api-provider">IA:</label>
  <select class="api-select" id="api-provider">
    <option value="anthropic">Anthropic Claude</option>
    <option value="gemini">Google Gemini</option>
  </select>
</div>
```

Nenhuma outra alteração no HTML.

---

### 2. `style.css` — estilos do seletor

Adicione ao final do arquivo:

```css
/* ─── Seletor de API ──────────────────────────────────────── */
.api-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 10px;
  border-right: 1px solid var(--cinza-borda);
  margin-right: 4px;
}
.api-selector-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--cinza-sec);
  white-space: nowrap;
}
.api-select {
  font-size: 12px;
  font-family: var(--font-ui);
  color: var(--cinza-texto);
  background: var(--branco);
  border: 1px solid var(--cinza-borda-med);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  cursor: pointer;
  appearance: auto;
  transition: border-color var(--transition);
}
.api-select:focus {
  outline: none;
  border-color: var(--azul-escuro);
}
```

---

### 3. `app.js` — todas as modificações

#### 3a. Expandir CONSTANTS com as duas configurações de API

Substitua o bloco de CONSTANTS existente por este (mantendo o SYSTEM_PROMPT e DOM idênticos):

```js
// ─── 2. CONSTANTS ─────────────────────────────────────────

// ── Chaves de API ─────────────────────────────────────────
// Substitua pelos valores reais antes de usar.
// Nunca commite chaves em repositórios públicos.
const API_KEYS = {
  anthropic: 'SUA_CHAVE_ANTHROPIC_AQUI',
  gemini:    'SUA_CHAVE_GEMINI_AQUI',
};

// ── Configuração por provedor ──────────────────────────────
const API_CONFIG = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-6',
  },
  gemini: {
    // A chave vai na query string — padrão oficial da API REST do Gemini
    // Modelo: gemini-2.0-flash — mais rápido, gratuito no free tier
    // Endpoint base sem a chave; ela será concatenada em runtime
    urlBase: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
  },
};

// ── Prompt do sistema (igual para os dois provedores) ──────
const SYSTEM_PROMPT = `
Você é um especialista em pedagogia brasileira, auxiliando professores a redigir
relatórios individuais de alunos do ensino fundamental.

Quando receber uma descrição de um aluno, gere um relatório pedagógico completo
em português formal, adequado para documento escolar oficial.

IMPORTANTE: Responda SOMENTE com um JSON válido, sem texto antes ou depois.
Sem blocos de código, sem markdown, apenas o JSON puro.

Formato do JSON:
{
  "studentName": "Nome completo do aluno",
  "class": "Ex: 2º Ano A",
  "age": "Ex: 7 anos",
  "period": "Ex: 1º Semestre 2025",
  "teacher": "A preencher",
  "geral": "Parágrafo sobre desenvolvimento geral (3-4 frases formais)",
  "academico": "Parágrafo sobre desempenho acadêmico (3-4 frases formais)",
  "social": "Parágrafo sobre socialização e comportamento (2-3 frases formais)",
  "pontos": "Lista de pontos fortes separados por vírgula",
  "obs": "Observações e recomendações para próximo período (2-3 frases)"
}

Use linguagem formal, empática e construtiva, adequada para relatórios pedagógicos brasileiros.
Nunca use linguagem negativa — transforme dificuldades em áreas de desenvolvimento.
`;

// DOM — sem mudanças, manter igual ao original
const DOM = {
  // ... (copiar integralmente do script original)
};
```

---

#### 3b. Adicionar função utilitária `getActiveProvider`

Adicione esta função logo após o bloco CONSTANTS, antes da seção API:

```js
// ─── Utilitário: provedor ativo ───────────────────────────

function getActiveProvider() {
  const select = document.getElementById('api-provider');
  return select ? select.value : 'anthropic'; // fallback seguro
}
```

---

#### 3c. Substituir a função `callAnthropicAPI` por `callAI`

Remova a função `callAnthropicAPI` existente e adicione estas três em seu lugar:

```js
// ─── 3. API ───────────────────────────────────────────────

/**
 * Ponto de entrada único para chamadas de IA.
 * Detecta o provedor selecionado e delega para a função correta.
 *
 * @param {Array} messages - Array no formato Anthropic: [{ role, content }]
 *                           A conversão para o formato Gemini é feita internamente.
 * @returns {Promise<string>} Texto bruto retornado pela IA (esperado: JSON puro)
 */
async function callAI(messages) {
  const provider = getActiveProvider();

  if (provider === 'gemini') {
    return callGemini(messages);
  }
  return callAnthropic(messages);
}

// ── Anthropic ─────────────────────────────────────────────
async function callAnthropic(messages) {
  // Formato nativo da Anthropic API
  // Docs: https://docs.anthropic.com/en/api/messages
  const response = await fetch(API_CONFIG.anthropic.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEYS.anthropic,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      // ^ Header obrigatório para chamadas diretas do browser sem proxy
    },
    body: JSON.stringify({
      model: API_CONFIG.anthropic.model,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: messages,
      // messages = [{ role: 'user'|'assistant', content: 'texto' }]
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic — erro HTTP ${response.status}`);
  }

  const data = await response.json();
  // Resposta em: data.content[0].text
  return data.content[0].text;
}

// ── Gemini ────────────────────────────────────────────────
async function callGemini(messages) {
  // A API REST do Gemini usa formato diferente da Anthropic.
  // Diferenças principais:
  //   - A chave vai na query string (?key=...), não no header Authorization
  //   - O array de mensagens usa o campo "contents" com "parts"
  //   - As roles são "user" e "model" (não "assistant")
  //   - O system prompt vai em "systemInstruction" separado do histórico
  //   - A resposta está em: data.candidates[0].content.parts[0].text
  //
  // Docs: https://ai.google.dev/api/generate-content

  const url = `${API_CONFIG.gemini.urlBase}?key=${API_KEYS.gemini}`;

  // Converte o histórico do formato Anthropic para o formato Gemini
  // Anthropic: { role: 'assistant', content: 'texto' }
  // Gemini:    { role: 'model',     parts: [{ text: 'texto' }] }
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Gemini não usa x-api-key no header — chave vai na URL
    },
    body: JSON.stringify({
      systemInstruction: {
        // systemInstruction é um Content object com parts
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: contents,
      generationConfig: {
        maxOutputTokens: 1500,
        temperature: 0.4,
        // responseMimeType não é usado aqui pois parseamos o JSON manualmente
        // para manter compatibilidade com o parseReportJSON existente
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    // Gemini retorna erros em: err.error.message
    const msg = err?.error?.message || `Gemini — erro HTTP ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();

  // Extração do texto gerado pelo Gemini
  // Caminho: candidates[0].content.parts[0].text
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    // Gemini pode retornar finishReason diferente de STOP em casos de bloqueio
    const reason = data?.candidates?.[0]?.finishReason;
    throw new Error(`Gemini não retornou texto. Motivo: ${reason || 'desconhecido'}`);
  }

  return text;
}
```

---

#### 3d. Atualizar a função `sendMessage` para usar `callAI`

No corpo da função `sendMessage`, localize a linha:

```js
const rawResponse = await callAnthropicAPI(student.chatHistory);
```

Substitua por:

```js
const rawResponse = await callAI(student.chatHistory);
```

Nenhuma outra alteração em `sendMessage`.

---

#### 3e. Adicionar feedback de provedor no toast de geração

Ainda em `sendMessage`, logo antes de `renderPDF()`, adicione:

```js
// Informa à professora qual provedor gerou o relatório
const provider = getActiveProvider();
const providerLabel = provider === 'gemini' ? 'Google Gemini' : 'Anthropic Claude';
showToast(`✅ Relatório gerado com ${providerLabel}!`);
```

---

## Checklist de implementação

Implemente exatamente nesta ordem:

- [ ] **1.** Abrir `index.html` → localizar `div.pdf-toolbar-right` → inserir `div.api-selector` antes dos botões
- [ ] **2.** Abrir `style.css` → adicionar os 3 blocos de estilo do seletor no final do arquivo
- [ ] **3.** Abrir `app.js` → substituir o bloco CONSTANTS conforme descrito em 3a
- [ ] **4.** Adicionar `getActiveProvider()` após CONSTANTS (3b)
- [ ] **5.** Remover `callAnthropicAPI` e adicionar `callAI`, `callAnthropic`, `callGemini` (3c)
- [ ] **6.** Atualizar a chamada em `sendMessage` de `callAnthropicAPI` para `callAI` (3d)
- [ ] **7.** Adicionar o toast de provedor em `sendMessage` (3e)
- [ ] **8.** Testar com Anthropic: gerar um relatório e verificar que o fluxo completo funciona
- [ ] **9.** Trocar o select para Gemini e testar novamente com a mesma descrição de aluno
- [ ] **10.** Verificar no DevTools (Network) que cada provedor usa o endpoint correto

---

## Como obter as chaves de API

### Anthropic
1. Acesse: https://console.anthropic.com
2. Vá em "API Keys" → "Create Key"
3. Copie e cole em `API_KEYS.anthropic`

### Google Gemini (gratuito)
1. Acesse: https://aistudio.google.com/app/apikey
2. Clique em "Create API Key"
3. Selecione um projeto Google Cloud (ou crie um novo gratuito)
4. Copie e cole em `API_KEYS.gemini`
5. O modelo `gemini-2.0-flash` está disponível no free tier sem necessidade de cartão

---

## Diferenças técnicas entre os dois provedores

| Aspecto | Anthropic | Gemini |
|---|---|---|
| Autenticação | Header `x-api-key` | Query param `?key=` |
| Header extra browser | `anthropic-dangerous-direct-browser-access: true` | Não precisa |
| System prompt | Campo `system` no body | Campo `systemInstruction.parts[0].text` |
| Role do assistente | `"assistant"` | `"model"` |
| Formato mensagens | `[{ role, content: string }]` | `[{ role, parts: [{text}] }]` |
| Caminho da resposta | `data.content[0].text` | `data.candidates[0].content.parts[0].text` |
| Modelo gratuito | Pago (tem trial) | `gemini-2.0-flash` (free tier real) |
| Limite free tier | — | 1.500 req/dia, 1M tokens/min |

---

## Comportamento esperado após a implementação

- O seletor aparece na toolbar do PDF, à esquerda dos botões Salvar/Baixar
- Ao trocar o provedor no meio de uma conversa, a próxima mensagem enviada já usa o novo
- O histórico de chat do aluno é preservado ao trocar de provedor (o contexto é enviado inteiro)
- O toast de confirmação menciona qual IA gerou o relatório
- Erros de API de cada provedor exibem mensagens distintas no chat (não alert)

---

## Proibições absolutas

- ❌ Não adicione dois `SYSTEM_PROMPT` separados — o mesmo prompt serve para os dois provedores
- ❌ Não passe a chave Gemini no header — ela vai **somente** na query string da URL
- ❌ Não esqueça de converter `role: 'assistant'` para `role: 'model'` ao chamar o Gemini
- ❌ Não use `innerHTML` nos campos contenteditable — sempre `textContent`
- ❌ Não quebre nenhuma função existente que não está listada neste script como "modificar"
