import { iconSvg } from '../../design-system/icons.js';
import { resolverDestaques } from '../../core/configService.js';
import { possuiCanalConfigurado, montarLinkWhatsApp, montarLinkEmail } from '../../core/contatoService.js';

/**
 * Tela 1 — Entrada / Início (secao 7.1). Apresentacao rapida,
 * atalho para busca, visao geral de estilos em destaque.
 * Sprint 02 (UX/UI): markup movido para classes do design system,
 * cartoes acessiveis via <button>, foco visivel herdado do global.
 * Sprint 15 (Admin): os cartoes de "Em destaque" agora podem ser
 * escolhidos em dados/configuracoes.json; se o arquivo nao existir
 * ou vier vazio, cai no comportamento antigo (os 4 primeiros por
 * ordem de exibicao) — nunca quebra a tela.
 * Sprint 16: card "Fale comigo" com WhatsApp/e-mail na Home, usando
 * o mesmo dados/contato.json e as mesmas funções de link da tela de
 * Finalizar Pedido — só aparece se houver algum canal configurado.
 */
export function renderHome({ catalogo, estilos, configuracoes, contato, irParaExplorar, irParaExplorarComBusca }) {
  const destaquesConfigurados = resolverDestaques(estilos, configuracoes?.destaquesHome || []);
  const destaques = destaquesConfigurados.length > 0 ? destaquesConfigurados : estilos.slice(0, 4);

  const el = document.createElement('div');
  el.className = 'view container';
  el.innerHTML = `
    <section class="hero">
      <p class="eyebrow">Catálogo Musical</p>
      <h1 class="hero__title">Monte o pendrive com <mark>os estilos que você realmente ouve</mark>.</h1>
      <p class="hero__lead">
        Explore estilos musicais, escolha o que quiser e acompanhe
        sua seleção em tempo real — sem compromisso até você finalizar.
      </p>
      <div class="hero__actions">
        <button class="btn btn-primary" data-acao="explorar">
          ${iconSvg('seta', 18)}<span>Explorar estilos</span>
        </button>
        <button class="btn btn-ghost" data-acao="buscar">
          ${iconSvg('busca', 18)}<span>Buscar um estilo</span>
        </button>
      </div>
    </section>

    <section class="card highlight-servico" style="padding: var(--space-5); margin-block: var(--space-6);">
      <p class="style-card__title" style="font-size: var(--text-lg);">🎬 Conversão de Mídias Físicas (DVD para MP4)</p>
      <p style="margin-top: var(--space-2); color: var(--color-text-secondary);">
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

    ${possuiCanalConfigurado(contato) ? `
    <section class="card contato-home" style="padding: var(--space-5); margin-bottom: var(--space-6);">
      <p class="style-card__title" style="font-size: var(--text-lg);">Fale comigo</p>
      <p style="margin-top: var(--space-2); color: var(--color-text-secondary);">
        Dúvidas, pedidos personalizados ou sobre a conversão de mídias? É só chamar:
      </p>
      <div class="contato-home__links" style="display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-4);">
        ${contato.whatsapp ? `
          <a class="btn btn-accent" href="${montarLinkWhatsApp(contato.whatsapp, 'Olá! Vim pelo Catálogo Musical e queria tirar uma dúvida.')}" target="_blank" rel="noopener">
            ${iconSvg('whatsapp', 18)}<span>WhatsApp</span>
          </a>` : ''}
        ${contato.email ? `
          <a class="btn btn-ghost" href="${montarLinkEmail(contato.email, 'Contato — Catálogo Musical', '')}">
            ${iconSvg('email', 18)}<span>${contato.email}</span>
          </a>` : ''}
      </div>
    </section>` : ''}

    <section>
      <div class="section-heading">
        <h2 style="font-size: var(--text-lg);">Em destaque</h2>
        <button class="link-quiet" data-acao="explorar">Ver todos →</button>
      </div>
      <div class="grid-styles">
        ${destaques.map(estilo => `
          <button type="button" class="style-card" style="--card-accent:${estilo.categoriaCor};" data-ir-detalhe="${estilo.id}">
            <span class="style-card__icon">${iconSvg(estilo.categoriaIcone, 20)}</span>
            <div>
              <p class="style-card__title">${estilo.nome}</p>
              <p class="style-card__category">${estilo.categoriaNome}</p>
            </div>
          </button>
        `).join('')}
      </div>
    </section>
  `;

  el.querySelectorAll('[data-acao="explorar"]').forEach(btn =>
    btn.addEventListener('click', () => irParaExplorar()));
  el.querySelector('[data-acao="buscar"]').addEventListener('click', () => irParaExplorarComBusca());
  el.querySelectorAll('[data-ir-detalhe]').forEach(card =>
    card.addEventListener('click', () => irParaExplorar(card.dataset.irDetalhe)));

  return el;
}
