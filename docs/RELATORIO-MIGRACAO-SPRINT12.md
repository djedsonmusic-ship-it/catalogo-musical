# Relatório de Migração — Sprint 12

Fonte: `catalogo_origem.csv` (anexado pelo usuário), copiado para
`ferramentas/catalogo_origem.csv`.

## ✔ Estrutura identificada no CSV

- **Codificação**: Latin-1 (ISO-8859-1), quebras de linha CRLF.
- **Delimitador**: `;`
- **Colunas**: exatamente 2 — `Categoria` e `Subpasta`.
- **165 linhas de dados**, todas com as 2 colunas preenchidas
  (nenhuma célula vazia).
- **40 categorias únicas**, de 1 a 27 subpastas cada (ex.:
  "Eletrônicas" tem 27; "Blues", "Zumba", "Pop" etc. têm só 1).
- **Nenhum par (Categoria, Subpasta) duplicado.**
- O CSV representa a **estrutura de pastas real** do acervo do DJ —
  não existe, em nenhuma coluna, preço, quantidade de músicas,
  espaço, tags, descrição ou status. Só nomes de categoria e de
  subpasta.

## ✔ Problemas encontrados

1. **2 linhas com espaço em branco nas bordas do valor**
   (`"Gospel;Funk "` e `"MPB; Melhores da MPB"`) — corrigidos
   automaticamente pelo script (`.strip()`).
2. **1 valor com espaço duplo interno** (`"Black  98 - 2000"` →
   `"Black 98 - 2000"`) — corrigido automaticamente.
3. **2 valores com apóstrofo substituído por `_`**
   (`"Gigi D_Agostino"` → `"Gigi D'Agostino"`, `"Drum N_Bass"` →
   `"Drum N'Bass"`) — são claramente um artefato de uma exportação
   anterior (outros nomes no mesmo CSV usam apóstrofo normal, ex.:
   *"Rock 'n' Roll Clássico"*). Corrigidos no script, com a lista
   exata das duas substituições documentada no próprio código
   (`CORRECOES_TEXTO`), para ficar rastreável.
4. **2 categorias com caracteres que exigem slug especial**
   (`"Pop / Rock"` → id `pop-rock`, `"Rap - Hip Hop"` → id
   `rap-hip-hop`) — resolvido pela normalização de slug (acentos e
   símbolos viram hífen).
5. **Nenhum dado comercial no CSV** (preço, quantidade de músicas,
   espaço) — não é um "erro" do arquivo, é simplesmente uma coluna
   que não existe nele. Tratado como pendência (ver abaixo), não
   como inconsistência a corrigir.

Nenhum desses problemas impediu a migração — todos tinham correção
simples e de baixo risco, listada acima com total transparência.

## ✔ Estratégia adotada para migração

- **1 script Python** (`ferramentas/migrar-csv-para-catalogo.py`),
  sem dependências além da biblioteca padrão — lê o CSV e gera os
  mesmos arquivos que o app já lê (`app/dados/manifesto.json` e
  `app/dados/estilos/*.json`), respeitando exatamente o schema
  definido em `docs/MODELO-DE-DADOS.md` (Sprint 04). **Nenhuma
  arquitetura foi alterada** — o app continua sem saber que os dados
  vieram de um CSV; ele só enxerga os mesmos JSONs de sempre.
- **1 Categoria → 1 arquivo**; **1 linha do CSV (Subpasta) → 1
  Subcategoria + 1 Estilo filho** — a mesma relação 1:1 já usada e
  documentada desde a Sprint 04 (o modelo já suporta N estilos por
  subcategoria; o CSV simplesmente não distingue os dois níveis
  ainda).
- **Reexecutável**: para atualizar o catálogo no futuro, basta
  substituir `ferramentas/catalogo_origem.csv` e rodar o script de
  novo — ele também remove automaticamente arquivos de categorias
  que não existem mais no CSV atual, evitando lixo acumulado.
- **IDs estáveis**: gerados por posição (`est_<categoria>_001`,
  `002`...) na ordem em que aparecem no CSV. Se uma linha for
  reordenada numa atualização futura, o `id` dela pode mudar — ver
  "Pendências" abaixo.

