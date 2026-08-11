/**
 * Módulo de Feedback — pequeno "toast" de confirmação, usado quando
 * o usuário adiciona/remove um estilo da seleção (item 6 da Sprint
 * 03: "melhorar feedback visual ao selecionar ou remover um item").
 * Vive em core/ por ser compartilhado entre app.js e as features,
 * sem criar nenhuma pasta nova.
 */

let elToast = null;
let idTimeout = null;

export function montarToast(elemento) {
  elToast = elemento;
}

export function mostrarToast(mensagem, tipo = 'info') {
  if (!elToast) return;
  elToast.textContent = mensagem;
  elToast.dataset.tipo = tipo;
  elToast.classList.remove('is-visible');
  // força reflow para reiniciar a animação em toques rápidos sucessivos
  void elToast.offsetWidth;
  elToast.classList.add('is-visible');
  clearTimeout(idTimeout);
  idTimeout = setTimeout(() => elToast.classList.remove('is-visible'), 1900);
}
