# Modelo de Dados — Catálogo Musical (v3.0, Sprint 04)

Este documento descreve a estrutura definitiva dos dados do catálogo,
pensada para crescer de dezenas para milhares de registros sem exigir
nova reescrita da camada de acesso (`app/core/catalogService.js`).

Ainda não existe banco de dados — tudo continua em arquivos JSON
estáticos, mas normalizados (3 níveis) e divididos em módulos.

## Arquivos

```
app/dados/
├── manifesto.json        # Categorias + Subcategorias (leve, muda pouco)
└── estilos/
    ├── rock.json          # Estilos da categoria "rock"
    ├── eletronica.json    # Estilos da categoria "eletronica"
    ├── mpb.json
    ├── sertanejo.json
    ├── pagode-samba.json
    └── internacional.json # um módulo por categoria — a parte que cresce
```

Cada categoria tem seu próprio módulo de estilos. Adicionar uma
categoria nova = criar 1 entrada em `manifesto.json` + 1 arquivo em
`dados/estilos/`. Adicionar milhares de estilos a uma categoria
existente = só o arquivo daquela categoria cresce; os demais módulos
e o manifesto não são afetados.

## Modelo — Categoria

| Campo           | Tipo   | Descrição                                   |
|------------------|--------|----------------------------------------------|
| `id`             | string | Identificador único e estável (slug)          |
| `nome`           | string | Nome de exibição                              |
| `slug`           | string | Igual ao `id` nesta versão; reservado para URLs futuras |
| `icone`          | string | Chave do ícone (`design-system/icons.js`)     |
| `cor`            | string | Cor de identidade (hex)                       |
| `ordemExibicao`  | number | Ordena a listagem de categorias               |
| `status`         | string | `"ativo"` \| `"inativo"`                      |

## Modelo — Subcategoria

| Campo           | Tipo   | Descrição                                   |
|------------------|--------|------------------------------------------------|
| `id`             | string | Identificador único (`<categoriaId>__<slug>`)   |
| `categoriaId`    | string | Referência à Categoria-pai                      |
| `nome`           | string | Nome de exibição                                |
| `slug`           | string | Reservado para URLs futuras                     |
| `ordemExibicao`  | number | Ordena a listagem dentro da categoria           |
| `status`         | string | `"ativo"` \| `"inativo"`                        |

## Modelo — Estilo

| Campo                        | Tipo     | Descrição                                                        |
|-------------------------------|----------|--------------------------------------------------------------------|
| `id`                          | string   | Identificador único e estável, nunca reaproveitado                 |
| `categoriaId`                 | string   | Referência à Categoria                                             |
| `subcategoriaId`              | string   | Referência à Subcategoria                                          |
| `nome`                        | string   | Nome de exibição                                                   |
| `descricaoCurta`              | string   | 1 frase — evitar textos longos (ver Sprint 03, "evite excesso de texto") |
| `quantidadeMusicasEstimada`   | number   | Estimativa de faixas (dado de exemplo nesta fase)                  |
| `espacoEstimadoMb`            | number   | Estimativa de espaço em MB (dado de exemplo nesta fase)            |
| `valorEstimadoCentavos`       | number   | Valor provisório em centavos (dado de exemplo nesta fase)          |
| `tags`                        | string[] | Palavras-chave livres — preparado para filtro por tag (não implementado) |
| `status`                      | string   | `"ativo"` \| `"inativo"` — oculta sem apagar o registro             |
| `ordemExibicao`               | number   | Ordena a listagem dentro da subcategoria/categoria                  |

> `quantidadeMusicasEstimada`, `espacoEstimadoMb` e
> `valorEstimadoCentavos` continuam sendo dados de exemplo (ver
> `docs/NOTAS-SPRINT.md`, Sprint 01) — a regra de negócio definitiva
> chegará com o Módulo de Precificação/Volume, sem exigir mudança
> neste schema.

## Por que este formato, e não um único array aninhado

- **Busca/filtro/ordenação futuros**: um array plano de Estilos (por
  módulo) é trivial de filtrar e ordenar; uma árvore aninhada exigiria
  achatar a estrutura toda vez.
- **Paginação futura**: cada módulo de categoria já é uma fatia
  natural; paginar por categoria (ou por intervalo dentro do módulo)
  não exige reestruturar o JSON.
- **Lazy loading futuro**: como cada categoria já é um arquivo à
  parte, buscar só o módulo da categoria que o usuário abriu (em vez
  de todos, como hoje) é uma troca pontual em
  `catalogService.carregarCatalogo()` — não uma reestruturação de dados.
- **IDs estáveis e não reaproveitáveis**: permitem que a seleção do
  usuário (`selectionState`, guardada por `id`) e futuras integrações
  (ex.: relatórios) continuem válidas mesmo que nomes/descrições mudem.
- **`status`**: permite remover um estilo da vitrine sem apagar o
  registro (histórico, auditoria, e uma futura tela administrativa).

## O que NÃO foi implementado nesta sprint (por instrução explícita)

Busca por tag, ordenação escolhida pelo usuário, paginação real e
lazy loading sob demanda **não têm nenhuma tela ou botão** — apenas o
formato de dados e pequenas funções utilitárias já preparadas em
`catalogService.js` (`ordenarPorExibicao`, `listarTagsDisponiveis`),
que hoje não são chamadas por nenhuma tela.
