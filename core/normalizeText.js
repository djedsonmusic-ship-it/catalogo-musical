/**
 * Reaproveita o padrão da v1 (normalizeText.js): normalização de
 * texto para busca — remove acentuação, caixa e espaços redundantes.
 */
export function normalizarTexto(texto) {
  return (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Escapa HTML — usado antes de reinserir texto do usuário/dados no DOM via innerHTML. */
export function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto == null ? '' : String(texto);
  return div.innerHTML;
}

/**
 * Envolve em <mark> o trecho de `textoOriginal` que corresponde a
 * `termoBusca` (comparação tolerante a acentos/caixa via
 * normalizarTexto). Sempre escapa o restante do texto. Usado para
 * dar a sensação de busca instantânea (RF-02 + Sprint 03, item "BUSCA").
 */
export function destacarTrecho(textoOriginal, termoBusca) {
  const termoNormalizado = normalizarTexto(termoBusca);
  if (!termoNormalizado) return escaparHtml(textoOriginal);

  const textoNormalizado = normalizarTexto(textoOriginal);
  const indice = textoNormalizado.indexOf(termoNormalizado);
  if (indice === -1) return escaparHtml(textoOriginal);

  const antes = textoOriginal.slice(0, indice);
  const meio = textoOriginal.slice(indice, indice + termoNormalizado.length);
  const depois = textoOriginal.slice(indice + termoNormalizado.length);
  return `${escaparHtml(antes)}<mark>${escaparHtml(meio)}</mark>${escaparHtml(depois)}`;
}
export function distanciaLevenshtein(a, b, limite = 2) {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  const linhaAnterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let linhaAtual = [i];
    let melhorDaLinha = i;
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      const valor = Math.min(
        linhaAnterior[j] + 1,
        linhaAtual[j - 1] + 1,
        linhaAnterior[j - 1] + custo
      );
      linhaAtual.push(valor);
      melhorDaLinha = Math.min(melhorDaLinha, valor);
    }
    if (melhorDaLinha > limite) return limite + 1;
    linhaAnterior.splice(0, linhaAnterior.length, ...linhaAtual);
  }
  return linhaAnterior[b.length];
}
