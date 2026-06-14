# Script para Claude Code — Sistema Pedagógico de Relatórios

## Contexto do projeto

Você vai construir um **sistema pedagógico de geração de relatórios individuais de alunos**,
usando a API da Anthropic para gerar o texto dos relatórios e jsPDF para exportar o PDF final.

A interface é dividida em dois painéis:
- **Esquerdo (42%):** chat por aluno, onde a professora descreve a criança em linguagem natural
- **Direito (58%):** pré-visualizador do relatório em formato de folha A4 com todos os campos editáveis inline

---

## Estrutura de arquivos a criar

```
sistema-pedagogico/
├── index.html
├── style.css
└── app.js
```

Não use frameworks, bundlers ou dependências npm. Tudo vanilla HTML + CSS + JS.
A única dependência externa é a biblioteca jsPDF (carregada via CDN).

---

## ARQUIVO 1 — index.html

### Estrutura geral do documento

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sistema Pedagógico de Relatórios</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <!-- APP ROOT -->
  <div id="app">
    <!-- HEADER -->
    <!-- MAIN SPLIT -->
    <!-- LEFT PANEL -->
    <!-- RIGHT PANEL -->
  </div>
  <div id="toast" class="toast hidden"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

---

### Seção: Header (`<header id="app-header">`)

```html
<header id="app-header">
  <div class="header-left">
    <div class="header-icon">🏫</div>
    <div class="header-titles">
      <h1 class="header-title">Sistema Pedagógico</h1>
      <span class="header-subtitle">Relatórios individuais por IA</span>
    </div>
  </div>
  <div class="header-right">
    <span class="header-student-indicator" id="active-student-indicator">
      Nenhum aluno selecionado
    </span>
  </div>
</header>
```

---

### Seção: Main layout (`<main id="main-layout">`)

Contém dois painéis lado a lado dentro de uma `div.split-container`.

