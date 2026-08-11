import { iconSvg } from '../../design-system/icons.js';
import { selectionState } from '../../core/selectionState.js';
import { finalizarPedido, CANAIS, FORMAS_ENTREGA } from '../../core/checkoutService.js';
import { mostrarToast } from '../../core/feedback.js';
import { carregarContato, possuiCanalConfigurado, montarLinkWhatsApp, montarLinkEmail, montarLinkTelefone } from '../../core/contatoService.js';

/**
 * Tela 5 — Finalizar seleção (secao 7.5).
 *
 * Sprint 14 (modelo de negócio sem preço): a tela agora tem 2 passos
 * dentro da mesma tela (sem criar uma tela nova, conforme
 * arquitetura): 1) escolher a forma de entrega + observações
 * opcionais; 2) confirmação, com o resumo exigido pelo briefing
 * (código, data, forma de entrega, quantidade, lista de estilos,
 * observações, contato do proprietário) — nenhuma menção a preço.
 */
export function renderFinalizar({ estilos, irParaHome }) {
  const el = document.createElement('div');
  el.className = 'view container tela-finalizar';

  const ids = new Set(selectionState.listarIds());
  const selecionados = estilos.filter(e => ids.has(e.id));

  if (selecionados.length === 0) {
    el.innerHTML = `
      <div class="empty-state card">
        ${iconSvg('carrinho', 32)}
        <strong>Sua seleção está vazia</strong>
        <p>Volte e escolha os estilos antes de finalizar o pedido.</p>
        <button data-voltar class="btn btn-primary" style="margin-top: var(--space-3);">Voltar ao início</button>
      </div>
    `;
    el.querySelector('[data-voltar]').addEventListener('click', irParaHome);
    return el;
  }

  renderFormulario();
  return el;

  function renderFormulario() {
    el.innerHTML = `
      <h1 style="font-size: var(--text-xl); margin-bottom: var(--space-2);">Finalizar pedido</h1>
      <p style="margin-bottom: var(--space-6);">${selecionados.length} estilo${selecionados.length === 1 ? '' : 's'} selecionado${selecionados.length === 1 ? '' : 's'}. Escolha como prefere receber.</p>

      <fieldset class="entrega-opcoes">
        <legend class="eyebrow" style="margin-bottom: var(--space-3);">Forma de entrega</legend>
        ${Object.values(FORMAS_ENTREGA).map((texto) => `
          <label class="entrega-opcao">
            <input type="radio" name="forma-entrega" value="${escaparHtml(texto)}" />
            <span>${texto}</span>
          </label>
        `).join('')}
      </fieldset>

      <label style="display:block; margin-top: var(--space-6);">
        <span class="eyebrow" style="margin-bottom: var(--space-2); display:block;">Observações (opcional)</span>
        <textarea id="campo-observacoes" class="campo-observacoes" rows="3" placeholder="Alguma preferência ou detalhe para o seu pedido?"></textarea>
      </label>

      <button data-confirmar class="btn btn-accent btn-block checkout-cta" style="margin-top: var(--space-6);">
        ${iconSvg('seta', 18)} Confirmar pedido
      </button>
    `;

    el.querySelector('[data-confirmar]').addEventListener('click', () => {
      const escolha = el.querySelector('input[name="forma-entrega"]:checked');
      if (!escolha) {
        mostrarToast('Selecione uma forma de entrega para continuar', 'remocao');
        return;
      }
      const observacoes = el.querySelector('#campo-observacoes').value.trim();
      const resultado = finalizarPedido(CANAIS.SIMULADO, { selecionados, formaEntrega: escolha.value, observacoes });
      renderConfirmacao(resultado, escolha.value, observacoes);
    });
  }

  function renderConfirmacao(resultado, formaEntrega, observacoes) {
    el.innerHTML = `
      <div class="card checkout-card">
        <span class="checkout-card__icone">${iconSvg('check', 32)}</span>
        <h1 style="font-size: var(--text-xl); margin-top: var(--space-4);">Pedido recebido!</h1>
        <p style="margin-top: var(--space-3);">
          Recebemos sua seleção com sucesso. Copie o resumo abaixo e
          envie pelo canal de sua preferência para confirmarmos os
          próximos passos.
        </p>

        <div class="checkout-resumo-campos">
          <div><span class="eyebrow">Código do pedido</span><strong>${resultado.protocolo}</strong></div>
          <div><span class="eyebrow">Data</span><strong>${resultado.dataFormatada}</strong></div>
          <div><span class="eyebrow">Forma de entrega</span><strong>${formaEntrega}</strong></div>
          <div><span class="eyebrow">Estilos selecionados</span><strong>${selecionados.length}</strong></div>
        </div>

        <div id="checkout-contato" class="checkout-contato" hidden></div>

        <div class="checkout-card__resumo">
          <div class="section-heading" style="margin-bottom: var(--space-3);">
            <span class="eyebrow">Detalhes do pedido</span>
            <button data-copiar class="btn btn-ghost btn-sm">${iconSvg('copiar', 14)} Copiar resumo</button>
          </div>
          <pre class="checkout-card__pre">${escaparHtml(resultado.resumoTextual)}</pre>
        </div>

        <section class="card highlight-servico" style="padding: var(--space-4); margin-top: var(--space-5);">
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

        <button data-voltar class="btn btn-primary btn-block" style="margin-top: var(--space-6);">Voltar ao início</button>
      </div>
    `;

    carregarContato().then(contato => {
      if (!possuiCanalConfigurado(contato)) {
        console.warn('[Catálogo Musical] Nenhum canal de contato configurado em dados/contato.json.');
        return;
      }
      const areaContato = el.querySelector('#checkout-contato');
      areaContato.hidden = false;
      areaContato.innerHTML = `
        <span class="eyebrow" style="display:block; margin-bottom: var(--space-3);">Enviar direto pelo</span>
        <div class="checkout-contato__botoes">
          ${contato.whatsapp ? `<a class="btn btn-accent" href="${montarLinkWhatsApp(contato.whatsapp, resultado.resumoTextual)}" target="_blank" rel="noopener">${iconSvg('enviar', 16)} WhatsApp</a>` : ''}
          ${contato.email ? `<a class="btn btn-ghost" href="${montarLinkEmail(contato.email, 'Pedido — Catálogo Musical', resultado.resumoTextual)}">${iconSvg('enviar', 16)} E-mail</a>` : ''}
          ${contato.telefone ? `<a class="btn btn-ghost" href="${montarLinkTelefone(contato.telefone)}">${iconSvg('telefone', 16)} Ligar</a>` : ''}
        </div>
      `;
    });

    el.querySelector('[data-voltar]').addEventListener('click', irParaHome);
    el.querySelector('[data-copiar]').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(resultado.resumoTextual);
        mostrarToast('Resumo copiado para a área de transferência', 'adicao');
      } catch (erro) {
        mostrarToast('Não foi possível copiar automaticamente — selecione o texto manualmente', 'remocao');
      }
    });
  }
}

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}
