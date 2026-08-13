# Notas da Sprint — MVP Comercial 1.0

Este documento registra observações e decisões tomadas durante a
implementação, conforme instrução de "registrar a observação e
continuar a implementação" em caso de inconsistência com o
documento de arquitetura.

## Observações de inconsistência (registradas, não bloqueantes)

1. **Seção 4.2 e 7.5 (Finalizar seleção)** — o documento deixa
   explicitamente em aberto o que ocorre ao finalizar. A sprint
   autorizou uso de dados/ação simulados. Implementado em
   `features/finalizar/finalizar.js` com uma função isolada
   `registrarPedidoSimulado`, para troca futura sem retrabalho.

2. **Seção 6.4 (stack)** — nenhuma stack foi definida no documento
   (item explicitamente deixado como decisão de implementação).
   Decisão tomada nesta sprint: **HTML/CSS/JavaScript puro (ES
   Modules), sem framework e sem etapa de build**. Justificativa:
   atende a todos os critérios da seção 6.4 (artefatos 100%
   estáticos, zero dependência de rede em runtime para
   ícones/lógica) com o menor custo de manutenção para uma pessoa
   só (RNF-11), e mantém compatibilidade máxima com WebViews
   restritos (RNF-05). Pode ser revisto sem perda de arquitetura,
   já que a separação em módulos (core/features/design-system) não
   depende de framework.

3. **Seção 7.3 (Detalhe do estilo)** — esta tela existe no documento
   principalmente para reprodução de preview de áudio, que está
   fora de escopo desta sprint. Como a ação "adicionar à seleção"
   precisava de um lugar, foi implementado um **painel de detalhe
   simplificado** (modal, sem áudio) dentro do módulo
   `explorar-estilos`, não uma tela de rota própria. Isso preenche a
   lacuna funcional sem antecipar o Módulo de Preview de Áudio
   (Fase 2). Nenhuma decisão de arquitetura foi alterada — o painel
   é um estado local da tela de Explorar, não uma nova tela.

4. **Seção 9.2 (dados comerciais)** — quantidade de músicas, tamanho
   médio e preço por estilo são lacunas de negócio não preenchidas
   nos anexos. Para que a tela de Resumo do Pedido (módulo 6 e 7 do
   escopo da sprint) tivesse algo real para exibir, foram criados
   dados de exemplo em `app/dados/catalogo.json`, claramente
   marcados no próprio arquivo (campo `"aviso"`) como fictícios. O
   cálculo vive isolado em `core/estimateService.js`, para ser
   substituído pelo Módulo de Precificação/Volume reais (seção 20,
   itens 2 e 3) sem tocar em nenhuma tela.

5. **Seção 18 (descartar hash/History API como navegação
   primária)** — respeitado integralmente: a troca de telas em
   `app.js` é feita por estado de JavaScript em memória, sem nunca
   escrever na URL.

## O que foi deliberadamente deixado de fora (fora do escopo desta sprint)

Conforme instrução explícita da sprint: preview de áudio, PWA,
offline, dashboard administrativo, CI/CD, publicação, analytics,
sistema de preços definitivo, pipeline completo de dados (o
`data-pipeline/` da seção 10 não foi criado — os dados de exemplo
foram escritos diretamente em `app/dados/catalogo.json`).

---

# Sprint 02 — UX/UI (refinamento visual)

Nenhuma tela nova, nenhuma funcionalidade nova, nenhuma pasta nova.
Trabalho limitado a `design-system/tokens.css`,
`design-system/components.css`, `styles.css` e ao markup das telas já
existentes em `features/` (troca de estilos inline por classes).

## Observação registrada

Esta sprint faz referência a "imagem de referência anexada
anteriormente", mas **nenhuma imagem foi de fato anexada** a esta
conversa. Não há como replicar uma paleta específica de uma imagem
que não está disponível. Prossegui usando a linguagem visual descrita
por extenso no briefing (poucas cores, alto contraste, hierarquia
tipográfica, sem elementos decorativos) e pelas referências nomeadas
(Linear/Stripe/Notion/Vercel/Supabase). Se a imagem existir, uma
próxima sprint pode recalibrar só os tokens de cor em
`tokens.css` sem tocar em nenhum outro arquivo.

