import { previewService, ESTADOS_PREVIEW } from '../core/previewService.js';

function obterPreviewUrlsDoEstilo(estilo) {
  if (Array.isArray(estilo.previewUrls)) {
    return estilo.previewUrls
      .filter(url => typeof url === 'string' && url.trim())
      .map(url => url.trim());
  }
  if (typeof estilo.previewUrl === 'string' && estilo.previewUrl.trim()) {
    return [estilo.previewUrl.trim()];
  }
  return [];
}

export function renderPreviewPlayer(estilo) {
  const previewUrls = obterPreviewUrlsDoEstilo(estilo);
  if (!previewUrls.length) return '';

  const multiple = previewUrls.length > 1;
  return `
    <div class="preview-player" data-preview-id="${estilo.id}">
      <div class="preview-player__controls">
        <button type="button" class="preview-player__nav preview-player__nav--prev" data-preview-prev aria-label="Preview anterior de ${estilo.nome}" ${multiple ? '' : 'disabled'}>
          ${svgPrev()}
        </button>
        <button type="button" class="preview-player__botao" data-preview-toggle aria-label="Tocar preview de ${estilo.nome}">
          ${svgPlay()}
        </button>
        <button type="button" class="preview-player__nav preview-player__nav--next" data-preview-next aria-label="Próximo preview de ${estilo.nome}" ${multiple ? '' : 'disabled'}>
          ${svgNext()}
        </button>
      </div>
      <div class="preview-player__corpo">
        <div class="preview-player__trilha"><div class="preview-player__progresso" style="width:0%"></div></div>
        <span class="preview-player__legenda">${multiple ? `Preview 1 de ${previewUrls.length}` : 'Preview de 15s'}</span>
      </div>
    </div>
  `;
}

export function vincularPreviewPlayer(raiz, estilo) {
  const previewUrls = obterPreviewUrlsDoEstilo(estilo);
  if (!previewUrls.length) return () => {};

  const elPlayer = raiz.querySelector(`.preview-player[data-preview-id="${estilo.id}"]`);
  if (!elPlayer) return () => {};
  const botao = elPlayer.querySelector('[data-preview-toggle]');
  const botaoPrev = elPlayer.querySelector('[data-preview-prev]');
  const botaoNext = elPlayer.querySelector('[data-preview-next]');
  const progresso = elPlayer.querySelector('.preview-player__progresso');
  const legenda = elPlayer.querySelector('.preview-player__legenda');

  let indiceAtual = 0;
  const multiple = previewUrls.length > 1;

  function obterUrlAtual() {
    return previewUrls[indiceAtual];
  }

  function atualizarNavegacao() {
    if (!botaoPrev || !botaoNext) return;
    if (!multiple) {
      botaoPrev.disabled = true;
      botaoNext.disabled = true;
      return;
    }
    botaoPrev.disabled = indiceAtual === 0;
    botaoNext.disabled = indiceAtual === previewUrls.length - 1;
  }

  function atualizarLegenda() {
    if (!legenda) return;
    legenda.textContent = multiple
      ? `Preview ${indiceAtual + 1} de ${previewUrls.length}`
      : 'Preview de 15s';
  }

  function atualizar() {
    const estado = previewService.obterEstadoDe(estilo.id);
    elPlayer.classList.toggle('is-tocando', estado === ESTADOS_PREVIEW.TOCANDO);
    elPlayer.classList.toggle('is-carregando', estado === ESTADOS_PREVIEW.CARREGANDO);
    botao.innerHTML = estado === ESTADOS_PREVIEW.TOCANDO ? svgPause() : svgPlay();
    botao.setAttribute('aria-label', `${estado === ESTADOS_PREVIEW.TOCANDO ? 'Pausar' : 'Tocar'} preview de ${estilo.nome}`);
    progresso.style.width = `${Math.round(previewService.obterProgressoDe(estilo.id) * 100)}%`;
    legenda.textContent =
      estado === ESTADOS_PREVIEW.CARREGANDO ? 'Carregando...' :
      estado === ESTADOS_PREVIEW.ERRO ? 'Não foi possível reproduzir' :
      (multiple ? `Preview ${indiceAtual + 1} de ${previewUrls.length}` : 'Preview de 15s');
    atualizarNavegacao();
  }

  botao.addEventListener('click', () => {
    const estadoAtual = previewService.obterEstadoDe(estilo.id);
    if (estadoAtual === ESTADOS_PREVIEW.TOCANDO) {
      previewService.pausar();
    } else {
      previewService.reproduzir(estilo.id, obterUrlAtual());
    }
  });

  if (botaoPrev) {
    botaoPrev.addEventListener('click', () => {
      if (indiceAtual === 0) return;
      indiceAtual -= 1;
      atualizarLegenda();
      atualizarNavegacao();
      if (previewService.idAtivo() === estilo.id) {
        previewService.reproduzir(estilo.id, obterUrlAtual());
      }
    });
  }

  if (botaoNext) {
    botaoNext.addEventListener('click', () => {
      if (indiceAtual === previewUrls.length - 1) return;
      indiceAtual += 1;
      atualizarLegenda();
      atualizarNavegacao();
      if (previewService.idAtivo() === estilo.id) {
        previewService.reproduzir(estilo.id, obterUrlAtual());
      }
    });
  }

  const desligar = previewService.aoMudar(atualizar);
  atualizar();
  return desligar;
}

function svgPlay() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z"/></svg>';
}
function svgPause() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
}
function svgPrev() {
  return '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>';
}
function svgNext() {
  return '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 6l-1.41 1.41L12.17 12l-4.58 4.59L9 18l6-6z"/></svg>';
}
