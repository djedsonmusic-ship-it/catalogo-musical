import {
  salvarSelecao, carregarSelecao,
  salvarSelecaoDiscografias, carregarSelecaoDiscografias,
  salvarFormaRecebimentoPreferida, carregarFormaRecebimentoPreferida,
  salvarSolicitacoesPersonalizadas, carregarSolicitacoesPersonalizadas
} from './storage.js';

/**
 * Módulo de Seleção (carrinho) — estado isolado da seleção do
 * cliente. Não conhece telas; apenas expõe estado + eventos, para
 * que a camada de apresentação reaja (padrão observer simples).
 */
class SelectionState {
  constructor(carregar, salvar) {
    this._carregar = carregar;
    this._salvar = salvar;
    this._idsSelecionados = new Set(carregar());
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
    this._salvar(this.listarIds());
    this._ouvintes.forEach(callback => callback());
  }
}

export const selectionState = new SelectionState(carregarSelecao, salvarSelecao);

/**
 * Sprint 21 (ajuste A): estado de seleção para Discografias Completas
 * — mesma classe/API do carrinho de estilos, em armazenamento próprio.
 * Quando o cliente clica "Adicionar" numa discografia ENCONTRADA no
 * catálogo, ela entra aqui (sem abrir WhatsApp). O WhatsApp continua
 * reservado só para o fluxo de "não encontrei/pedido personalizado".
 */
export const discografiaSelectionState = new SelectionState(carregarSelecaoDiscografias, salvarSelecaoDiscografias);

/**
 * Sprint 21 (ajuste C): guarda a forma de recebimento escolhida pelo
 * atalho no Hero da Home, para pré-selecionar (e permitir trocar) na
 * tela de Finalizar Pedido.
 */
export const formaRecebimentoPreferida = {
  obter: carregarFormaRecebimentoPreferida,
  definir: salvarFormaRecebimentoPreferida
};

/**
 * Sprint 22 (ajuste 4): registro de solicitações de discografia
 * personalizada (artista pesquisado e não encontrado). Mesmo padrão
 * observer das seleções acima — cada solicitação some do texto do
 * pedido só quando o carrinho inteiro é esvaziado (`limparTudo`).
 */
class SolicitacoesPersonalizadasState {
  constructor() {
    this._lista = carregarSolicitacoesPersonalizadas();
    this._ouvintes = new Set();
  }
  listar() { return [...this._lista]; }
  adicionar(nome) {
    const nomeLimpo = (nome || '').trim();
    if (!nomeLimpo || this._lista.includes(nomeLimpo)) return;
    this._lista.push(nomeLimpo);
    this._persistirENotificar();
  }
  remover(nome) {
    this._lista = this._lista.filter(n => n !== nome);
    this._persistirENotificar();
  }
  limparTudo() {
    this._lista = [];
    this._persistirENotificar();
  }
  aoMudar(callback) {
    this._ouvintes.add(callback);
    return () => this._ouvintes.delete(callback);
  }
  _persistirENotificar() {
    salvarSolicitacoesPersonalizadas(this._lista);
    this._ouvintes.forEach(callback => callback());
  }
}

export const solicitacoesPersonalizadasState = new SolicitacoesPersonalizadasState();