## Decisões de estilo tomadas

- Paleta reduzida a um único acento de ação (índigo `#4F46E5`) e uma
  cor de investimento reservada (âmbar `#B7791F`), conforme "poucas
  cores".
- Radius mais contido (6/10/16px) e sombras quase imperceptíveis,
  para fugir de estética "loja/blog" e soar como software.
- Identidade própria de cartão: faixa de cor de 3px à esquerda
  (por categoria) substituindo o badge/ícone grande estilo
  Bootstrap; números de estatística em fonte monoespaçada, ao estilo
  de painéis de métricas.
- Todos os estados exigidos (hover, active/pressed, focus-visible,
  disabled) foram implementados via CSS, sem JavaScript adicional de
  estado visual — exceto os chips de categoria, que passaram de
  estilo inline para a classe `.is-active`.

---

# Sprint 03 — Experiência (UX comportamental)

Nenhuma tela nova, nenhuma pasta nova, nenhuma funcionalidade fora da
lista do briefing. Trabalho concentrado em `app.js`, nas telas de
`features/explorar-estilos` e `features/selecao`, e em três módulos
novos e pequenos dentro de pastas já existentes: `core/feedback.js`
(toast) e as funções `destacarTrecho`/`escaparHtml` acrescentadas a
`core/normalizeText.js`.

## Decisões de escopo

- **"Painel lateral/inferior de resumo"** do briefing foi interpretado
  como o reforço da barra de seleção persistente já existente (que já
  aparece no rodapé em qualquer tela), agora mostrando quantidade,
  músicas, espaço e valor estimados ao vivo — em vez de criar uma
  estrutura de layout com sidebar, o que exigiria alterar a
  arquitetura de tela (fora do permitido nesta sprint). A tela cheia
  de "Resumo do pedido" continua existindo para o detalhe completo.
  Registrado como sugestão para a próxima sprint, caso um verdadeiro
  layout com coluna lateral no desktop seja desejado.
- Agrupamento por categoria na grade de Explorar só é aplicado quando
  nenhum filtro de busca/categoria está ativo — evita reorganizar a
  tela no meio de uma busca, o que quebraria a sensação de
  "instantâneo".

---

# Sprint 04 — Estrutura de Dados

Objetivo: preparar o catálogo para milhares de estilos. Nenhuma tela
nova, nenhuma funcionalidade de UI nova — apenas o modelo de dados e
a camada de acesso (`catalogService.js`). Schema completo documentado
em `docs/MODELO-DE-DADOS.md`.

## O que mudou

- `dados/catalogo.json` (monolítico, Sprint 01) foi **substituído**
  por `dados/manifesto.json` (Categorias + Subcategorias) e
  `dados/estilos/<categoriaId>.json` (um módulo por categoria) —
  carregamento por módulos implementado via `Promise.all` em
  `catalogService.carregarCatalogo()`.
- Modelo passou de 2 níveis (Categoria → item-com-tudo) para 3 níveis
  reais (Categoria → Subcategoria → Estilo), com IDs próprios em cada
  nível.
- Campos do Estilo renomeados para o vocabulário desta sprint:
  `quantidade_musicas` → `quantidadeMusicasEstimada`,
  `tamanho_estimado_mb` → `espacoEstimadoMb`,
  `preco_estimado_centavos` → `valorEstimadoCentavos`,
  `descricao` → `descricaoCurta`. Adicionados: `tags`, `status`,
  `ordemExibicao`. Todas as referências nas telas (`explorar-estilos`,
  `selecao`, `estimateService`) foram atualizadas de acordo — troca
  mecânica de nome de campo, não mudança de comportamento.

## Observação de escopo