```html
<main id="main-layout">
  <div class="split-container">

    <!-- PAINEL ESQUERDO -->
    <section class="panel left-panel" id="left-panel">
      <!-- 1. Abas de alunos -->
      <div class="tabs-bar" id="tabs-bar">
        <!-- Abas geradas dinamicamente pelo JS -->
        <button class="tab-add-btn" id="btn-add-student" title="Adicionar aluno">+</button>
      </div>

      <!-- 2. Área de chat -->
      <div class="chat-area" id="chat-area">
        <!-- Mensagens inseridas dinamicamente -->
      </div>

      <!-- 3. Input da professora -->
      <div class="input-area">
        <div class="input-row">
          <textarea
            id="msg-input"
            class="msg-textarea"
            placeholder="Descreva o aluno: nome, turma, comportamento, desempenho, pontos fortes e áreas de melhoria..."
            rows="3"
          ></textarea>
          <button class="btn-send" id="btn-send">
            <span class="btn-send-icon">➤</span>
            <span>Gerar</span>
          </button>
        </div>
        <p class="input-hint">Enter para enviar · Shift+Enter para nova linha</p>
      </div>
    </section>

    <!-- PAINEL DIREITO -->
    <section class="panel right-panel" id="right-panel">
      <!-- 1. Toolbar do PDF -->
      <div class="pdf-toolbar" id="pdf-toolbar">
        <div class="pdf-toolbar-left">
          <span class="pdf-toolbar-icon">📄</span>
          <span class="pdf-active-name" id="pdf-active-name">Nenhum relatório</span>
          <span class="pdf-badge">PDF</span>
        </div>
        <div class="pdf-toolbar-right">
          <button class="btn-toolbar" id="btn-save">💾 Salvar</button>
          <button class="btn-toolbar btn-primary" id="btn-download">⬇ Baixar PDF</button>
        </div>
      </div>

      <!-- 2. Área do visualizador -->
      <div class="pdf-viewer" id="pdf-viewer">

        <!-- Estado vazio (visível quando não há relatório gerado) -->
        <div class="empty-state" id="empty-state">
          <div class="empty-icon">📋</div>
          <p class="empty-title">Nenhum relatório ainda</p>
          <p class="empty-sub">Adicione um aluno e descreva-o no chat para gerar o relatório</p>
        </div>

        <!-- Folha do PDF (oculta inicialmente, mostrada após geração) -->
        <div class="pdf-page" id="pdf-page" style="display:none;">

          <!-- Cabeçalho da folha -->
          <div class="page-header">
            <div class="school-logo" aria-hidden="true">🏫</div>
            <div class="school-info">
              <h2 class="school-name" id="field-school-name" contenteditable="true">
                Escola Municipal Girassol
              </h2>
              <p class="school-sub">Relatório Pedagógico Individual</p>
            </div>
          </div>
          <hr class="page-divider" />

          <!-- Título do relatório -->
          <div class="report-title-block">
            <p class="report-label">RELATÓRIO DE DESENVOLVIMENTO ESCOLAR</p>
            <h3 class="report-student-name" id="field-student-name" contenteditable="true">
              Nome do Aluno
            </h3>
          </div>

          <!-- Grade de metadados -->
          <div class="meta-grid">
            <div class="meta-item">
              <label class="meta-label">Turma</label>
              <span class="meta-value" id="field-class" contenteditable="true">—</span>
            </div>
            <div class="meta-item">
              <label class="meta-label">Idade</label>
              <span class="meta-value" id="field-age" contenteditable="true">—</span>
            </div>
            <div class="meta-item">
              <label class="meta-label">Período</label>
              <span class="meta-value" id="field-period" contenteditable="true">1º Semestre 2025</span>
            </div>
            <div class="meta-item">
              <label class="meta-label">Professora</label>
              <span class="meta-value" id="field-teacher" contenteditable="true">—</span>
            </div>
          </div>

          <!-- Seções do relatório (todas editáveis) -->
          <div class="report-section">
            <h4 class="section-title">Desenvolvimento Geral</h4>
            <div class="section-content" id="field-geral" contenteditable="true"></div>
          </div>

          <div class="report-section">
            <h4 class="section-title">Desempenho Acadêmico</h4>
            <div class="section-content" id="field-academico" contenteditable="true"></div>
          </div>

          <div class="report-section">
            <h4 class="section-title">Socialização e Comportamento</h4>
            <div class="section-content" id="field-social" contenteditable="true"></div>
          </div>

          <div class="report-section">
            <h4 class="section-title">Pontos Fortes</h4>
            <div class="section-content" id="field-pontos" contenteditable="true"></div>
          </div>

          <div class="report-section">
            <h4 class="section-title">Observações e Recomendações</h4>
            <div class="section-content" id="field-obs" contenteditable="true"></div>
          </div>

          <!-- Avaliação por estrelas -->
          <div class="report-section">
            <h4 class="section-title">Avaliação do Período</h4>
            <div class="stars-row" id="stars-row" role="group" aria-label="Avaliação em estrelas">
              <span class="star active" data-value="1" role="button" tabindex="0" aria-label="1 estrela">★</span>
              <span class="star active" data-value="2" role="button" tabindex="0" aria-label="2 estrelas">★</span>
              <span class="star active" data-value="3" role="button" tabindex="0" aria-label="3 estrelas">★</span>
              <span class="star active" data-value="4" role="button" tabindex="0" aria-label="4 estrelas">★</span>
              <span class="star"       data-value="5" role="button" tabindex="0" aria-label="5 estrelas">★</span>
            </div>
          </div>

          <!-- Rodapé da folha -->
          <div class="page-footer">
            <span class="footer-date" id="field-date" contenteditable="true">Jundiaí, junho de 2025</span>
            <div class="footer-signature">
              <div class="signature-line"></div>
              <span class="signature-label" id="field-signature" contenteditable="true">Assinatura da Professora</span>
            </div>
          </div>

        </div><!-- fim .pdf-page -->

        <!-- Skeleton de carregamento (oculto por padrão) -->
        <div class="pdf-skeleton" id="pdf-skeleton" style="display:none;">
          <div class="skeleton-line wide"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line wide"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line wide"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line wide"></div>
        </div>

      </div><!-- fim .pdf-viewer -->
    </section>

  </div><!-- fim .split-container -->
</main>
```

---

## ARQUIVO 2 — style.css

### Variáveis e reset

```css
/* ─── Variáveis ─────────────────────────────────────────── */
:root {
  --azul-escuro:      #1E3A5F;
  --azul-medio:       #2C5282;
  --azul-gelo:        #EBF4FF;
  --azul-gelo-hover:  #DBEAFE;
  --verde-acao:       #38A169;
  --verde-hover:      #2F855A;
  --verde-suave:      #F0FFF4;
  --creme:            #FEFCF7;
  --branco:           #FFFFFF;
  --cinza-texto:      #2D3748;
  --cinza-sec:        #718096;
  --cinza-borda:      #E2E8F0;
  --cinza-borda-med:  #CBD5E0;
  --dourado-estrela:  #F5A623;
  --sombra-papel:     0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
  --font-ui:          'Inter', system-ui, sans-serif;
  --font-doc:         Georgia, 'Times New Roman', serif;
  --radius-sm:        6px;
  --radius-md:        10px;
  --radius-lg:        14px;
  --transition:       150ms ease;
}

/* ─── Reset ─────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: var(--font-ui);
  font-size: 14px;
  color: var(--cinza-texto);
  background: #F0F4F8;
  overflow: hidden;
}
[contenteditable] { outline: none; }
```

---

### Layout raiz

