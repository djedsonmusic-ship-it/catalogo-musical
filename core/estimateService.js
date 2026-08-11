/**
 * Motor de estimativa — recebe os estilos selecionados e devolve os
 * três indicadores (quantidade de músicas, espaço, investimento).
 *
 * ATENÇÃO: nesta sprint o "sistema de preços definitivo" está fora
 * de escopo (ver instruções da sprint). Os valores de
 * valorEstimadoCentavos vêm dos módulos de exemplo em dados/estilos/
 * e são somados de forma simples (soma linear por estilo), apenas
 * para que a tela de Resumo do Pedido tenha algo real para exibir e
 * evoluir. A regra de negócio definitiva será implementada pelo
 * Módulo de Precificação (seção 20, item 2) e pelo Módulo de
 * Estimativa de Volume (item 3), substituindo esta função sem exigir
 * mudança nas telas — nenhum outro arquivo além deste deve ser
 * alterado quando isso acontecer.
 */
export function estimarSelecao(estilosSelecionados) {
  const totalMusicas = estilosSelecionados.reduce((soma, e) => soma + (e.quantidadeMusicasEstimada || 0), 0);
  const totalMb = estilosSelecionados.reduce((soma, e) => soma + (e.espacoEstimadoMb || 0), 0);
  const totalCentavos = estilosSelecionados.reduce((soma, e) => soma + (e.valorEstimadoCentavos || 0), 0);

  return {
    totalMusicas,
    espacoTexto: formatarEspaco(totalMb),
    investimentoTexto: formatarMoeda(totalCentavos),
    isEstimativaDeExemplo: true
  };
}

function formatarEspaco(totalMb) {
  if (totalMb >= 1024) return `${(totalMb / 1024).toFixed(1)} GB`;
  return `${totalMb} MB`;
}

function formatarMoeda(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
