import { carregarCatalogo, listarEstilos, listarCategorias } from './core/catalogService.js';
import { carregarConfiguracoes } from './core/configService.js';
import { carregarContato } from './core/contatoService.js';
import { carregarDiscografias } from './core/discografiaService.js';
import { selectionState, discografiaSelectionState, solicitacoesPersonalizadasState } from './core/selectionState.js';
import { montarToast } from './core/feedback.js';
import { previewService } from './core/previewService.js';
import { iconSvg, waveformSvg } from './design-system/icons.js';
import { renderHome } from './features/home/home.js';
import { renderExplorar } from './features/explorar-estilos/explorarEstilos.js';
import { renderSelecao } from './features/selecao/selecao.js';
import { renderFinalizar } from './features/finalizar/finalizar.js';

/**
 * Orquestrador da experiencia (Modulo de Navegacao, secao 20 item 9).
 * Decisao de arquitetura registrada na Sprint 01: troca de tela por
 * estado de JS em memoria, sem hash/URL (secao 18).
 *
 * Sprint 03 (Experiencia): transicao suave entre telas (fade), barra
 * de selecao persistente enriquecida com estimativa ao vivo (item
 * "RESUMO" do briefing) e toast de feedback centralizado.
 */

const elApp = document.getElementById('app');
const elHeader = document.getElementById('app-header');
const elBarraSelecao = document.getElementById('barra-selecao');
const elToast = document.getElementById('toast');

let catalogo = null;
let estilos = [];
let categorias = [];
let configuracoes = { destaquesHome: [] };
let contato = { whatsapp: '', email: '', telefone: '' };
let discografias = [];
let viewAtual = 'home';
let atualizarBarraSelecao = () => {};

async function iniciar() {
  montarToast(elToast);
  renderCarregando();
  try {
    catalogo = await carregarCatalogo();
    estilos = listarEstilos(catalogo);
    categorias = listarCategorias(catalogo);
    configuracoes = await carregarConfiguracoes();
    contato = await carregarContato();
    discografias = await carregarDiscografias();
    montarHeader();
    atualizarBarraSelecao = montarBarraSelecao();
    if (estilos.length === 0) {
      renderCatalogoVazio();
    } else {
      irPara('home');
    }
  } catch (erro) {
    renderErroCritico(erro);
  }
}

function renderCarregando() {
  elApp.innerHTML = `
    <div class="container view carregamento-inicial" aria-busy="true">
      <div class="carregamento-inicial__spinner" aria-hidden="true"></div>
      <p class="visually-hidden">Carregando catálogo...</p>
    </div>
  `;
}

function montarHeader() {
  elHeader.innerHTML = `
    <div class="brand" role="button" tabindex="0" data-ir="home">
      ${waveformSvg()}
      <span>Catálogo Musical</span>
    </div>
    <nav>
      <button class="btn btn-ghost btn-sm" data-ir="explorar">${iconSvg('busca', 16)}<span class="btn-label">Explorar</span></button>
      <button class="btn btn-ghost btn-sm" data-ir="selecao">${iconSvg('carrinho', 16)}<span class="btn-label">Seleção</span></button>
    </nav>
  `;
  elHeader.querySelectorAll('[data-ir]').forEach(elemento =>
    elemento.addEventListener('click', () => irPara(elemento.dataset.ir)));
  atualizarItemAtivoHeader();
}

function atualizarItemAtivoHeader() {
  elHeader.querySelectorAll('nav [data-ir]').forEach(botao => {
    const ativo = botao.dataset.ir === viewAtual;
    botao.classList.toggle('btn-ghost', !ativo);
    botao.classList.toggle('btn-primary', ativo);
  });
}

/**
 * Barra de seleção persistente — Sprint 14: exibe só a quantidade de
 * estilos selecionados. Estimativa de músicas/espaço/valor foi
 * removida do que é mostrado ao cliente (o modelo de negócio não
 * calcula preço nesta versão); o motor de estimativa continua
 * existindo em `core/estimateService.js` para um módulo de
 * precificação futuro, só não é mais chamado aqui.
 *
 * Sprint 06 (Seleção): a contagem recebe um pulso discreto sempre
 * que muda de valor (indicador visual claro, sem exagero) — nunca no
 * primeiro carregamento, só quando o número realmente muda.
 */
