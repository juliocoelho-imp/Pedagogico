/* ════════════════════════════════════════════════════════
   1. STATE
════════════════════════════════════════════════════════ */
const state = {
  students: [],
  activeId: null,
  generating: false,
  uid: 1,
};

/* ════════════════════════════════════════════════════════
   2. CONSTANTS
════════════════════════════════════════════════════════ */
const SCHOOL = {
  name: 'Escola Municipal Antonio Federzoni',
  gov: 'Rede Municipal de Ensino',
};

const API_KEYS_STORAGE = {
  anthropic: 'ped_api_key_anthropic',
  gemini:    'ped_api_key_gemini',
};

const API_CONFIG = {
  anthropic: {
    url:   'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-6',
  },
  gemini: {
    urlBase: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    model: 'gemini-2.5-flash',
  },
};

function getCurrentPeriod() {
  const month = new Date().getMonth() + 1;
  const year  = new Date().getFullYear();
  return month <= 6 ? `1º Semestre ${year}` : `2º Semestre ${year}`;
}

function getSystemPrompt() {
  return `Você é um especialista em pedagogia brasileira, auxiliando professores a redigir relatórios individuais de alunos do ensino fundamental.

Quando receber uma descrição de um aluno, gere um relatório pedagógico completo em português formal, adequado para documento escolar oficial.

Data de hoje: ${getCurrentDate()}
Período letivo atual: ${getCurrentPeriod()}

IMPORTANTE: Responda SOMENTE com um JSON válido, sem texto antes ou depois. Sem blocos de código, sem markdown, apenas o JSON puro.

Formato do JSON:
{
  "studentName": "Nome completo do aluno",
  "class": "Ex: 3º Ano A",
  "age": "Ex: 8 anos",
  "period": "Ex: 1º Semestre 2026",
  "teacher": "A preencher",
  "geral": "Parágrafo sobre desenvolvimento geral (3-4 frases formais)",
  "academico": "Parágrafo sobre desempenho acadêmico (3-4 frases formais)",
  "social": "Parágrafo sobre socialização e comportamento (2-3 frases formais)",
  "pontos": "Parágrafo sobre pontos fortes (2-3 frases formais)",
  "obs": "Observações e recomendações para o próximo período (2-3 frases)"
}

Use linguagem formal, empática e construtiva. Nunca use linguagem negativa — transforme dificuldades em áreas de desenvolvimento.`;
}

const DOM = {
  tabsBar:       () => document.getElementById('tabsBar'),
  chatScroll:    () => document.getElementById('chatScroll'),
  composerInput: () => document.getElementById('composerInput'),
  composerBox:   () => document.getElementById('composerBox'),
  sendBtn:       () => document.getElementById('sendBtn'),
  saveBtn:       () => document.getElementById('saveBtn'),
  downloadBtn:   () => document.getElementById('downloadBtn'),
  wordBtn:       () => document.getElementById('wordBtn'),
  pdfStage:      () => document.getElementById('pdfStage'),
  tbName:        () => document.getElementById('tbName'),
  tbSub:         () => document.getElementById('tbSub'),
  headerStudent: () => document.getElementById('headerStudent'),
  toastWrap:     () => document.getElementById('toastWrap'),
  modalBackdrop:       () => document.getElementById('modalBackdrop'),
  apiKeyAnthropicInput:() => document.getElementById('apiKeyAnthropicInput'),
  apiKeyGeminiInput:   () => document.getElementById('apiKeyGeminiInput'),
  apiProvider:         () => document.getElementById('api-provider'),
  btnSettings:         () => document.getElementById('btnSettings'),
  modalCancel:         () => document.getElementById('modalCancel'),
  modalSave:           () => document.getElementById('modalSave'),
};

/* ════════════════════════════════════════════════════════
   3. API
════════════════════════════════════════════════════════ */
function getApiKey(provider) {
  return localStorage.getItem(API_KEYS_STORAGE[provider] || API_KEYS_STORAGE.anthropic) || '';
}

function saveApiKey(provider, key) {
  localStorage.setItem(API_KEYS_STORAGE[provider], key.trim());
}

