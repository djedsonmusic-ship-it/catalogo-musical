import { iconSvg } from '../../design-system/icons.js';
import { selectionState, discografiaSelectionState, solicitacoesPersonalizadasState } from '../../core/selectionState.js';
import { mostrarToast } from '../../core/feedback.js';

/**
 * Tela 4 — Minha selecao / Resumo do pedido (secao 7.4).
 *
 * Sprint 14 (modelo de negocio sem preco): removida toda estimativa
 * de musicas/espaco/valor desta tela — o catalogo agora e so
 * "escolher e enviar", sem calculo de preco exibido ao cliente. A
 * tela mantem: contagem de estilos, lista com remocao rapida, e o
 * botao para seguir a Finalizar Pedido (onde a forma de entrega e
 * escolhida). `core/estimateService.js` continua existindo, intocado,
 * para um modulo de precificacao futuro — so nao e mais chamado aqui.
 */
export function renderSelecao({ estilos, discografias = [], irParaExplorar, irParaFinalizar }) {
  const el = document.createElement('div');
  el.className = 'view container';

  const cancelarOuvinte = selectionState.aoMudar(() => renderConteudo());
  const cancelarOuvinteDiscografia = discografiaSelectionState.aoMudar(() => renderConteudo());
  const cancelarOuvinteSolicitacoes = solicitacoesPersonalizadasState.aoMudar(() => renderConteudo());

  function estilosSelecionados() {
    const ids = new Set(selectionState.listarIds());
    return estilos.filter(e => ids.has(e.id));
  }

  /** Sprint 21 (ajuste A): discografias completas adicionadas pelo
   * cliente entram no mesmo resumo do pedido, como itens à parte
   * (removíveis individualmente, sem afetar a contagem de estilos). */
  function discografiasSelecionadas() {
    const ids = new Set(discografiaSelectionState.listarIds());
    return discografias.filter(d => ids.has(d.id));
  }

  function renderConteudo() {
    const selecionados = estilosSelecionados();
    const discosSelecionados = discografiasSelecionadas();
    const solicitacoes = solicitacoesPersonalizadasState.listar();

    if (selecionados.length === 0 && discosSelecionados.length === 0 && solicitacoes.length === 0) {
      el.innerHTML = `
        <h1 style="font-size: var(--text-xl); margin-bottom: var(--space-5);">Resumo do pedido</h1>
        <div class="empty-state card">
          <span style="color:var(--color-ink-faint);">${iconSvg('carrinho', 32)}</span>
          <strong>Sua seleção está vazia</strong>
          <p>Explore os estilos disponíveis e adicione o que combina com você.</p>
          <button class="btn btn-primary" data-ir-explorar style="margin-top: var(--space-3);">Explorar estilos</button>
        </div>
      `;
      el.querySelector('[data-ir-explorar]').addEventListener('click', irParaExplorar);
      return;
    }

    const SELECAO_GENEROSA = 8;

    el.innerHTML = `
      <div class="section-heading">
        <h1 style="font-size: var(--text-xl);">Resumo do pedido</h1>
        <button data-limpar class="btn btn-danger-ghost btn-sm">Limpar seleção</button>
      </div>
      ${selecionados.length === 1
        ? `<p style="font-size: var(--text-sm); color: var(--color-accent); margin-bottom: var(--space-5);">✨ Ótimo começo — continue explorando para completar sua seleção.</p>`
        : selecionados.length >= SELECAO_GENEROSA
          ? `<p style="margin-bottom: var(--space-5);"><span class="badge-generosa">${iconSvg('check', 12)} Seleção generosa — ${selecionados.length} estilos escolhidos</span></p>`
          : ''
      }

      <div style="display:flex; gap: var(--space-4); flex-wrap:wrap; margin-bottom: var(--space-6);">
        <div class="stat-card" style="display:inline-block;">
          <span class="stat-card__label">Estilos selecionados</span>
          <strong class="stat-card__value">${selecionados.length}</strong>
        </div>
        ${discosSelecionados.length > 0 ? `
        <div class="stat-card" style="display:inline-block;">
          <span class="stat-card__label">Discografias completas</span>
          <strong class="stat-card__value">${discosSelecionados.length}</strong>
        </div>` : ''}
        ${solicitacoes.length > 0 ? `
        <div class="stat-card" style="display:inline-block;">
          <span class="stat-card__label">Discografias personalizadas solicitadas</span>
          <strong class="stat-card__value">${solicitacoes.length}</strong>
        </div>` : ''}
      </div>

      ${selecionados.length > 0 ? `
      <h2 class="checkout-section-title">Itens selecionados</h2>
      <div style="display:flex; flex-direction:column; gap: var(--space-3); margin-bottom: var(--space-6);">
        ${selecionados.map(itemSelecionado).join('')}
      </div>` : ''}

      ${discosSelecionados.length > 0 ? `
      <h2 class="checkout-section-title">Discografias completas</h2>
      <div style="display:flex; flex-direction:column; gap: var(--space-3); margin-bottom: var(--space-6);">
        ${discosSelecionados.map(itemDiscografiaSelecionada).join('')}
      </div>` : ''}

      ${solicitacoes.length > 0 ? `
      <h2 class="checkout-section-title">Discografias personalizadas solicitadas</h2>
      <div style="display:flex; flex-direction:column; gap: var(--space-3); margin-bottom: var(--space-6);">
        ${solicitacoes.map(itemSolicitacaoPersonalizada).join('')}
      </div>` : ''}

      <ul class="checkout-confirmacao">
        <li>${iconSvg('check', 14)} Você poderá remover itens a qualquer momento antes de enviar</li>
        <li>${iconSvg('check', 14)} No próximo passo você escolhe como quer receber</li>
      </ul>

      <button data-finalizar class="btn btn-accent btn-block checkout-cta">
        ${iconSvg('seta', 18)} Finalizar pedido
      </button>
    `;

    el.querySelectorAll('[data-remover]').forEach(btn =>
      btn.addEventListener('click', () => removerComAnimacao(btn.dataset.remover, selecionados)));
    el.querySelectorAll('[data-remover-discografia]').forEach(btn =>
      btn.addEventListener('click', () => removerDiscografiaComAnimacao(btn.dataset.removerDiscografia, discosSelecionados)));
    el.querySelectorAll('[data-remover-solicitacao]').forEach(btn =>
      btn.addEventListener('click', () => removerSolicitacaoComAnimacao(btn.dataset.removerSolicitacao)));
    el.querySelector('[data-limpar]').addEventListener('click', () => {
      selectionState.limparTudo();
      discografiaSelectionState.limparTudo();
      solicitacoesPersonalizadasState.limparTudo();
      mostrarToast('Seleção limpa', 'remocao');
    });
    el.querySelector('[data-finalizar]').addEventListener('click', () => irParaFinalizar());
  }

  /** Remove com uma pequena animação de colapso (Sprint 06) antes de tocar o estado real. */
  function removerComAnimacao(id, selecionados) {
    const linha = el.querySelector(`.line-item[data-item-id="${id}"]`);
    const estilo = selecionados.find(e => e.id === id);
    if (!linha) { selectionState.remover(id); return; }
    linha.classList.add('is-removendo');
    setTimeout(() => {
      selectionState.remover(id);
      if (estilo) mostrarToast(`“${estilo.nome}” removido da seleção`, 'remocao');
    }, 180);
  }

  /** Sprint 21 (ajuste A): mesma animação de remoção, para discografias. */
  function removerDiscografiaComAnimacao(id, discosSelecionados) {
    const linha = el.querySelector(`.line-item[data-item-discografia-id="${id}"]`);
    const disco = discosSelecionados.find(d => d.id === id);
    if (!linha) { discografiaSelectionState.remover(id); return; }
    linha.classList.add('is-removendo');
    setTimeout(() => {
      discografiaSelectionState.remover(id);
      if (disco) mostrarToast(`“${disco.titulo}” removida da seleção`, 'remocao');
    }, 180);
  }

  /** Sprint 22 (ajuste 4): mesma animação de remoção, para solicitações
   * de discografia personalizada. */
  function removerSolicitacaoComAnimacao(nome) {
    const linha = el.querySelector(`.line-item[data-item-solicitacao="${CSS.escape(nome)}"]`);
    if (!linha) { solicitacoesPersonalizadasState.remover(nome); return; }
    linha.classList.add('is-removendo');
    setTimeout(() => {
      solicitacoesPersonalizadasState.remover(nome);
      mostrarToast(`Solicitação de “${nome}” removida`, 'remocao');
    }, 180);
  }

  function itemSelecionado(estilo) {
    return `
      <div class="line-item" data-item-id="${estilo.id}">
        <div style="display:flex; align-items:center; gap: var(--space-3);">
          <span class="style-card__icon" style="--card-accent:${estilo.categoriaCor};">
            ${iconSvg(estilo.categoriaIcone, 18)}
          </span>
          <div>
            <p class="style-card__title" style="font-size: var(--text-sm);">${estilo.nome}</p>
            <p class="style-card__category">${estilo.categoriaNome}</p>
          </div>
        </div>
        <button data-remover="${estilo.id}" class="btn btn-ghost btn-sm btn-icon" aria-label="Remover ${estilo.nome} da seleção">
          ${iconSvg('lixo', 16)}
        </button>
      </div>
    `;
  }

  function itemDiscografiaSelecionada(disco) {
    return `
      <div class="line-item" data-item-discografia-id="${disco.id}">
        <div style="display:flex; align-items:center; gap: var(--space-3);">
          <span class="style-card__icon" style="--card-accent:#4F46E5;">
            ${iconSvg('carrinho', 18)}
          </span>
          <div>
            <p class="style-card__title" style="font-size: var(--text-sm);">${disco.titulo}</p>
            ${disco.subtitulo ? `<p class="style-card__category">${disco.subtitulo}</p>` : ''}
          </div>
        </div>
        <button data-remover-discografia="${disco.id}" class="btn btn-ghost btn-sm btn-icon" aria-label="Remover ${disco.titulo} da seleção">
          ${iconSvg('lixo', 16)}
        </button>
      </div>
    `;
  }

  // Sprint 23 (ajuste 2/3): tratado como dado textual — sem ícone do
  // WhatsApp (a solicitação não é mais uma ação de WhatsApp, é um item
  // do pedido como outro qualquer).
  function itemSolicitacaoPersonalizada(nome) {
    const nomeAttr = nome.replace(/"/g, '&quot;');
    return `
      <div class="line-item" data-item-solicitacao="${nomeAttr}">
        <div style="display:flex; align-items:center; gap: var(--space-3);">
          <span class="style-card__icon" style="--card-accent:#4F46E5;">
            ${iconSvg('busca', 18)}
          </span>
          <div>
            <p class="style-card__title" style="font-size: var(--text-sm);">${nome}</p>
            <p class="style-card__category">Discografia personalizada solicitada</p>
          </div>
        </div>
        <button data-remover-solicitacao="${nomeAttr}" class="btn btn-ghost btn-sm btn-icon" aria-label="Remover solicitação de ${nome}">
          ${iconSvg('lixo', 16)}
        </button>
      </div>
    `;
  }

  renderConteudo();
  el._limpar = () => { cancelarOuvinte(); cancelarOuvinteDiscografia(); cancelarOuvinteSolicitacoes(); };
  return el;
}
