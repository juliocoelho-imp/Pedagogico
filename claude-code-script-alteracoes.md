# Script para Claude Code — Alterações no Sistema Pedagógico

## O que mudar

Leia tudo antes de tocar em qualquer arquivo. São 4 alterações independentes.

---

## ALTERAÇÃO 1 — Remover avaliação por estrelas

### index.html
Localize e **remova completamente** este bloco:

```html
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
```

### style.css
Localize e **remova completamente** os blocos:

```css
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
```

E remova também a variável:
```css
--dourado-estrela:  #F5A623;
```

### app.js
Remova a função inteira:
```js
function renderStars(value) { ... }
```

Remova a função inteira:
```js
function setupStars() { ... }
```

Remova a chamada dentro de `setupEvents`:
```js
setupStars();
```

Remova a chamada dentro de `renderPDF`:
```js
renderStars(r.starRating || 4);
```

Remova o campo `starRating` de todos os lugares onde aparece no objeto `student.report`
(na criação do report dentro de `sendMessage` e em `collectPDFEdits`).

Remova do DOM:
```js
starsRow: () => document.getElementById('stars-row'),
```

---

## ALTERAÇÃO 2 — Adicionar assinatura dos pais e ajustar rodapé

### index.html
Localize o bloco do rodapé da folha PDF:

```html
<div class="page-footer">
  <span class="footer-date" id="field-date" contenteditable="true">Jundiaí, junho de 2025</span>
  <div class="footer-signature">
    <div class="signature-line"></div>
    <span class="signature-label" id="field-signature" contenteditable="true">Assinatura da Professora</span>
  </div>
</div>
```

**Substitua por** este novo rodapé com três assinaturas lado a lado:

```html
<div class="page-footer">
  <span class="footer-date" id="field-date" contenteditable="true">Jundiaí, junho de 2025</span>
  <div class="footer-signatures">
    <div class="footer-signature">
      <div class="signature-line"></div>
      <span class="signature-label" id="field-signature" contenteditable="true">Assinatura da Professora</span>
    </div>
    <div class="footer-signature">
      <div class="signature-line"></div>
      <span class="signature-label">Assinatura da Direção</span>
    </div>
    <div class="footer-signature">
      <div class="signature-line"></div>
      <span class="signature-label">Assinatura dos Pais/Responsáveis</span>
    </div>
  </div>
</div>
```

### style.css
Localize o bloco atual do rodapé:

```css
.page-footer {
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid var(--cinza-borda);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.footer-date { ... }
.footer-signature { ... }
.signature-line { ... }
.signature-label { ... }
```

**Substitua por:**

```css
.page-footer {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--cinza-borda);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.footer-date {
  font-size: 10px;
  color: var(--cinza-sec);
  border-radius: 3px;
  padding: 2px 4px;
  transition: background var(--transition);
  align-self: flex-start;
}
.footer-date:hover { background: #F7FAFF; }
.footer-date:focus { background: #EBF4FF; }

.footer-signatures {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.footer-signature {
  flex: 1;
  text-align: center;
}
.signature-line {
  border-top: 1px solid var(--cinza-borda-med);
  margin-bottom: 5px;
  width: 100%;
}
.signature-label {
  display: block;
  font-size: 9px;
  color: var(--cinza-sec);
  border-radius: 3px;
  padding: 1px 4px;
  line-height: 1.4;
  transition: background var(--transition);
}
.signature-label:hover { background: #F7FAFF; }
.signature-label:focus { background: #EBF4FF; }
```

---

## ALTERAÇÃO 3 — Valores padrão: escola e professora

### app.js — dentro de `sendMessage`, no objeto `student.report`

Localize:
```js
student.report = {
  schoolName:  'Escola Municipal Girassol',
  ...
  teacher:     parsed.teacher      || '',
  ...
}
```

Substitua pelos novos padrões:
```js
student.report = {
  schoolName:  'Escola Municipal Antonio Federzoni',
  ...
  teacher:     parsed.teacher      || 'Maria Aparecida',
  ...
}
```

### app.js — dentro de `renderPDF`

Localize:
```js
f.schoolName().textContent  = r.schoolName  || 'Escola Municipal Girassol';
```

Substitua por:
```js
f.schoolName().textContent  = r.schoolName  || 'Escola Municipal Antonio Federzoni';
```

Localize:
```js
f.teacher().textContent     = r.teacher     || '—';
```

Substitua por:
```js
f.teacher().textContent     = r.teacher     || 'Maria Aparecida';
```

### index.html — campo school-name no pdf-page

Localize o valor padrão do campo editável:
```html
<h2 class="school-name" id="field-school-name" contenteditable="true">
  Escola Municipal Girassol
</h2>
```

Substitua por:
```html
<h2 class="school-name" id="field-school-name" contenteditable="true">
  Escola Municipal Antonio Federzoni
</h2>
```

---

## ALTERAÇÃO 4 — Exportação de PDF: texto completo, alta qualidade, página única

Este é o ajuste mais importante. O problema tem duas causas:
1. `html2canvas` captura apenas a área visível na tela (viewport), cortando o conteúdo
2. A escala `scale: 2` gera imagem grande mas o jsPDF a comprime sem ajustar dimensões

### app.js — substituir a função `downloadPDF` inteira

