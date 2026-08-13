# Catálogo Musical 2.0 — Documento de Arquitetura

**Status:** documento de arquitetura para aprovação. Nenhum código foi escrito ou alterado nesta etapa.
**Fontes de verdade utilizadas:** projeto completo da v1 (`CatalogoMusical.zip`) e `AUDITORIA-CatalogoMusical.md`.
**Premissa central:** a v1 é considerada **congelada** — continua existindo e funcionando como está. A v2 é um **novo projeto**, que reaproveita da v1 somente o que fizer sentido.

> Convenção usada neste documento: sempre que uma informação necessária não constava nos anexos, ela está marcada como **[LACUNA]** — nenhuma suposição foi feita para preenchê-la. Uma lista consolidada dessas lacunas está no Anexo A, ao final.

---

## 1. Resumo executivo

A v1 (Catálogo Musical Offline) é uma aplicação estática HTML/CSS/JS, sem servidor, alimentada por um pipeline Python (`admin/`) que importa dados de CSV e/ou HTML de origem, valida, mescla por prioridade configurável e gera `catalogo.json`/`catalogo.js` consumidos pelo frontend. A auditoria técnica anexada mostra um projeto **bem estruturado internamente** (módulos de responsabilidade única, fallbacks para `localStorage`, History API e `navigator.share`), mas com problemas reais de experiência móvel corrigidos apenas recentemente (sidebar inacessível em celular, corte de `100vh`, zoom automático em iOS, áreas de toque abaixo de 44×44px) e fragilidades pontuais em exportação/impressão em navegadores internos (WhatsApp/Messenger).

Mais importante do que os bugs corrigidos, porém, é a mudança de propósito entre as duas versões:

- A **v1** é um **catálogo de navegação e organização** de um acervo musical, com foco em consultar, selecionar e exportar uma lista de subpastas.
- A **v2** é uma **ferramenta comercial**: o catálogo existe para que um cliente monte, sozinho ou assistido, um pedido de pendrive personalizado — com pré-visualização de estilos, estimativa de quantidade de músicas, espaço ocupado e investimento.

Isso significa que a v2 não é uma evolução incremental da v1: é um produto com um objetivo de negócio diferente (venda guiada), que precisa de conceitos que **não existem hoje em nenhum lugar do sistema** — preview de áudio, estimativa de tamanho, precificação. A arquitetura recomendada trata a v1 como uma **fonte de padrões validados** (modelo de dados único no pipeline, normalização de texto, busca fuzzy, filosofia de fallback gracioso, lições de acessibilidade móvel da auditoria) e como um **repositório de conteúdo reaproveitável** (catálogo de categorias/subpastas já existente), mas propõe uma aplicação nova, pensada como PWA, hospedada gratuitamente, com publicação automática e navegação orientada à experiência do cliente — não a pastas.

---

## 2. Objetivos do produto

Conforme definido pelo solicitante, o produto **não é um catálogo musical em si** — é uma ferramenta comercial de configuração de pedido. Objetivos, na ordem em que aparecem no fluxo esperado:

1. Permitir que o cliente **entre no catálogo** sem fricção (sem instalar nada, carregamento rápido, funciona em qualquer navegador moderno).
2. Permitir **pesquisar estilos musicais** disponíveis, de forma instantânea.
3. Permitir **ouvir pequenos previews** de cada estilo antes de decidir.
4. Permitir **selecionar estilos** (um ou vários) para compor o pendrive.
5. Mostrar, com a seleção atual, a **quantidade estimada de músicas**.
6. Mostrar o **espaço estimado ocupado** (em GB/MB) pela seleção.
7. Mostrar o **investimento estimado** (valor a pagar) para a seleção atual.
8. Permitir **finalizar a seleção** (registrar/enviar o pedido configurado).

Objetivos de produto secundários, decorrentes da filosofia declarada (item 4 do briefing):
- Transmitir **aparência profissional**, equivalente a um dashboard moderno (Vercel/Stripe/Supabase/Grafana/Linear/Notion citados como referência de organização visual, não de cópia).
- Ser **rápido** de carregar e de navegar, mesmo para o público multigeracional já identificado pela v1 como típico deste negócio.
- Ter **manutenção simples** e **arquitetura modular**, para permitir evolução por etapas independentes (ver seção 20).
- Ter caminho aberto para **funcionamento offline** no futuro, sem que isso seja um requisito bloqueante da primeira versão.

---

## 3. Público-alvo

O único dado explícito disponível sobre o público-alvo vem do `README.md` da v1: *"o público final costuma ser multigeracional, e nem todo mundo tem intimidade para baixar um `.zip`, extrair e encontrar `index.html`"*, o que motivou, na v1, a distribuição via arquivo único por WhatsApp.

A partir disso, e do próprio objetivo do produto (montar um pendrive de música personalizado, com previews de estilo), é possível inferir com segurança que o público-alvo da v2 é:

- **Clientes finais do negócio de DJ/venda de acervo musical** (não administradores) — pessoas que querem comprar um pendrive com músicas dos estilos de sua preferência.
- Um público com **variação ampla de familiaridade digital** (multigeracional), o que reforça o requisito de simplicidade de uso e baixa fricção de entrada.
- Predominantemente em **dispositivos móveis** (a própria auditoria trata o comportamento mobile como prioridade e identifica que a distribuição tende a ocorrer via WhatsApp), mas com necessidade de compatibilidade também em desktop.

