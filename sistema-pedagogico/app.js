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

const SYSTEM_PROMPT = `Você é um especialista em pedagogia brasileira, auxiliando professores a redigir relatórios individuais de alunos do ensino fundamental.

Quando receber uma descrição de um aluno, gere um relatório pedagógico completo em português formal, adequado para documento escolar oficial.

IMPORTANTE: Responda SOMENTE com um JSON válido, sem texto antes ou depois. Sem blocos de código, sem markdown, apenas o JSON puro.

Formato do JSON:
{
  "studentName": "Nome completo do aluno",
  "class": "Ex: 3º Ano A",
  "age": "Ex: 8 anos",
  "period": "Ex: 2º Bimestre 2026",
  "teacher": "A preencher",
  "geral": "Parágrafo sobre desenvolvimento geral (3-4 frases formais)",
  "academico": "Parágrafo sobre desempenho acadêmico (3-4 frases formais)",
  "social": "Parágrafo sobre socialização e comportamento (2-3 frases formais)",
  "pontos": "Parágrafo sobre pontos fortes (2-3 frases formais)",
  "obs": "Observações e recomendações para o próximo período (2-3 frases)"
}

Use linguagem formal, empática e construtiva. Nunca use linguagem negativa — transforme dificuldades em áreas de desenvolvimento.`;

const DOM = {
  tabsBar:       () => document.getElementById('tabsBar'),
  chatScroll:    () => document.getElementById('chatScroll'),
  composerInput: () => document.getElementById('composerInput'),
  composerBox:   () => document.getElementById('composerBox'),
  sendBtn:       () => document.getElementById('sendBtn'),
  saveBtn:       () => document.getElementById('saveBtn'),
  downloadBtn:   () => document.getElementById('downloadBtn'),
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
      system: SYSTEM_PROMPT,
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
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
      periodo:    parsed.period   || '—',
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
          <div class="who">Assinatura da Direção</div>
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

  const page = DOM.pdfStage().querySelector('.sheet');
  if (!page) { showToast('Documento não encontrado.', true); return; }

  // Guarda estilos originais para restaurar depois
  const originalStyles = {
    maxWidth: page.style.maxWidth,
    width:    page.style.width,
    height:   page.style.height,
    overflow: page.style.overflow,
    position: page.style.position,
  };

  try {
    // 1. Expande a folha para capturar o conteúdo completo sem corte
    page.style.maxWidth = 'none';
    page.style.width    = '794px';   // largura A4 a 96 DPI
    page.style.height   = 'auto';
    page.style.overflow = 'visible';
    page.style.position = 'relative';

    // 2. Aguarda o browser re-renderizar
    await new Promise(resolve => setTimeout(resolve, 120));

    // 3. Captura em alta resolução (3x ≈ 288 DPI)
    const canvas = await html2canvas(page, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth:  page.scrollWidth,
      windowHeight: page.scrollHeight,
    });

    // 4. Cria o PDF A4
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidthMM  = 210;
    const pageHeightMM = 297;

    // 5. Ajusta a imagem para caber em A4 sem perder proporção
    const imgWidthMM  = pageWidthMM;
    const imgHeightMM = (canvas.height * imgWidthMM) / canvas.width;

    if (imgHeightMM <= pageHeightMM) {
      // Cabe em página única — centraliza verticalmente
      const yOffset = (pageHeightMM - imgHeightMM) / 2;
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.97),
        'JPEG',
        0,
        yOffset > 0 ? yOffset : 0,
        imgWidthMM,
        imgHeightMM,
        undefined,
        'FAST'
      );
    } else {
      // Conteúdo maior que A4 — escala para página única
      const scale   = pageHeightMM / imgHeightMM;
      const fittedW = imgWidthMM  * scale;
      const fittedH = pageHeightMM;
      const xOffset = (pageWidthMM - fittedW) / 2;
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.97),
        'JPEG',
        xOffset,
        0,
        fittedW,
        fittedH,
        undefined,
        'FAST'
      );
    }

    // 6. Salva com nome limpo (sem acentos)
    const safeName = s.name.toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '-');
    const fileName = `relatorio-${safeName}.pdf`;
    pdf.save(fileName);
    showToast(`PDF baixado: ${fileName}`);

  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    showToast('Erro ao gerar PDF. Tente novamente.', true);
  } finally {
    // 7. Restaura os estilos originais em qualquer cenário
    page.style.maxWidth = originalStyles.maxWidth;
    page.style.width    = originalStyles.width;
    page.style.height   = originalStyles.height;
    page.style.overflow = originalStyles.overflow;
    page.style.position = originalStyles.position;
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
