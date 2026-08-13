#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enriquecer um estilo já existente (Sprint 14 — múltiplos previews).

Edita SÓ os campos informados de um estilo que já existe — nunca cria,
apaga ou recria registros. Localiza automaticamente em qual arquivo
(app/dados/estilos/<categoria>.json) o `id` informado está.

MODO 1 — um estilo por vez (linha de comando):
    python3 ferramentas/enriquecer-estilo.py --id est_mpb_002 \
        --descricao "Suavidade e sofisticação harmônica." \
        --musicas 180 --espaco 720 --preco 15.90 \
        --tags "acustico,romantico" \
        --preview "./dados/audio-exemplo/preview-exemplo-01.wav"

    Todos os campos são opcionais — informe só o que quiser mudar.
    --preco é em REAIS (ex.: 15.90); o script converte para centavos.
    --tags aceita uma lista separada por vírgula (substitui a lista
    inteira; não é possível adicionar 1 tag sem repetir as outras).

    PREVIEWS (agora aceita mais de um por estilo):
      --preview  "<url>"              acrescenta 1 preview à lista
                                       existente (não apaga os outros)
      --previews "<url1>,<url2>,..."  SUBSTITUI a lista inteira de
                                       previews (mesmo comportamento
                                       de --tags)

MODO 2 — vários estilos de uma vez (arquivo de lote):
    python3 ferramentas/enriquecer-estilo.py --lote meu-lote.json

    Onde `meu-lote.json` é um objeto no formato:
    {
      "est_mpb_002": {
        "preco": 15.90, "musicas": 180, "espaco": 720,
        "descricao": "...", "tags": ["a", "b"],
        "previews": ["previews/mpb-002-01.mp3", "previews/mpb-002-02.mp3"]
      },
      "est_rock_001": { "preco": 12.00, "preview": "previews/rock-001.mp3" }
    }
    (mesmos nomes de campo do Modo 1; "preco" sempre em reais;
    "previews" substitui a lista inteira, "preview" só acrescenta 1.)

    PRIORIDADE DOS 3 CAMPOS CRÍTICOS (preço, músicas, espaço): são os
    campos que alimentam o Resumo do Pedido, então o resumo impresso
    ao final do lote reporta separadamente quantos estilos ficaram
    com cada um desses 3 campos preenchidos — não só quantos estilos
    "tiveram sucesso" de forma genérica.

    OTIMIZAÇÃO DE E/S: no modo lote, cada arquivo de categoria é lido
    e reescrito UMA VEZ SÓ (índice de estilo_id -> arquivo construído
    com uma única varredura da pasta), mesmo que o lote contenha
    vários estilos daquela mesma categoria.