```css
/* ─── App root ───────────────────────────────────────────── */
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* ─── Header ────────────────────────────────────────────── */
#app-header {
  height: 52px;
  background: var(--azul-escuro);
  color: var(--branco);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.header-left  { display: flex; align-items: center; gap: 10px; }
.header-icon  { font-size: 22px; line-height: 1; }
.header-title { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.header-subtitle { font-size: 11px; opacity: 0.6; display: block; margin-top: 1px; }
.header-student-indicator {
  font-size: 12px;
  opacity: 0.7;
  background: rgba(255,255,255,0.10);
  padding: 4px 12px;
  border-radius: 20px;
}

/* ─── Main layout ────────────────────────────────────────── */
#main-layout { flex: 1; overflow: hidden; }
.split-container { display: flex; height: 100%; }

/* ─── Painéis ────────────────────────────────────────────── */
.panel { display: flex; flex-direction: column; overflow: hidden; }
.left-panel  { width: 42%; border-right: 1px solid var(--cinza-borda); background: var(--creme); }
.right-panel { flex: 1; background: var(--azul-gelo); }
```

---

### Painel esquerdo — Abas

```css
/* ─── Abas ───────────────────────────────────────────────── */
.tabs-bar {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 10px 12px 0;
  border-bottom: 1px solid var(--cinza-borda);
  background: var(--creme);
  overflow-x: auto;
  flex-shrink: 0;
}
.tab-btn {
  padding: 6px 14px;
  border: 1px solid var(--cinza-borda);
  border-bottom: none;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  background: #F1EDE8;
  color: var(--cinza-sec);
  font-size: 12px;
  font-family: var(--font-ui);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition), color var(--transition);
}
.tab-btn:hover { background: #EAE5DF; color: var(--cinza-texto); }
.tab-btn.active {
  background: var(--creme);
  color: var(--azul-escuro);
  font-weight: 500;
  border-color: var(--cinza-borda-med);
}
.tab-add-btn {
  padding: 5px 10px;
  border: 1px dashed var(--cinza-borda-med);
  border-bottom: none;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  background: transparent;
  color: var(--cinza-sec);
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
  transition: color var(--transition), border-color var(--transition);
}
.tab-add-btn:hover { color: var(--azul-escuro); border-color: var(--azul-escuro); }
```

---

### Painel esquerdo — Chat

```css
/* ─── Chat ───────────────────────────────────────────────── */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}

/* Mensagem genérica */
.message { display: flex; flex-direction: column; gap: 3px; max-width: 88%; }
.message.user      { align-self: flex-end; }
.message.assistant { align-self: flex-start; }

.msg-label {
  font-size: 10px;
  color: var(--cinza-sec);
  padding: 0 4px;
}
.message.user .msg-label { text-align: right; }

.msg-bubble {
  padding: 9px 13px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}
.message.user .msg-bubble {
  background: var(--azul-escuro);
  color: var(--branco);
  border-radius: 12px 12px 2px 12px;
}
.message.assistant .msg-bubble {
  background: var(--branco);
  color: var(--cinza-texto);
  border: 1px solid var(--cinza-borda);
  border-radius: 12px 12px 12px 2px;
}

/* Badge gerando */
.generating-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--verde-acao);
  padding: 6px 13px;
  border: 1px solid var(--verde-acao);
  border-radius: 20px;
  align-self: flex-start;
  font-weight: 500;
}
.dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--verde-acao);
  animation: pulse-dot 1.2s infinite;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse-dot {
  0%, 100% { opacity: 0.25; transform: scale(0.8); }
  50%       { opacity: 1;    transform: scale(1); }
}
```

---

### Painel esquerdo — Input

```css
/* ─── Input ─────────────────────────────────────────────── */
.input-area {
  padding: 12px;
  border-top: 1px solid var(--cinza-borda);
  background: var(--creme);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.input-row { display: flex; gap: 8px; align-items: flex-end; }

.msg-textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--cinza-borda-med);
  border-radius: var(--radius-md);
  padding: 9px 12px;
  font-size: 13px;
  font-family: var(--font-ui);
  line-height: 1.6;
  color: var(--cinza-texto);
  background: var(--branco);
  transition: border-color var(--transition), box-shadow var(--transition);
}
.msg-textarea:focus {
  border-color: var(--azul-escuro);
  box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.12);
}
.msg-textarea::placeholder { color: var(--cinza-sec); }

.btn-send {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  background: var(--azul-escuro);
  color: var(--branco);
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-ui);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition), transform var(--transition);
  align-self: flex-end;
  height: 40px;
}
.btn-send:hover  { background: var(--azul-medio); }
.btn-send:active { transform: scale(0.97); }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.input-hint {
  font-size: 11px;
  color: var(--cinza-sec);
}
```

---

### Painel direito — Toolbar e viewer

