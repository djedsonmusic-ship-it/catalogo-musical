import { carregarCatalogo, listarEstilos, listarCategorias } from './core/catalogService.js';
import { carregarConfiguracoes } from './core/configService.js';
import { carregarContato } from './core/contatoService.js';
import { selectionState } from './core/selectionState.js';
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
let viewAtual = 'home';

async function iniciar() {
  montarToast(elToast);
  renderCarregando();
  try {
    catalogo = await carregarCatalogo();
    estilos = listarEstilos(catalogo);
    categorias = listarCategorias(catalogo);
    configuracoes = await carregarConfiguracoes();
    contato = await carregarContato();
    montarHeader();
    montarBarraSelecao();
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
    const quantidade = selectionState.quantidade();
    elBarraSelecao.classList.toggle('is-visible', quantidade > 0 && viewAtual !== 'finalizar');
    if (quantidade === 0) { elBarraSelecao.innerHTML = ''; quantidadeAnterior = 0; return; }

    const mudou = quantidadeAnterior !== null && quantidadeAnterior !== quantidade;

    elBarraSelecao.innerHTML = `
      <div class="selection-bar__stats">
        <span><b class="${mudou ? 'pulso-contagem' : ''}">${quantidade}</b> estilo${quantidade === 1 ? '' : 's'} selecionado${quantidade === 1 ? '' : 's'}</span>
      </div>
      <button class="btn btn-accent btn-sm" data-ver-selecao>Ver seleção</button>
    `;
    const botao = elBarraSelecao.querySelector('[data-ver-selecao]');
    if (botao) botao.addEventListener('click', () => irPara('selecao'));
    quantidadeAnterior = quantidade;
  }
  selectionState.aoMudar(atualizar);
  atualizar();
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
      catalogo, estilos, configuracoes, contato,
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
      estilos,
      irParaExplorar: () => irPara('explorar'),
      irParaFinalizar: () => irPara('finalizar')
    });
  } else if (view === 'finalizar') {
    elView = renderFinalizar({
      estilos,
      irParaHome: () => { selectionState.limparTudo(); irPara('home'); }
    });
  }

  if (elView) {
    elView.classList.add('view-transition');
    elApp.appendChild(elView);
  }
  atualizarItemAtivoHeader();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  const quantidadeAtual = selectionState.quantidade();
  elBarraSelecao.classList.toggle('is-visible', quantidadeAtual > 0 && view !== 'finalizar');
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
