import { normalizarTexto, distanciaLevenshtein } from './normalizeText.js';

/**
 * Motor de Busca e Filtros (Sprint 05).
 *
 * Pensado para milhares de registros:
 *  - `construirIndiceBusca` normaliza cada estilo UMA VEZ (ao montar a
 *    tela), não a cada tecla digitada — evita reprocessar acentuação/
 *    caixa em cada keystroke (item "PERFORMANCE" do briefing).
 *  - Os filtros (`filtrarPor*`) são funções puras, independentes e
 *    combináveis — `aplicarFiltros` só executa os que forem
 *    informados, na ordem mais seletiva primeiro (categoria/tags
 *    antes de texto), para reduzir o array o quanto antes.
 *  - `buscarEFiltrar` é o único ponto de entrada usado pela tela:
 *    aplica filtros + busca textual + escolhe a ordenação (alfabética
 *    sem termo, relevância com termo) em uma única passada.
 */

// ---------------------------------------------------------------
// Índice de busca — normalização feita uma única vez por catálogo
// ---------------------------------------------------------------
export function construirIndiceBusca(estilos) {
  return estilos.map(estilo => ({
    estilo,
    nomeNormalizado: normalizarTexto(estilo.nome),
    categoriaNormalizada: normalizarTexto(estilo.categoriaNome),
    subcategoriaNormalizada: normalizarTexto(estilo.subcategoriaNome),
    tagsNormalizadas: (estilo.tags || []).map(normalizarTexto)
  }));
}

// ---------------------------------------------------------------
// Filtros independentes e combináveis (por categoria/subcategoria/
// tags/status/faixas já preparados; nem todos têm controle na UI
// ainda — ver docs/NOTAS-SPRINT.md, Sprint 05)
// ---------------------------------------------------------------
export function filtrarPorCategoria(itens, categoriaId) {
  return categoriaId ? itens.filter(i => i.estilo.categoriaId === categoriaId) : itens;
}

export function filtrarPorSubcategoria(itens, subcategoriaId) {
  return subcategoriaId ? itens.filter(i => i.estilo.subcategoriaId === subcategoriaId) : itens;
}

export function filtrarPorTags(itens, tags) {
  if (!tags || tags.length === 0) return itens;
  const tagsNormalizadas = tags.map(normalizarTexto);
  return itens.filter(i => tagsNormalizadas.every(tag => i.tagsNormalizadas.includes(tag)));
}

export function filtrarPorStatus(itens, status) {
  return status ? itens.filter(i => i.estilo.status === status) : itens;
}

export function filtrarPorFaixaQuantidade(itens, min, max) {
  if (min == null && max == null) return itens;
  return itens.filter(i => {
    const q = i.estilo.quantidadeMusicasEstimada || 0;
    return (min == null || q >= min) && (max == null || q <= max);
  });
}

export function filtrarPorFaixaPreco(itens, minCentavos, maxCentavos) {
  if (minCentavos == null && maxCentavos == null) return itens;
  return itens.filter(i => {
    const v = i.estilo.valorEstimadoCentavos || 0;
    return (minCentavos == null || v >= minCentavos) && (maxCentavos == null || v <= maxCentavos);
  });
}

/** Aplica somente os critérios informados, na ordem mais seletiva primeiro. */
export function aplicarFiltros(itens, criterios = {}) {
  let resultado = itens;
  resultado = filtrarPorCategoria(resultado, criterios.categoriaId);
  resultado = filtrarPorSubcategoria(resultado, criterios.subcategoriaId);
  resultado = filtrarPorTags(resultado, criterios.tags);
  resultado = filtrarPorStatus(resultado, criterios.status);
  resultado = filtrarPorFaixaQuantidade(resultado, criterios.quantidadeMin, criterios.quantidadeMax);
  resultado = filtrarPorFaixaPreco(resultado, criterios.precoMinCentavos, criterios.precoMaxCentavos);
  return resultado;
}

// ---------------------------------------------------------------
// Busca textual com pontuação de relevância
// (nome exato > nome começa com > nome contém > tag exata >
//  subcategoria > categoria > tag parcial > correspondência difusa)
// ---------------------------------------------------------------
function pontuarItem(item, termoNormalizado) {
  if (item.nomeNormalizado === termoNormalizado) return 100;
  if (item.nomeNormalizado.startsWith(termoNormalizado)) return 80;
  if (item.nomeNormalizado.includes(termoNormalizado)) return 60;
  if (item.tagsNormalizadas.includes(termoNormalizado)) return 50;
  if (item.subcategoriaNormalizada.includes(termoNormalizado)) return 40;
  if (item.categoriaNormalizada.includes(termoNormalizado)) return 30;
  if (item.tagsNormalizadas.some(tag => tag.includes(termoNormalizado))) return 25;
  const palavras = item.nomeNormalizado.split(' ');
  if (palavras.some(palavra => distanciaLevenshtein(palavra, termoNormalizado, 2) <= 2)) return 10;
  return 0;
}

export function ordenarAlfabeticamente(itens) {
  return [...itens].sort((a, b) => a.estilo.nome.localeCompare(b.estilo.nome, 'pt-BR'));
}

/**
 * Ponto de entrada único da tela de Explorar/Busca: recebe o índice
 * pré-computado (montado uma vez) e os critérios atuais, devolve os
 * estilos já filtrados e ordenados — sem nome fixo do modo de
 * ordenação: alfabética quando não há termo de busca, relevância
 * quando há (RF "Ordenação alfabética" + "Ordenação por relevância").
 */
export function buscarEFiltrar(indice, criterios = {}) {
  const candidatos = aplicarFiltros(indice, criterios);
  const termoNormalizado = normalizarTexto(criterios.termo);

  if (!termoNormalizado) {
    return { resultados: ordenarAlfabeticamente(candidatos).map(i => i.estilo), modoOrdenacao: 'alfabetica' };
  }

  const pontuados = candidatos
    .map(item => ({ item, pontuacao: pontuarItem(item, termoNormalizado) }))
    .filter(r => r.pontuacao > 0)
    .sort((a, b) => b.pontuacao - a.pontuacao || a.item.nomeNormalizado.localeCompare(b.item.nomeNormalizado, 'pt-BR'));

  return { resultados: pontuados.map(r => r.item.estilo), modoOrdenacao: 'relevancia' };
}
