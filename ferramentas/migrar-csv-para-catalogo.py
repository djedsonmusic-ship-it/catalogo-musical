#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migração do catálogo real (CSV) para a estrutura JSON do app.

Uso:
    python3 ferramentas/migrar-csv-para-catalogo.py

Lê:
    ferramentas/catalogo_origem.csv     (Categoria;Subpasta — UTF-8 ou
                                         Latin-1, detectado automaticamente; ;)
    ferramentas/correcoes-texto.json    (correções pontuais de codificação — Sprint 12)
Gera:
    app/dados/manifesto.json
    app/dados/estilos/<categoriaId>.json  (um arquivo por categoria)

PROTEÇÃO DE DADOS (Sprint 13): reexecutar este script NÃO apaga mais
os enriquecimentos feitos por enriquecer-estilo.py / importar_previews.py.
Antes de gerar qualquer coisa, os dados atuais de app/dados/ são
copiados para uma pasta de backup com timestamp
(ferramentas/backups-migracao/<timestamp>/). Depois, para cada estilo
recriado a partir do CSV, o script procura o estilo equivalente nos
dados antigos (casando por `subcategoriaId`, que é estável mesmo que
a ORDEM das linhas no CSV mude — diferente do `id`, que é sequencial
e pode deslocar) e copia de volta os campos que só o enriquecimento
manual preenche: descricaoCurta, quantidadeMusicasEstimada,
espacoEstimadoMb, valorEstimadoCentavos, tags e a lista inteira de
previews (previewUrls).