Na Sprint 01, cada "subcategoria" já funcionava como o item final
(estilo) da vitrine. Nesta sprint, para atender ao pedido explícito de
3 modelos distintos (Categoria/Subcategoria/Estilo), cada subcategoria
existente virou 1 Subcategoria + 1 Estilo filho — uma relação 1:1 no
mock atual. O modelo já suporta N Estilos por Subcategoria; o mock só
não usa essa possibilidade ainda porque não havia conteúdo real para
popular mais de um Estilo por Subcategoria nesta fase.

## O que foi preparado, mas não ligado a nenhuma tela

- `catalogService.ordenarPorExibicao` — pronta para uma futura
  ordenação escolhida pelo usuário.
- `catalogService.listarTagsDisponiveis` — pronta para um futuro
  filtro por tag.
- Campo `status` — respeitado na leitura (`listarEstilos` já ignora
  `"inativo"` por padrão), mas não há nenhuma tela para alterá-lo
  ainda (isso seria um dashboard administrativo, fora de escopo).

---

# Sprint 05 — Busca (motor de busca e filtros)

Nenhuma tela nova, nenhuma pasta nova. Trabalho concentrado em
`core/searchService.js` (reescrito) e na integração em
`features/explorar-estilos/explorarEstilos.js`.

## O que mudou

- `searchService.js` passou de uma única função (`filtrarEstilos`)
  para um motor completo:
  - `construirIndiceBusca` — normaliza nome/categoria/subcategoria/
    tags **uma única vez** por carregamento de tela, não a cada tecla.
  - `filtrarPorCategoria`, `filtrarPorSubcategoria`, `filtrarPorTags`,
    `filtrarPorStatus`, `filtrarPorFaixaQuantidade`,
    `filtrarPorFaixaPreco` — funções puras, independentes e
    combináveis (`aplicarFiltros` roda só as informadas).
  - Pontuação de relevância (nome exato > começa com > contém > tag
    exata > subcategoria > categoria > tag parcial > correspondência
    difusa).
  - `buscarEFiltrar` — ponto de entrada único: aplica filtros, decide
    ordenação (alfabética sem termo, relevância com termo) e devolve
    o resultado pronto para a tela.
- `explorarEstilos.js`: input de busca agora usa
  `requestAnimationFrame` para agrupar teclas digitadas em rajada em
  um único repaint (sensação instantânea sem reprocessar a cada
  tecla); painel de detalhe passou a mostrar também a subcategoria.

## O que está pronto no motor, mas sem controle de UI ainda

`filtrarPorSubcategoria`, `filtrarPorTags` (como filtro dedicado —
hoje tags só entram via busca textual livre), `filtrarPorStatus`,
`filtrarPorFaixaQuantidade` e `filtrarPorFaixaPreco` existem, são
testáveis isoladamente e são combináveis entre si via
`aplicarFiltros`, mas nenhuma tela ainda tem sliders/seletores para
usá-los — conforme pedido explícito do briefing ("preparar filtros",
não implementar controles para todos eles).

## Otimizações de performance aplicadas

- Índice pré-computado (normalização não repetida por tecla).
- Busca em rajada agrupada por frame (`requestAnimationFrame`),
  evitando um re-render por tecla em digitação rápida.
- Filtros mais seletivos (categoria) aplicados antes da pontuação
  textual, reduzindo o array a ser pontuado.
- Somente o container de resultados é re-renderizado a cada busca;
  cabeçalho, chips e barra de seleção persistente não são tocados.
- Alternar seleção de um cartão não re-renderiza a grade — só
  atualiza classe/badge do cartão específico (já existia desde a
  Sprint 03, mantido).

---

# Sprint 06 — Seleção (experiência de montar o pedido)

Nenhuma tela nova, nenhuma pasta nova. Trabalho concentrado em
`app.js` (barra de seleção), `features/selecao/selecao.js` e
`features/explorar-estilos/explorarEstilos.js` (mensagem de
feedback), além de estilos novos em `styles.css`.

## Observação de escopo