## ✔ Arquivos gerados

- `ferramentas/catalogo_origem.csv` (cópia da fonte)
- `ferramentas/migrar-csv-para-catalogo.py` (script, reexecutável)
- `app/dados/manifesto.json` (substituído — 40 categorias, 165 subcategorias)
- `app/dados/estilos/*.json` (40 arquivos, substituindo os 6 de exemplo da Sprint 01/04)
- `COMO_ADICIONAR_ESTILOS.md` (nova seção "0. Atualização em massa via planilha/CSV")

## ✔ Validação pós-migração

| Verificação | Resultado |
|---|---|
| Categorias | 40 |
| Subcategorias | 165 |
| Estilos | 165 |
| IDs duplicados (categoria/subcategoria/estilo) | nenhum |
| Registros com campo obrigatório ausente | nenhum |
| Referências órfãs (categoria/subcategoria inexistente) | nenhuma |
| JSON válido em todos os arquivos gerados | sim |
| `node --check` em todos os `.js` do app | sem erros |
| Ícones atribuídos existem em `icons.js` | sim (guitarra, onda, violao, microfone, pandeiro, globo, padrao) |

## ✔ Pendências para lançamento

1. **Dados comerciais zerados em 100% dos 165 estilos**
   (`quantidadeMusicasEstimada`, `espacoEstimadoMb`,
   `valorEstimadoCentavos` = `0`) — o CSV não trazia essa informação
   e nenhum valor foi inventado. Hoje o Resumo do Pedido mostrará
   R$ 0,00 e 0 músicas para qualquer seleção até esses campos serem
   preenchidos. **Este é o bloqueio real antes do lançamento**, não
   um problema técnico — ver seção 7 de `COMO_ADICIONAR_ESTILOS.md`.
2. **`descricaoCurta` vazia em todos os estilos** — nenhum texto foi
   inventado; o painel de detalhe funciona normalmente sem
   descrição, mas fica menos convincente para o cliente final.
3. **Nenhum estilo tem `previewUrl`** — esperado e correto para esta
   sprint (ver seção "PREVIEW" do briefing); o player já lida bem com
   isso desde a Sprint 08 ("preview ainda não disponível").
   Os 2 áudios de exemplo da Sprint 08 (`dados/audio-exemplo/*.wav`)
   ficaram órfãos (nenhum estilo real os referencia) — mantidos no
   projeto, sem uso, para eventual teste futuro.
4. **IDs de estilo dependem da ordem do CSV** — se uma atualização
   futura reordenar linhas em vez de só adicionar/remover, os `id`s
   podem mudar de estilo. Não afeta o funcionamento do site, mas pode
   fazer um `id` "sumir" e outro "aparecer" nos relatórios ao longo
   do tempo. Baixo risco, registrado para transparência.
5. **40 categorias é bastante para a grade "Todas"** sem filtro
   ativo — a Sprint 09 já limita isso a rolagem simples (sem
   paginação); com 165 estilos reais o desempenho continua leve, mas
   vale um teste visual real antes do lançamento (fora do escopo
   desta sprint, que era só dados).

## ✔ Dossiê de Continuidade

- **Fonte da verdade dos dados agora é o CSV**, não mais os JSONs
  editados à mão — qualquer atualização estrutural grande deve
  passar por `ferramentas/catalogo_origem.csv` +
  `migrar-csv-para-catalogo.py`, não por edição manual dos JSONs
  (que seria sobrescrita na próxima migração).
- Ajustes finos que o CSV não cobre (preço, descrição, tags) devem
  ser feitos **depois** de rodar o script, diretamente nos JSONs
  gerados, seguindo `COMO_ADICIONAR_ESTILOS.md` — e não serão
  perdidos a menos que o script rode de novo.
- Nenhum componente de UI, serviço (`catalogService`,
  `searchService`, `estimateService`, `previewService`) ou tela foi
  alterado nesta sprint — só o conteúdo de `app/dados/`.
- Histórico completo das 12 sprints em `docs/NOTAS-SPRINT.md`.