Ou seja: o CSV continua sendo a fonte da verdade para QUAIS estilos
existem (altas/baixas/renomeações de categoria e subpasta), mas o
enriquecimento já feito sobrevive à reexecução — não é mais um
processo destrutivo. Para ajustes pontuais que o CSV não cobre, ver
`COMO_ADICIONAR_ESTILOS.md`.
"""
import csv
import json
import os
import re
import shutil
import unicodedata
from datetime import datetime

from previews_util import obter_previews, definir_previews

PASTA_RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_ORIGEM = os.path.join(PASTA_RAIZ, 'ferramentas', 'catalogo_origem.csv')
CORRECOES_TEXTO_JSON = os.path.join(PASTA_RAIZ, 'ferramentas', 'correcoes-texto.json')
SAIDA_MANIFESTO = os.path.join(PASTA_RAIZ, 'app', 'dados', 'manifesto.json')
SAIDA_ESTILOS = os.path.join(PASTA_RAIZ, 'app', 'dados', 'estilos')
PASTA_BACKUPS = os.path.join(PASTA_RAIZ, 'ferramentas', 'backups-migracao')

# Campos preenchidos manualmente (enriquecer-estilo.py / importar_previews.py)
# que devem sobreviver a uma reexecução da migração. Previews são
# tratados à parte (via previews_util) porque agora são uma LISTA,
# não um campo escalar — ver reaplicar_enriquecimento().
CAMPOS_ENRIQUECIMENTO = (
    'descricaoCurta', 'quantidadeMusicasEstimada', 'espacoEstimadoMb',
    'valorEstimadoCentavos', 'tags',
)

ICONES_VALIDOS = ['guitarra', 'onda', 'violao', 'microfone', 'pandeiro', 'globo', 'padrao']
PALAVRAS_CHAVE_ICONE = [
    (['rock', 'blues', 'guarda', 'metal', 'punk'], 'guitarra'),
    (['eletr', 'trance', 'house', 'techno', 'tecno', 'bass', 'freestyle', 'eurodance', 'rave', 'trap'], 'onda'),
    (['mpb', 'bossa', 'viola', 'seresta', 'country', 'clássica', 'classica', 'jazz'], 'violao'),
    (['funk', 'rap', 'hip hop', 'pagode', 'piseiro', 'arrocha', 'brega', 'charme',
      'black music', 'sertanejo', 'samba'], 'microfone'),
    (['carnaval', 'forró', 'forro', 'zumba', 'dança', 'danca'], 'pandeiro'),
    (['internacional', 'cumbia', 'reggae', 'gospel', 'infantil'], 'globo'),
]

PALETA_CORES = [
    '#5B5FEF', '#1FAA59', '#F5A623', '#E85D75', '#D9822B', '#3D8BFF',
    '#8B5CF6', '#0EA5A5', '#C7373F', '#2E9E6B', '#B7791F', '#4F46E5',
]


def carregar_correcoes_texto():
    """CORRECOES_TEXTO isolado (Sprint 13): antes era um dict fixo no
    código-fonte (patch manual que exigia editar o .py a cada correção
    nova). Agora vive em ferramentas/correcoes-texto.json — atualizável
    sem tocar no script, e sem risco de virar dívida técnica escondida
    dentro da lógica de migração."""
    if not os.path.exists(CORRECOES_TEXTO_JSON):
        print(f"[Aviso] {CORRECOES_TEXTO_JSON} não encontrado — seguindo sem correções de texto.")
        return {}
    with open(CORRECOES_TEXTO_JSON, encoding='utf-8') as f:
        conteudo = json.load(f)
    return conteudo.get('correcoes', {})


def normalizar_slug(texto):
    texto = unicodedata.normalize('NFD', texto)
    texto = texto.encode('ascii', 'ignore').decode('ascii')
    texto = texto.lower().strip()
    texto = re.sub(r"[^a-z0-9]+", '-', texto)
    texto = re.sub(r"-{2,}", '-', texto).strip('-')
    return texto


def limpar_texto(texto, correcoes):
    texto = texto.strip()
    texto = re.sub(r"\s{2,}", ' ', texto)  # espaços internos duplicados
    return correcoes.get(texto, texto)


def escolher_icone(nome_categoria):
    nome_normalizado = nome_categoria.lower()
    for palavras, icone in PALAVRAS_CHAVE_ICONE:
        if any(p in nome_normalizado for p in palavras):
            return icone
    return 'padrao'


def _ler_bytes_csv(caminho):
    """Detecta a codificação real do CSV em vez de presumir uma fixa.
    Historicamente o arquivo já foi Latin-1 (ver docstring do módulo),
    mas passou a ser salvo como UTF-8 numa atualização — e o script
    continuou lendo como Latin-1, o que não dá erro (Latin-1 aceita
    qualquer byte), só produz nomes de estilo corrompidos silenciosamente
    (ex.: 'Música' virava 'MÃºsica'). Tenta UTF-8 primeiro (com ou sem
    BOM); só cai para Latin-1 se os bytes não formarem UTF-8 válido."""
    with open(caminho, 'rb') as f:
        dados_brutos = f.read()
    try:
        return dados_brutos.decode('utf-8-sig')
    except UnicodeDecodeError:
        print("[Aviso] CSV não é UTF-8 válido — lendo como Latin-1 (codificação legada).")
        return dados_brutos.decode('latin-1')


def ler_csv(caminho, correcoes):
    texto = _ler_bytes_csv(caminho)
    leitor = csv.reader(texto.splitlines(), delimiter=';')
    linhas = list(leitor)
    cabecalho, dados = linhas[0], linhas[1:]
    assert cabecalho == ['Categoria', 'Subpasta'], f'Cabeçalho inesperado: {cabecalho}'
    return [(limpar_texto(c, correcoes), limpar_texto(s, correcoes)) for c, s in dados if c.strip() and s.strip()]


def fazer_backup_dados_atuais():
    """Copia app/dados/ inteiro para ferramentas/backups-migracao/<timestamp>/
    antes de qualquer regeneração. Não falha a migração se não houver
    nada para fazer backup ainda (primeira execução)."""
    pasta_dados = os.path.join(PASTA_RAIZ, 'app', 'dados')
    if not os.path.exists(pasta_dados):
        return None

    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    destino = os.path.join(PASTA_BACKUPS, timestamp)
    os.makedirs(PASTA_BACKUPS, exist_ok=True)
    shutil.copytree(pasta_dados, destino)
    print(f"[Backup] Dados atuais copiados para: {os.path.relpath(destino, PASTA_RAIZ)}")
    return destino


def carregar_enriquecimento_existente():
    """Indexa os estilos JÁ GRAVADOS em app/dados/estilos/ por
    subcategoriaId (chave estável — não muda se a ordem das linhas do
    CSV mudar, diferente do `id` sequencial). Usado para repor os
    campos de enriquecimento nos estilos recriados a partir do CSV."""
    indice = {}
    if not os.path.exists(SAIDA_ESTILOS):
        return indice
    for nome_arquivo in os.listdir(SAIDA_ESTILOS):
        if not nome_arquivo.endswith('.json'):
            continue
        caminho = os.path.join(SAIDA_ESTILOS, nome_arquivo)
        try:
            with open(caminho, encoding='utf-8') as f:
                conteudo = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue
        for estilo in conteudo.get('estilos', []):
            subcategoria_id = estilo.get('subcategoriaId')
            if subcategoria_id:
                indice[subcategoria_id] = estilo
    return indice


def reaplicar_enriquecimento(estilo_novo, indice_antigo):
    """Se existir um estilo antigo com a mesma subcategoriaId, copia de
    volta os campos de enriquecimento (preço, músicas, espaço,
    descrição, tags) para o estilo recém-gerado do CSV, e restaura
    a LISTA INTEIRA de previews (via previews_util, aceitando tanto o
    schema novo `previewUrls` quanto o legado `previewUrl` do estilo
    antigo)."""
    antigo = indice_antigo.get(estilo_novo['subcategoriaId'])
    if not antigo:
        return False
    algum_campo_restaurado = False
    for campo in CAMPOS_ENRIQUECIMENTO:
        valor_antigo = antigo.get(campo)
        # só restaura se havia algo preenchido de fato (não substitui
        # por lixo vazio/zerado do próprio estilo antigo)
        if valor_antigo not in (None, '', 0, []):
            estilo_novo[campo] = valor_antigo
            algum_campo_restaurado = True

    previews_antigos = obter_previews(antigo)
    if previews_antigos:
        definir_previews(estilo_novo, previews_antigos)
        algum_campo_restaurado = True

    return algum_campo_restaurado


def migrar():
    correcoes = carregar_correcoes_texto()
    pares = ler_csv(CSV_ORIGEM, correcoes)

    fazer_backup_dados_atuais()
    indice_enriquecimento_antigo = carregar_enriquecimento_existente()
    total_restaurados = 0

    categorias = {}       # categoriaId -> dict
    subcategorias = {}    # subcategoriaId -> dict
    estilos_por_categoria = {}  # categoriaId -> [estilo, ...]

    for categoria_nome, subpasta_nome in pares:
        categoria_id = normalizar_slug(categoria_nome)
        if categoria_id not in categorias:
            indice = len(categorias)
            categorias[categoria_id] = {
                "id": categoria_id,
                "nome": categoria_nome,
                "slug": categoria_id,
                "icone": escolher_icone(categoria_nome),
                "cor": PALETA_CORES[indice % len(PALETA_CORES)],
                "ordemExibicao": indice + 1,
                "status": "ativo",
            }
            estilos_por_categoria[categoria_id] = []

        subcategoria_slug = normalizar_slug(subpasta_nome)
        subcategoria_id = f"{categoria_id}__{subcategoria_slug}"
        if subcategoria_id not in subcategorias:
            ordem_sub = sum(1 for s in subcategorias.values() if s['categoriaId'] == categoria_id) + 1
            subcategorias[subcategoria_id] = {
                "id": subcategoria_id,
                "categoriaId": categoria_id,
                "nome": subpasta_nome,
                "slug": subcategoria_slug,
                "ordemExibicao": ordem_sub,
                "status": "ativo",
            }

        # 1 Estilo por Subpasta (mesma relação já documentada desde a Sprint 04).
        ordem_estilo = len(estilos_por_categoria[categoria_id]) + 1
        estilo_id = f"est_{categoria_id}_{ordem_estilo:03d}"
        estilo_novo = {
            "id": estilo_id,
            "categoriaId": categoria_id,
            "subcategoriaId": subcategoria_id,
            "nome": subpasta_nome,
            "descricaoCurta": "",
            "quantidadeMusicasEstimada": 0,
            "espacoEstimadoMb": 0,
            "valorEstimadoCentavos": 0,
            "tags": [],
            "status": "ativo",
            "ordemExibicao": ordem_estilo,
        }

        if reaplicar_enriquecimento(estilo_novo, indice_enriquecimento_antigo):
            total_restaurados += 1

        estilos_por_categoria[categoria_id].append(estilo_novo)

    manifesto = {
        "versaoSchema": "3.0-estrutura-definitiva",
        "aviso": "Gerado automaticamente por ferramentas/migrar-csv-para-catalogo.py a partir de catalogo_origem.csv. Enriquecimentos (preço/músicas/espaço/descrição/tags/preview) são preservados entre execuções via subcategoriaId — não editar à mão.",
        "categorias": list(categorias.values()),
        "subcategorias": list(subcategorias.values()),
    }

    os.makedirs(SAIDA_ESTILOS, exist_ok=True)
    # remove módulos de categorias antigas que não existem mais no CSV atual
    # (o backup já garante que esses dados não se perdem de verdade)
    for nome_arquivo in os.listdir(SAIDA_ESTILOS):
        if nome_arquivo.endswith('.json') and nome_arquivo[:-5] not in categorias:
            os.remove(os.path.join(SAIDA_ESTILOS, nome_arquivo))

    with open(SAIDA_MANIFESTO, 'w', encoding='utf-8') as f:
        json.dump(manifesto, f, ensure_ascii=False, indent=2)

    for categoria_id, lista_estilos in estilos_por_categoria.items():
        caminho = os.path.join(SAIDA_ESTILOS, f"{categoria_id}.json")
        conteudo = {
            "categoriaId": categoria_id,
            "aviso": "Gerado automaticamente por ferramentas/migrar-csv-para-catalogo.py. Enriquecimentos são preservados entre execuções — não editar à mão.",
            "estilos": lista_estilos,
        }
        with open(caminho, 'w', encoding='utf-8') as f:
            json.dump(conteudo, f, ensure_ascii=False, indent=2)

    return manifesto, estilos_por_categoria, total_restaurados


if __name__ == '__main__':
    manifesto, estilos_por_categoria, total_restaurados = migrar()
    total_estilos = sum(len(v) for v in estilos_por_categoria.values())
    print(f"Categorias: {len(manifesto['categorias'])}")
    print(f"Subcategorias: {len(manifesto['subcategorias'])}")
    print(f"Estilos: {total_estilos}")
    print(f"Estilos com enriquecimento restaurado do backup: {total_restaurados}")
    print(f"Arquivos gerados em: {SAIDA_ESTILOS}")
