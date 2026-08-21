/**
 * Módulo de Discografias Completas — carrega a lista de discografias
 * que o PROPRIETÁRIO cadastra em `dados/discografias.json`, sem
 * precisar mexer no HTML/JS da Home. Segue o mesmo padrão de
 * fallback gracioso de `configService.js`/`contatoService.js`: se o
 * arquivo não existir, vier vazio ou malformado, a Home
 * simplesmente não mostra a seção — nunca quebra a tela nem inventa
 * discografias fictícias.
 */

let discografiasCache = null;

export async function carregarDiscografias() {
  if (discografiasCache) return discografiasCache;
  try {
    const resposta = await fetch('./dados/discografias.json');
    if (!resposta.ok) throw new Error('discografias.json não encontrado');
    const dados = await resposta.json();
    discografiasCache = Array.isArray(dados.discografias) ? dados.discografias : [];
  } catch (erro) {
    discografiasCache = [];
  }
  return discografiasCache;
}

/**
 * Filtra apenas discografias ativas e ordena por `ordemExibicao`
 * (com título como desempate estável) — mesmo critério usado em
 * `catalogService.js` para estilos.
 */
export function listarDiscografias(discografias) {
  return discografias
    .filter(item => item.status !== 'inativo')
    .slice()
    .sort((a, b) => {
      const diferenca = (a.ordemExibicao ?? 0) - (b.ordemExibicao ?? 0);
      if (diferenca !== 0) return diferenca;
      return (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR');
    });
}