function getActiveProvider() {
  const sel = DOM.apiProvider();
  return sel ? sel.value : 'anthropic';
}

async function callAI(messages) {
  const provider = getActiveProvider();
  return provider === 'gemini' ? callGemini(messages) : callAnthropic(messages);
  
}

async function callAnthropic(messages) {
  const key = getApiKey('anthropic');
  if (!key) throw new Error('Chave Anthropic não configurada. Clique em ⚙ no cabeçalho.');

  const response = await fetch(API_CONFIG.anthropic.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: API_CONFIG.anthropic.model,
      max_tokens: 1800,
      system: getSystemPrompt(),
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic — erro HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callGemini(messages) {
  const key = getApiKey('gemini');
  if (!key) throw new Error('Chave Gemini não configurada. Clique em ⚙ no cabeçalho.');

  

  const url = `${API_CONFIG.gemini.urlBase}?key=${key}`;

  // Converte formato Anthropic → Gemini: role 'assistant' → 'model', content → parts[{text}]
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: getSystemPrompt() }] },
      contents,
      generationConfig: { maxOutputTokens: 1800, temperature: 0.4 },
    }),

    generationConfig: {
      maxOutputTokens: 1500,
      temperature: 0.4,
      responseMimeType: 'application/json', // força JSON puro, sem markdown
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini — erro HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason || 'desconhecido';
    throw new Error(`Gemini não retornou texto. Motivo: ${reason}`);
  }
  return text;
}

/* ════════════════════════════════════════════════════════
   4. PARSER
════════════════════════════════════════════════════════ */
function parseReportJSON(rawText) {
  const clean = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(clean);
  } catch {
    throw new Error('A IA retornou um formato inesperado. Tente enviar a descrição novamente.');
  }
}

function extractName(text) {
  const m = text.match(/\b(?:chama-se|nome[ée]|aluno[ae]?\s*[:é]?\s*)?([A-ZÀ-Ý][a-zà-ÿ]{2,})\b/);
  if (m && m[1]) return m[1];
  const first = text.trim().split(/\s+/)[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : 'Aluno(a)';
}

function getCurrentDate() {
  const now = new Date();
  const months = [
    'janeiro','fevereiro','março','abril','maio','junho',
    'julho','agosto','setembro','outubro','novembro','dezembro',
  ];
  return `${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function buildReportFromParsed(parsed, fallbackName) {
  return {
    school:      SCHOOL.name,
    title:       'Relatório Pedagógico Individual',
    studentName: parsed.studentName || fallbackName,
    meta: {
      turma:      parsed.class    || '—',
      periodo:    parsed.period   || getCurrentPeriod(),
      professora: parsed.teacher  || 'Maria Aparecida',
      data:       getCurrentDate(),
    },
    sections: [
      { label: 'Desenvolvimento Geral',               body: parsed.geral     || '' },
      { label: 'Desempenho Acadêmico',                body: parsed.academico || '' },
      { label: 'Socialização e Comportamento',        body: parsed.social    || '' },
      { label: 'Pontos Fortes',                       body: parsed.pontos    || '' },
      { label: 'Observações e Recomendações',         body: parsed.obs       || '' },
    ],
  };
}

/* ════════════════════════════════════════════════════════
   5. UI RENDER
════════════════════════════════════════════════════════ */

/* ── 5a. Tabs ── */
function renderTabs() {
  const bar = DOM.tabsBar();
  bar.innerHTML = '';

  state.students.forEach(s => {
    const t = document.createElement('button');
    t.className = 'tab' + (s.id === state.activeId ? ' active' : '');
    const av = document.createElement('span');
    av.className = 'tab-avatar';
    av.textContent = initials(s.name);
    const label = document.createElement('span');
    label.textContent = s.name;
    t.appendChild(av);
    t.appendChild(label);
    t.addEventListener('click', () => switchTo(s.id));
    bar.appendChild(t);
  });

  const add = document.createElement('button');
  add.className = 'tab-add';
  add.title = 'Adicionar aluno';
  add.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
  add.addEventListener('click', addStudent);
  bar.appendChild(add);
}

/* ── 5b. Chat ── */
function renderChat() {
  const sc = DOM.chatScroll();
  const s = activeStudent();
  sc.innerHTML = '';
  if (!s) {
    sc.appendChild(createBubble('assistant', 'Bem-vinda! Adicione um aluno clicando no botão "+" acima para começar.'));
    return;
  }
  s.messages.forEach(m => sc.appendChild(createBubble(m.role, m.text)));
  if (s.generating) sc.appendChild(createGenBadge());
  sc.scrollTop = sc.scrollHeight;
}

function createBubble(role, text) {
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + (role === 'teacher' ? 'teacher' : 'assistant');

  if (role === 'assistant') {
    const av = document.createElement('span');
    av.className = 'avatar';
    av.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2 5 5 .5-3.8 3.3 1.3 5.2L12 13.2 7.5 16l1.3-5.2L5 7.5 10 7z"/></svg>`;
    const stack = document.createElement('div');
    stack.className = 'stack';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    stack.appendChild(bubble);
    wrap.appendChild(av);
    wrap.appendChild(stack);
  } else {
    const stack = document.createElement('div');
    stack.className = 'stack';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    stack.appendChild(bubble);
    wrap.appendChild(stack);
  }
  return wrap;
}

