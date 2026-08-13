/**
 * Módulo de Contato (Sprint 11) — carrega o canal de contato que o
 * PRÓPRIO PROPRIETÁRIO configura em `dados/contato.json` (nenhum
 * número ou e-mail fica escrito no código-fonte). A tela de
 * Finalizar Pedido usa este módulo para mostrar automaticamente só
 * os canais que estiverem preenchidos.
 */

let contatoCache = null;

export async function carregarContato() {
  if (contatoCache) return contatoCache;
  try {
    const resposta = await fetch('./dados/contato.json');
    if (!resposta.ok) throw new Error('contato.json não encontrado');
    const dados = await resposta.json();
    contatoCache = {
      whatsapp: (dados.whatsapp || '').trim(),
      email: (dados.email || '').trim(),
      telefone: (dados.telefone || '').trim()
    };
  } catch (erro) {
    // Sem configuração ainda: a tela de Finalizar simplesmente não
    // mostra nenhum canal (nunca inventamos um contato falso).
    contatoCache = { whatsapp: '', email: '', telefone: '' };
  }
  return contatoCache;
}

export function possuiCanalConfigurado(contato) {
  return Boolean(contato.whatsapp || contato.email || contato.telefone);
}

/**
 * Monta o link `wa.me` a partir do número (aceita com ou sem formatação)
 * e um texto pré-preenchido.
 * O wa.me exige o número em formato internacional (código do país + DDD +
 * número, sem "+"). Se vier só no formato nacional (10 ou 11 dígitos —
 * DDD + telefone), adiciona automaticamente o 55 do Brasil, para nunca
 * cair no bug de mensagem indo para número errado por falta do código.
 */
export function montarLinkWhatsApp(numero, mensagem) {
  let apenasDigitos = numero.replace(/\D/g, '');
  if (apenasDigitos.length <= 11 && !apenasDigitos.startsWith('55')) {
    apenasDigitos = `55${apenasDigitos}`;
  }
  return `https://wa.me/${apenasDigitos}?text=${encodeURIComponent(mensagem)}`;
}

export function montarLinkEmail(email, assunto, corpo) {
  return `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

export function montarLinkTelefone(numero) {
  return `tel:${numero.replace(/[^\d+]/g, '')}`;
}
