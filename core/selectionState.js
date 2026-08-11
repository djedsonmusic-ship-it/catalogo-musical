import { salvarSelecao, carregarSelecao } from './storage.js';

/**
 * Módulo de Seleção (carrinho) — estado isolado da seleção do
 * cliente. Não conhece telas; apenas expõe estado + eventos, para
 * que a camada de apresentação reaja (padrão observer simples).
 */
class SelectionState {
  constructor() {
    this._idsSelecionados = new Set(carregarSelecao());
    this._ouvintes = new Set();
  }

  estaSelecionado(id) {
    return this._idsSelecionados.has(id);
  }

  alternar(id) {
    if (this._idsSelecionados.has(id)) {
      this._idsSelecionados.delete(id);
    } else {
      this._idsSelecionados.add(id);
    }
    this._persistirENotificar();
  }

  remover(id) {
    this._idsSelecionados.delete(id);
    this._persistirENotificar();
  }

  limparTudo() {
    this._idsSelecionados.clear();
    this._persistirENotificar();
  }

  listarIds() {
    return Array.from(this._idsSelecionados);
  }

  quantidade() {
    return this._idsSelecionados.size;
  }

  aoMudar(callback) {
    this._ouvintes.add(callback);
    return () => this._ouvintes.delete(callback);
  }

  _persistirENotificar() {
    salvarSelecao(this.listarIds());
    this._ouvintes.forEach(callback => callback());
  }
}

export const selectionState = new SelectionState();
