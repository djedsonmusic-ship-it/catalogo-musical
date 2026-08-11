# Checklist de Publicação — v1.0

## Antes de publicar (dados)
- [ ] `app/dados/contato.json` preenchido (WhatsApp e/ou e-mail)
- [ ] Estilos/categorias/preços reais no lugar dos dados de exemplo
      (ver `COMO_ADICIONAR_ESTILOS.md`)
- [ ] Nenhum estilo de demonstração com `"status": "ativo"` esquecido

## Como publicar
Este projeto é 100% estático (HTML/CSS/JS, sem build, sem servidor
próprio). Basta enviar a pasta `app/` inteira para qualquer
hospedagem que sirva arquivos estáticos por HTTP: Netlify, Vercel
(modo estático), GitHub Pages, Cloudflare Pages, ou qualquer plano de
hospedagem compartilhada com FTP.

- [ ] Enviar todo o conteúdo de `app/` para a raiz do domínio (ou de
      uma subpasta — todos os caminhos usam `./`, então funciona em
      qualquer subpasta também)
- [ ] Confirmar que o servidor serve arquivos `.json` com o
      cabeçalho `Content-Type` correto (praticamente todos servem por
      padrão; só costuma ser um problema em servidores configurados
      manualmente)
- [ ] Acessar o site publicado e navegar o fluxo completo: Home →
      Explorar → Buscar → Selecionar → Resumo → Finalizar

## Limitação conhecida (não é um bug)
Abrir `index.html` **diretamente do computador** (clique duplo, sem
nenhum servidor) não funciona — é uma restrição de segurança dos
navegadores para módulos JavaScript (`fetch` de arquivos locais).
Isso é esperado e não afeta a publicação real: qualquer hospedagem
(mesmo a mais simples) serve os arquivos por HTTP normalmente. Para
testar no computador antes de publicar, use um servidor local (ver
`README.md`).

## Depois de publicar
- [ ] Testar em pelo menos 1 celular real (Android ou iPhone)
- [ ] Testar em uma conexão lenta (modo "Slow 3G" das ferramentas do
      navegador) para conferir a tela de carregamento inicial
- [ ] Testar navegação só por teclado (Tab) até a tela de Finalizar