```css
/* ─── PDF Toolbar ────────────────────────────────────────── */
.pdf-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--branco);
  border-bottom: 1px solid var(--cinza-borda);
  flex-shrink: 0;
}
.pdf-toolbar-left  { display: flex; align-items: center; gap: 8px; }
.pdf-toolbar-icon  { font-size: 16px; }
.pdf-active-name   { font-size: 13px; font-weight: 500; color: var(--azul-escuro); }
.pdf-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--branco);
  background: var(--azul-escuro);
  padding: 2px 8px;
  border-radius: 20px;
  letter-spacing: 0.04em;
}
.pdf-toolbar-right { display: flex; gap: 6px; }

.btn-toolbar {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: 1px solid var(--cinza-borda-med);
  border-radius: var(--radius-sm);
  background: var(--branco);
  color: var(--cinza-texto);
  font-size: 12px;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: background var(--transition);
}
.btn-toolbar:hover { background: var(--cinza-borda); }
.btn-toolbar.btn-primary {
  background: var(--verde-acao);
  color: var(--branco);
  border-color: var(--verde-acao);
  font-weight: 500;
}
.btn-toolbar.btn-primary:hover { background: var(--verde-hover); border-color: var(--verde-hover); }

/* ─── PDF Viewer ─────────────────────────────────────────── */
.pdf-viewer {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

/* ─── Empty state ────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 100%;
  min-height: 400px;
  color: var(--cinza-sec);
  text-align: center;
}
.empty-icon  { font-size: 48px; opacity: 0.35; }
.empty-title { font-size: 15px; font-weight: 500; }
.empty-sub   { font-size: 13px; opacity: 0.75; max-width: 240px; line-height: 1.5; }
```

---

### Folha PDF

```css
/* ─── Folha PDF ──────────────────────────────────────────── */
.pdf-page {
  background: var(--branco);
  width: 100%;
  max-width: 480px;
  min-height: 640px;
  border-radius: 3px;
  box-shadow: var(--sombra-papel);
  padding: 40px 44px;
  display: flex;
  flex-direction: column;
  gap: 0;
  animation: page-appear 0.25s ease;
}
@keyframes page-appear {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Cabeçalho da folha */
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.school-logo {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: var(--azul-escuro);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.school-name {
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 600;
  color: var(--azul-escuro);
}
.school-sub {
  font-size: 10px;
  color: var(--cinza-sec);
  margin-top: 1px;
}

.page-divider {
  border: none;
  border-top: 1.5px solid var(--azul-escuro);
  margin-bottom: 16px;
}

/* Bloco de título */
.report-title-block {
  text-align: center;
  margin-bottom: 18px;
}
.report-label {
  font-size: 9px;
  font-family: var(--font-ui);
  font-weight: 600;
  color: var(--cinza-sec);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 5px;
}
.report-student-name {
  font-family: var(--font-doc);
  font-size: 17px;
  font-weight: bold;
  color: var(--azul-escuro);
}

/* Grade de metadados */
.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: #EBF4FF;
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 18px;
}
.meta-item { display: flex; flex-direction: column; gap: 2px; }
.meta-label {
  font-size: 9px;
  font-weight: 600;
  color: var(--cinza-sec);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.meta-value {
  font-size: 12px;
  font-weight: 500;
  color: var(--cinza-texto);
  min-height: 18px;
  border-radius: 3px;
  padding: 1px 3px;
  transition: background var(--transition);
}
.meta-value:hover { background: rgba(30,58,95,0.06); }
.meta-value:focus { background: rgba(30,58,95,0.10); }

/* Seções do relatório */
.report-section { margin-bottom: 14px; }
.section-title {
  font-family: var(--font-ui);
  font-size: 9px;
  font-weight: 700;
  color: var(--azul-escuro);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 5px;
  padding-bottom: 3px;
  border-bottom: 1px solid #B8D4F0;
}
.section-content {
  font-family: var(--font-doc);
  font-size: 11.5px;
  line-height: 1.8;
  color: var(--cinza-texto);
  min-height: 32px;
  border-radius: 3px;
  padding: 4px 5px;
  transition: background var(--transition);
}
.section-content:hover { background: #F7FAFF; }
.section-content:focus { background: #EBF4FF; box-shadow: 0 0 0 2px rgba(30,58,95,0.18); }
.section-content:empty::before {
  content: 'Clique para editar...';
  color: var(--cinza-sec);
  font-style: italic;
  pointer-events: none;
}

/* Estrelas */
.stars-row { display: flex; gap: 4px; margin-bottom: 2px; }
.star {
  font-size: 20px;
  color: var(--cinza-borda-med);
  cursor: pointer;
  transition: color var(--transition), transform var(--transition);
  user-select: none;
}
.star.active { color: var(--dourado-estrela); }
.star:hover  { transform: scale(1.25); }

/* Rodapé da folha */
.page-footer {
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid var(--cinza-borda);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.footer-date {
  font-size: 10px;
  color: var(--cinza-sec);
  border-radius: 3px;
  padding: 2px 4px;
  transition: background var(--transition);
}
.footer-date:hover { background: #F7FAFF; }
.footer-date:focus { background: #EBF4FF; }
.footer-signature { text-align: center; }
.signature-line {
  width: 130px;
  border-top: 1px solid var(--cinza-borda-med);
  margin-bottom: 5px;
}
.signature-label {
  display: block;
  font-size: 9px;
  color: var(--cinza-sec);
  border-radius: 3px;
  padding: 1px 4px;
  transition: background var(--transition);
}
.signature-label:hover { background: #F7FAFF; }
.signature-label:focus { background: #EBF4FF; }
```