Remova a função `downloadPDF` existente e substitua por esta:

```js
async function downloadPDF() {
  const student = getActiveStudent();
  if (!student || !student.report) {
    showToast('❌ Gere um relatório antes de baixar.');
    return;
  }

  collectPDFEdits();
  showToast('⏳ Gerando PDF...', 10000);

  const page = DOM.pdfPage();

  // Guarda os estilos originais para restaurar depois
  const originalStyles = {
    maxWidth:  page.style.maxWidth,
    width:     page.style.width,
    height:    page.style.height,
    overflow:  page.style.overflow,
    position:  page.style.position,
  };

  try {
    // 1. Expande a folha para mostrar todo o conteúdo sem corte
    //    Remove max-width e deixa height: auto para capturar tudo
    page.style.maxWidth  = 'none';
    page.style.width     = '794px';   // largura A4 a 96 DPI
    page.style.height    = 'auto';
    page.style.overflow  = 'visible';
    page.style.position  = 'relative';

    // 2. Aguarda o browser re-renderizar com os novos estilos
    await new Promise(resolve => setTimeout(resolve, 120));

    // 3. Captura com alta escala para qualidade de impressão
    //    useCORS e allowTaint garantem que fontes e bordas sejam capturados
    const canvas = await html2canvas(page, {
      scale: 3,               // 3x = ~288 DPI — qualidade de impressão profissional
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      // Captura a altura real do elemento, não do viewport
      windowWidth:  page.scrollWidth,
      windowHeight: page.scrollHeight,
    });

    // 4. Cria o PDF em A4
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',          // 210 × 297 mm
      compress: true,
    });

    const pageWidthMM  = 210;
    const pageHeightMM = 297;

    // 5. Calcula as dimensões da imagem para caber em A4
    //    Mantém proporção e reduz se necessário
    const imgWidthMM  = pageWidthMM;
    const imgHeightMM = (canvas.height * imgWidthMM) / canvas.width;

    if (imgHeightMM <= pageHeightMM) {
      // Conteúdo cabe em uma página — centraliza verticalmente
      const yOffset = (pageHeightMM - imgHeightMM) / 2;
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.97), // JPEG 97% — melhor qualidade/tamanho
        'JPEG',
        0,
        yOffset > 0 ? yOffset : 0,
        imgWidthMM,
        imgHeightMM,
        undefined,
        'FAST'
      );
    } else {
      // Conteúdo maior que A4 — escala para caber em página única
      const scale     = pageHeightMM / imgHeightMM;
      const fittedW   = imgWidthMM  * scale;
      const fittedH   = pageHeightMM;
      const xOffset   = (pageWidthMM - fittedW) / 2;

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

    // 6. Salva o arquivo
    const safeName  = student.name.toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   // remove acentos
      .replace(/\s+/g, '-');             // espaços → hífens
    const fileName  = `relatorio-${safeName}.pdf`;
    pdf.save(fileName);

    showToast(`📄 PDF baixado: ${fileName}`);

  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    showToast('❌ Erro ao gerar PDF. Tente novamente.');
  } finally {
    // 7. Restaura os estilos originais da folha em qualquer cenário
    page.style.maxWidth  = originalStyles.maxWidth;
    page.style.width     = originalStyles.width;
    page.style.height    = originalStyles.height;
    page.style.overflow  = originalStyles.overflow;
    page.style.position  = originalStyles.position;
  }
}
```

---

## Checklist de implementação

Execute exatamente nesta ordem:

- [ ] **1.** `index.html` — remover bloco das estrelas
- [ ] **2.** `index.html` — substituir `div.page-footer` pelo novo rodapé com 3 assinaturas
- [ ] **3.** `index.html` — atualizar nome da escola no campo padrão
- [ ] **4.** `style.css` — remover estilos de `.stars-row` e `.star`
- [ ] **5.** `style.css` — remover variável `--dourado-estrela`
- [ ] **6.** `style.css` — substituir estilos do rodapé pelo novo bloco
- [ ] **7.** `app.js` — remover `renderStars`, `setupStars` e todas as referências a `starRating`
- [ ] **8.** `app.js` — atualizar valores padrão da escola e professora em `sendMessage` e `renderPDF`
- [ ] **9.** `app.js` — substituir função `downloadPDF` inteira pela nova versão
- [ ] **10.** Testar geração de relatório — verificar que estrelas não aparecem mais
- [ ] **11.** Testar rodapé — verificar que as 3 linhas de assinatura aparecem lado a lado
- [ ] **12.** Testar download — abrir o PDF e verificar que o texto não está cortado

---

## Por que o PDF estava cortando

O `html2canvas` por padrão captura apenas a área visível do elemento dentro do viewport.
Como a folha PDF pode ser mais alta que a tela, o conteúdo abaixo do scroll era ignorado.

A correção expande temporariamente o elemento para `height: auto` antes da captura,
forçando o browser a renderizar todo o conteúdo. Depois do `html2canvas`, os estilos
originais são restaurados no bloco `finally` — isso garante que mesmo se der erro,
a interface volta ao normal.

O `scale: 3` (antes era 2) e o formato `JPEG 97%` (antes era PNG) melhoram a qualidade
visual do texto e reduzem artefatos nas bordas.
