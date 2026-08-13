# Catálogo Musical 2.0 — MVP Comercial 1.0

Implementação inicial conforme o documento de arquitetura aprovado
em `docs/ARQUITETURA.md`. Ver `docs/NOTAS-SPRINT.md` para decisões e
observações registradas durante esta sprint.

**Para substituir os dados de exemplo pelo catálogo real** (estilos,
categorias, preços), use o guia **[`COMO_ADICIONAR_ESTILOS.md`](./COMO_ADICIONAR_ESTILOS.md)**
— escrito para quem não programa.

**Para produzir e organizar os previews de áudio**, use o guia
**[`GUIA_PREVIEWS.md`](./GUIA_PREVIEWS.md)**.

**Para importar previews em lote automaticamente** (inclusive mais de
1 preview por estilo), use o guia
**[`GUIA_IMPORTAR_PREVIEWS.md`](./GUIA_IMPORTAR_PREVIEWS.md)**.

## Como rodar localmente

Este é um app estático (HTML/CSS/JS com ES Modules), sem etapa de
build. Como navegadores bloqueiam `fetch()` de módulos ES a partir
de `file://`, é necessário servir a pasta `app/` por um servidor
HTTP simples:

```bash
cd app
python3 -m http.server 8000
# depois abra http://localhost:8000
```

ou, com Node instalado:

```bash
cd app
npx serve .
```

## Estrutura

```
CatalogoMusical2/
├── app/
│   ├── index.html
│   ├── app.js                 # orquestrador de navegação/experiência
│   ├── styles.css
│   ├── core/                  # dados, busca, seleção, persistência, estimativa
│   ├── design-system/         # tokens, componentes, ícones
│   ├── features/
│   │   ├── home/
│   │   ├── explorar-estilos/
│   │   ├── selecao/
│   │   └── finalizar/
│   ├── previews/               # áudios de preview (ver GUIA_IMPORTAR_PREVIEWS.md)
│   └── dados/
│       ├── manifesto.json     # Categorias + Subcategorias
│       └── estilos/*.json     # Estilos, um módulo por categoria
├── ferramentas/                # scripts de manutenção do catálogo (ver abaixo)
│   ├── migrar-csv-para-catalogo.py
│   ├── enriquecer-estilo.py
│   ├── importar_previews.py
│   ├── validar-enriquecimento.py
│   ├── previews_util.py        # módulo compartilhado (schema de previews)
│   ├── correcoes-texto.json    # correções de codificação do CSV de origem
│   ├── catalogo_origem.csv     # fonte dos dados (Categoria;Subpasta)
│   └── relatorio-enriquecimento.md  # gerado por validar-enriquecimento.py
└── docs/
    ├── ARQUITETURA.md         # documento mestre aprovado
    ├── MODELO-DE-DADOS.md     # schema definitivo (Sprint 04)
    └── NOTAS-SPRINT.md
```

## Ferramentas (`ferramentas/`)

Scripts de manutenção do catálogo, sempre executados a partir da raiz
do projeto. Nenhum deles precisa que o app esteja rodando.

| Script | Para que serve |
|---|---|
| `migrar-csv-para-catalogo.py` | Gera/regenera `manifesto.json` e `app/dados/estilos/*.json` a partir de `catalogo_origem.csv`. Faz backup automático antes de regravar e preserva o enriquecimento já feito (não é destrutivo). |
| `enriquecer-estilo.py` | Preenche preço, músicas, espaço, descrição, tags e previews de um estilo já existente — um por vez (`--id`) ou em lote (`--lote arquivo.json`). |
| `importar_previews.py` | Vincula automaticamente os áudios de `app/previews/` aos estilos, casando pelo nome (aceita mais de 1 preview por estilo — ver `GUIA_IMPORTAR_PREVIEWS.md`). |
| `validar-enriquecimento.py` | Só leitura: gera `relatorio-enriquecimento.md` mostrando o que falta preencher, com destaque para os 3 campos críticos do Resumo do Pedido (preço, músicas, espaço). |
| `previews_util.py` | Módulo interno, importado pelos scripts acima — não é executado diretamente. |

Ordem recomendada de execução ao atualizar o catálogo:

```bash
python3 ferramentas/migrar-csv-para-catalogo.py      # só se catalogo_origem.csv mudou
python3 ferramentas/enriquecer-estilo.py --lote meu-lote.json
python3 ferramentas/importar_previews.py
python3 ferramentas/validar-enriquecimento.py
```