---

### Skeleton e Toast

```css
/* ─── Skeleton ───────────────────────────────────────────── */
.pdf-skeleton {
  background: var(--branco);
  width: 100%;
  max-width: 480px;
  min-height: 400px;
  border-radius: 3px;
  box-shadow: var(--sombra-papel);
  padding: 40px 44px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.skeleton-line {
  height: 12px;
  background: linear-gradient(90deg, #E8EDF2 25%, #D1D8E0 50%, #E8EDF2 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: shimmer 1.4s infinite;
}
.skeleton-line.wide   { width: 100%; }
.skeleton-line.medium { width: 70%; }
.skeleton-line.short  { width: 40%; }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ─── Toast ──────────────────────────────────────────────── */
.toast {
  position: fixed;
  top: 68px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--verde-acao);
  color: var(--branco);
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  z-index: 999;
  box-shadow: 0 4px 12px rgba(56, 161, 105, 0.35);
  transition: opacity 0.3s ease;
}
.toast.hidden { opacity: 0; pointer-events: none; }

/* ─── Scrollbar ──────────────────────────────────────────── */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--cinza-borda-med); border-radius: 10px; }
```

---

## ARQUIVO 3 — app.js

### Estrutura geral do arquivo

Organize o JS em 6 módulos comentados na ordem abaixo. Não use classes nem ES modules — apenas funções e variáveis no escopo global do arquivo.

```
1. STATE         — objeto central com todos os dados da aplicação
2. CONSTANTS     — chave de API, prompt do sistema, seletores de DOM
3. API           — função que chama a Anthropic API
4. PARSER        — extrai os campos do JSON retornado pela IA
5. UI RENDER     — funções que escrevem no DOM (abas, chat, PDF)
6. EVENTS        — todos os addEventListener
```

---

### 1. STATE

```js
// ─── 1. STATE ─────────────────────────────────────────────
const state = {
  students: [],          // Array de objetos { id, name, chatHistory, report }
  activeStudentId: null, // ID do aluno atualmente selecionado
  isGenerating: false,   // Bloqueia envio duplo
  starRating: 4,         // Valor atual das estrelas
};

// Estrutura de um estudante:
// {
//   id: 'uuid-v4-string',
//   name: 'Nome do Aluno',
//   chatHistory: [
//     { role: 'user' | 'assistant', content: 'texto' }
//   ],
//   report: {           // null até ser gerado
//     schoolName: '',
//     studentName: '',
//     class: '',
//     age: '',
//     period: '',
//     teacher: '',
//     geral: '',
//     academico: '',
//     social: '',
//     pontos: '',
//     obs: '',
//     starRating: 4,
//     date: '',
//     signature: '',
//   }
// }
```

---

### 2. CONSTANTS

```js
// ─── 2. CONSTANTS ─────────────────────────────────────────
const API_KEY = 'SUA_CHAVE_AQUI'; // Substituir pela chave real

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

const DOM = {
  tabsBar:         () => document.getElementById('tabs-bar'),
  chatArea:        () => document.getElementById('chat-area'),
  msgInput:        () => document.getElementById('msg-input'),
  btnSend:         () => document.getElementById('btn-send'),
  btnSave:         () => document.getElementById('btn-save'),
  btnDownload:     () => document.getElementById('btn-download'),
  btnAddStudent:   () => document.getElementById('btn-add-student'),
  pdfPage:         () => document.getElementById('pdf-page'),
  pdfSkeleton:     () => document.getElementById('pdf-skeleton'),
  emptyState:      () => document.getElementById('empty-state'),
  pdfActiveName:   () => document.getElementById('pdf-active-name'),
  activeIndicator: () => document.getElementById('active-student-indicator'),
  toast:           () => document.getElementById('toast'),
  starsRow:        () => document.getElementById('stars-row'),
  // Campos editáveis do PDF
  fields: {
    schoolName:  () => document.getElementById('field-school-name'),
    studentName: () => document.getElementById('field-student-name'),
    class:       () => document.getElementById('field-class'),
    age:         () => document.getElementById('field-age'),
    period:      () => document.getElementById('field-period'),
    teacher:     () => document.getElementById('field-teacher'),
    geral:       () => document.getElementById('field-geral'),
    academico:   () => document.getElementById('field-academico'),
    social:      () => document.getElementById('field-social'),
    pontos:      () => document.getElementById('field-pontos'),
    obs:         () => document.getElementById('field-obs'),
    date:        () => document.getElementById('field-date'),
    signature:   () => document.getElementById('field-signature'),
  }
};
```

