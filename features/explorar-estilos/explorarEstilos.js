import { iconSvg } from '../../design-system/icons.js';
import { construirIndiceBusca, buscarEFiltrar } from '../../core/searchService.js';
import { destacarTrecho } from '../../core/normalizeText.js';
import { selectionState } from '../../core/selectionState.js';
import { mostrarToast } from '../../core/feedback.js';
import { previewService, ESTADOS_PREVIEW } from '../../core/previewService.js';
import { renderPreviewPlayer, vincularPreviewPlayer } from '../../design-system/previewPlayer.js';

/**
 * Tela 2 — Explorar estilos (secao 7.2) + Busca (RF-02).
 *
 * Sprint 05 (Busca): motor de busca com indice pre-computado
 * (`construirIndiceBusca`, montado uma unica vez, nao a cada tecla),
 * pontuacao de relevancia (nome/tag/subcategoria/categoria) e
 * ordenacao automatica — alfabetica sem termo, por relevancia com
 * termo. A busca por texto ja cobre categoria, subcategoria e tags
 * (todas entram na pontuacao), atendendo aos itens "busca por
 * categoria/subcategoria/tags" sem exigir controles de UI novos.
 *
 * Performance: o input usa requestAnimationFrame para agrupar
 * teclas digitadas em rajada em um unico re-render (sensacao
 * instantanea, sem processar a mesma tecla duas vezes); apenas o
 * container de resultados e re-renderizado a cada busca — cabecalho,
 * chips e barra de selecao permanecem intocados.
 */
