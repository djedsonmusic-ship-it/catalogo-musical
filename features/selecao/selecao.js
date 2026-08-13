import { iconSvg } from '../../design-system/icons.js';
import { selectionState } from '../../core/selectionState.js';
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
export function renderSelecao({ estilos, irParaExplorar, irParaFinalizar }) {
  const el = document.createElement('div');
  el.className = 'view container';

  const cancelarOuvinte = selectionState.aoMudar(() => renderConteudo());

  function estilosSelecionados() {
    const ids = new Set(selectionState.listarIds());
    return estilos.filter(e => ids.has(e.id));
  }

  function renderConteudo() {
    const selecionados = estilosSelecionados();

    if (selecionados.length === 0) {
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

      <div class="stat-card" style="margin-bottom: var(--space-6); display:inline-block;">
        <span class="stat-card__label">Estilos selecionados</span>
        <strong class="stat-card__value">${selecionados.length}</strong>
      </div>

      <h2 class="checkout-section-title">Itens selecionados</h2>
      <div style="display:flex; flex-direction:column; gap: var(--space-3); margin-bottom: var(--space-6);">
        ${selecionados.map(itemSelecionado).join('')}
      </div>

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
    el.querySelector('[data-limpar]').addEventListener('click', () => {
      selectionState.limparTudo();
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

  renderConteudo();
  el._limpar = cancelarOuvinte;
  return el;
}