---

### 3. API

```js
// ─── 3. API ───────────────────────────────────────────────

async function callAnthropicAPI(messages) {
  // messages = array no formato [{ role, content }]
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text; // texto bruto retornado pela IA
}
```

---

### 4. PARSER

```js
// ─── 4. PARSER ────────────────────────────────────────────

function parseReportJSON(rawText) {
  // Remove blocos markdown caso a IA os inclua por engano
  const clean = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error('Erro ao parsear JSON da IA:', rawText);
    throw new Error('A IA retornou um formato inválido. Tente novamente.');
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getCurrentDate() {
  const now = new Date();
  const months = [
    'janeiro','fevereiro','março','abril','maio','junho',
    'julho','agosto','setembro','outubro','novembro','dezembro'
  ];
  // Detecta cidade pela variável definida no HTML ou usa padrão
  const city = window.CITY_NAME || 'Jundiaí';
  return `${city}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
}
```

---

### 5. UI RENDER

#### 5a. Abas

```js
// ─── 5. UI RENDER ─────────────────────────────────────────

function renderTabs() {
  const bar = DOM.tabsBar();
  // Remove todas as abas existentes (mantém o botão +)
  bar.querySelectorAll('.tab-btn').forEach(t => t.remove());
  const addBtn = DOM.btnAddStudent();

  state.students.forEach(student => {
    const tab = document.createElement('button');
    tab.className = 'tab-btn' + (student.id === state.activeStudentId ? ' active' : '');
    tab.textContent = student.name;
    tab.dataset.id = student.id;
    tab.addEventListener('click', () => selectStudent(student.id));
    bar.insertBefore(tab, addBtn);
  });
}
```

#### 5b. Chat

```js
function renderChat() {
  const area = DOM.chatArea();
  area.innerHTML = '';

  const student = getActiveStudent();
  if (!student) return;

  if (student.chatHistory.length === 0) {
    appendAssistantMessage(
      `Olá! Descreva ${student.name} para eu gerar o relatório. ` +
      `Inclua turma, idade, comportamento, desempenho e pontos fortes.`
    );
    return;
  }

  student.chatHistory.forEach(msg => {
    const el = createMessageElement(msg.role, msg.content);
    area.appendChild(el);
  });

  area.scrollTop = area.scrollHeight;
}

function createMessageElement(role, content) {
  const wrapper = document.createElement('div');
  wrapper.className = `message ${role}`;

  const label = document.createElement('span');
  label.className = 'msg-label';
  label.textContent = role === 'user' ? 'Professora' : 'Assistente';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = content;

  wrapper.appendChild(label);
  wrapper.appendChild(bubble);
  return wrapper;
}

function appendUserMessage(text) {
  const area = DOM.chatArea();
  const el = createMessageElement('user', text);
  area.appendChild(el);
  area.scrollTop = area.scrollHeight;
}

function appendAssistantMessage(text) {
  const area = DOM.chatArea();
  const el = createMessageElement('assistant', text);
  area.appendChild(el);
  area.scrollTop = area.scrollHeight;
}

function showGeneratingBadge() {
  const area = DOM.chatArea();
  const badge = document.createElement('div');
  badge.className = 'generating-badge';
  badge.id = 'generating-badge';
  badge.innerHTML = `
    <span class="dot"></span>
    <span class="dot"></span>
    <span class="dot"></span>
    Gerando relatório...
  `;
  area.appendChild(badge);
  area.scrollTop = area.scrollHeight;
}

function hideGeneratingBadge() {
  const badge = document.getElementById('generating-badge');
  if (badge) badge.remove();
}
```

#### 5c. PDF

```js
function renderPDF() {
  const student = getActiveStudent();

  // Atualiza toolbar
  DOM.pdfActiveName().textContent = student ? student.name : 'Nenhum relatório';
  DOM.activeIndicator().textContent = student
    ? `Aluno ativo: ${student.name}`
    : 'Nenhum aluno selecionado';

  if (!student || !student.report) {
    DOM.emptyState().style.display  = 'flex';
    DOM.pdfPage().style.display     = 'none';
    DOM.pdfSkeleton().style.display = 'none';
    return;
  }

  DOM.emptyState().style.display  = 'none';
  DOM.pdfSkeleton().style.display = 'none';
  DOM.pdfPage().style.display     = 'flex';

  const r = student.report;
  const f = DOM.fields;

  // Preenche cada campo com o valor salvo no state
  // contenteditable — usar textContent para evitar XSS
  f.schoolName().textContent  = r.schoolName  || 'Escola Municipal Girassol';
  f.studentName().textContent = r.studentName || student.name;
  f.class().textContent       = r.class       || '—';
  f.age().textContent         = r.age         || '—';
  f.period().textContent      = r.period      || '1º Semestre 2025';
  f.teacher().textContent     = r.teacher     || '—';
  f.geral().textContent       = r.geral       || '';
  f.academico().textContent   = r.academico   || '';
  f.social().textContent      = r.social      || '';
  f.pontos().textContent      = r.pontos      || '';
  f.obs().textContent         = r.obs         || '';
  f.date().textContent        = r.date        || getCurrentDate();
  f.signature().textContent   = r.signature   || 'Assinatura da Professora';

  renderStars(r.starRating || 4);
}

