/**
 * Módulo de Configurações (Admin) — carrega ajustes que o
 * PROPRIETÁRIO controla em `dados/configuracoes.json`, sem precisar
 * mexer no código-fonte das telas. Sprint 15.
 */

let configCache = null;

export async function carregarConfiguracoes() {
  if (configCache) return configCache;
  try {
    const resposta = await fetch('./dados/configuracoes.json');
    if (!resposta.ok) throw new Error('configuracoes.json não encontrado');
    const dados = await resposta.json();
    configCache = {
      destaquesHome: Array.isArray(dados.destaquesHome) ? dados.destaquesHome : []
    };
  } catch (erro) {
    // Sem configuração ainda: cada tela decide seu próprio fallback.
    configCache = { destaquesHome: [] };
  }
  return configCache;
}

/**
 * Resolve a lista de IDs configurada em estilos reais, preservando a
 * ordem do config. IDs inexistentes são ignorados silenciosamente.
 * Se a lista resultante vier vazia, quem chamou decide o fallback.
 */
export function resolverDestaques(estilos, idsConfigurados) {
  const porId = new Map(estilos.map(e => [e.id, e]));
  return idsConfigurados
    .map(id => porId.get(id))
    .filter(Boolean);
}
