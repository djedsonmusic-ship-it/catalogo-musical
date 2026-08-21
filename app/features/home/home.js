import { iconSvg } from '../../design-system/icons.js';
import { resolverDestaques } from '../../core/configService.js';
import { possuiCanalConfigurado, montarLinkWhatsApp, montarLinkEmail } from '../../core/contatoService.js';
import { listarDiscografias } from '../../core/discografiaService.js';
import { normalizarTexto, destacarTrecho } from '../../core/normalizeText.js';
import { discografiaSelectionState, formaRecebimentoPreferida, solicitacoesPersonalizadasState } from '../../core/selectionState.js';
import { mostrarToast } from '../../core/feedback.js';
import { FORMAS_ENTREGA } from '../../core/checkoutService.js';

/** Sprint 21 (ajuste B): a Home renderiza só um lote inicial de
 * discografias e revela o restante sob demanda ("Carregar mais"),
 * para o catálogo poder crescer sem pesar a tela — a busca abaixo
 * continua olhando a lista inteira, não só o lote visível. */
const LOTE_INICIAL_DISCOGRAFIAS = 24;
const INCREMENTO_DISCOGRAFIAS = 24;

/** Sprint 21 (ajuste C): mapeia cada atalho do grid de recebimento do
 * Hero para o texto oficial em `FORMAS_ENTREGA` (o mesmo usado pelos
 * rádios de Finalizar Pedido), para a escolha poder ser pré-marcada
 * e ficar registrada no pedido sem duplicar a lista de opções. */
const MAPA_RECEBIMENTO_HERO = {
  'proprio-pendrive': FORMAS_ENTREGA.LEVAR,
  'envio-digital': FORMAS_ENTREGA.LINK,
  'nosso-pendrive': FORMAS_ENTREGA.COMPRAR
};

function estiloTemPreview(estilo) {
  return (Array.isArray(estilo.previewUrls) ? estilo.previewUrls.length : 0) > 0 ||
    (typeof estilo.previewUrl === 'string' && estilo.previewUrl.trim().length > 0);
}

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
 * Sprint 17 (Evolução comercial): nova hierarquia — hero focado em
 * "grave do seu jeito", destaque de Discografias Completas logo no
 * início (dados/discografias.json, some sozinho se vazio), seção
 * fixa "Escolha como quer receber" e card de pedido personalizado
 * com campo de nome + WhatsApp. Nenhum carrinho/checkout novo: os
 * botões de discografia e o pedido personalizado só abrem o
 * WhatsApp já configurado, com mensagem pré-formatada.
 * Sprint 18 (Composição visual): reestruturação da HOME por áreas de
 * decisão (montar pendrive / discografia / estilos / receber), com
 * densidade real no mobile (grids de 2 colunas em vez de blocos
 * empilhados) e melhor aproveitamento de largura no desktop. Estilos
 * inline movidos para classes semânticas (.home-*) no styles.css —
 * nenhum contrato de dado, serviço ou seletor de evento foi alterado.
 * Sprint 20 (Reorganização estrutural — MD "Nova Home + Discografias",
 * seções 4/5/6/7/16/17): a Home passa a seguir a hierarquia
 * Header → Hero+Painel de atalhos → Contatos → Destaques → (demais
 * seções preservadas). O hero ganha uma segunda coluna com os 3
 * atalhos (Discografias / Estilos Musicais / Não encontrou?) como um
 * painel único, reaproveitando .style-card; nenhuma função ou
 * seletor usado pelos listeners abaixo foi renomeado — só o local no
 * markup onde cada bloco é renderizado mudou. Discografias (busca,
 * normalização, estado vazio, cards, pedido via WhatsApp) segue
 * intacta, apenas reposicionada.
 */