O briefing pede, na lista de indicadores do resumo: "Quantidade de
estilos" e, separadamente, "Quantidade total de itens". Neste modelo
de dados não existe quantidade por item (um estilo é escolhido ou
não — não há "2x Rock Nacional"), então as duas métricas seriam
numericamente idênticas. Optei por **não duplicar o mesmo número sob
dois rótulos diferentes** (isso confundiria mais do que ajudaria,
contra o objetivo "extremamente simples" desta sprint) — "Estilos"
já representa a quantidade total de itens da seleção. Caso uma
sprint futura introduza quantidade por item (ex.: "quantas cópias"),
essa distinção passaria a fazer sentido e pode ser adicionada sem
retrabalho na estrutura atual.

## O que foi implementado

- **Pulso discreto na contagem** da barra de seleção persistente,
  disparado só quando o número muda (nunca ao simplesmente navegar
  entre telas).
- **Mensagem de "primeira seleção"**: ao adicionar o 1º estilo da
  sessão, o toast e o resumo mostram uma mensagem diferenciada
  ("✨ foi seu primeiro estilo adicionado!" / "Ótimo começo...").
- **Estado de "muitos itens"**: a partir de 8 estilos selecionados,
  um selo discreto ("Seleção generosa") aparece no topo do resumo.
- **Remoção animada**: ao remover um item do resumo, ele recolhe
  (altura + opacidade) antes de sair da lista, em vez de sumir
  abruptamente — depois disso o toast de confirmação aparece.
- Estados de seleção vazia, item selecionado (borda + selo) e
  seleção com 1 item já existiam desde sprints anteriores e foram
  mantidos sem alteração (não refatorados, conforme instrução).

---

# Sprint 07 — Resumo do pedido (fechamento profissional)

Nenhuma tela nova, nenhuma pasta nova. Trabalho concentrado em
`features/selecao/selecao.js`, `features/finalizar/finalizar.js`, um
módulo novo pequeno (`core/checkoutService.js`) e estilos em
`styles.css`. `selectionState.js` e `estimateService.js` não foram
tocados (continuam funcionando corretamente).

## O que mudou

- **Hierarquia do Resumo**: o valor estimado virou o destaque
  principal (`checkout-hero`, cartão escuro, número grande), com
  Estilos/Músicas/Espaço em segundo plano (`stat-grid--secundaria`).
- **Lista de confirmação** (`checkout-confirmacao`) antes do botão
  final, reforçando "o que foi selecionado", "pode remover a
  qualquer momento" e "nada foi cobrado ainda" — transmite confiança
  sem inventar garantias que a arquitetura não sustenta.
- **Botão "Finalizar Pedido"** maior, com ícone e microcopy abaixo
  ("Você poderá revisar tudo antes de confirmar").
- **`core/checkoutService.js` (novo)**: ponto único de finalização.
  `finalizarPedido(canal, dados)` hoje só aceita o canal
  `"simulado"`; qualquer canal futuro (ex.: WhatsApp) é um novo
  `case` nesta função só — nenhuma tela precisa mudar. Já expõe
  `montarResumoTextual`, que gera o texto exato que uma integração
  futura enviaria.
- **Tela de Finalizar**: agora mostra esse resumo textual em um
  bloco de código, com botão "Copiar resumo" (usa
  `navigator.clipboard`, funcional de verdade) — permite ao usuário
  copiar e colar manualmente enquanto o envio automático não existe.

## Estrutura preparada para WhatsApp (sem implementar)

`CANAIS` em `checkoutService.js` documenta onde a chave `WHATSAPP`
entraria; a função `finalizarPedido` já lança um erro claro
("ainda não está disponível") se alguém tentar usar um canal não
implementado, em vez de falhar silenciosamente. Nenhuma chamada de
rede, link `wa.me` ou dado saem do navegador nesta sprint.

---

# Sprint 08 — Infraestrutura de Preview de Áudio

Nenhuma tela nova (o player entra no painel de detalhe já existente
em Explorar), nenhuma pasta de nível raiz nova. Detalhamento completo
em `docs/ARQUITETURA-PREVIEW.md`.

## Arquivos criados

- `core/previewService.js` — motor central (1 único `<audio>`,
  máquina de estados, lazy loading real).
- `design-system/previewPlayer.js` — componente reutilizável
  (render + vincular), visual discreto (botão circular + linha de
  progresso, nada de aparência de streaming).