function createGenBadge() {
  const g = document.createElement('div');
  g.className = 'gen-badge';
  g.id = 'genBadge';
  g.innerHTML = `Gerando relatório <span class="gen-dots"><i></i><i></i><i></i></span>`;
  return g;
}

function appendMessage(role, text) {
  const sc = DOM.chatScroll();
  sc.appendChild(createBubble(role, text));
  sc.scrollTop = sc.scrollHeight;
}

function showGenBadge() {
  const sc = DOM.chatScroll();
  const existing = document.getElementById('genBadge');
  if (!existing) sc.appendChild(createGenBadge());
  sc.scrollTop = sc.scrollHeight;
}

function hideGenBadge() {
  const b = document.getElementById('genBadge');
  if (b) b.remove();
}

/* ── 5c. PDF ── */
function renderPDF(opts = {}) {
  const stage = DOM.pdfStage();
  const s = activeStudent();
  const hasReport = s && s.report;

  DOM.tbName().textContent = s ? `Relatório — ${s.name}` : 'Relatório';
  DOM.headerStudent().textContent = s ? s.name : '—';
  DOM.tbSub().textContent = hasReport
    ? 'Documento pronto · clique nos campos para editar'
    : 'Nenhum documento gerado';
  DOM.saveBtn().disabled = !hasReport;
  DOM.downloadBtn().disabled = !hasReport;
  DOM.wordBtn().disabled = !hasReport;

  if (!s) { stage.innerHTML = emptyHTML(); return; }
  if (s.generating) { stage.innerHTML = skeletonHTML(); return; }
  if (!s.report) { stage.innerHTML = emptyHTML(); return; }

  stage.innerHTML = sheetHTML(s.report);
  const sheet = stage.querySelector('.sheet');
  if (opts.appear) sheet.classList.add('appear');
  wireEditable(s);
}

function emptyHTML() {
  return `<div class="empty">
    <div class="ill">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6M9 13h6M9 17h4"/>
      </svg>
    </div>
    <h3>Nenhum relatório ainda</h3>
    <p>Descreva o aluno no chat ao lado em linguagem natural. O relatório pedagógico será gerado aqui automaticamente.</p>
    <div class="arrow">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Comece pelo painel da esquerda
    </div>
  </div>`;
}