**[LACUNA]** Não há, nos anexos, personas formais, faixa etária predominante, volume esperado de acessos/pedidos simultâneos, nem indicação de que o catálogo será usado de forma autônoma pelo cliente (self-service) ou como apoio visual durante um atendimento presencial/por chamada com o vendedor/DJ — essa distinção é relevante para decisões de UX (ex.: necessidade de dar suporte a "modo apresentação") e não deve ser assumida.

---

## 4. Requisitos funcionais

### 4.1 Requisitos funcionais do cliente final (núcleo do produto)

| # | Requisito |
|---|---|
| RF-01 | O sistema deve listar todos os estilos musicais disponíveis, organizados de forma navegável. |
| RF-02 | O sistema deve permitir buscar estilos por nome, tolerando pequenos erros de digitação (capacidade já existente na v1 via busca fuzzy/Levenshtein, candidata a reaproveitamento — ver seção 17). |
| RF-03 | O sistema deve permitir reproduzir um preview curto de áudio para um estilo, sem sair da tela de navegação. |
| RF-04 | O sistema deve permitir selecionar/deselecionar um ou mais estilos para compor o pedido. |
| RF-05 | A seleção do cliente deve ser visível e editável a qualquer momento (equivalente ao "painel de seleção" já existente na v1). |
| RF-06 | O sistema deve calcular e exibir, em tempo real, conforme a seleção muda: quantidade estimada de músicas, espaço estimado ocupado e investimento estimado. |
| RF-07 | O sistema deve permitir "finalizar a seleção" — um passo explícito que encerra a configuração do pedido. |
| RF-08 | A seleção deve persistir localmente entre sessões no mesmo dispositivo (equivalente ao comportamento de `localStorage` já validado na v1), para que o cliente não perca o trabalho de montagem ao fechar o navegador. |
| RF-09 | O sistema deve funcionar em navegadores móveis e desktop modernos, incluindo os *WebViews* internos de apps de mensagens (relevante pela forma de distribuição usada na v1). |

### 4.2 Requisitos funcionais decorrentes de "finalizar a seleção"

**[LACUNA]** O briefing pede para "visualizar o investimento" e "finalizar a seleção", mas não define **o que acontece depois de finalizar**: se é geração de um resumo para enviar por WhatsApp (como a v1 já faz para outra finalidade), se é um checkout de fato (com pagamento), se é um formulário de contato, ou se é apenas uma tela de confirmação que o cliente mostra ao vendedor. Essa decisão muda significativamente o escopo técnico (ver Riscos, seção 16) e não foi assumida.

### 4.3 Requisitos funcionais administrativos (herdados conceitualmente da v1)

A v1 já resolve, no ambiente `admin/`, o problema de manter um catálogo de categorias/subpastas atualizado a partir de fontes externas (CSV e/ou HTML de um painel de origem), com validação e mesclagem por prioridade. A v2 precisa de uma capacidade equivalente, mas **estendida** com os novos atributos de negócio (preço, espaço, quantidade de músicas — ver seção 9), que hoje **não existem em nenhuma fonte de dados da v1** (os campos já reservados no schema, como `quantidade_musicas` e `bpm_medio`, estão presentes mas nunca preenchidos por nenhum importador atual).

**[LACUNA]** Não foi informado se a v2 terá uma interface administrativa própria (painel web) para o lojista/DJ cadastrar preço, previews e metadados por estilo, ou se continuará havendo um processo manual/Python equivalente ao `atualizar.py` da v1. Isso é tratado como decisão em aberto na seção 6 e 20.

---

## 5. Requisitos não funcionais

| # | Requisito | Origem/justificativa |
|---|---|---|
| RNF-01 | Carregamento inicial rápido, mesmo em conexões móveis instáveis. | Filosofia explícita do briefing; público majoritariamente mobile. |
| RNF-02 | Interface responsiva mobile-first, com áreas de toque de no mínimo 44×44px. | Lição direta da auditoria (P4), que já identificou botões de 38px e ícones de ~22–26px como abaixo do recomendado. |
| RNF-03 | Uso de `100dvh` (com fallback `100vh`) em qualquer altura de tela cheia. | Lição direta da auditoria (P2) sobre corte de layout em navegadores móveis com barra dinâmica. |
| RNF-04 | Campos de busca/input com `font-size` ≥16px em telas de toque. | Lição direta da auditoria (P3) sobre zoom automático no Safari iOS. |
| RNF-05 | Compatibilidade com WebViews internos de apps de mensagens (WhatsApp/Messenger), inclusive para reprodução de preview de áudio. | A v1 já distribui conteúdo via WhatsApp e a auditoria documentou várias restrições desse ambiente (download, pop-up, `history.back()`). |
| RNF-06 | Aplicação instalável como PWA, com ícone e nome próprios na tela inicial do dispositivo. | Requisito explícito da v2. |
| RNF-07 | Caminho técnico aberto para uso offline, sem que isso seja obrigatório na primeira entrega. | Requisito explícito da v2 ("possibilidade futura"). |
| RNF-08 | Hospedagem sem custo recorrente. | Requisito explícito da v2. |
| RNF-09 | Publicação automática a cada atualização de catálogo/estilo. | Requisito explícito da v2. |
| RNF-10 | Arquitetura modular, com módulos substituíveis/expansíveis de forma independente. | Requisito explícito da v2; também já era um valor da v1 (import/export plugável). |
| RNF-11 | Manutenção simples por uma única pessoa/equipe pequena, sem exigir infraestrutura de servidor dedicado. | Decorre da filosofia "rapidez, simplicidade, manutenção simples". |
| RNF-12 | Escalabilidade do catálogo (a v1 já opera com centenas/milhares de subpastas — 165 na amostra atual, até ~1.500 mencionadas em comentários de código) sem degradar a busca/renderização. | Já é uma preocupação de performance explícita no código da v1 (`search.js`, `normalizeText.js` com *early exit* de Levenshtein). |
| RNF-13 | Acessibilidade básica (semântica, `aria-*`, contraste), no padrão já iniciado na v1. | Observado no HTML/CSS da v1 (uso de `aria-label`, `role="checkbox"`, etc.). |
| RNF-14 | Segurança de conteúdo: qualquer texto vindo de dados externos deve ser escapado antes de renderizar. | Padrão já seguido na v1 (`escaparHtml`); deve ser mantido. |

