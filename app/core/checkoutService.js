/**
 * Módulo de Finalização.
 *
 * Sprint 14 (modelo de negócio sem preço): removida toda referência
 * a valor/estimativa do resumo do pedido — o proprietário faz o
 * orçamento diretamente com o cliente depois de receber o pedido.
 * `core/estimateService.js` continua existindo intocado, pronto para
 * um módulo de precificação futuro; só deixou de ser usado aqui.
 *
 * Estrutura de canais preparada desde a Sprint 07: qualquer canal
 * futuro (ex.: WhatsApp automático) é um novo `case` em
 * `finalizarPedido` — nenhuma tela precisa mudar.
 */

export const CANAIS = {
  SIMULADO: 'simulado'
};

export const FORMAS_ENTREGA = Object.freeze({
  LEVAR: 'Vou levar meu pendrive',
  COMPRAR: 'Quero comprar um pendrive',
  LINK: 'Quero receber por link (Google Drive, OneDrive ou outro serviço)'
});

function formatarDataAtual() {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Gera o texto do pedido — sem nenhuma menção a preço/valor.
 * Sprint 21 (ajuste A): `discografiasSelecionadas` (opcional) entra
 * como uma seção própria no resumo, sem afetar a contagem/lista de
 * estilos já existente.
 * Sprint 22 (ajuste 4): `solicitacoesPersonalizadas` (opcional) — nomes
 * de artistas pedidos sob encomenda — também entram no resumo, para
 * não existirem só dentro da conversa do WhatsApp. */
export function montarResumoTextual({ protocolo, dataFormatada, formaEntrega, selecionados, observacoes, discografiasSelecionadas = [], solicitacoesPersonalizadas = [] }) {
  const linhas = selecionados.map(e => `• ${e.nome} (${e.categoriaNome})`);
  const linhasDiscografias = discografiasSelecionadas.map(d => `• ${d.titulo}${d.subtitulo ? ` (${d.subtitulo})` : ''}`);
  const linhasSolicitacoes = solicitacoesPersonalizadas.map(nome => `• Solicitação de discografia personalizada: ${nome}`);
  return [
    'Pedido — Catálogo Musical',
    '',
    `Código do pedido: ${protocolo}`,
    `Data: ${dataFormatada}`,
    `Forma de entrega: ${formaEntrega}`,
    '',
    `Estilos selecionados (${selecionados.length}):`,
    ...linhas,
    ...(discografiasSelecionadas.length > 0 ? ['', `Discografias completas (${discografiasSelecionadas.length}):`, ...linhasDiscografias] : []),
    ...(solicitacoesPersonalizadas.length > 0 ? ['', `Discografias personalizadas solicitadas (${solicitacoesPersonalizadas.length}):`, ...linhasSolicitacoes] : []),
    ...(observacoes ? ['', `Observações: ${observacoes}`] : [])
  ].join('\n');
}

/**
 * Ponto único de finalização. `dados` deve conter `selecionados`
 * (array de estilos), `formaEntrega` (uma das `FORMAS_ENTREGA`) e,
 * opcionalmente, `observacoes` (string).
 */
export function finalizarPedido(canal, dados) {
  const protocolo = `CM-${Date.now().toString(36).toUpperCase()}`;
  const dataFormatada = formatarDataAtual();
  const resumoTextual = montarResumoTextual({ protocolo, dataFormatada, ...dados });

  if (canal === CANAIS.SIMULADO) {
    return { sucesso: true, protocolo, dataFormatada, resumoTextual };
  }

  throw new Error(`Canal de finalização "${canal}" ainda não está disponível nesta versão.`);
}