function montarBarraSelecao() {
  let quantidadeAnterior = null;

  function atualizar() {
    // Sprint 21 (ajuste A) + Sprint 22 (ajuste 4): a barra persistente
    // conta estilos, discografias completas E solicitações de
    // discografia personalizada — sem isso, um cliente que só pediu
    // uma discografia sob encomenda (sem selecionar mais nada) não
    // teria como chegar em "Ver seleção"/Finalizar para revisar/enviar
    // o pedido com essa solicitação.
    const quantidade = selectionState.quantidade() + discografiaSelectionState.quantidade() + solicitacoesPersonalizadasState.listar().length;

    // Sprint 22 (ajuste 7): em "Explorar estilos" a barra aparece
    // desde a entrada na tela, mesmo sem nada selecionado, com
    // "Voltar ao início" — antes só surgia depois da 1ª seleção,
    // obrigando o cliente a usar o botão pequeno do cabeçalho. Nas
    // demais telas (Home, Seleção) o comportamento antigo continua:
    // só aparece havendo itens selecionados, e nunca em Finalizar.
    const deveAparecer = viewAtual !== 'finalizar' && (quantidade > 0 || viewAtual === 'explorar');
    elBarraSelecao.classList.toggle('is-visible', deveAparecer);
    // Sprint 22 (ajuste 7): reserva espaço no fim da página quando a
    // barra fixa está visível — sem isso, em telas com pouco conteúdo
    // (ex.: Resumo do pedido com só 1 item) a barra ficava sobreposta
    // ao botão "Finalizar pedido", impedindo o clique.
    document.body.classList.toggle('tem-barra-selecao', deveAparecer);
    if (!deveAparecer) { elBarraSelecao.innerHTML = ''; quantidadeAnterior = quantidade === 0 ? 0 : quantidadeAnterior; return; }

    const mudou = quantidadeAnterior !== null && quantidadeAnterior !== quantidade;

    const botaoVoltar = `<button class="btn btn-ghost btn-sm" data-voltar-inicio>Voltar ao início</button>`;

    if (quantidade === 0) {
      // Explorar estilos, ainda sem nenhuma seleção.
      elBarraSelecao.innerHTML = `
        <div class="selection-bar__stats">
          <span>Nenhum item selecionado ainda</span>
        </div>
        ${botaoVoltar}
      `;
    } else {
      elBarraSelecao.innerHTML = `
        <div class="selection-bar__stats">
          <span><b class="${mudou ? 'pulso-contagem' : ''}">${quantidade}</b> ${quantidade === 1 ? 'item selecionado' : 'itens selecionados'}</span>
        </div>
        <div class="selection-bar__acoes">
          <button class="btn btn-accent btn-sm" data-ver-selecao>Ver seleção</button>
          ${botaoVoltar}
        </div>
      `;
    }
    const botaoVer = elBarraSelecao.querySelector('[data-ver-selecao]');
    if (botaoVer) botaoVer.addEventListener('click', () => irPara('selecao'));
    const botaoInicio = elBarraSelecao.querySelector('[data-voltar-inicio]');
    if (botaoInicio) botaoInicio.addEventListener('click', () => irPara('home'));
    quantidadeAnterior = quantidade;
  }
  selectionState.aoMudar(atualizar);
  discografiaSelectionState.aoMudar(atualizar);
  solicitacoesPersonalizadasState.aoMudar(atualizar);
  atualizar();
  return atualizar;
}

function irPara(view, parametros = {}) {
  viewAtual = view;
  previewService.parar();
  elApp.querySelectorAll(':scope > *').forEach(filho => {
    if (typeof filho._limpar === 'function') filho._limpar();
  });
  elApp.innerHTML = '';

  let elView;
  if (view === 'home') {
    elView = renderHome({
      catalogo, estilos, configuracoes, contato, discografias,
      irParaExplorar: (idEstilo) => irPara('explorar', { focoInicialId: idEstilo }),
      irParaExplorarComBusca: () => irPara('explorar', { autoFocoBusca: true })
    });
  } else if (view === 'explorar') {
    elView = renderExplorar({
      estilos, categorias,
      focoInicialId: parametros.focoInicialId,
      autoFocoBusca: parametros.autoFocoBusca,
      aoMudarSelecao: () => {}
    });
  } else if (view === 'selecao') {
    elView = renderSelecao({
      estilos, discografias,
      irParaExplorar: () => irPara('explorar'),
      irParaFinalizar: () => irPara('finalizar')
    });
  } else if (view === 'finalizar') {
    elView = renderFinalizar({
      estilos, discografias,
      irParaHome: () => { selectionState.limparTudo(); discografiaSelectionState.limparTudo(); solicitacoesPersonalizadasState.limparTudo(); irPara('home'); }
    });
  }

  if (elView) {
    elView.classList.add('view-transition');
    elApp.appendChild(elView);
  }
  atualizarItemAtivoHeader();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  atualizarBarraSelecao();
}

function renderCatalogoVazio() {
  elApp.innerHTML = `
    <div class="container view">
      <div class="empty-state card">
        ${iconSvg('carrinho', 32)}
        <strong>O catálogo ainda não tem estilos cadastrados</strong>
        <p>Volte em instantes — estamos organizando o acervo.</p>
      </div>
    </div>
  `;
}

function renderErroCritico(erro) {
  elApp.innerHTML = `
    <div class="container view">
      <div class="empty-state card" style="border-color: var(--color-danger);">
        <strong style="color: var(--color-danger);">Não foi possível carregar o catálogo</strong>
        <p>${erro && erro.message ? erro.message : 'Tente novamente em instantes.'}</p>
        <button class="btn btn-primary" onclick="location.reload()">Tentar novamente</button>
      </div>
    </div>
  `;
}

iniciar();