function skeletonHTML() {
  let secs = '';
  for (let i = 0; i < 4; i++) {
    secs += `<div style="margin-bottom:22px">
      <div class="skel-line" style="width:38%;height:8px"></div>
      <div class="skel-line" style="width:100%"></div>
      <div class="skel-line" style="width:94%"></div>
      <div class="skel-line" style="width:86%;margin-bottom:0"></div>
    </div>`;
  }
  return `<div class="sheet">
    <div style="display:flex;gap:13px;align-items:center;padding-bottom:14px;border-bottom:2px solid var(--blue-deep)">
      <div class="skel-line" style="width:42px;height:42px;border-radius:50%;margin:0;flex-shrink:0"></div>
      <div style="flex:1">
        <div class="skel-line" style="width:60%"></div>
        <div class="skel-line" style="width:35%;height:8px;margin-bottom:0"></div>
      </div>
    </div>
    <div class="skel-center" style="margin:24px 0 22px">
      <div class="skel-line" style="width:55%;height:16px"></div>
      <div class="skel-line" style="width:30%;height:11px;margin-bottom:0"></div>
    </div>
    <div class="skel-line" style="width:100%;height:46px;border-radius:6px;margin-bottom:26px"></div>
    ${secs}
  </div>`;
}

function metaCellHTML(label, key, val) {
  return `<div class="meta-cell">
    <div class="label">${esc(label)}</div>
    <div class="value editable" data-meta="${esc(key)}" contenteditable="true" data-placeholder="—">${esc(val)}</div>
  </div>`;
}

function sheetHTML(r) {
  const sectionsHTML = (r.sections || []).map((sec, i) =>
    `<div class="section">
      <div class="sec-label">${esc(sec.label)}</div>
      <div class="sec-body editable" data-sec="${i}" contenteditable="true" data-placeholder="Clique para editar…">${esc(sec.body)}</div>
    </div>`
  ).join('');

  return `<div class="sheet">
    <div class="sheet-head">
      <div class="sheet-logo">${esc(initials(r.school).slice(0, 2))}</div>
      <div class="sheet-school">
        <span class="name editable" data-field="school" contenteditable="true" data-placeholder="Nome da escola">${esc(r.school)}</span>
        <span class="gov">${esc(SCHOOL.gov)}</span>
      </div>
    </div>

    <div class="sheet-title">
      <h2 class="editable" data-field="title" contenteditable="true" data-placeholder="Título">${esc(r.title)}</h2>
    </div>
    <div class="sheet-student">
      <span class="pref">Aluno(a)</span>
      <span class="editable" data-field="studentName" contenteditable="true" data-placeholder="Nome do aluno">${esc(r.studentName)}</span>
    </div>

    <div class="meta-grid">
      ${metaCellHTML('Turma', 'turma', r.meta.turma)}
      ${metaCellHTML('Período letivo', 'periodo', r.meta.periodo)}
      ${metaCellHTML('Professora(o)', 'professora', r.meta.professora)}
      ${metaCellHTML('Data de emissão', 'data', r.meta.data)}
    </div>

    ${sectionsHTML}

    <div class="sheet-foot">
      <div class="foot-date editable" data-field="data-foot" contenteditable="true">${esc(r.meta.data)}</div>
      <div class="foot-sigs">
        <div class="sign">
          <div class="line"></div>
          <div class="who">
            <b class="editable" data-field="professora-sig" contenteditable="true" data-placeholder="Nome da professora">${esc(r.meta.professora)}</b>
            Professora responsável
          </div>
        </div>
        <div class="sign">
          <div class="line"></div>
          <div class="who">Assinatura dos Pais/Responsáveis</div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── 5d. Wire editable fields ── */
function wireEditable(s) {
  DOM.pdfStage().querySelectorAll('.editable[contenteditable]').forEach(el => {
    el.addEventListener('blur', () => {
      const txt = el.textContent.trim();
      if (el.dataset.field) {
        if (el.dataset.field === 'school') s.report.school = txt;
        else if (el.dataset.field === 'title') s.report.title = txt;
        else if (el.dataset.field === 'studentName') {
          s.report.studentName = txt;
          s.name = txt.split(/\s+/)[0] || s.name;
          renderTabs();
          DOM.headerStudent().textContent = s.name;
          DOM.tbName().textContent = `Relatório — ${s.name}`;
        } else if (el.dataset.field === 'professora-sig') {
          s.report.meta.professora = txt;
        } else if (el.dataset.field === 'data-foot') {
          s.report.meta.data = txt;
        }
      } else if (el.dataset.meta) {
        s.report.meta[el.dataset.meta] = txt;
      } else if (el.dataset.sec !== undefined) {
        const idx = parseInt(el.dataset.sec, 10);
        if (s.report.sections[idx]) s.report.sections[idx].body = txt;
      }
    });
  });
}

/* ── 5e. Toast ── */
function showToast(msg, isError = false) {
  const wrap = DOM.toastWrap();
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' error' : '');
  const icon = isError
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>`;
  t.innerHTML = `${icon} ${esc(msg)}`;
  wrap.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 260);
  }, isError ? 4000 : 2800);
}