function renderStars(value) {
  state.starRating = value;
  DOM.starsRow().querySelectorAll('.star').forEach(star => {
    const v = parseInt(star.dataset.value);
    star.classList.toggle('active', v <= value);
  });
}

function showPDFSkeleton() {
  DOM.emptyState().style.display  = 'none';
  DOM.pdfPage().style.display     = 'none';
  DOM.pdfSkeleton().style.display = 'flex';
  DOM.pdfSkeleton().style.flexDirection = 'column';
}
```

#### 5d. Toast

```js
function showToast(message, duration = 3000) {
  const toast = DOM.toast();
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), duration);
}
```

---

### 6. EVENTS e lógica principal

```js
// ─── 6. EVENTS ────────────────────────────────────────────

// Retorna o aluno ativo ou null
function getActiveStudent() {
  return state.students.find(s => s.id === state.activeStudentId) || null;
}

// Seleciona um aluno e re-renderiza tudo
function selectStudent(id) {
  state.activeStudentId = id;
  renderTabs();
  renderChat();
  renderPDF();
}

// Adiciona novo aluno com prompt de nome
function addStudent() {
  const name = prompt('Nome do aluno:');
  if (!name || !name.trim()) return;

  const student = {
    id: generateId(),
    name: name.trim(),
    chatHistory: [],
    report: null,
  };

  state.students.push(student);
  selectStudent(student.id);
  renderTabs();
  renderChat();
  renderPDF();
}

// Envia mensagem e aciona geração de relatório
async function sendMessage() {
  if (state.isGenerating) return;

  const input = DOM.msgInput();
  const text = input.value.trim();
  if (!text) return;

  const student = getActiveStudent();
  if (!student) {
    alert('Selecione ou adicione um aluno primeiro.');
    return;
  }

  // Bloqueia UI
  state.isGenerating = true;
  DOM.btnSend().disabled = true;

  // Registra mensagem da professora
  student.chatHistory.push({ role: 'user', content: text });
  input.value = '';
  appendUserMessage(text);
  showGeneratingBadge();
  showPDFSkeleton();

  try {
    // Chama API com histórico completo do aluno
    const rawResponse = await callAnthropicAPI(student.chatHistory);

    // Parseia JSON
    const parsed = parseReportJSON(rawResponse);

    // Salva no state
    student.report = {
      schoolName:  'Escola Municipal Girassol',
      studentName: parsed.studentName  || student.name,
      class:       parsed.class        || '',
      age:         parsed.age          || '',
      period:      parsed.period       || '1º Semestre 2025',
      teacher:     parsed.teacher      || '',
      geral:       parsed.geral        || '',
      academico:   parsed.academico    || '',
      social:      parsed.social       || '',
      pontos:      parsed.pontos       || '',
      obs:         parsed.obs          || '',
      starRating:  4,
      date:        getCurrentDate(),
      signature:   'Assinatura da Professora',
    };

    // Atualiza histórico com resposta da IA
    student.chatHistory.push({
      role: 'assistant',
      content: 'Relatório gerado! Você pode editar qualquer campo diretamente no documento ao lado. Clique em "Baixar PDF" quando estiver pronto.',
    });

    hideGeneratingBadge();
    appendAssistantMessage(student.chatHistory[student.chatHistory.length - 1].content);
    renderPDF();

  } catch (err) {
    hideGeneratingBadge();
    student.chatHistory.push({ role: 'assistant', content: `Erro: ${err.message}` });
    appendAssistantMessage(`Erro: ${err.message}`);
    // Volta ao empty state se não havia relatório anterior
    if (!student.report) renderPDF();
  }

  state.isGenerating = false;
  DOM.btnSend().disabled = false;
}

// Coleta os valores editados pela professora e salva no state
function collectPDFEdits() {
  const student = getActiveStudent();
  if (!student || !student.report) return;

  const f = DOM.fields;
  student.report.schoolName  = f.schoolName().textContent.trim();
  student.report.studentName = f.studentName().textContent.trim();
  student.report.class       = f.class().textContent.trim();
  student.report.age         = f.age().textContent.trim();
  student.report.period      = f.period().textContent.trim();
  student.report.teacher     = f.teacher().textContent.trim();
  student.report.geral       = f.geral().textContent.trim();
  student.report.academico   = f.academico().textContent.trim();
  student.report.social      = f.social().textContent.trim();
  student.report.pontos      = f.pontos().textContent.trim();
  student.report.obs         = f.obs().textContent.trim();
  student.report.date        = f.date().textContent.trim();
  student.report.signature   = f.signature().textContent.trim();
  student.report.starRating  = state.starRating;
}