---

## 6. Arquitetura recomendada

### 6.1 Visão geral

Recomenda-se uma **Single Page Application (SPA) estática, entregue como PWA**, com os dados do catálogo consumidos como **arquivo(s) JSON estático(s) versionado(s)** — mesma filosofia de "app não conhece a origem dos dados" já provada na v1 (a `app/` da v1 nunca depende de CSV/HTML, só do `catalogo.json` consolidado). Essa separação é o encaixe natural com o requisito de publicação automática: um pipeline de dados gera o(s) JSON(s), um pipeline de build gera os artefatos estáticos da aplicação, e um pipeline de deploy publica ambos.

```
┌─────────────────────┐      ┌──────────────────────┐      ┌───────────────────────┐
│   CAMADA DE DADOS    │      │  CAMADA DE APLICAÇÃO  │      │   CAMADA DE ENTREGA    │
│ (equivalente ao      │      │  (PWA — HTML/CSS/JS   │      │ (hospedagem estática   │
│  admin/ da v1,       │ ───► │   modular, sem        │ ───► │  gratuita + CDN +      │
│  estendido com preço/│      │   servidor de app)    │      │  publicação automática)│
│  espaço/preview)     │      │                       │      │                        │
└─────────────────────┘      └──────────────────────┘      └───────────────────────┘
```

### 6.2 Por que não um backend tradicional (por padrão)

Nada no objetivo do produto exige estado compartilhado entre usuários em tempo real, autenticação de conta, nem processamento de pagamento *dentro* do catálogo (isso é uma lacuna registrada na seção 4.2). Um backend dedicado aumentaria custo, complexidade operacional e tempo de carregamento — na contramão direta da filosofia declarada. A recomendação é **arquitetura estática por padrão**, com backend introduzido **somente** se a decisão da seção 4.2 (o que acontece ao "finalizar") exigir persistência server-side (ex.: checkout real, envio automático de pedido a um sistema do lojista) — nesse caso, a peça de backend deve ser um serviço pequeno e isolado (ex.: uma função serverless), não um redesenho da aplicação inteira.

### 6.3 Camadas internas da aplicação (frontend)

Mantendo o princípio de responsabilidade única já usado com sucesso na v1 (cada módulo JS com um papel só), a v2 deve separar:

- **Camada de dados/serviço** — acesso somente-leitura ao catálogo (equivalente ao `CatalogService` da v1), mais um novo serviço de **estimativa** (quantidade/espaço/investimento).
- **Camada de estado do cliente** — seleção do usuário, favoritos (se mantidos), persistência local (equivalente a `selection.js`/`favorites.js`/`storage.js`).
- **Camada de navegação/experiência** — controla em qual "tela de experiência" o usuário está (não em qual pasta) — ver seção 8.
- **Camada de apresentação/design system** — componentes visuais reaproveitáveis, no padrão de dashboard profissional pedido.
- **Camada de mídia/preview** — reprodução controlada de áudio, com apenas um preview tocando por vez.
- **Camada de plataforma (PWA)** — *service worker*, *manifest*, estratégia de cache (seção 14).

### 6.4 Escolha de stack

**[LACUNA]** Não houve, no briefing, uma exigência de framework específico (React, Vue, Svelte, ou JS puro como na v1). Como decisão de arquitetura, e não de implementação, este documento recomenda apenas os **critérios** que a escolha da stack deve satisfazer, deixando a ferramenta específica para a etapa de implementação:
- Deve compilar para **artefatos 100% estáticos** (HTML/CSS/JS), sem exigir um servidor Node em produção.
- Deve suportar *code-splitting*/carregamento sob demanda, para manter o carregamento inicial rápido mesmo com o catálogo crescendo.
- Deve ter suporte maduro a *service worker*/PWA no ecossistema de build escolhido.
- Deve permitir a mesma filosofia "zero dependência de rede em runtime" da v1 sempre que possível (ex.: ícones inline em vez de fontes de ícone externas, como já é feito em `iconLibrary.js`).

---

## 7. Estrutura das telas

Pensada como **experiência do cliente**, não como hierarquia de pastas:

1. **Entrada / Início** — apresentação rápida do catálogo, atalho para busca, visão geral dos estilos em destaque.
2. **Explorar estilos** — grade/lista de estilos musicais navegável e pesquisável (equivalente evoluído da "grade de categorias" da v1).
3. **Detalhe do estilo** — onde o preview de áudio é reproduzido, com ação clara de "adicionar à seleção" (substitui a ideia de "entrar na subpasta" da v1 por uma tela orientada a decisão de compra).
4. **Minha seleção (resumo do pedido)** — equivalente ao "painel de seleção" da v1, mas exibindo os três indicadores centrais do produto: quantidade estimada de músicas, espaço estimado, investimento estimado — sempre visíveis, não só no fim.
5. **Finalizar seleção** — tela de confirmação/fechamento do pedido (conteúdo exato dependente da decisão da lacuna 4.2).
6. **Estado vazio / erro** — equivalente ao tratamento já existente na v1 (`_htmlEstadoVazio`, tela de erro crítico quando o catálogo não carrega), mantido como boa prática.

Uma **barra/indicador persistente** com o resumo da seleção (contagem, espaço, investimento) deve ficar visível durante toda a navegação (não só dentro da tela 4), para reforçar constantemente o valor sendo construído pelo cliente — um padrão comum em dashboards e fluxos de carrinho de compra.

---

## 8. Fluxo de navegação

```
Início
  │
  ▼
Explorar estilos ──(buscar)──► Resultados de busca ──┐
  │                                                    │
  ▼                                                    │
Detalhe do estilo ◄─────────────────────────────────────┘
  │  (ouvir preview)
  │  (selecionar estilo)
  ▼
Minha seleção (resumo ao vivo: qtde. músicas | espaço | investimento)
  │
  ▼
Finalizar seleção
```

Diferente da v1 — onde a navegação é estruturalmente `categorias → subpastas de uma categoria → busca` —, a v2 deve tratar **busca, exploração e seleção como parte contínua do mesmo fluxo**, sem que o usuário precise "entrar" formalmente em uma pasta para tomar uma decisão. O resumo de seleção (RF-06) deve ser alcançável a partir de qualquer tela, em 1 toque — um padrão de carrinho persistente.

---

## 9. Arquitetura dos dados

### 9.1 O que já existe e pode ser reaproveitado

O schema atual (`catalogo.json`, versão 1.1) já modela:

```json
{
  "id": "rock",
  "nome": "Rock",
  "icone": "guitarra",
  "cor": "#E8A33D",
  "quantidade_subcategorias": 12,
  "subcategorias": [
    {
      "id": "rock__classic-rock",
      "nome": "Classic Rock",
      "url": null,
      "quantidade_musicas": null,
      "bpm_medio": null,
      "artistas": [],
      "descricao": null,
      "caminho_pasta": null
    }
  ]
}
```

Os campos `quantidade_musicas`, `bpm_medio`, `artistas`, `descricao` e `caminho_pasta` **já existem no schema desde a v1**, mas **em nenhum dado real fornecido eles estão preenchidos** — todos aparecem como `null` na amostra analisada (40 categorias, 165 subcategorias). Ou seja: a v1 já previa arquiteturalmente esse tipo de expansão, mas nunca a implementou.

### 9.2 O que precisa ser criado para a v2

Para atender aos requisitos RF-06 (quantidade, espaço, investimento), o modelo de dados do estilo precisa, no mínimo, de:

- **Quantidade de músicas** por estilo (`quantidade_musicas`, já reservado) — necessário para estimar a soma da seleção.
- **Tamanho médio estimado** por estilo (em MB ou por faixa) — **[LACUNA]** não existe hoje nenhum campo equivalente nem dado de referência (nem sequer um tamanho médio de arquivo de música) nos anexos.
- **Preço/regra de precificação** por estilo, por música, ou por faixa de tamanho — **[LACUNA]** nenhuma informação de preço, tabela de preços ou lógica comercial (ex.: preço fixo por pendrive, preço por GB, desconto por volume) foi fornecida.
- **Referência de preview de áudio** por estilo (arquivo, URL de streaming, ou identificador de faixa) — **[LACUNA]** não há, nos anexos, nenhum arquivo de áudio, nem link de preview, nem indicação de onde essas prévias seriam hospedadas ou geradas. O campo `subcategoria.url` existente na v1 aponta para o **painel de origem** (fonte de onde o item foi importado), não para um arquivo de áudio.

Essas lacunas são as mais importantes do documento inteiro: **a arquitetura pode prever onde esses dados entram no sistema, mas os valores em si (preços, tamanhos médios, arquivos de preview) precisam vir do solicitante antes da implementação.**

### 9.3 Proposta de extensão do schema (nível conceitual, sem código)

Mantendo compatibilidade com o modelo existente, propõe-se pensar cada "estilo" (equivalente à atual `subcategoria`) com estes grupos de atributos:
- **Identidade e apresentação**: nome, ícone, cor (já existentes).
- **Conteúdo**: referência de preview de áudio; descrição curta (campo `descricao` já reservado).
- **Métricas de catálogo**: quantidade de músicas; tamanho médio estimado (novo).
- **Métricas comerciais**: regra de precificação aplicável (novo — a granularidade exata depende da lacuna 9.2).

O **motor de estimativa** (quantidade/espaço/investimento) deve ser um serviço separado, que recebe a lista de estilos selecionados e devolve os três números — nunca lógica espalhada pela tela, para poder evoluir a regra de negócio (ex.: mudar de "preço por estilo" para "preço por GB") sem tocar na interface.