- `dados/audio-exemplo/preview-exemplo-0{1,2}.wav` — 2 tons simples
  gerados localmente via Python `wave` (stdlib, sem rede), ~2s cada.
- `docs/ARQUITETURA-PREVIEW.md`.

## Arquivos alterados

- `dados/estilos/rock.json`, `dados/estilos/eletronica.json` — 1
  estilo de cada recebeu `previewUrls` de exemplo (campo novo e
  opcional no schema; os demais estilos não têm o campo e o player
  mostra "preview ainda não disponível" ou usa o campo legado `previewUrl`).
- `features/explorar-estilos/explorarEstilos.js` — player integrado
  ao painel de detalhe; selo discreto (ponto pulsante) no card cujo
  preview está tocando.
- `app.js` — para qualquer preview ativo ao trocar de tela.

## Pendências

- Player só está no painel de detalhe, não em cada card da grade —
  decisão para não arriscar quebrar o clique-para-abrir-detalhe do
  card nesta sprint. Adicionar depois é só reaproveitar
  `renderPreviewPlayer`/`vincularPreviewPlayer` dentro do card.
- Sobreposição visual possível entre o selo "Selecionado" e o ponto
  "tocando" (ambos no canto superior direito do card) se as duas
  coisas acontecerem ao mesmo tempo — cosmético, não funcional.
- Apenas 2 de 14 estilos têm preview de exemplo.

---

# Sprint 09 — Pronto para os primeiros clientes (revisão de textos)

Sem funcionalidade nova. Trabalho de revisão de copy voltada ao
cliente final — nenhuma tela, arquivo de dados ou lógica de negócio
foi criada. Alterações pontuais em textos e em 1 linha de geração de
código de pedido.

## O que foi revisado e por quê

- **`finalizar.js`**: texto trocado de linguagem interna de projeto
  ("passo temporário desta fase", "sprint futura", "Protocolo local")
  para linguagem de produto ("Pedido recebido!", "Código do pedido").
  Mais importante: a mensagem deixou de **prometer contato automático
  da equipe** (o sistema não coleta e-mail/telefone do cliente nem
  envia nada sozinho) e passou a instruir uma ação real e honesta:
  copiar o resumo e enviar para o atendimento. Prometer um retorno
  automático que o sistema não realiza seria o tipo de "elemento
  provisório" mais grave de todos — uma promessa que não se cumpre.
- **`selecao.js`**: nota do valor estimado trocada de "a regra
  comercial definitiva chega em sprint futura" (jargão interno) para
  "o valor final é confirmado no atendimento" (consistente com a
  tela de Finalizar).
- **`previewPlayer.js`**: removida a palavra "(exemplo)" da legenda
  visível ao cliente.
- **`checkoutService.js`**: código do pedido deixou de usar o
  prefixo `SIM-` (lia-se como "simulação") e passa a usar `CM-`
  (iniciais do produto).

## Pergunta final: entregaria este catálogo para clientes reais amanhã?

**Ainda não — por um motivo real, não cosmético.** A tela de
Finalizar agora instrui o cliente a copiar o resumo e enviá-lo "para
o nosso atendimento", mas **nenhum canal de contato é mostrado em
lugar nenhum da interface** (nem WhatsApp, nem e-mail, nem telefone).
Isso não foi inventado nesta sprint porque nenhum dado de contato
real do negócio foi fornecido — e um número/e-mail falso seria pior
do que nenhum.

### O que realmente impede a entrega amanhã
1. **Falta um canal de contato visível** na tela de Finalizar (ex.:
   um link `wa.me/<numero>` ou `mailto:`) — sem isso, o cliente copia
   o resumo e não sabe para onde enviá-lo.
2. **Nada é salvo fora do navegador do cliente** — se ele fechar a
   aba antes de copiar/enviar o resumo, a seleção é perdida.
3. **Quantidade de músicas, espaço e valor ainda são dados de
   exemplo** (`docs/MODELO-DE-DADOS.md`) — precisam ser substituídos
   pelo acervo e pela tabela de preços reais do cliente antes do
   lançamento.