/* ════════════════════════════════════════════════════════
   6. EVENTS & ACTIONS
════════════════════════════════════════════════════════ */
function activeStudent() {
  return state.students.find(s => s.id === state.activeId) || null;
}

function switchTo(id) {
  if (id === state.activeId) return;
  state.activeId = id;
  renderTabs();
  renderChat();

  const stage = DOM.pdfStage();
  stage.style.transition = 'opacity .15s, transform .15s';
  stage.style.opacity = '0';
  stage.style.transform = 'translateX(8px)';
  setTimeout(() => {
    renderPDF();
    stage.style.opacity = '1';
    stage.style.transform = 'none';
  }, 150);
}

function addStudent() {
  const s = {
    id: state.uid++,
    name: `Aluno ${state.students.length + 1}`,
    generating: false,
    report: null,
    messages: [{
      role: 'assistant',
      text: 'Novo aluno criado. Descreva a criança em linguagem natural — personalidade, desempenho, pontos fortes e desafios — e eu gero o relatório pedagógico completo.',
    }],
  };
  state.students.push(s);
  state.activeId = s.id;
  renderTabs();
  renderChat();
  renderPDF();
  DOM.composerInput().focus();
}

async function sendMessage() {
  if (state.generating) return;

  const input = DOM.composerInput();
  const text = input.value.trim();
  if (!text) return;

  const s = activeStudent();
  if (!s) {
    showToast('Selecione ou adicione um aluno primeiro.', true);
    return;
  }

  state.generating = true;
  s.generating = true;
  DOM.sendBtn().disabled = true;

  s.messages.push({ role: 'teacher', text });
  input.value = '';
  autoGrow(input);
  DOM.sendBtn().disabled = true;

  appendMessage('teacher', text);
  showGenBadge();
  DOM.pdfStage().innerHTML = skeletonHTML();
  DOM.tbSub().textContent = 'Gerando relatório…';

  const apiMessages = s.messages
    .filter(m => m.role !== 'assistant' || s.messages.indexOf(m) > 0)
    .map(m => ({ role: m.role === 'teacher' ? 'user' : 'assistant', content: m.text }));

  try {
    const rawResponse = await callAI(apiMessages);
    const parsed = parseReportJSON(rawResponse);

    const name = parsed.studentName
      ? parsed.studentName.split(/\s+/)[0]
      : (s.name && !/^Aluno/.test(s.name) ? s.name : extractName(text));

    s.name = name;
    s.report = buildReportFromParsed(parsed, name);
    s.generating = false;

    const confirmText = `Pronto! Gerei o relatório de ${name}. Você pode editar qualquer campo diretamente no documento ao lado. Clique em "Baixar PDF" quando estiver pronto.`;
    s.messages.push({ role: 'assistant', text: confirmText });

    hideGenBadge();
    appendMessage('assistant', confirmText);
    renderTabs();
    renderPDF({ appear: true });

    const providerLabel = getActiveProvider() === 'gemini' ? 'Google Gemini' : 'Anthropic Claude';
    showToast(`Relatório gerado com ${providerLabel}`);

  } catch (err) {
    s.generating = false;
    const errText = err.message || 'Erro desconhecido. Tente novamente.';
    s.messages.push({ role: 'assistant', text: errText });
    hideGenBadge();
    appendMessage('assistant', errText);
    showToast(errText, true);
    if (!s.report) DOM.pdfStage().innerHTML = emptyHTML();
    DOM.tbSub().textContent = 'Nenhum documento gerado';
  }

  state.generating = false;
  DOM.sendBtn().disabled = !DOM.composerInput().value.trim();
}