### 9.4 Origem e atualização dos dados

**[LACUNA]** Não foi informado se a fonte de dados da v2 continuará sendo o mesmo CSV/HTML de origem já usados na v1, se passará a existir uma nova fonte (planilha de preços, por exemplo) a ser mesclada, ou se haverá um painel administrativo de fato. A arquitetura de importação/validação/mesclagem por prioridade já validada na v1 (seção 17) é reaproveitável como **padrão**, mas as fontes concretas da v2 precisam ser definidas.

---

## 10. Estrutura das pastas

Estrutura proposta em nível conceitual (a organização interna de arquivos pode continuar existindo — o que muda é que o **usuário nunca a vê**; ele vê apenas telas/experiência, conforme a seção 7):

```
CatalogoMusical2/
│
├── data-pipeline/            # Equivalente evoluído do admin/ da v1
│   ├── importers/            # Reaproveita o padrão BaseImporter/CatalogItem
│   ├── pricing/              # NOVO — regras de precificação
│   ├── media/                # NOVO — organização/referência dos previews
│   └── build/                # Gera o(s) JSON(s) estático(s) de saída
│
├── app/                       # Aplicação cliente (PWA)
│   ├── design-system/         # Componentes visuais reaproveitáveis
│   ├── features/
│   │   ├── explorar-estilos/
│   │   ├── detalhe-estilo/
│   │   ├── selecao/           # "carrinho" + estimativa ao vivo
│   │   └── finalizar/
│   ├── core/                  # Serviços de dados, estado, navegação
│   ├── pwa/                   # manifest, service worker, ícones
│   └── dados/                 # JSON(s) gerados pelo data-pipeline
│
├── docs/
│   └── ARQUITETURA.md         # Este documento evolui aqui
│
└── .ci/                        # Pipeline de publicação automática (seção 15)
```

Esta estrutura preserva o valor já comprovado na v1 de **separar claramente "quem gera dado" de "quem consome dado"**, mas organiza a aplicação por **feature/experiência** (`explorar-estilos`, `detalhe-estilo`, `selecao`, `finalizar`) em vez de por tipo técnico de arquivo, alinhado ao pedido explícito de pensar em experiência, não em pastas.

---

## 11. Estratégia para previews

Como não há, nos anexos, nenhum arquivo de áudio, link de streaming ou indicação de licenciamento **[LACUNA]**, este documento não recomenda uma única solução técnica fechada, mas define os critérios que a decisão precisa respeitar, e as opções compatíveis com a arquitetura recomendada:

- **Compatibilidade com WebViews restritos** (WhatsApp/Messenger) — a auditoria já mostrou que esse ambiente restringe downloads e pop-ups; a reprodução de áudio deve ser testada especificamente nesses navegadores internos antes de ser considerada confiável.
- **Apenas um preview tocando por vez**, com controle central (equivalente, em espírito, ao padrão *singleton* que a v1 já usa para outros estados globais).
- **Prévias curtas** (poucos segundos), para manter o carregamento leve e reduzir custo de armazenamento/banda, especialmente relevante junto de uma hospedagem gratuita (seção 12).
- **Origem do arquivo de áudio**: pode ser (a) arquivos estáticos hospedados junto com o app, (b) um serviço de streaming de terceiros, ou (c) outra fonte ainda não definida — **essa escolha depende de uma decisão de negócio (direitos de uso, custo, catálogo já existente em outro lugar) que não estava nos anexos.**
- **Carregamento sob demanda**: o preview de um estilo só deve ser buscado quando o usuário efetivamente abrir/tocar aquele estilo, nunca pré-carregado para o catálogo inteiro (fundamental para RNF-01 e para a estratégia de cache, seção 14).

---

## 12. Estratégia para hospedagem gratuita

A arquitetura recomendada (aplicação 100% estática) é compatível, por definição, com qualquer provedor de hospedagem estática com camada gratuita — os requisitos que essa hospedagem precisa cumprir são:

- Servir arquivos estáticos com **HTTPS** (obrigatório para PWA instalável e para `navigator.share`/Service Worker funcionarem corretamente).
- Suportar **CDN**/distribuição geograficamente próxima ao usuário, para manter o carregamento rápido.
- Permitir **deploy automatizado a partir de um repositório de código** (necessário para a publicação automática — seção 15).
- Ter **limite de banda/armazenamento gratuito compatível** com o volume de acesso esperado — **[LACUNA]** nenhuma estimativa de tráfego mensal, número de clientes ou frequência de acesso foi informada, o que impede recomendar um provedor específico com segurança (previews em áudio, em particular, consomem bem mais banda que texto/JSON e podem aproximar o projeto de limites gratuitos dependendo do volume).
- Suportar **domínio próprio** opcionalmente, caso o negócio já tenha um domínio — **[LACUNA]** não informado.

Este documento não recomenda um provedor específico por nome como decisão fechada de arquitetura (isso é uma decisão de implementação/operacional, e o mercado de hospedagem estática gratuita muda com frequência); recomenda-se validar as opções vigentes no momento da implementação contra os critérios acima.

---

## 13. Estratégia para PWA

Componentes necessários, no nível de arquitetura (sem código):