Nenhum desses 3 pontos é um problema de design, performance ou UX —
são decisões de negócio que só o dono do catálogo pode fornecer
(número de contato, e acervo/preço reais). Assim que esses dados
existirem, o item 1 é uma alteração pequena e local em `finalizar.js`
(adicionar um link visível), e o item 3 é só substituir o conteúdo de
`dados/estilos/*.json` — nenhuma arquitetura muda.

---

# Sprint 10 — Preparação para dados reais

Nenhuma funcionalidade nova, nenhuma arquitetura alterada, nenhum
Design System tocado. Entregável é documentação + a confirmação de
que a estrutura de dados já suporta a manutenção manual sem código.

## Arquivos alterados

- `README.md` — link para o novo guia.
- `docs/NOTAS-SPRINT.md` — este registro.

## Arquivos criados

- `COMO_ADICIONAR_ESTILOS.md` (raiz do projeto) — guia em linguagem
  simples para o proprietário cadastrar estilos, categorias,
  subcategorias e preços reais, editando só arquivos `.json`.

## Decisão de escopo

O briefing pede "criar uma forma simples de importar os estilos
reais". Como as instruções também proíbem importador complexo, banco
de dados e painel administrativo, a "forma simples" implementada é a
que já existe desde a Sprint 04: editar diretamente os arquivos
`.json` em `dados/`. Nenhum código de importação foi criado — o
trabalho desta sprint foi confirmar que a estrutura já é simples o
bastante (checado: uma categoria nova sem arquivo de estilos ainda
não quebra o carregamento, graças ao tratamento de erro já existente
em `catalogService.js`) e documentar o processo de forma que não
exija conhecimento de programação.

---

# Sprint 11 — Preparação para produção (v1.0)

Nenhuma funcionalidade nova além do item explicitamente pedido (canal
de contato). Nenhum painel administrativo, banco de dados, login,
PWA ou analytics foram criados.

## O que foi implementado

- **Canal de contato configurável** (`dados/contato.json` +
  `core/contatoService.js`): resolve a pendência crítica registrada
  na Sprint 09. Nenhum número/e-mail fica no código — a tela de
  Finalizar Pedido lê o arquivo e mostra automaticamente só os
  botões dos canais preenchidos (WhatsApp via link `wa.me` com o
  resumo já preenchido, e-mail via `mailto:`, telefone via `tel:`).
  Se nada estiver configurado, a tela mantém apenas "Copiar resumo"
  e um aviso aparece só no console do navegador (nunca visível ao
  cliente).
- **Carregamento inicial**: adicionado um spinner visível enquanto o
  catálogo carrega, evitando tela em branco em conexões lentas.
- **Acessibilidade básica**: link "Pular para o conteúdo" (visível
  só ao navegar por teclado), `tabindex="-1"` no `<main>` para o
  salto funcionar corretamente.
- **Favicon inline** (SVG embutido, sem arquivo de imagem) — evita o
  erro 404 padrão de `favicon.ico` no console.
- Revisão completa: navegação, mensagens de erro, responsividade e
  textos já estavam adequados desde as Sprints 03–09; nenhuma
  mudança adicional foi necessária nesses pontos.

## Publicação

`docs/CHECKLIST-PUBLICACAO.md` (novo) documenta o processo de
publicar em qualquer hospedagem estática, e explicita a única
limitação conhecida: abrir `index.html` por duplo clique (`file://`)
não funciona, por restrição de segurança do navegador a módulos
JavaScript — funciona normalmente em qualquer hospedagem HTTP real,
mesmo a mais simples.

---

# Sprint 12 — Migração do catálogo real (CSV)

Nenhuma arquitetura alterada, nenhum banco de dados, nenhum painel
administrativo. Relatório completo em
`docs/RELATORIO-MIGRACAO-SPRINT12.md`.

## Resumo

