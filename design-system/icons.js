/**
 * Módulo de Design System — biblioteca de ícones SVG inline.
 * Reaproveita o padrão da v1 (iconLibrary.js): sem dependência de
 * fontes de ícone externas, para carregamento rápido (RNF-01) e
 * funcionamento offline de assets (RNF-05, WebViews restritos).
 */

const ICONS = {
  guitarra: '<path d="M9 3l6 6M4 20l3-3m0 0a3 3 0 104-4 3 3 0 00-4 4zm7-7l4-4"/>',
  onda: '<path d="M2 12c1.5-4 3-4 4.5 0s3 4 4.5 0 3-4 4.5 0 3 4 4.5 0"/>',
  violao: '<circle cx="9" cy="15" r="5"/><path d="M12 11L19 4"/>',
  microfone: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
  pandeiro: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  globo: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 3 2.5 13 0 16M12 4c-2.5 3-2.5 13 0 16"/>',
  busca: '<circle cx="10" cy="10" r="6"/><path d="M20 20l-5.5-5.5"/>',
  fechar: '<path d="M5 5l14 14M19 5L5 19"/>',
  carrinho: '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2 3h2l2.4 12.2A2 2 0 008.35 17H17a2 2 0 002-1.6L21 6H6"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  lixo: '<path d="M4 6h16M9 6V4h6v2m-9 0l1 14h10l1-14"/>',
  copiar: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>',
  telefone: '<path d="M5 4h3l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v3a2 2 0 01-2 2A16 16 0 015 6a2 2 0 012-2z"/>',
  enviar: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  whatsapp: '<path d="M21 11.5a8.5 8.5 0 01-12.4 7.55L3 20l1.05-5.4A8.5 8.5 0 1121 11.5z"/><path d="M8.5 8.5c.3-.7.8-.7 1.1-.7h.5c.2 0 .4.1.5.4l.7 1.7c.1.2 0 .5-.1.6l-.6.7c-.1.2-.1.4 0 .6.4.8 1.6 2 2.6 2.4.2.1.4.1.6-.1l.7-.6c.2-.2.4-.2.6-.1l1.7.8c.2.1.4.3.4.5v.5c0 .4-.4.9-1 1.1-1 .3-2.3.2-4-.7-1.5-.8-2.8-2-3.6-3.6-.7-1.4-.9-2.6-.7-3.5z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  setaBaixo: '<path d="M6 9l6 6 6-6"/>',
  padrao: '<circle cx="12" cy="12" r="8"/>'
};

export function iconSvg(nome, tamanho = 22) {
  const path = ICONS[nome] || ICONS.padrao;
  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

/** Elemento assinatura: barrinhas de equalizador, decorativo (aria-hidden). */
export function waveformSvg() {
  const alturas = [6, 14, 9, 17, 5, 12];
  const barras = alturas.map(h => `<span style="height:${h}px"></span>`).join('');
  return `<span class="waveform" aria-hidden="true">${barras}</span>`;
}