- **Web App Manifest**: nome, nome curto, cores de tema/splash, ícones em múltiplas resoluções, modo de exibição (standalone), tela inicial. **[LACUNA]** a pasta de ícones da v1 (`app/assets/icons/`) contém apenas um arquivo `LEIA-ME.txt`, sem nenhum ícone real — nenhum ativo visual de marca (logo, ícone de app) foi fornecido nos anexos.
- **Service Worker**: responsável por instalar o app, servir o *app shell* offline e aplicar a estratégia de cache (seção 14).
- **Critérios de instalabilidade**: HTTPS (depende da hospedagem, seção 12), manifest válido, service worker registrado — pré-requisitos técnicos padrão de qualquer PWA.
- **Diferença de suporte entre plataformas**: Safari/iOS historicamente tem suporte mais limitado a recursos de PWA (e a própria auditoria da v1 já documentou várias particularidades do WebKit/iOS) — a experiência precisa **degradar graciosamente** para "site normal, rápido, num navegador" em qualquer dispositivo que não suporte instalação completa, nunca depender da instalação para o fluxo principal funcionar.
- Nenhuma exigência de "modo offline completo" na primeira versão (é possibilidade futura, RNF-07) — a arquitetura deve deixar essa porta aberta (ex.: já separar o que é *app shell* do que é dado dinâmico), sem construir o offline completo agora.

---

## 14. Estratégia de cache

Recomenda-se uma estratégia em camadas, coerente com o service worker da seção 13:

| Tipo de conteúdo | Estratégia recomendada | Motivo |
|---|---|---|
| *App shell* (HTML/CSS/JS da aplicação) | *Cache-first*, com atualização em segundo plano | Carregamento instantâneo em visitas repetidas; app shell muda pouco entre publicações. |
| Dados do catálogo (JSON de estilos/preços) | *Stale-while-revalidate* (mostra o cache imediatamente, atualiza em segundo plano) | Permite abrir rápido mesmo com conexão ruim, mas evita mostrar preço desatualizado por muito tempo. |
| Previews de áudio | *Cache sob demanda*, só após reprodução, com limite de tamanho total | Evita ocupar armazenamento do dispositivo com previews nunca ouvidos; relevante em dispositivos mais antigos, público já identificado como multigeracional. |
| Ícones/assets de marca | *Cache-first* de longa duração | Mudam raramente. |

**[LACUNA]** Não há informação sobre a frequência esperada de mudança de preços/catálogo (diária? sazonal?), o que ajudaria a calibrar o tempo de expiração ideal do cache de dados — a estratégia *stale-while-revalidate* acima é uma recomendação segura na ausência dessa informação, por nunca bloquear o carregamento esperando a rede.

---

## 15. Estratégia para publicação automática

Reaproveitando o princípio já provado na v1 — de que o pipeline de dados (`admin/atualizar.py`) é independente da aplicação —, a v2 deve ter uma esteira de publicação com três etapas encadeadas, disparadas automaticamente a partir de mudanças no repositório de código/dados:

```
1) Build dos dados         2) Build da aplicação        3) Publicação
   (gera o(s) JSON(s)    ──►  (empacota o PWA:      ──►    (envia os artefatos
   finais de estilos/         HTML/CSS/JS/manifest/         estáticos para a
   preços a partir das         service worker)               hospedagem gratuita)
   fontes configuradas)
```

- A etapa 1 é a evolução natural do pipeline Python já existente (importadores → validação → mesclagem → exportação), estendida com os novos atributos de preço/tamanho/preview (seção 9).
- A etapa 2 e 3 são responsabilidade de uma esteira de integração/entrega contínua (CI/CD), disparada por push no repositório — este é um padrão de mercado amplamente disponível de graça para repositórios pequenos/médios em diversas plataformas de hospedagem de código, mas a ferramenta específica **[LACUNA]** não foi definida no briefing e deve ser escolhida na implementação, respeitando o critério de "gratuito" já exigido.
- Cada publicação deve ser **rastreável** (equivalente ao `admin/logs/ultima_atualizacao.log` já existente na v1) para permitir auditoria de quando um preço ou estilo mudou.

---

## 16. Riscos técnicos

| Risco | Impacto | Observação |
|---|---|---|
| Ausência de dados de preço/tamanho/preview (lacunas da seção 9) | **Alto** — bloqueia a implementação do requisito central do produto (RF-06) | Este é o maior risco do projeto: a arquitetura pode ser construída, mas os números que o cliente vê (quantidade, espaço, investimento) não existem ainda em nenhuma fonte fornecida. |
| Indefinição do que ocorre em "finalizar seleção" (lacuna 4.2) | **Alto** — muda a necessidade ou não de backend/pagamento | Deve ser decidido antes da fase de implementação do módulo de finalização (seção 20). |
| Restrições de WebViews internos (WhatsApp/Messenger) para áudio/PWA | **Médio** | A auditoria já comprovou restrições nesse ambiente para download/pop-up/histórico; reprodução de áudio e instalação de PWA dentro desses WebViews têm suporte historicamente inconsistente e devem ser testadas cedo. |
| Suporte parcial/inconsistente a PWA no Safari/iOS | **Médio** | Recorrente no mercado; a auditoria da v1 já documentou várias particularidades específicas de iOS/WebKit (100vh, zoom em input) que reforçam a necessidade de testar nessa plataforma especificamente. |
| Custo de banda de previews de áudio em hospedagem gratuita | **Médio** | Sem estimativa de tráfego (lacuna da seção 12), o risco de estourar limites gratuitos com arquivos de áudio (mais pesados que texto/JSON) não pode ser descartado. |
| Crescimento do catálogo afetando performance de busca no cliente | **Baixo/Médio** | A v1 já opera na casa de centenas/milhares de itens com busca client-side com bom desempenho (uso de *early exit* no Levenshtein); a v2 deve validar esse limite à medida que estilos com preview/preço forem adicionados (payload de dados maior por item). |
| Dependência de um processo de atualização de catálogo ainda não redesenhado (lacuna 9.4) | **Médio** | Sem clareza de quem/como vai manter preços e previews atualizados, a "publicação automática" (RNF-09) fica sem gatilho definido. |
| Falta de ativos de marca (ícones/logo) para o PWA | **Baixo** | Fácil de resolver, mas bloqueia literalmente a geração do manifest antes de existir. |