Fonte: `catalogo_origem.csv` (2 colunas — Categoria;Subpasta, Latin-1,
165 linhas, 40 categorias únicas). Criado um script Python
reexecutável (`ferramentas/migrar-csv-para-catalogo.py`) que gera
`app/dados/manifesto.json` + `app/dados/estilos/*.json` no mesmo
schema já definido na Sprint 04 — o app não sabe (nem precisa saber)
que os dados vieram de um CSV.

Resultado: 40 categorias, 165 subcategorias, 165 estilos (relação 1:1
subcategoria→estilo, mesma decisão já registrada na Sprint 04),
substituindo os 6 categorias/14 estilos de exemplo. Validação: sem
duplicados, sem órfãos, sem campos obrigatórios ausentes, todo JSON
válido, todo `.js` do app continua passando em `node --check`.

## Pendência crítica herdada

Dados comerciais (preço, quantidade de músicas, espaço) não vieram no
CSV — os 165 estilos reais têm esses campos zerados até o proprietário
preenchê-los (seção 7 de `COMO_ADICIONAR_ESTILOS.md`). Combinada com a
pendência já resolvida do canal de contato (Sprint 11), esta é agora
a única pendência real antes do lançamento comercial.

---

# Sprint 13 — Ferramenta de enriquecimento dos 165 estilos reais

Nenhuma funcionalidade nova no app, nenhuma tela, nenhuma arquitetura
alterada. Trabalho 100% em `ferramentas/` (scripts offline) e no guia.

## O que foi criado

- `ferramentas/enriquecer-estilo.py` — edita só os campos pedidos de
  UM estilo já existente (nunca cria/recria/apaga). Dois modos: um
  estilo por vez via linha de comando, ou um lote de vários estilos
  via arquivo JSON. Testado em registros reais (`est_mpb_001` e
  `est_mpb_002`) e revertido ao estado original em seguida — a
  sprint entrega a ferramenta, não o enriquecimento em si.
- `ferramentas/validar-enriquecimento.py` — só leitura; gera
  `ferramentas/relatorio-enriquecimento.md` com quantos estilos
  faltam descrição/preço/quantidade/espaço/tags/preview. Nunca
  bloqueia o site.
- `COMO_ADICIONAR_ESTILOS.md` — nova seção 9.1 com a tabela de
  campos obrigatórios/opcionais, como usar as duas ferramentas e
  boas práticas de preenchimento.

## Relatório de validação (estado atual, pós-migração da Sprint 12)

165/165 estilos ainda sem descrição, preço, quantidade de músicas,
espaço e tags (esperado — a Sprint 12 migrou só a estrutura). Preview
é opcional e também está 165/165 vazio, sem impacto no
funcionamento. Relatório completo e atualizável em
`ferramentas/relatorio-enriquecimento.md` (rodar o script de novo a
qualquer momento).

---

# Sprint 14 — Adequação ao modelo de negócio real (sem preço)

Mudança de modelo de negócio: o catálogo agora é "escolher e enviar
pedido" — o orçamento é feito diretamente pelo proprietário depois.
Nenhuma arquitetura de telas/módulos foi criada ou removida; nenhum
Design System alterado (só componentes novos: opção de entrega,
textarea, grid de campos do resumo, seguindo os tokens existentes).

## O que foi removido do que o cliente vê

- Valor estimado, "investimento", e toda a exibição de preço — da
  barra de seleção persistente, da tela de Resumo (Seleção) e do
  resumo final (Finalizar).
- Quantidade de músicas e espaço estimado também saíram das telas
  (a lista de campos do Resumo do Pedido definida nesta sprint não
  os inclui).
- `core/estimateService.js` **não foi apagado nem alterado** —
  continua existindo, sem nenhum chamador ativo, pronto para voltar a
  ser usado por um módulo de precificação futuro sem retrabalho de
  arquitetura.

## O que foi adicionado