export function renderHome({ catalogo, estilos, configuracoes, contato, discografias, irParaExplorar, irParaExplorarComBusca }) {
  const destaquesConfigurados = resolverDestaques(estilos, configuracoes?.destaquesHome || []);
  const destaques = destaquesConfigurados.length > 0 ? destaquesConfigurados : estilos.slice(0, 4);
  const discografiasAtivas = listarDiscografias(discografias || []);

  const el = document.createElement('div');
  el.className = 'view container';
  el.innerHTML = `
    <section class="hero home-hero">
      <div class="home-hero__grid">
        <div class="home-hero__content">
          <p class="eyebrow">Catálogo Musical</p>
          <h1 class="hero__title">Monte o <mark>Pendrive do seu jeito</mark>! E nós gravamos!</h1>
          <p class="hero__lead">
            Escolha seus estilos e artistas favoritos, ouça prévias e monte
            sua seleção de músicas de forma simples e rápida.
          </p>
          <div class="home-hero__delivery">
            <p class="home-hero__delivery-title">📦 Escolha como quer receber:</p>
            <div class="home-hero__delivery-grid" role="radiogroup" aria-label="Forma de recebimento">
              <button type="button" class="home-hero__delivery-item" data-recebimento="proprio-pendrive" role="radio" aria-checked="false">
                <span class="home-hero__delivery-icon" style="color:#64b5f6;">💻</span>
                <span>No seu próprio Pendrive</span>
              </button>
              <button type="button" class="home-hero__delivery-item home-hero__delivery-item--wide" data-recebimento="envio-digital" role="radio" aria-checked="false">
                <span class="home-hero__delivery-icon">☁️</span>
                <div class="home-hero__delivery-text">
                  <span class="home-hero__delivery-text-title">Envio Digital</span>
                  <span class="home-hero__delivery-sub">Via Google Drive</span>
                </div>
              </button>
              <button type="button" class="home-hero__delivery-item" data-recebimento="nosso-pendrive" role="radio" aria-checked="false">
                <span class="home-hero__delivery-icon" style="color:#ffb74d;">🎁</span>
                <span>Com o nosso Pendrive</span>
              </button>
            </div>
            <p class="home-hero__delivery-hint" data-recebimento-confirmacao hidden></p>
          </div>
        </div>
        <div class="home-hero__atalhos" role="group" aria-label="Atalhos rápidos">
          <button type="button" class="style-card home-atalho" data-acao="discografias">
            <span class="style-card__icon">${iconSvg('seta', 20)}</span>
            <div>
              <p class="style-card__title">Discografias completas</p>
              <p class="style-card__category">Artista favorito, de uma vez só</p>
            </div>
          </button>
          <button type="button" class="style-card home-atalho" data-acao="buscar">
            <span class="style-card__icon">${iconSvg('busca', 20)}</span>
            <div>
              <p class="style-card__title">Estilos Musicais</p>
              <p class="style-card__category">Monte sua seleção por estilo</p>
            </div>
          </button>
          <button type="button" class="style-card home-atalho" data-acao="nao-encontrou">
            <span class="style-card__icon">${iconSvg('whatsapp', 20)}</span>
            <div>
              <p class="style-card__title">Não encontrou?</p>
              <p class="style-card__category">Peça e a gente verifica pra você</p>
            </div>
          </button>
        </div>
      </div>
    </section>

    ${possuiCanalConfigurado(contato) ? `
    <section class="card home-section home-contato contato-home">
      <p class="style-card__title home-section__title">Fale comigo</p>
      <p class="home-section__lead">
        Dúvidas, pedidos personalizados ou sobre a conversão de mídias? É só chamar:
      </p>
      <div class="contato-home__links home-contato__links">
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

    <section class="home-section home-destaques">
      <div class="section-heading">
        <h2 class="home-section__title">🎵 Destaques</h2>
        <button class="link-quiet" data-acao="explorar">Ver todos →</button>
      </div>
      <p class="home-section__lead home-section__lead--tight">
        Explore os estilos, ouça prévias e escolha o que combina com você.
      </p>
      <div class="grid-styles home-highlights__grid">
        ${destaques.map(estilo => `
          <button type="button" class="style-card" style="--card-accent:${estilo.categoriaCor};" data-ir-detalhe="${estilo.id}">
            <span class="style-card__icon">${iconSvg(estilo.categoriaIcone, 20)}</span>
            <div>
              <p class="style-card__title">${estilo.nome}</p>
              <p class="style-card__category">${estilo.categoriaNome}</p>
            </div>
            ${estiloTemPreview(estilo) ? `
            <div class="style-card__meta">
              <span class="style-card__preview-badge">▶ Ouvir Preview</span>
            </div>` : ''}
          </button>
        `).join('')}
      </div>
    </section>

    <section id="secao-discografias" class="card home-section home-discografias">
      <p class="style-card__title home-section__title">💿 Discografias completas</p>
      <p class="home-section__lead">
        Quer praticidade? Escolha seu artista favorito e leve a discografia completa de uma só vez.
      </p>
      ${discografiasAtivas.length > 0 ? `
      <label class="search-field home-discografias__busca" for="campo-busca-discografia">
        ${iconSvg('busca', 18)}
        <input type="text" id="campo-busca-discografia" placeholder="Buscar artista ou discografia..." autocomplete="off">
      </label>
      <div id="grid-discografias" class="home-discografias__grid"></div>
      <div id="discografias-sem-resultado" class="home-discografias__sem-resultado" style="display:none;"></div>
      <button type="button" id="botao-carregar-mais-discografias" class="btn btn-ghost btn-sm home-discografias__carregar-mais" hidden>
        Carregar mais discografias
      </button>` : `
      <div id="secao-nao-encontrou" class="home-custom-request">
        <p class="home-discografias__preparando">
          Ainda estamos preparando nossas discografias. Enquanto isso, peça a sua abaixo que a gente verifica pra você!
        </p>
        <p class="home-custom-request__lead">Digite pelo menos uma palavra ou o nome completo do artista.</p>
        <div class="home-custom-request__form">
          <div class="search-field home-custom-request__field">
            <input type="text" id="pedido-personalizado-nome" placeholder="Nome do artista ou banda">
          </div>
          <button type="button" class="btn btn-accent" data-acao="pedido-personalizado">
            <span>Pedir discografia personalizada</span>
          </button>
        </div>
      </div>`}
    </section>

    <section class="card home-section home-service highlight-servico">
      <p class="style-card__title home-section__title">🎥 Conversão de Mídias — DVD para MP4</p>
      <p class="home-section__lead">
        Salve seus shows antigos e memórias de família antes que o disco estrague! Convertemos
        seus DVDs físicos em arquivos digitais MP4 de alta qualidade, prontos para rodar na TV,
        no celular ou direto no pendrive.
      </p>
      <p class="highlight-servico__aviso home-service__aviso">
        ⚠️ Aviso sobre discos danificados: mídias muito arranhadas podem não ser convertidas.
        Se você autorizar, faremos uma limpeza profissional e polimento para tentar recuperar
        o arquivo, mas o sucesso depende do estado físico do disco.
      </p>
    </section>
  `;

  el.querySelectorAll('[data-acao="explorar"]').forEach(btn =>
    btn.addEventListener('click', () => irParaExplorar()));
  el.querySelector('[data-acao="buscar"]').addEventListener('click', () => irParaExplorarComBusca());
  const botaoDiscografiasHero = el.querySelector('[data-acao="discografias"]');
  if (botaoDiscografiasHero) {
    botaoDiscografiasHero.addEventListener('click', () => {
      const secao = el.querySelector('#secao-discografias');
      if (secao) secao.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  const botaoNaoEncontrou = el.querySelector('[data-acao="nao-encontrou"]');
  if (botaoNaoEncontrou) {
    botaoNaoEncontrou.addEventListener('click', () => {
      const secao = el.querySelector('#secao-nao-encontrou') || el.querySelector('#secao-discografias');
      if (secao) secao.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Sprint 22 (ajuste 2): com busca unificada, o campo a focar
      // muda conforme existir ou não catálogo de discografias — o
      // campo "nome do artista" avulso só existe quando ainda não há
      // nenhuma discografia cadastrada.
      const campoFoco = el.querySelector('#campo-busca-discografia') || el.querySelector('#pedido-personalizado-nome');
      if (campoFoco) campoFoco.focus({ preventScroll: true });
    });
  }
  el.querySelectorAll('[data-ir-detalhe]').forEach(card =>
    card.addEventListener('click', () => irParaExplorar(card.dataset.irDetalhe)));

  // Sprint 21 (ajuste C): atalho de recebimento no Hero — só marca a
  // preferência (visualmente e em armazenamento local); a forma de
  // entrega definitiva continua sendo confirmada em Finalizar Pedido,
  // já pré-selecionada a partir daqui.
  const botoesRecebimento = el.querySelectorAll('[data-recebimento]');
  const dicaRecebimento = el.querySelector('[data-recebimento-confirmacao]');
  function marcarRecebimentoAtivo(chave) {
    botoesRecebimento.forEach(botao => {
      const ativo = botao.dataset.recebimento === chave;
      botao.classList.toggle('is-active', ativo);
      botao.setAttribute('aria-checked', String(ativo));
    });
    if (dicaRecebimento) {
      if (chave) {
        dicaRecebimento.hidden = false;
        dicaRecebimento.textContent = `✓ Você escolheu: ${MAPA_RECEBIMENTO_HERO[chave]}`;
      } else {
        dicaRecebimento.hidden = true;
      }
    }
  }
  const chaveRecebimentoSalva = Object.keys(MAPA_RECEBIMENTO_HERO)
    .find(chave => MAPA_RECEBIMENTO_HERO[chave] === formaRecebimentoPreferida.obter());
  if (chaveRecebimentoSalva) marcarRecebimentoAtivo(chaveRecebimentoSalva);
  botoesRecebimento.forEach(botao => botao.addEventListener('click', () => {
    formaRecebimentoPreferida.definir(MAPA_RECEBIMENTO_HERO[botao.dataset.recebimento]);
    marcarRecebimentoAtivo(botao.dataset.recebimento);
    mostrarToast('Forma de recebimento escolhida — você pode confirmar ou trocar ao finalizar o pedido', 'adicao');
  }));

  const gridDiscografias = el.querySelector('#grid-discografias');
  if (gridDiscografias) {
    const campoBuscaDiscografia = el.querySelector('#campo-busca-discografia');
    const semResultado = el.querySelector('#discografias-sem-resultado');
    const botaoCarregarMais = el.querySelector('#botao-carregar-mais-discografias');
    let termoBuscaDiscografia = '';
    let quantidadeVisivel = LOTE_INICIAL_DISCOGRAFIAS;
    const cancelarOuvinteDiscografia = discografiaSelectionState.aoMudar(() => renderGridDiscografias());
    const cancelarOuvinteSolicitacoes = solicitacoesPersonalizadasState.aoMudar(() => renderGridDiscografias());

    function cartaoDiscografia(disc) {
      const selecionada = discografiaSelectionState.estaSelecionado(disc.id);
      return `
        <div class="style-card home-discografias__item ${selecionada ? 'is-selected' : ''}" style="--card-accent:#4F46E5;">
          ${selecionada ? `<span class="style-card__badge-selected">${iconSvg('check', 11)} Adicionada</span>` : ''}
          <div>
            <p class="style-card__title">${destacarTrecho(disc.titulo || '', termoBuscaDiscografia)}</p>
            ${disc.subtitulo ? `<p class="style-card__category">${destacarTrecho(disc.subtitulo, termoBuscaDiscografia)}</p>` : ''}
          </div>
          <button type="button" class="btn ${selecionada ? 'btn-danger-ghost' : 'btn-accent'} btn-sm" data-alternar-discografia="${disc.id}">
            ${selecionada ? 'Remover' : 'Adicionar'}
          </button>
        </div>
      `;
    }

    // Sprint 22 (ajuste 2): pesquisar → achou → seleciona OU
    // pesquisar → não achou → pedir discografia personalizada, tudo
    // no mesmo campo de busca (antes havia um segundo campo sempre
    // visível, dando a impressão de duas pesquisas independentes).
    // Sprint 23 (ajuste 1/2): "Pedir discografia personalizada" é uma
    // ação de MONTAGEM do pedido, não de envio — não aciona mais o
    // WhatsApp nem exibe o ícone; só registra a solicitação.
    function blocoNaoEncontrado() {
      const termo = termoBuscaDiscografia.trim();
      const jaSolicitado = termo && solicitacoesPersonalizadasState.listar().some(n => normalizarTexto(n) === normalizarTexto(termo));
      return `
        <p class="home-discografias__sem-resultado-texto">Nenhuma discografia encontrada para “${termo}”.</p>
        <div class="home-custom-request home-custom-request--inline">
          <p class="home-custom-request__title">Não encontrou o artista que procura?</p>
          ${!jaSolicitado ? `
          <p class="home-custom-request__lead">Digite pelo menos uma palavra ou o nome completo do artista.</p>` : ''}
          ${jaSolicitado ? `
          <p class="home-custom-request__confirmado">${iconSvg('check', 14)} Solicitação de “${termo}” já adicionada ao seu pedido.</p>` : `
          <button type="button" class="btn btn-accent btn-sm" data-acao="pedido-personalizado" data-nome="${termo.replace(/"/g, '&quot;')}">
            <span>Pedir discografia personalizada</span>
          </button>`}
        </div>
      `;
    }

    // Sprint 21 (ajuste B): sem termo de busca, só o lote atual é
    // desenhado no DOM (com botão "Carregar mais"); a lista inteira
    // só entra quando o usuário efetivamente filtra — evita re-render
    // e travamento conforme o catálogo de discografias cresce.
    function renderGridDiscografias() {
      const termoNormalizado = normalizarTexto(termoBuscaDiscografia);
      const filtradas = termoNormalizado
        ? discografiasAtivas.filter(disc =>
            normalizarTexto(disc.titulo).includes(termoNormalizado) ||
            normalizarTexto(disc.subtitulo || '').includes(termoNormalizado))
        : discografiasAtivas;

      const visiveis = termoNormalizado ? filtradas : filtradas.slice(0, quantidadeVisivel);
      gridDiscografias.innerHTML = visiveis.map(cartaoDiscografia).join('');
      gridDiscografias.querySelectorAll('[data-alternar-discografia]').forEach(botao =>
        botao.addEventListener('click', () => alternarDiscografia(botao.dataset.alternarDiscografia)));

      const semResultadoVisivel = termoNormalizado && filtradas.length === 0;
      if (semResultado) {
        semResultado.style.display = semResultadoVisivel ? '' : 'none';
        if (semResultadoVisivel) {
          semResultado.innerHTML = blocoNaoEncontrado();
          const botaoPedir = semResultado.querySelector('[data-acao="pedido-personalizado"]');
          if (botaoPedir) botaoPedir.addEventListener('click', () => acionarPedidoPersonalizado(botaoPedir.dataset.nome));
        }
      }
      if (botaoCarregarMais) {
        const restantes = !termoNormalizado && discografiasAtivas.length > visiveis.length;
        botaoCarregarMais.hidden = !restantes;
      }
    }

    // Ajuste pontual (busca parcial): recebe sempre o ID do resultado
    // (data-alternar-discografia), nunca o termo digitado na busca —
    // o nome gravado no pedido é sempre disc.titulo, vindo do próprio
    // resultado selecionado. Isso já garante "Líban" → "Banda Líbanos".
    function alternarDiscografia(id) {
      const disc = discografiasAtivas.find(d => d.id === id);
      if (!disc) return;
      const jaSelecionada = discografiaSelectionState.estaSelecionado(id);
      discografiaSelectionState.alternar(id);
      mostrarToast(jaSelecionada ? `“${disc.titulo}” removida da seleção` : `“${disc.titulo}” adicionada à seleção`, jaSelecionada ? 'remocao' : 'adicao');
    }

    if (campoBuscaDiscografia) {
      campoBuscaDiscografia.addEventListener('input', () => {
        termoBuscaDiscografia = campoBuscaDiscografia.value;
        renderGridDiscografias();
      });
    }
    if (botaoCarregarMais) {
      botaoCarregarMais.addEventListener('click', () => {
        quantidadeVisivel += INCREMENTO_DISCOGRAFIAS;
        renderGridDiscografias();
      });
    }

    renderGridDiscografias();
    el._limpar = () => { cancelarOuvinteDiscografia(); cancelarOuvinteSolicitacoes(); };
  }

  const botaoPedidoPersonalizado = el.querySelector('[data-acao="pedido-personalizado"]');
  if (botaoPedidoPersonalizado) {
    botaoPedidoPersonalizado.addEventListener('click', () => {
      const campoNome = el.querySelector('#pedido-personalizado-nome');
      acionarPedidoPersonalizado(campoNome?.value || '');
    });
  }

  // Sprint 23 (ajuste 1/2/5): a seleção de discografia personalizada é
  // uma ação de MONTAGEM do pedido — não abre WhatsApp, não abre nova
  // aba/janela, não redireciona para lugar nenhum. O WhatsApp só é
  // acionado depois, na etapa de Finalizar Pedido, quando o cliente
  // escolhe explicitamente esse canal de envio.
  function acionarPedidoPersonalizado(nomeBruto) {
    const nome = (nomeBruto || '').trim();
    if (!nome) return;
    solicitacoesPersonalizadasState.adicionar(nome);
    mostrarToast(`Solicitação de “${nome}” adicionada ao seu pedido`, 'adicao');
  }

  return el;
}