function collectEdits() {
  const s = activeStudent();
  if (!s || !s.report) return;
  DOM.pdfStage().querySelectorAll('.editable[contenteditable]').forEach(el => el.blur());
}

function saveReport() {
  const s = activeStudent();
  if (!s || !s.report) return;
  collectEdits();
  showToast('Relatório salvo com sucesso');
}

async function downloadPDF() {
  const s = activeStudent();
  if (!s || !s.report) {
    showToast('Gere um relatório antes de baixar.', true);
    return;
  }

  collectEdits();
  showToast('Gerando PDF…');

  try {
    const page = DOM.pdfStage().querySelector('.sheet');
    if (!page) { showToast('Documento não encontrado.', true); return; }

    // 1. Clona a folha para não alterar o DOM original
    const clone = page.cloneNode(true);

    // 2. Estilos inline no clone — valores concretos, sem var()
    Object.assign(clone.style, {
      position:        'fixed',
      top:             '-99999px',
      left:            '-99999px',
      width:           '794px',
      height:          'auto',
      maxWidth:        'none',
      overflow:        'visible',
      background:      '#ffffff',
      backgroundColor: '#ffffff',
      padding:         '40px 44px',
      boxSizing:       'border-box',
      fontFamily:      'Georgia, serif',
      color:           '#1A1A1A',
      boxShadow:       'none',
      borderRadius:    '0',
      zIndex:          '-1',
    });

    // 3. Garante que fundos transparentes não virem preto
    clone.querySelectorAll('*').forEach(el => {
      const bg = el.style.backgroundColor;
      if (!bg || bg === 'rgba(0, 0, 0, 0)') {
        el.style.backgroundColor = 'transparent';
      }
    });

    // 4. Corrige cores dos elementos de cabeçalho
    const sheetHead = clone.querySelector('.sheet-head');
    if (sheetHead) { sheetHead.style.borderBottom = '2px solid #2A6B67'; }

    const sheetLogo = clone.querySelector('.sheet-logo');
    if (sheetLogo) {
      sheetLogo.style.background = '#2A6B67';
      sheetLogo.style.color      = '#ffffff';
    }

    const schoolName = clone.querySelector('.sheet-school .name');
    if (schoolName) { schoolName.style.color = '#2A6B67'; }

    const govInfo = clone.querySelector('.sheet-school .gov');
    if (govInfo) { govInfo.style.color = '#4A4842'; }

    const titleH2 = clone.querySelector('.sheet-title h2');
    if (titleH2) { titleH2.style.color = '#2A6B67'; }

    const studentPref = clone.querySelector('.sheet-student .pref');
    if (studentPref) { studentPref.style.color = '#4A4842'; }

    // 5. Corrige meta-grid
    const metaGrid = clone.querySelector('.meta-grid');
    if (metaGrid) {
      metaGrid.style.backgroundColor = '#E8E4DC';
      metaGrid.style.borderRadius    = '6px';
      metaGrid.style.padding         = '12px';
    }

    clone.querySelectorAll('.meta-cell .label').forEach(el => {
      el.style.color         = '#4A4842';
      el.style.fontSize      = '9px';
      el.style.fontWeight    = '700';
      el.style.textTransform = 'uppercase';
      el.style.letterSpacing = '0.04em';
    });

    clone.querySelectorAll('.meta-cell .value').forEach(el => {
      el.style.color      = '#1A1A1A';
      el.style.fontSize   = '12px';
      el.style.fontFamily = 'Georgia, serif';
    });

    // 6. Corrige seções
    clone.querySelectorAll('.section .sec-label').forEach(el => {
      el.style.color         = '#1F5956';
      el.style.fontSize      = '9px';
      el.style.fontWeight    = '700';
      el.style.textTransform = 'uppercase';
      el.style.letterSpacing = '0.08em';
    });

    clone.querySelectorAll('.section .sec-body').forEach(el => {
      el.style.color      = '#1A1A1A';
      el.style.fontSize   = '11.5px';
      el.style.lineHeight = '1.8';
      el.style.fontFamily = 'Georgia, serif';
    });

    // 7. Corrige rodapé e assinaturas
    const footDate = clone.querySelector('.foot-date');
    if (footDate) { footDate.style.color = '#4A4842'; }

    clone.querySelectorAll('.sign .line').forEach(el => {
      el.style.borderTop    = '1px solid #7A7570';
      el.style.marginBottom = '5px';
    });

    clone.querySelectorAll('.sign .who').forEach(el => {
      el.style.color    = '#4A4842';
      el.style.fontSize = '10px';
    });

    // 8. Insere o clone num container isolado fora da tela
    const container = document.createElement('div');
    Object.assign(container.style, {
      position:   'fixed',
      top:        '-99999px',
      left:       '-99999px',
      width:      '794px',
      background: '#ffffff',
      zIndex:     '-1',
    });
    container.appendChild(clone);
    document.body.appendChild(container);

    // 9. Aguarda fonts e re-render
    await new Promise(resolve => setTimeout(resolve, 200));

    // 10. Captura com html2canvas
    const canvas = await html2canvas(clone, {
      scale:           3,
      useCORS:         true,
      allowTaint:      true,
      backgroundColor: '#ffffff',
      logging:         false,
      windowWidth:     794,
      windowHeight:    clone.scrollHeight,
      width:           794,
      height:          clone.scrollHeight,
    });

    // 11. Remove o clone do DOM
    document.body.removeChild(container);

    // 12. Gera o PDF em A4
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit:        'mm',
      format:      'a4',
      compress:    true,
    });

    const pageW = 210;
    const pageH = 297;
    const imgW  = pageW;
    const imgH  = (canvas.height * imgW) / canvas.width;

    if (imgH <= pageH) {
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.98),
        'JPEG', 0, 0, imgW, imgH,
        undefined, 'FAST'
      );
    } else {
      const ratio   = pageH / imgH;
      const fittedW = imgW * ratio;
      const xOffset = (pageW - fittedW) / 2;
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.98),
        'JPEG', xOffset, 0, fittedW, pageH,
        undefined, 'FAST'
      );
    }

    // 13. Salva com nome limpo (sem acentos)
    const safeName = s.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '-');

    pdf.save(`relatorio-${safeName}.pdf`);
    showToast(`PDF gerado com sucesso!`);

  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    showToast('Erro ao gerar PDF. Veja o console para detalhes.', true);
  }
}