- **Forma de entrega** (Finalizar Pedido): 3 opções em radio button
  ("Vou levar meu pendrive", "Quero comprar um pendrive", "Quero
  receber por link") — escolha obrigatória antes de confirmar.
- **Campo de observações** (opcional, textarea livre).
- **Resumo final reestruturado** contendo exatamente: código do
  pedido, data, forma de entrega, quantidade de estilos, lista dos
  estilos, observações (se preenchidas) e os canais de contato do
  proprietário (Sprint 11, mantido sem alteração).
- Tela de Finalizar passou a ter 2 passos internos (formulário →
  confirmação) dentro do mesmo arquivo/tela — sem criar rota nova.

## Preview sem erro

`design-system/previewPlayer.js`: quando não há `previewUrls` nem `previewUrl`, a
função agora devolve string vazia — nenhum botão desabilitado, nenhum
texto de aviso. `explorarEstilos.js` só insere o player no DOM quando
existe preview, evitando até um espaço em branco residual.

## Auditoria final: "Eu entregaria este sistema para clientes reais amanhã?"

**Ainda não** — 1 bloqueio real, herdado e ainda não resolvido:

1. **Dados comerciais dos 165 estilos reais continuam vazios**
   (Sprint 12/13) — mas isso agora é MENOS crítico do que antes,
   porque o novo modelo de negócio não exibe preço nenhuma hora; o
   que falta preencher para um bom lançamento é `descricaoCurta` e
   `tags` (ajudam a busca e a confiança do cliente), não mais preço.
   Rodar `ferramentas/validar-enriquecimento.py` mostra o estado
   atual.

Não há mais nenhum bloqueio técnico ou de fluxo: o caminho completo
(Home → Explorar → Buscar → Preview quando existir → Selecionar →
Resumo → Finalizar com forma de entrega → Confirmação com contato do
proprietário) funciona de ponta a ponta sem preço em lugar nenhum.

### Melhorias futuras (não impedem o uso comercial)
- Preencher descrição/tags dos 165 estilos reais (ferramenta já pronta, Sprint 13)
- Reativar `estimateService.js` num módulo de precificação, se o modelo de negócio mudar de novo
- Testar o fluxo completo em dispositivo real antes do lançamento (Sprint 09/11)

---

# Sprint 15 — Estrutura oficial de previews (escala)

Nenhum código alterado. Nenhuma funcionalidade, interface ou
experiência do usuário modificada — sprint 100% de estrutura de
pastas + documentação.

## Validação da arquitetura atual (antes de qualquer decisão)

Confirmado por leitura de código: `core/previewService.js`,
`design-system/previewPlayer.js` e `core/catalogService.js` tratam
`previewUrl` como uma string opaca — nenhum deles assume ou constrói
caminho de pasta. **Resultado: a arquitetura já suporta qualquer
estrutura de pastas para os previews, sem necessidade de nenhuma
alteração de código.** Esta sprint só define QUAL estrutura usar e
documenta o padrão de produção.

## Estrutura definida

```
app/previews/<categoriaId>/<estiloId>.mp3
```

1 subpasta por categoria (mesmo `id` do manifesto), 1 arquivo por
estilo (nomeado pelo `id` do estilo, nunca pelo nome de exibição) —
evita problemas de acento/espaço/maiúscula em nome de arquivo e
espelha a mesma organização já usada em `dados/estilos/`.

## Padrão oficial de qualidade

MP3, mono, 64–96 kbps, 44.100 Hz, 10–15s, volume normalizado, fade in
200–400ms, fade out 300–600ms — arquivo esperado entre 80–180 KB.
Detalhado com justificativa em `GUIA_PREVIEWS.md` (novo, raiz do
projeto).

## Arquivos criados/alterados

- `app/previews/README.md` (novo) — referência rápida da estrutura
- `GUIA_PREVIEWS.md` (novo, raiz) — guia completo de produção
- `README.md` — link para o novo guia
- `docs/ARQUITETURA-PREVIEW.md` — atualizado com a estrutura oficial
  da Sprint 15 (substitui a menção aos arquivos de exemplo da Sprint
  08, que ficam só como legado sem uso)

## Nenhum ajuste de código foi necessário

Confirmado pela validação acima — o critério de sucesso da sprint
("verificar se o sistema atual suporta essa organização sem
necessidade de alterar a arquitetura") foi atendido com 0 linhas de
código alteradas.