export function renderExplorar({ estilos, categorias, focoInicialId, autoFocoBusca, aoMudarSelecao }) {
  const indice = construirIndiceBusca(estilos);
  let termoBusca = '';
  let categoriaAtiva = null;
  let quadroAgendado = null;

  const el = document.createElement('div');
  el.className = 'view container';

  const cancelarOuvinte = selectionState.aoMudar(() => atualizarEstadoCartoes());
  let desligarPreviewPainel = () => {};
  const cancelarOuvintePreview = previewService.aoMudar(() => atualizarIndicadorPreviewNosCards());

  const contagemPorCategoria = new Map();
  categorias.forEach(c => contagemPorCategoria.set(c.id, 0));
  estilos.forEach(e => contagemPorCategoria.set(e.categoriaId, (contagemPorCategoria.get(e.categoriaId) || 0) + 1));

  el.innerHTML = `
    <div style="margin-bottom: var(--space-6);">
      <h1 style="font-size: var(--text-xl); margin-bottom: var(--space-4);">Explorar estilos</h1>
      <label class="search-field" for="campo-busca">
        <button type="button" id="botao-buscar" class="search-field__icon-btn" aria-label="Buscar">${iconSvg('busca', 18)}</button>
        <input id="campo-busca" type="text" placeholder="Buscar por nome, categoria ou tag..." autocomplete="off" />
        <span id="contador-inline-busca" class="search-field__contador" style="display:none;" aria-hidden="true"></span>
        <button type="button" id="botao-limpar-busca" class="btn btn-icon btn-sm btn-ghost" style="display:none; border-color:transparent;" aria-label="Limpar busca">
          ${iconSvg('fechar', 14)}
        </button>
      </label>
      <div id="chips-categorias" class="chips-row">
        <button class="chip is-active" data-cat="">Todas <span class="chip__count">${estilos.length}</span></button>
        ${categorias.map(c => `<button class="chip" data-cat="${c.id}">${c.nome} <span class="chip__count">${contagemPorCategoria.get(c.id) || 0}</span></button>`).join('')}
      </div>
      <p class="aviso-scroll-resultados">${iconSvg('setaBaixo', 14)} Role a tela para baixo para visualizar o resultado das buscas</p>
    </div>
    <section class="card highlight-servico" style="padding: var(--space-4); margin-bottom: var(--space-5);">
      <p class="style-card__title">🎬 Conversão de Mídias Físicas (DVD para MP4)</p>
      <p style="margin-top: var(--space-2); color: var(--color-text-secondary); font-size: var(--text-sm);">
        Traga suas memórias e shows antigos para o formato digital! Convertemos seus DVDs
        físicos para arquivos de vídeo MP4, prontos para assistir na TV, celular ou salvar
        no seu pendrive.
      </p>
      <p class="highlight-servico__aviso" style="margin-top: var(--space-3);">
        ⚠️ Importante: Mídias muito arranhadas não têm garantia de conversão. Caso autorizado,
        realizaremos uma limpeza e polimento na mídia para tentar eliminar os arranhões e
        viabilizar a conversão, mas o processo pode não funcionar dependendo do estado do disco.
      </p>
    </section>
    <p id="contador-resultado" class="result-counter" aria-live="polite"></p>
    <div id="resultado-busca"></div>
    <div id="painel-detalhe-host"></div>
  `;

  const campoBusca = el.querySelector('#campo-busca');
  const botaoBuscar = el.querySelector('#botao-buscar');
  const botaoLimparBusca = el.querySelector('#botao-limpar-busca');
  const contadorInlineBusca = el.querySelector('#contador-inline-busca');
  const contadorResultado = el.querySelector('#contador-resultado');
  const containerResultado = el.querySelector('#resultado-busca');
  const chips = el.querySelectorAll('#chips-categorias .chip');

  /** Rolagem suave até a área de resultados (Sprint 17 — feedback de UX:
   * usuários não percebiam que os resultados apareciam abaixo da dobra). */
  function rolarParaResultados() {
    contadorResultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function agendarRenderResultado() {
    // Agrupa teclas digitadas na mesma rajada em um único repaint
    // (evita re-renderizar a grade a cada tecla em digitação rápida).
    if (quadroAgendado) cancelAnimationFrame(quadroAgendado);
    quadroAgendado = requestAnimationFrame(() => {
      quadroAgendado = null;
      renderResultado();
    });
  }

  function renderResultado() {
    const { resultados: lista } = buscarEFiltrar(indice, { termo: termoBusca, categoriaId: categoriaAtiva });
    botaoLimparBusca.style.display = termoBusca ? 'inline-flex' : 'none';

    // Feedback IMEDIATO junto da própria caixa de busca (Sprint 18):
    // o contador principal (#contador-resultado) fica abaixo de um
    // card promocional e some da tela em telas pequenas — sem nada
    // visível perto do campo, digitar dava a impressão de que a
    // busca "não roda". Este contador inline aparece/atualiza junto
    // com cada tecla, sem precisar rolar a página.
    if (termoBusca) {
      contadorInlineBusca.textContent = String(lista.length);
      contadorInlineBusca.style.display = 'inline-flex';
    } else {
      contadorInlineBusca.style.display = 'none';
    }

    if (estilos.length === 0) {
      contadorResultado.textContent = '';
      containerResultado.innerHTML = `
        <div class="empty-state card">
          ${iconSvg('busca', 32)}
          <strong>O catálogo ainda não tem estilos cadastrados</strong>
          <p>Volte em instantes — estamos organizando o acervo.</p>
        </div>`;
      return;
    }

    if (lista.length === 0) {
      contadorResultado.textContent = '';
      containerResultado.innerHTML = `
        <div class="empty-state card">
          ${iconSvg('busca', 32)}
          <strong>Nenhum resultado para${termoBusca ? ` "${escaparAtributo(termoBusca)}"` : ' este filtro'}</strong>
          <p>Tente outro termo, verifique a ortografia ou remova o filtro de categoria.</p>
          ${termoBusca || categoriaAtiva ? `<button class="btn btn-ghost btn-sm" data-limpar-filtros>Limpar filtros</button>` : ''}
        </div>`;
      const btnLimpar = containerResultado.querySelector('[data-limpar-filtros]');
      if (btnLimpar) btnLimpar.addEventListener('click', limparFiltros);
      return;
    }

    contadorResultado.textContent = `${lista.length} ${lista.length === 1 ? 'estilo encontrado' : 'estilos encontrados'}`;

    const agrupar = !termoBusca && !categoriaAtiva;
    if (agrupar) {
      containerResultado.innerHTML = categorias.map(cat => {
        const doGrupo = lista.filter(e => e.categoriaId === cat.id);
        if (doGrupo.length === 0) return '';
        return `
          <section class="category-group">
            <h2 class="category-group__title">${cat.nome}</h2>
            <div class="grid-styles">${doGrupo.map(cartaoEstilo).join('')}</div>
          </section>
        `;
      }).join('');
    } else {
      containerResultado.innerHTML = `<div class="grid-styles">${lista.map(cartaoEstilo).join('')}</div>`;
    }

    containerResultado.querySelectorAll('[data-abrir]').forEach(card =>
      card.addEventListener('click', () => abrirDetalhe(card.dataset.abrir)));
    atualizarIndicadorPreviewNosCards();
  }

  function cartaoEstilo(estilo) {
    const selecionado = selectionState.estaSelecionado(estilo.id);
    return `
      <button type="button" class="style-card ${selecionado ? 'is-selected' : ''}" style="--card-accent:${estilo.categoriaCor};" data-abrir="${estilo.id}" data-card-id="${estilo.id}" aria-pressed="${selecionado}">
        ${selecionado ? `<span class="style-card__badge-selected">${iconSvg('check', 11)} Selecionado</span>` : ''}
        <span class="style-card__icon">${iconSvg(estilo.categoriaIcone, 20)}</span>
        <div>
          <p class="style-card__title">${destacarTrecho(estilo.nome, termoBusca)}</p>
          <p class="style-card__category">${estilo.categoriaNome}</p>
        </div>
        <div class="style-card__meta"><span>${estilo.quantidadeMusicasEstimada} músicas</span></div>
      </button>
    `;
  }

  function atualizarEstadoCartoes() {
    // Só ajusta os cartões afetados — não re-renderiza a grade inteira
    // a cada seleção/remoção (item "PERFORMANCE" do briefing).
    containerResultado.querySelectorAll('[data-card-id]').forEach(card => {
      const selecionado = selectionState.estaSelecionado(card.dataset.cardId);
      card.classList.toggle('is-selected', selecionado);
      card.setAttribute('aria-pressed', String(selecionado));
      const badgeExistente = card.querySelector('.style-card__badge-selected');
      if (selecionado && !badgeExistente) {
        card.insertAdjacentHTML('afterbegin', `<span class="style-card__badge-selected style-card__badge-selected--pop">${iconSvg('check', 11)} Selecionado</span>`);
      } else if (!selecionado && badgeExistente) {
        badgeExistente.remove();
      }
    });
    const painelBotao = el.querySelector('[data-detalhe-toggle]');
    if (painelBotao) {
      const selecionado = selectionState.estaSelecionado(painelBotao.dataset.detalheToggle);
      painelBotao.textContent = selecionado ? 'Remover da seleção' : 'Adicionar à seleção';
      painelBotao.classList.toggle('btn-primary', !selecionado);
      painelBotao.classList.toggle('btn-danger-ghost', selecionado);
    }
    aoMudarSelecao();
  }

  function atualizarIndicadorPreviewNosCards() {
    // Reflete visualmente a regra "só um preview por vez": o selo
    // aparece só no card cujo id bate com o preview ativo no motor.
    containerResultado.querySelectorAll('[data-card-id]').forEach(card => {
      const tocando = previewService.obterEstadoDe(card.dataset.cardId) === ESTADOS_PREVIEW.TOCANDO;
      card.classList.toggle('is-tocando-preview', tocando);
    });
  }

  function alternarSelecao(estilo) {
    const jaSelecionado = selectionState.estaSelecionado(estilo.id);
    selectionState.alternar(estilo.id);
    if (!jaSelecionado && selectionState.quantidade() === 1) {
      mostrarToast(`✨ “${estilo.nome}” foi seu primeiro estilo adicionado!`, 'adicao');
    } else {
      mostrarToast(jaSelecionado ? `“${estilo.nome}” removido da seleção` : `“${estilo.nome}” adicionado à seleção`, jaSelecionado ? 'remocao' : 'adicao');
    }
  }

  function estiloTemPreview(estilo) {
    return (Array.isArray(estilo.previewUrls) ? estilo.previewUrls.length : 0) > 0 ||
      (typeof estilo.previewUrl === 'string' && estilo.previewUrl.trim().length > 0);
  }

  function abrirDetalhe(id) {
    const estilo = estilos.find(e => e.id === id);
    if (!estilo) return;
    const host = el.querySelector('#painel-detalhe-host');
    const selecionado = selectionState.estaSelecionado(id);
    host.innerHTML = `
      <div class="panel-overlay">
        <div class="card panel-sheet">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="display:flex; gap: var(--space-3); align-items:center;">
              <span class="style-card__icon" style="--card-accent:${estilo.categoriaCor}; width:44px; height:44px;">
                ${iconSvg(estilo.categoriaIcone, 22)}
              </span>
              <div>
                <h2 style="font-size: var(--text-lg);">${estilo.nome}</h2>
                <p style="font-size: var(--text-sm);">${estilo.categoriaNome} · ${estilo.subcategoriaNome}</p>
              </div>
            </div>
            <button data-fechar-painel class="btn btn-ghost btn-sm btn-icon" aria-label="Fechar">${iconSvg('fechar', 16)}</button>
          </div>
          <p style="margin-top: var(--space-4);">${estilo.descricaoCurta || ''}</p>
          <div class="badge" style="margin-top: var(--space-4);">${estilo.quantidadeMusicasEstimada} músicas</div>
          ${estiloTemPreview(estilo) ? `<div style="margin-top: var(--space-4);">${renderPreviewPlayer(estilo)}</div>` : ''}
          <button data-detalhe-toggle="${estilo.id}" class="btn ${selecionado ? 'btn-danger-ghost' : 'btn-primary'} btn-block" style="margin-top: var(--space-5);">
            ${selecionado ? 'Remover da seleção' : 'Adicionar à seleção'}
          </button>
        </div>
      </div>
    `;
    desligarPreviewPainel();
    desligarPreviewPainel = vincularPreviewPlayer(host, estilo);
    host.querySelector('[data-fechar-painel]').addEventListener('click', () => {
      previewService.parar();
      host.innerHTML = '';
    });
    host.querySelector('.panel-overlay').addEventListener('click', (ev) => {
      if (ev.target.classList.contains('panel-overlay')) {
        previewService.parar();
        host.innerHTML = '';
      }
    });
    host.querySelector('[data-detalhe-toggle]').addEventListener('click', () => alternarSelecao(estilo));
  }

  function limparFiltros() {
    termoBusca = '';
    categoriaAtiva = null;
    campoBusca.value = '';
    chips.forEach(c => c.classList.toggle('is-active', c.dataset.cat === ''));
    renderResultado();
    campoBusca.focus();
  }

  campoBusca.addEventListener('input', (ev) => {
    termoBusca = ev.target.value;
    agendarRenderResultado();
  });
  campoBusca.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') rolarParaResultados();
  });
  botaoBuscar.addEventListener('click', () => {
    campoBusca.focus();
    rolarParaResultados();
  });
  botaoLimparBusca.addEventListener('click', () => {
    termoBusca = '';
    campoBusca.value = '';
    renderResultado();
    campoBusca.focus();
  });

  chips.forEach(chip => chip.addEventListener('click', () => {
    categoriaAtiva = chip.dataset.cat || null;
    chips.forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    renderResultado();
    rolarParaResultados();
  }));

  renderResultado();
  if (focoInicialId) abrirDetalhe(focoInicialId);
  if (autoFocoBusca) campoBusca.focus();

  el._limpar = () => {
    cancelarOuvinte();
    cancelarOuvintePreview();
    desligarPreviewPainel();
    if (quadroAgendado) cancelAnimationFrame(quadroAgendado);
  };
  return el;
}

function escaparAtributo(texto) {
  return (texto || '').replace(/"/g, '&quot;');
}