// Salva edições e mostra toast
function saveReport() {
  collectPDFEdits();
  showToast('✅ Relatório salvo!');
}

// Baixa o PDF usando html2canvas + jsPDF
async function downloadPDF() {
  const student = getActiveStudent();
  if (!student || !student.report) {
    alert('Gere um relatório antes de baixar.');
    return;
  }

  collectPDFEdits();

  // Esconde elementos que não devem ir no PDF (handles de edição etc.)
  const page = DOM.pdfPage();
  showToast('⏳ Gerando PDF...', 8000);

  try {
    const canvas = await html2canvas(page, {
      scale: 2,           // Alta resolução
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth  = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);

    const fileName = `relatorio-${student.name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    pdf.save(fileName);

    showToast(`📄 PDF baixado: ${fileName}`);
  } catch (err) {
    showToast('❌ Erro ao gerar PDF. Tente novamente.');
    console.error(err);
  }
}

// Estrelas — click
function setupStars() {
  DOM.starsRow().addEventListener('click', (e) => {
    const star = e.target.closest('.star');
    if (!star) return;
    const value = parseInt(star.dataset.value);
    renderStars(value);
    const student = getActiveStudent();
    if (student && student.report) student.report.starRating = value;
  });

  // Acessibilidade: Enter/Space nas estrelas
  DOM.starsRow().addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const star = e.target.closest('.star');
      if (star) star.click();
    }
  });
}

// Registrar todos os eventos
function setupEvents() {
  DOM.btnAddStudent().addEventListener('click', addStudent);
  DOM.btnSend().addEventListener('click', sendMessage);
  DOM.btnSave().addEventListener('click', saveReport);
  DOM.btnDownload().addEventListener('click', downloadPDF);

  // Enter para enviar, Shift+Enter para nova linha
  DOM.msgInput().addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  setupStars();
}

// ─── INIT ─────────────────────────────────────────────────

function init() {
  // Mensagem de boas-vindas no chat (estado inicial sem aluno)
  const area = DOM.chatArea();
  area.innerHTML = '';
  const el = createMessageElement('assistant',
    'Bem-vinda! Adicione um aluno clicando no botão "+" acima para começar.'
  );
  area.appendChild(el);

  setupEvents();
  renderTabs();
  renderPDF();
}

document.addEventListener('DOMContentLoaded', init);
```

---

## Checklist de implementação

Implemente exatamente nesta ordem:

- [ ] **1.** Criar `index.html` completo com toda a estrutura semântica descrita
- [ ] **2.** Criar `style.css` com todas as variáveis, reset, e estilos na ordem documentada
- [ ] **3.** Criar `app.js` com os 6 módulos na ordem: STATE → CONSTANTS → API → PARSER → UI RENDER → EVENTS
- [ ] **4.** Substituir `'SUA_CHAVE_AQUI'` em CONSTANTS pela variável de ambiente ou input do usuário
- [ ] **5.** Testar o fluxo: adicionar aluno → digitar descrição → gerar → editar campos → salvar → baixar PDF
- [ ] **6.** Validar que `contenteditable` funciona em todos os campos do PDF
- [ ] **7.** Validar que o download do PDF captura os campos editados pela professora

---

## Comportamentos esperados por estado

| Situação | Painel esquerdo | Painel direito |
|---|---|---|
| App recém-aberto | Mensagem de boas-vindas | Empty state com ícone |
| Aluno adicionado, sem relatório | Chat com saudação personalizada | Empty state |
| Professora digitando | Textarea ativa, btn habilitado | Empty state |
| IA gerando | Badge animado "Gerando..." | Skeleton animado |
| Relatório gerado | Mensagem do assistente confirmando | Folha PDF preenchida |
| Editando campo no PDF | — | Ring azul no campo em foco |
| Salvo | — | Toast verde "Relatório salvo!" |
| Baixando PDF | — | Toast "Gerando PDF..." depois "PDF baixado" |
| Erro na API | Mensagem de erro no chat | Volta ao empty state |

---

## Proibições absolutas

- ❌ Não use React, Vue, jQuery ou qualquer framework
- ❌ Não use innerHTML com dados do usuário (risco XSS) — use textContent
- ❌ Não use `var` — apenas `const` e `let`
- ❌ Não misture lógica de estado com lógica de DOM na mesma função
- ❌ Não faça chamadas à API sem o header `anthropic-dangerous-direct-browser-access: true`
- ❌ Não exponha a API key no console ou em erros visíveis ao usuário
- ❌ Não use `alert()` para erros da API — use o sistema de toast
- ❌ Não use gradientes, sombras decorativas ou emojis na UI (exceto os 3 especificados: 🏫 📄 ✅)
