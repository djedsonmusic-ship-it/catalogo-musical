/**
 * Persistência local com fallback gracioso (RF-08, e princípio de
 * engenharia registrado na seção 17 do documento de arquitetura):
 * tenta localStorage; se indisponível/bloqueado (ex.: WebView
 * restrito), cai para memória — a sessão atual continua funcionando,
 * apenas sem persistir entre sessões.
 */

const CHAVE = 'catalogo-musical:selecao:v1';
let memoriaFallback = null;
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

export function salvarSelecao(listaIds) {
  const serializado = JSON.stringify(listaIds);
  if (testarLocalStorage()) {
    try {
      window.localStorage.setItem(CHAVE, serializado);
      return;
    } catch (erro) {
      // cai para memória abaixo
    }
  }
  memoriaFallback = serializado;
}

export function carregarSelecao() {
  let bruto = null;
  if (testarLocalStorage()) {
    try {
      bruto = window.localStorage.getItem(CHAVE);
    } catch (erro) {
      bruto = memoriaFallback;
    }
  } else {
    bruto = memoriaFallback;
  }
  if (!bruto) return [];
  try {
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) ? lista : [];
  } catch (erro) {
    return [];
  }
}
