/**
 * Modulo de Catalogo (cliente) — acesso somente-leitura aos dados.
 *
 * Sprint 04 (Estrutura de Dados): modelo normalizado em 3 niveis —
 * Categoria > Subcategoria > Estilo — pensado para crescer a
 * milhares de registros sem reescrever a camada de acesso:
 *
 *  - dados/manifesto.json    → Categorias + Subcategorias (leve,
 *                              carregado sempre, muda pouco).
 *  - dados/estilos/<categoriaId>.json → um modulo por categoria,
 *                              contendo os Estilos daquela categoria
 *                              (a parte que cresce para milhares).
 *
 * "Carregamento por modulos": cada categoria e buscada em uma
 * requisicao propria (Promise.all abaixo), em vez de um unico
 * arquivo gigante. Isso e o que esta sprint pede para IMPLEMENTAR.
 * Isso já deixa o caminho pronto para, no futuro, buscar só o módulo
 * da categoria que o usuário abrir (lazy loading) — mas essa busca
 * sob demanda em si NÃO é implementada nesta sprint, apenas a
 * estrutura que a viabiliza sem retrabalho.
 */

let catalogoCache = null;

export async function carregarCatalogo() {
  if (catalogoCache) return catalogoCache;

  const manifesto = await buscarJson('./dados/manifesto.json');

  const modulos = await Promise.all(
    manifesto.categorias.map(categoria =>
      buscarJson(`./dados/estilos/${categoria.id}.json`)
        .then(modulo => modulo.estilos || [])
        .catch(() => []) // categoria sem módulo de estilos ainda: não quebra o catálogo
    )
  );

  catalogoCache = {
    categorias: manifesto.categorias,
    subcategorias: manifesto.subcategorias,
    estilos: modulos.flat()
  };
  return catalogoCache;
}

async function buscarJson(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar ${caminho}.`);
  }
  return resposta.json();
}

/**
 * Lista os estilos já enriquecidos com os dados de exibição da sua
 * categoria e subcategoria (evita repetir esse join em cada tela).
 * Por padrão devolve apenas status "ativo" — o campo `status` existe
 * justamente para permitir ocultar um estilo sem apagar o registro
 * (ex.: fora de catálogo temporariamente), preparado para uma futura
 * tela administrativa (fora de escopo desta sprint).
 */
export function listarEstilos(catalogo, { incluirInativos = false } = {}) {
  const categoriasPorId = new Map(catalogo.categorias.map(c => [c.id, c]));
  const subcategoriasPorId = new Map(catalogo.subcategorias.map(s => [s.id, s]));

  return catalogo.estilos
    .filter(estilo => incluirInativos || estilo.status === 'ativo')
    .map(estilo => {
      const categoria = categoriasPorId.get(estilo.categoriaId);
      const subcategoria = subcategoriasPorId.get(estilo.subcategoriaId);
      return {
        ...estilo,
        categoriaNome: categoria ? categoria.nome : '',
        categoriaIcone: categoria ? categoria.icone : 'padrao',
        categoriaCor: categoria ? categoria.cor : '#8A8A94',
        subcategoriaNome: subcategoria ? subcategoria.nome : ''
      };
    })
    .sort(ordenarPorExibicao);
}

export function buscarEstiloPorId(catalogo, id) {
  return listarEstilos(catalogo, { incluirInativos: true }).find(e => e.id === id) || null;
}

export function listarCategorias(catalogo) {
  return catalogo.categorias
    .filter(c => c.status === 'ativo')
    .slice()
    .sort(ordenarPorExibicao)
    .map(c => ({ id: c.id, nome: c.nome, icone: c.icone, cor: c.cor }));
}

export function listarSubcategorias(catalogo, categoriaId) {
  return catalogo.subcategorias
    .filter(s => s.categoriaId === categoriaId && s.status === 'ativo')
    .slice()
    .sort(ordenarPorExibicao);
}

/**
 * Utilitário de ordenação por `ordemExibicao` (com nome como
 * desempate estável) — usado internamente e exportado para que
 * futuras telas (ordenação escolhida pelo usuário, paginação) já
 * encontrem uma função pronta em vez de reimplementar a regra.
 */
export function ordenarPorExibicao(a, b) {
  const diferenca = (a.ordemExibicao ?? 0) - (b.ordemExibicao ?? 0);
  if (diferenca !== 0) return diferenca;
  return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
}

/**
 * Extrai a lista única de tags presentes nos estilos — preparado
 * para uma futura tela de filtro por tags (RF ainda não definido);
 * não é chamada por nenhuma tela nesta sprint.
 */
export function listarTagsDisponiveis(estilos) {
  const tags = new Set();
  estilos.forEach(estilo => (estilo.tags || []).forEach(tag => tags.add(tag)));
  return Array.from(tags).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