---

## 17. Itens reutilizáveis da versão atual

Itens que **realmente fazem sentido** reaproveitar (como padrão, código ou conceito) na v2:

- **Modelo de domínio único no pipeline** (`CatalogItem` em `models.py`) e o desenho em estágios (importar → validar → mesclar → exportar), que já prova ser extensível sem alterar módulos existentes — base sólida para incorporar os novos atributos comerciais.
- **Regra de prioridade configurável entre fontes** (`PRIORIDADE_IMPORTADORES` em `config.py`), útil se a v2 mantiver múltiplas fontes de dados (ex.: catálogo + planilha de preços).
- **Normalização de texto e busca aproximada** (`normalizeText.js`: remoção de acentos, colapso de espaços, distância de Levenshtein com *early exit*), que já resolve bem busca tolerante a erro de digitação em um acervo grande.
- **Padrão de persistência local com degradação segura** (`storage.js`: tenta `localStorage`, cai para memória se bloqueado) — aplicável diretamente à persistência da seleção/carrinho da v2.
- **Padrão de biblioteca de ícones SVG inline determinística por categoria** (`iconLibrary.js` + `MAPA_ICONES_POR_PALAVRA_CHAVE`), evitando dependência de fontes de ícone externas — alinhado ao requisito de carregamento rápido.
- **Escolha de cor determinística por hash** (para não "embaralhar" cores já vistas pelo usuário a cada regeneração do catálogo) — bom padrão a manter caso a v2 continue atribuindo cor por estilo.
- **Lições de acessibilidade/compatibilidade documentadas na auditoria** (44×44px mínimo de toque, `100dvh` com fallback, `font-size:16px` em inputs de toque, cuidado com `color-mix()` sem fallback, fragilidade de download/pop-up em WebViews restritos) — devem ser tratadas como requisitos de partida da v2, não como bugs a redescobrir.
- **Filosofia de fallback gracioso** presente em vários módulos (armazenamento, histórico de navegação, compartilhamento, exportação) — vale como princípio de engenharia a carregar para o novo projeto, independentemente da tecnologia escolhida.
- **Conteúdo do catálogo já existente** (categorias e subpastas cadastradas) como ponto de partida de dados, ainda que sua estrutura/apresentação mude.

---

## 18. Itens que devem ser descartados

- **O modelo mental de navegação por pastas** (`categoria → subpastas`) como estrutura de experiência do usuário — pode continuar existindo como organização de dados internamente, mas não deve guiar as telas da v2 (conforme instrução explícita do briefing: "não pensar em pastas, pensar em experiência").
- **O exportador de arquivo único para WhatsApp** (`exporter_standalone.py`, tela de "arquivo único offline") como mecanismo de distribuição da aplicação em si — ele resolve um problema específico da v1 (app 100% offline sem hospedagem) que deixa de existir na v2, já que a v2 será hospedada e acessada por URL/PWA. Pode continuar existindo **apenas para a v1 congelada**, sem equivalente na v2.
- **A identidade visual atual** ("vinil"/tema escuro voltado a acervo musical genérico) não deve ser assumida como definitiva — o briefing pede uma referência visual de dashboard profissional (Vercel/Stripe/Supabase/Grafana/Linear/Notion), o que é uma direção de design distinta da atual e deve ser tratada como uma decisão de design a refazer, não a herdar.
- **Dependência de execução manual, local e em Windows** do pipeline de atualização (`python atualizar.py` rodado à mão pelo administrador) como único mecanismo de atualização de dados — incompatível com o requisito de publicação automática (RNF-09); o *conceito* do pipeline é reaproveitável (seção 17), mas sua forma de execução manual não deve ser a única via na v2.
- **Uso de `window.history.back()`/hash da URL como navegação primária** — útil como "bônus" (como a própria v1 já trata), mas não deve ser a base da navegação orientada à experiência da v2, especialmente considerando o uso majoritário em WebViews restritos onde a History API é pouco confiável (já documentado na auditoria).

---

## 19. Roadmap da versão 2.0