/* ── Word Download ── */
function downloadWord() {
  const s = activeStudent();
  if (!s || !s.report) {
    showToast('Gere um relatório antes de baixar.', true);
    return;
  }

  collectEdits();
  showToast('Gerando Word…');

  try {
    const r = s.report;

    const sectionsHTML = (r.sections || []).map(sec => `
      <p style="font-size:12pt;font-weight:bold;color:#2A6B67;margin:14pt 0 4pt 0;">${esc(sec.label)}</p>
      <p style="font-size:11pt;text-align:justify;margin:0 0 8pt 0;">${esc(sec.body)}</p>
    `).join('');

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <meta name=ProgId content=Word.Document>
        <!--[if gte mso 9]>
        <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1A1A1A; margin: 2cm; }
          table { width: 100%; border-collapse: collapse; }
          td { border: 1px solid #bbb; padding: 5pt 8pt; font-size: 10pt; }
        </style>
      </head>
      <body>
        <p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt 0;">${esc(r.school)}</p>
        <p style="text-align:center;font-size:10pt;color:#666;margin:0 0 16pt 0;">${esc(SCHOOL.gov)}</p>
        <p style="text-align:center;font-size:14pt;font-weight:bold;margin:0 0 14pt 0;">${esc(r.title)}</p>
        <p style="font-size:12pt;margin:0 0 12pt 0;"><b>Aluno(a):</b> ${esc(r.studentName)}</p>
        <table>
          <tr>
            <td style="font-weight:bold;background:#f0f0f0;">Turma</td>
            <td style="font-weight:bold;background:#f0f0f0;">Período letivo</td>
            <td style="font-weight:bold;background:#f0f0f0;">Professora(o)</td>
            <td style="font-weight:bold;background:#f0f0f0;">Data de emissão</td>
          </tr>
          <tr>
            <td>${esc(r.meta.turma || '—')}</td>
            <td>${esc(r.meta.periodo || '—')}</td>
            <td>${esc(r.meta.professora || '—')}</td>
            <td>${esc(r.meta.data || '—')}</td>
          </tr>
        </table>
        ${sectionsHTML}
        <p style="margin-top:24pt;font-size:10pt;">${esc(r.meta.data || '')}</p>
        <table style="margin-top:40pt;border:none;">
          <tr>
            <td style="border:none;text-align:center;width:50%;padding-top:8pt;">
              <p style="margin:0;">________________________________</p>
              <p style="margin:4pt 0 0 0;font-weight:bold;">${esc(r.meta.professora || '')}</p>
              <p style="margin:2pt 0 0 0;font-size:10pt;">Professora responsável</p>
            </td>
            <td style="border:none;text-align:center;width:50%;padding-top:8pt;">
              <p style="margin:0;">________________________________</p>
              <p style="margin:4pt 0 0 0;font-size:10pt;">Assinatura dos Pais/Responsáveis</p>
            </td>
          </tr>
        </table>
      </body>
      </html>`;

    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    const safeName = (r.studentName || 'relatorio').replace(/\s+/g, '-').toLowerCase();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${safeName}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Word gerado com sucesso!');

  } catch (err) {
    console.error('Erro ao gerar Word:', err);
    showToast('Erro ao gerar Word. Veja o console para detalhes.', true);
  }
}

/* ── Modal de API Keys ── */
function openModal() {
  DOM.apiKeyAnthropicInput().value = getApiKey('anthropic');
  DOM.apiKeyGeminiInput().value    = getApiKey('gemini');
  DOM.modalBackdrop().classList.remove('hidden');
  setTimeout(() => DOM.apiKeyAnthropicInput().focus(), 50);
}

function closeModal() {
  DOM.modalBackdrop().classList.add('hidden');
}

function saveModalKey() {
  const anthKey = DOM.apiKeyAnthropicInput().value.trim();
  const gemKey  = DOM.apiKeyGeminiInput().value.trim();
  if (!anthKey && !gemKey) {
    showToast('Cole ao menos uma chave de API válida.', true);
    return;
  }
  if (anthKey) saveApiKey('anthropic', anthKey);
  if (gemKey)  saveApiKey('gemini', gemKey);
  closeModal();
  showToast('Chaves de API salvas');
}

/* ── Auto-grow textarea ── */
function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 130) + 'px';
}

/* ── Setup all events ── */
function setupEvents() {
  const input = DOM.composerInput();
  const box = DOM.composerBox();

  input.addEventListener('input', () => {
    autoGrow(input);
    DOM.sendBtn().disabled = !input.value.trim() || state.generating;
  });
  input.addEventListener('focus', () => box.classList.add('focused'));
  input.addEventListener('blur', () => box.classList.remove('focused'));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  DOM.sendBtn().addEventListener('click', sendMessage);
  DOM.saveBtn().addEventListener('click', saveReport);
  DOM.downloadBtn().addEventListener('click', downloadPDF);
  DOM.wordBtn().addEventListener('click', downloadWord);

  DOM.btnSettings().addEventListener('click', openModal);
  DOM.modalCancel().addEventListener('click', closeModal);
  DOM.modalSave().addEventListener('click', saveModalKey);
  DOM.modalBackdrop().addEventListener('click', e => {
    if (e.target === DOM.modalBackdrop()) closeModal();
  });
  [DOM.apiKeyAnthropicInput, DOM.apiKeyGeminiInput].forEach(getter => {
    getter().addEventListener('keydown', e => {
      if (e.key === 'Enter') saveModalKey();
      if (e.key === 'Escape') closeModal();
    });
  });
}

/* ════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════ */
function init() {
  setupEvents();
  renderTabs();
  renderChat();
  renderPDF();

  if (!getApiKey('anthropic') && !getApiKey('gemini')) {
    setTimeout(openModal, 600);
  }
}

document.addEventListener('DOMContentLoaded', init);