Depois de enriquecer, rode `validar-enriquecimento.py` para conferir
o que ainda falta.
"""
import argparse
import glob
import json
import os

from previews_util import definir_previews, adicionar_previews

PASTA_RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA_ESTILOS = os.path.join(PASTA_RAIZ, 'app', 'dados', 'estilos')

# Os 3 campos que alimentam o Resumo do Pedido — ver validar-enriquecimento.py.
CAMPOS_CRITICOS = ('preco', 'musicas', 'espaco')


def construir_indice():
    """
    Uma única varredura de PASTA_ESTILOS: devolve
      - indice: estilo_id -> (caminho, posicao_na_lista)
      - conteudos: caminho -> conteudo do JSON já carregado (cache em memória)
    Isso substitui o glob.glob() repetido por estilo que existia antes
    (uma varredura + leitura de disco por item do lote).
    """
    indice = {}
    conteudos = {}
    for caminho in glob.glob(os.path.join(PASTA_ESTILOS, '*.json')):
        with open(caminho, encoding='utf-8') as f:
            conteudo = json.load(f)
        conteudos[caminho] = conteudo
        for posicao, estilo in enumerate(conteudo.get('estilos', [])):
            indice[estilo['id']] = (caminho, posicao)
    return indice, conteudos


def _normalizar_lista(valor):
    """--previews / campos['previews'] aceita tanto uma lista quanto
    uma string separada por vírgula (mesma tolerância de --tags)."""
    if isinstance(valor, str):
        return [v.strip() for v in valor.split(',') if v.strip()]
    return list(valor)


def aplicar_campos(estilo, campos):
    """Aplica só os campos presentes em `campos` (dict), ignorando os ausentes.
    Devolve o conjunto de campos CRÍTICOS que foram efetivamente aplicados."""
    criticos_aplicados = set()

    if 'descricao' in campos and campos['descricao'] is not None:
        estilo['descricaoCurta'] = campos['descricao']
    if 'musicas' in campos and campos['musicas'] is not None:
        estilo['quantidadeMusicasEstimada'] = int(campos['musicas'])
        criticos_aplicados.add('musicas')
    if 'espaco' in campos and campos['espaco'] is not None:
        estilo['espacoEstimadoMb'] = int(campos['espaco'])
        criticos_aplicados.add('espaco')
    if 'preco' in campos and campos['preco'] is not None:
        estilo['valorEstimadoCentavos'] = round(float(campos['preco']) * 100)
        criticos_aplicados.add('preco')
    if 'tags' in campos and campos['tags'] is not None:
        tags = campos['tags']
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(',') if t.strip()]
        estilo['tags'] = tags

    # Previews: "previews" (lista) SUBSTITUI tudo; "preview" (1 item)
    # só ACRESCENTA. Se os dois vierem juntos, "previews" tem prioridade
    # e "preview" é ignorado (evita ordem de aplicação ambígua).
    if 'previews' in campos and campos['previews'] is not None:
        definir_previews(estilo, _normalizar_lista(campos['previews']))
    elif 'preview' in campos and campos['preview'] is not None:
        adicionar_previews(estilo, [campos['preview']])

    return criticos_aplicados


def enriquecer_um(estilo_id, campos):
    """Modo 1 (um estilo, linha de comando): mantém o comportamento original
    de ler e gravar na hora, já que não há nada a agrupar."""
    for caminho in glob.glob(os.path.join(PASTA_ESTILOS, '*.json')):
        with open(caminho, encoding='utf-8') as f:
            conteudo = json.load(f)
        for indice, estilo in enumerate(conteudo.get('estilos', [])):
            if estilo['id'] == estilo_id:
                aplicar_campos(conteudo['estilos'][indice], campos)
                with open(caminho, 'w', encoding='utf-8') as f:
                    json.dump(conteudo, f, ensure_ascii=False, indent=2)
                print(f'  ✓ {estilo_id}: atualizado em {os.path.relpath(caminho, PASTA_RAIZ)}')
                return True
    print(f'  ✗ {estilo_id}: não encontrado em nenhum arquivo de dados/estilos/')
    return False


def enriquecer_lote(lote):
    """Modo 2 (lote): 1 varredura + 1 leitura por arquivo, agrupando as
    escritas por arquivo de categoria (no máximo 1 gravação por arquivo
    tocado pelo lote, não 1 por estilo)."""
    indice, conteudos = construir_indice()

    arquivos_alterados = set()
    sucesso = 0
    nao_encontrados = []
    contagem_criticos = {campo: 0 for campo in CAMPOS_CRITICOS}
    estilos_com_multiplos_previews = 0

    for estilo_id, campos in lote.items():
        localizacao = indice.get(estilo_id)
        if localizacao is None:
            nao_encontrados.append(estilo_id)
            print(f'  ✗ {estilo_id}: não encontrado em nenhum arquivo de dados/estilos/')
            continue

        caminho, posicao = localizacao
        estilo = conteudos[caminho]['estilos'][posicao]
        criticos_aplicados = aplicar_campos(estilo, campos)

        for campo in criticos_aplicados:
            contagem_criticos[campo] += 1

        if len(estilo.get('previewUrls') or []) > 1:
            estilos_com_multiplos_previews += 1

        arquivos_alterados.add(caminho)
        sucesso += 1
        print(f'  ✓ {estilo_id}: atualizado em {os.path.relpath(caminho, PASTA_RAIZ)}')

    for caminho in arquivos_alterados:
        with open(caminho, 'w', encoding='utf-8') as f:
            json.dump(conteudos[caminho], f, ensure_ascii=False, indent=2)

    print(f'\nConcluído: {sucesso}/{len(lote)} estilos atualizados '
          f'({len(arquivos_alterados)} arquivo(s) de categoria regravado(s)).')
    print('Campos críticos aplicados neste lote:')
    print(f"  - Preço:   {contagem_criticos['preco']}")
    print(f"  - Músicas: {contagem_criticos['musicas']}")
    print(f"  - Espaço:  {contagem_criticos['espaco']}")
    print(f'Estilos com mais de 1 preview: {estilos_com_multiplos_previews}')
    if nao_encontrados:
        print(f'\nNão encontrados ({len(nao_encontrados)}): {", ".join(nao_encontrados)}')


def main():
    parser = argparse.ArgumentParser(description='Enriquecer estilos já existentes (não recria nenhum registro).')
    parser.add_argument('--id', help='id do estilo (modo 1: um por vez)')
    parser.add_argument('--descricao', help='descrição curta (1 frase)')
    parser.add_argument('--musicas', type=int, help='quantidade estimada de músicas')
    parser.add_argument('--espaco', type=int, help='espaço estimado em MB')
    parser.add_argument('--preco', type=float, help='valor estimado em REAIS (ex.: 15.90)')
    parser.add_argument('--tags', help='tags separadas por vírgula')
    parser.add_argument('--preview', help='caminho/URL de UM preview a ACRESCENTAR (não apaga os existentes)')
    parser.add_argument('--previews', help='previews separados por vírgula — SUBSTITUI a lista inteira')
    parser.add_argument('--lote', help='arquivo JSON com vários estilos de uma vez (modo 2)')
    args = parser.parse_args()

    if args.lote:
        with open(args.lote, encoding='utf-8') as f:
            lote = json.load(f)
        print(f'Aplicando lote com {len(lote)} estilo(s)...')
        enriquecer_lote(lote)
        return

    if not args.id:
        parser.error('informe --id (modo 1) ou --lote (modo 2).')

    campos = {
        'descricao': args.descricao, 'musicas': args.musicas, 'espaco': args.espaco,
        'preco': args.preco, 'tags': args.tags,
        'preview': args.preview, 'previews': args.previews,
    }
    enriquecer_um(args.id, campos)


if __name__ == '__main__':
    main()