| Fase | Objetivo | Depende de |
|---|---|---|
| **Fase 0 — Preparação de dados e decisões de negócio** | Resolver as lacunas críticas: modelo de precificação, tamanho médio por estilo, fonte dos previews de áudio, definição do que ocorre em "finalizar seleção". | Decisão do solicitante — nenhuma implementação pode avançar de forma confiável sem isso. |
| **Fase 1 — MVP de navegação e seleção** | Explorar estilos, buscar, selecionar/deselecionar, ver seleção — sem preview nem estimativa ainda. | Catálogo de estilos existente (reaproveitado da v1). |
| **Fase 2 — Preview de áudio** | Reprodução de prévia por estilo, com o comportamento definido na seção 11. | Fonte de arquivos/links de preview (Fase 0). |
| **Fase 3 — Estimador comercial** | Cálculo ao vivo de quantidade de músicas, espaço e investimento. | Dados comerciais definidos na Fase 0. |
| **Fase 4 — Finalização do pedido** | Implementar o fluxo real de "finalizar seleção", conforme decisão da Fase 0. | Decisão de negócio da Fase 0 (seção 4.2). |
| **Fase 5 — PWA e cache** | Manifest, ícones, service worker, estratégia de cache (seções 13–14). | Ativos de marca (ícones/logo) — hoje inexistentes. |
| **Fase 6 — Hospedagem e publicação automática** | Esteira de build/deploy contínuo (seção 15). | Escolha do provedor de hospedagem gratuita e da ferramenta de CI. |
| **Fase 7 — Polimento e escala** | Ajustes de performance, acessibilidade e testes reais em dispositivos/WebViews (replicando a mesma disciplina de testes já demonstrada na auditoria da v1). | Fases anteriores concluídas. |

A ordem acima prioriza validar cedo o fluxo de experiência (Fase 1–2) antes de investir na parte comercial (Fase 3–4), mas a **Fase 0 é bloqueante** para que a Fase 3 em diante tenha números reais em vez de estimativas fictícias.

---

## 20. Plano de implementação dividido em módulos independentes

Cada módulo abaixo pode ser especificado, construído e evoluído de forma isolada, comunicando-se apenas pelos contratos de dados definidos na seção 9 — mesmo princípio de baixo acoplamento já demonstrado na v1 entre `admin/` e `app/`.

1. **Módulo de Dados/Pipeline** — importação, validação, mesclagem e geração dos JSON(s) finais de estilos (evolução do pipeline Python da v1, com os novos atributos comerciais).
2. **Módulo de Precificação** — regra de cálculo de investimento a partir da seleção (isolado do restante, para poder mudar a regra de negócio sem tocar em UI).
3. **Módulo de Estimativa de Volume** — cálculo de quantidade de músicas e espaço estimado a partir da seleção.
4. **Módulo de Catálogo/Busca (cliente)** — exploração e busca de estilos no app (evolução de `catalogService.js` + `normalizeText.js`/busca fuzzy da v1).
5. **Módulo de Preview de Áudio** — reprodução controlada, um preview por vez, com carregamento sob demanda.
6. **Módulo de Seleção (carrinho)** — estado da seleção do cliente, persistência local (evolução de `selection.js`/`storage.js`).
7. **Módulo de Finalização** — fluxo de encerramento do pedido (escopo depende da decisão da lacuna 4.2).
8. **Módulo de Design System** — componentes visuais reaproveitáveis no estilo "dashboard profissional" pedido.
9. **Módulo de Navegação/Experiência** — orquestra as telas da seção 7 sem expor conceito de pasta ao usuário.
10. **Módulo PWA** — manifest, ícones, service worker, estratégias de cache.
11. **Módulo de Publicação (CI/CD)** — build de dados → build de app → deploy automático, com rastreabilidade (log de publicação).

Essa divisão permite que a Fase 0 (seção 19) avance em paralelo com o início dos módulos 4, 6, 8 e 9 — que não dependem das lacunas de negócio — enquanto os módulos 2, 3, 5 e 7 aguardam as decisões pendentes.

---

## Anexo A — Lacunas de informação identificadas (consolidado)

Nenhuma destas foi assumida ou preenchida por suposição neste documento; estão listadas aqui para facilitar o acompanhamento e a coleta junto ao solicitante antes da implementação.

1. Personas formais, faixa etária predominante e volume esperado de acesso/pedidos (seção 3).
2. Se o catálogo será usado em modo self-service pelo cliente final ou como apoio durante atendimento (seção 3).
3. O que exatamente ocorre ao "finalizar a seleção" — resumo/contato, checkout com pagamento, ou envio a um sistema do lojista (seção 4.2 e 16).
4. Se haverá interface administrativa própria na v2 ou continuidade de um processo manual/Python equivalente ao da v1 (seção 4.3 e 9.4).
5. Framework/stack de frontend a utilizar (nenhuma exigência declarada — seção 6.4).
6. Tamanho médio de arquivo/estilo (para estimativa de espaço) (seção 9.2).
7. Regra e valores de precificação (preço fixo, por música, por GB, por pacote, etc.) (seção 9.2).
8. Fonte, formato e licenciamento dos arquivos/links de preview de áudio (seção 9.2 e 11).
9. Se a fonte de dados da v2 será a mesma da v1 (CSV/HTML) ou incluirá novas fontes (ex.: planilha de preços) (seção 9.4).
10. Estimativa de tráfego/uso mensal, para dimensionar hospedagem gratuita com segurança (seção 12).
11. Existência ou não de domínio próprio para o produto (seção 12).
12. Ativos de marca — logo/ícones em resoluções adequadas para o manifest do PWA (seção 13).
13. Frequência esperada de atualização de preços/catálogo, para calibrar o cache de dados (seção 14).
14. Ferramenta de CI/CD e provedor de hospedagem gratuita específicos a adotar (decisão de implementação, seção 15).
