/**
 * PreviewService (Sprint 08) — infraestrutura de preview de áudio.
 *
 * Decisões de arquitetura (ver docs/ARQUITETURA-PREVIEW.md para o
 * detalhamento completo):
 *
 *  - UM ÚNICO elemento <audio> é criado e reutilizado para todos os
 *    previews do app (nunca `new Audio()` por card) — é isso que
 *    garante, por construção, que só um preview toca por vez e que
 *    memória/conexões não crescem com milhares de estilos.
 *  - `src` só é atribuído quando `reproduzir(id, url)` é chamado pela
 *    primeira vez para aquele preview — nenhum áudio é baixado ao
 *    montar a tela ou ao renderizar um card (lazy loading real, não
 *    apenas "preparado").
 *  - Trocar de preview interrompe o anterior automaticamente, pois
 *    ambos compartilham o mesmo elemento `<audio>`.
 *  - Sem streaming, sem cache próprio, sem biblioteca externa: usa
 *    só a API nativa `HTMLAudioElement` do navegador.
 *
 * Padrão de estado: mesmo estilo do `selectionState.js` (estado +
 * `aoMudar(callback)`), para manter consistência com o resto do app.
 */

export const ESTADOS_PREVIEW = Object.freeze({
  INATIVO: 'inativo',
  CARREGANDO: 'carregando',
  TOCANDO: 'tocando',
  PAUSADO: 'pausado',
  ERRO: 'erro'
});

class PreviewService {
  constructor() {
    this._audio = null; // criado sob demanda (lazy) — não no construtor
    this._idAtivo = null;
    this._urlAtivo = null;
    this._estado = ESTADOS_PREVIEW.INATIVO;
    this._progresso = 0; // 0..1
    this._ouvintes = new Set();
  }

  _obterAudio() {
    if (this._audio) return this._audio;
    const audio = new Audio();
    audio.preload = 'none'; // nada é buscado antes do primeiro play
    audio.addEventListener('timeupdate', () => {
      this._progresso = audio.duration ? audio.currentTime / audio.duration : 0;
      this._notificar();
    });
    audio.addEventListener('ended', () => {
      this._estado = ESTADOS_PREVIEW.INATIVO;
      this._progresso = 0;
      this._notificar();
    });
    audio.addEventListener('waiting', () => {
      this._estado = ESTADOS_PREVIEW.CARREGANDO;
      this._notificar();
    });
    audio.addEventListener('playing', () => {
      this._estado = ESTADOS_PREVIEW.TOCANDO;
      this._notificar();
    });
    audio.addEventListener('error', () => {
      this._estado = ESTADOS_PREVIEW.ERRO;
      this._notificar();
    });
    this._audio = audio;
    return audio;
  }

  /** Inicia (ou retoma) o preview de `id`. Interrompe qualquer outro automaticamente. */
  async reproduzir(id, url) {
    if (!url) return; // sem previewUrl — nada a fazer (não implementamos fallback nesta sprint)
    const audio = this._obterAudio();

    const mesmoPreview = this._idAtivo === id && this._urlAtivo === url;
    if (mesmoPreview && this._estado === ESTADOS_PREVIEW.PAUSADO) {
      // Retomar o mesmo preview, sem recarregar
      this._estado = ESTADOS_PREVIEW.CARREGANDO;
      this._notificar();
      await audio.play().catch(() => this._marcarErro());
      return;
    }

    // Troca de preview ou nova reprodução: o mesmo <audio> é reaproveitado.
    this._idAtivo = id;
    this._urlAtivo = url;
    this._progresso = 0;
    this._estado = ESTADOS_PREVIEW.CARREGANDO;
    this._notificar();

    audio.src = url; // download só começa agora (lazy loading)
    try {
      await audio.play();
    } catch (erro) {
      this._marcarErro();
    }
  }

  pausar() {
    if (!this._audio || this._estado !== ESTADOS_PREVIEW.TOCANDO) return;
    this._audio.pause();
    this._estado = ESTADOS_PREVIEW.PAUSADO;
    this._notificar();
  }

  parar() {
    if (this._audio) {
      this._audio.pause();
      this._audio.removeAttribute('src');
      this._audio.load();
    }
    this._idAtivo = null;
    this._urlAtivo = null;
    this._progresso = 0;
    this._estado = ESTADOS_PREVIEW.INATIVO;
    this._notificar();
  }

  _marcarErro() {
    this._estado = ESTADOS_PREVIEW.ERRO;
    this._notificar();
  }

  obterEstadoDe(id) {
    return this._idAtivo === id ? this._estado : ESTADOS_PREVIEW.INATIVO;
  }

  obterProgressoDe(id) {
    return this._idAtivo === id ? this._progresso : 0;
  }

  idAtivo() {
    return this._idAtivo;
  }

  aoMudar(callback) {
    this._ouvintes.add(callback);
    return () => this._ouvintes.delete(callback);
  }

  _notificar() {
    this._ouvintes.forEach(callback => callback());
  }
}

export const previewService = new PreviewService();
