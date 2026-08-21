/**
 * Persistência local com fallback gracioso (RF-08, e princípio de
 * engenharia registrado na seção 17 do documento de arquitetura):
 * tenta localStorage; se indisponível/bloqueado (ex.: WebView
 * restrito), cai para memória — a sessão atual continua funcionando,
 * apenas sem persistir entre sessões.
 */

const CHAVE = 'catalogo-musical:selecao:v1';
const CHAVE_DISCOGRAFIAS = 'catalogo-musical:selecao-discografias:v1';
const CHAVE_FORMA_RECEBIMENTO = 'catalogo-musical:forma-recebimento:v1';
const CHAVE_SOLICITACOES_PERSONALIZADAS = 'catalogo-musical:solicitacoes-personalizadas:v1';
const memoriaFallbackPorChave = new Map();
let localStorageDisponivel = null;

function testarLocalStorage() {
  if (localStorageDisponivel !== null) return localStorageDisponivel;
  try {
    const chaveTeste = '__teste__';
    window.localStorage.setItem(chaveTeste, '1');
    window.localStorage.removeItem(chaveTeste);
    localStorageDisponivel = true;
  } catch (erro) {
    localStorageDisponivel = false;
  }
  return localStorageDisponivel;
}

function salvarBruto(chave, serializado) {
  if (testarLocalStorage()) {
    try {
      window.localStorage.setItem(chave, serializado);
      return;
    } catch (erro) {
      // cai para memória abaixo
    }
  }
  memoriaFallbackPorChave.set(chave, serializado);
}

function carregarBruto(chave) {
  if (testarLocalStorage()) {
    try {
      return window.localStorage.getItem(chave);
    } catch (erro) {
      return memoriaFallbackPorChave.get(chave) || null;
    }
  }
  return memoriaFallbackPorChave.get(chave) || null;
}

export function salvarSelecao(listaIds) {
  salvarBruto(CHAVE, JSON.stringify(listaIds));
}

export function carregarSelecao() {
  const bruto = carregarBruto(CHAVE);
  if (!bruto) return [];
  try {
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) ? lista : [];
  } catch (erro) {
    return [];
  }
}

/** Sprint 21 (ajuste A): seleção de discografias completas — mesmo
 * padrão de persistência da seleção de estilos, em chave própria
 * para não colidir ids de estilo com ids de discografia. */
export function salvarSelecaoDiscografias(listaIds) {
  salvarBruto(CHAVE_DISCOGRAFIAS, JSON.stringify(listaIds));
}

export function carregarSelecaoDiscografias() {
  const bruto = carregarBruto(CHAVE_DISCOGRAFIAS);
  if (!bruto) return [];
  try {
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) ? lista : [];
  } catch (erro) {
    return [];
  }
}

/** Sprint 21 (ajuste C): forma de recebimento escolhida no atalho da
 * Home — guardada à parte para pré-selecionar (e poder ser trocada)
 * na etapa de Finalizar Pedido. */
export function salvarFormaRecebimentoPreferida(valor) {
  salvarBruto(CHAVE_FORMA_RECEBIMENTO, valor || '');
}

export function carregarFormaRecebimentoPreferida() {
  return carregarBruto(CHAVE_FORMA_RECEBIMENTO) || '';
}

/** Sprint 22 (ajuste 4): pedidos de "discografia personalizada" (artista
 * não encontrado no catálogo) — nomes solicitados ficam registrados junto
 * com a seleção, e não só na conversa do WhatsApp. */
export function salvarSolicitacoesPersonalizadas(lista) {
  salvarBruto(CHAVE_SOLICITACOES_PERSONALIZADAS, JSON.stringify(lista));
}

export function carregarSolicitacoesPersonalizadas() {
  const bruto = carregarBruto(CHAVE_SOLICITACOES_PERSONALIZADAS);
  if (!bruto) return [];
  try {
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) ? lista : [];
  } catch (erro) {
    return [];
  }
}
