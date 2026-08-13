#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Importar previews de áudio em lote (Sprint 15 — limpeza automática de órfãos).

ALINHAMENTO DE SCHEMA: o preview vive no próprio ESTILO
(`previewUrls`, uma lista — ou o campo legado `previewUrl`, string
única), não em um array `faixas` (que não existe nos JSONs deste
projeto). Ver previews_util.py para o schema completo.

DUAS FORMAS DE ORGANIZAR OS ÁUDIOS EM app/previews/, para dar mais de
um preview ao mesmo estilo:

  (A) RECOMENDADO — 1 SUBPASTA POR ESTILO
      app/previews/Bossa Nova Anos 60/parte-1.mp3
      app/previews/Bossa Nova Anos 60/parte-2.mp3
      O nome da SUBPASTA é comparado ao nome do estilo (mesma
      normalização de sempre: sem acento, minúsculo, sem pontuação).
      TODOS os arquivos de áudio dentro dela viram previews daquele
      estilo, na ordem alfabética dos nomes de arquivo. Sem
      ambiguidade — é a forma preferida quando há mais de 1 preview.

  (B) ALTERNATIVA — ARQUIVOS SOLTOS COM SUFIXO NUMÉRICO
      app/previews/bossa-nova-anos-60-01.mp3
      app/previews/bossa-nova-anos-60-02.mp3
      Reconhecido quando o nome termina em "-01", "-02"... (numeração
      com zero à esquerda) ou em "parte 1"/"pt2" etc. — a parte antes
      do sufixo é comparada ao nome do estilo. Evite nomes de estilo
      que já terminam em número sem separador (ex.: "Anos 60") junto
      dessa convenção — nesses casos, prefira a opção (A).

      Um arquivo solto SEM sufixo numérico continua funcionando como
      antes: 1 preview para o estilo de mesmo nome.

Uso:
    python3 ferramentas/importar_previews.py
    python3 ferramentas/importar_previews.py --substituir

LIMPEZA AUTOMÁTICA DE ÓRFÃOS (sempre ativa, com ou sem --substituir):
antes de somar os previews encontrados nesta execução, o script
verifica se cada preview que o estilo JÁ TINHA ainda aponta para um
arquivo que existe em app/previews/ — se o arquivo foi apagado,
renomeado ou movido (ex.: você apagou a pasta e recriou com arquivos
de nome diferente), a entrada órfã é removida antes de adicionar as
novas. Isso evita que a lista de previews só cresça para sempre e
evita "Preview 1 de N" ficar preso em um arquivo que não existe mais.

Por padrão (sem --substituir), os previews encontrados nesta execução
são ACRESCENTADOS aos válidos que sobrarem depois da limpeza de
órfãos (sem duplicar). Com --substituir, a lista inteira é trocada
pelo que for encontrado agora, independentemente do que havia antes.
"""
import argparse
import json
import re
import unicodedata
from pathlib import Path

from previews_util import definir_previews, adicionar_previews, obter_previews

BASE_DIR = Path(__file__).resolve().parent.parent
DADOS_DIR = BASE_DIR / "app" / "dados" / "estilos"
PREVIEWS_DIR = BASE_DIR / "app" / "previews"

EXTENSOES_AUDIO = {".mp3", ".wav", ".ogg", ".aac", ".m4a"}

# "...-01" / "...-02" (zero à esquerda, 1 a 2 dígitos) — convenção de
# numeração explícita para não confundir com nomes de estilo que
# terminam em número "de verdade" (ex.: "Anos 60").
PADRAO_NUMERO_PADDED = re.compile(r'^(.*?)[-_\s]0([1-9][0-9]?)$')
# "...parte 2" / "...pt2" / "...parte-10" — palavra explícita antes do número.
PADRAO_PARTE = re.compile(r'^(.*?)[-_\s]+(?:parte|pt)[-_\s]*0*([1-9][0-9]?)$', re.IGNORECASE)


def normalizar_texto(texto):
    """Remove acentos, caracteres especiais, pontuações e converte para minúsculas."""
    if not texto:
        return ""
    texto = unicodedata.normalize('NFKD', str(texto)).encode('ASCII', 'ignore').decode('utf-8')
    texto = texto.lower()
    texto = re.sub(r'\b(preview|demo|audio|amostra)\b', '', texto)
    texto = re.sub(r'[^a-z0-9]', '', texto)
    return texto.strip()


def _caminho_relativo(caminho):
    try:
        return caminho.relative_to(BASE_DIR / "app").as_posix()
    except ValueError:
        return caminho.relative_to(BASE_DIR).as_posix()


def _e_orfao(url_preview):
    """True quando `url_preview` é um caminho dentro de app/previews/ e o
    arquivo correspondente NÃO existe mais em disco (pasta apagada e
    recriada, arquivo renomeado/movido etc.). URLs que não apontam para
    dentro de app/previews/ (ex.: um link externo colado manualmente)
    nunca são consideradas órfãs — não há como/por que checar essas."""
    url_preview = url_preview.replace('\\', '/')
    while url_preview.startswith('/'):
        url_preview = url_preview[1:]
    if not url_preview.startswith("previews/"):
        return False
    caminho = BASE_DIR / "app" / url_preview
    return not caminho.exists()


def _separar_base_e_ordem(stem_bruto):
    """Tenta reconhecer um sufixo numérico explícito no nome do arquivo
    (ver PADRAO_PARTE / PADRAO_NUMERO_PADDED no cabeçalho). Devolve
    (nome_base_bruto, ordem) — ordem é None quando não há sufixo
    reconhecido (arquivo solto de preview único, comportamento antigo)."""
    m = PADRAO_PARTE.match(stem_bruto)
    if m:
        return m.group(1), int(m.group(2))
    m = PADRAO_NUMERO_PADDED.match(stem_bruto)
    if m:
        return m.group(1), int(m.group(2))
    return stem_bruto, None


def _coletar_audios(diretorio):
    return sorted(
        p for p in diretorio.iterdir()
        if p.is_file() and p.suffix.lower() in EXTENSOES_AUDIO
    )


def mapear_previews(diretorio_previews):
    """
    Varre app/previews/ e devolve dois mapas — chave normalizada -> lista
    de caminhos relativos (na ordem em que devem ser tocados):
      - mapa_por_pasta: chave normalizada -> áudios, cobrindo DOIS formatos:
          (1) 1 subpasta = 1 estilo, áudios direto dentro dela
              (app/previews/Crossfit/*.mp3)
          (2) 1 subpasta = 1 CATEGORIA contendo uma subpasta por ESTILO
              (app/previews/Reggae/Nacional/*.mp3) — cada subpasta de
              estilo entra com duas chaves: o nome do estilo sozinho
              (chave_nome) e "estilo+categoria" (chave_combinada), para
              casar tanto com estilos de nome único quanto com nomes que
              se repetem em categorias diferentes (ex.: "Antigo" existe
              em mais de uma categoria).
      - mapa_por_base:  arquivos soltos na raiz, agrupados pelo sufixo numérico
                        (ou como item único quando não há sufixo)
    """
    mapa_por_pasta = {}
    arquivos_soltos = []

    if not diretorio_previews.exists():
        print(f"[Aviso] Pasta de previews não encontrada: {diretorio_previews}")
        return mapa_por_pasta, {}

    for item in sorted(diretorio_previews.iterdir()):
        if item.is_dir():
            audios = _coletar_audios(item)
            if audios:
                # Formato (1): a própria subpasta é o estilo.
                chave = normalizar_texto(item.name)
                mapa_por_pasta[chave] = [_caminho_relativo(p) for p in audios]

            # Formato (2): a subpasta é uma CATEGORIA — olha um nível
            # abaixo por subpastas de estilo, independentemente de o
            # nível atual já ter áudios diretos ou não.
            for subitem in sorted(item.iterdir()):
                if not subitem.is_dir():
                    continue
                sub_audios = _coletar_audios(subitem)
                if not sub_audios:
                    continue
                caminhos = [_caminho_relativo(p) for p in sub_audios]
                chave_estilo = normalizar_texto(subitem.name)
                chave_estilo_categoria = normalizar_texto(f"{subitem.name}{item.name}")
                # Não sobrescreve uma chave de formato (1) já definida
                # (subpasta-estilo direta tem prioridade sobre a
                # correspondência por nome de 2 níveis).
                mapa_por_pasta.setdefault(chave_estilo, caminhos)
                mapa_por_pasta.setdefault(chave_estilo_categoria, caminhos)
        elif item.is_file() and item.suffix.lower() in EXTENSOES_AUDIO:
            arquivos_soltos.append(item)

    grupos = {}
    for caminho in arquivos_soltos:
        base_bruta, ordem = _separar_base_e_ordem(caminho.stem)
        chave = normalizar_texto(base_bruta)
        grupos.setdefault(chave, []).append((ordem if ordem is not None else 0, caminho.name, caminho))

    mapa_por_base = {}
    for chave, itens in grupos.items():
        itens.sort(key=lambda t: (t[0], t[1]))
        mapa_por_base[chave] = [_caminho_relativo(p) for _, _, p in itens]

    return mapa_por_pasta, mapa_por_base


def executar_importacao(substituir_existentes=False):
    mapa_por_pasta, mapa_por_base = mapear_previews(PREVIEWS_DIR)

    if not mapa_por_pasta and not mapa_por_base:
        print("[Info] Nenhum arquivo de áudio encontrado na pasta de previews.")
        return

    print(f"[Info] {len(mapa_por_pasta)} subpasta(s) de estilo e "
          f"{len(mapa_por_base)} grupo(s) de arquivo solto mapeados.")

    if not DADOS_DIR.exists():
        print(f"[Erro] Diretório de dados não encontrado: {DADOS_DIR}")
        return

    total_arquivos = 0
    total_estilos = 0
    total_estilos_atualizados = 0
    total_previews_vinculados = 0
    total_estilos_com_multiplos = 0
    total_orfaos_removidos_geral = [0]  # lista de 1 item = contador mutável (fechamento simples)

    for arquivo_json in sorted(DADOS_DIR.glob("*.json")):
        total_arquivos += 1
        atualizado = False

        try:
            with open(arquivo_json, 'r', encoding='utf-8') as f:
                dados = json.load(f)

            estilos = dados.get("estilos", []) if isinstance(dados, dict) else dados
            if not isinstance(estilos, list):
                continue

            for estilo in estilos:
                if not isinstance(estilo, dict):
                    continue
                total_estilos += 1

                chave_nome = normalizar_texto(estilo.get("nome", ""))
                chave_combinada = normalizar_texto(
                    f"{estilo.get('nome', '')}{estilo.get('categoriaId', '')}"
                )

                encontrados = (
                    mapa_por_pasta.get(chave_nome) or mapa_por_pasta.get(chave_combinada)
                    or mapa_por_base.get(chave_nome) or mapa_por_base.get(chave_combinada)
                )

                if not encontrados:
                    continue

                if substituir_existentes:
                    definir_previews(estilo, encontrados)
                else:
                    # Antes de somar os novos, remove da lista atual qualquer
                    # preview "órfão" — que aponta para um caminho dentro de
                    # app/previews/ que não existe mais em disco (ex.: pasta
                    # apagada e recriada com nomes de arquivo diferentes).
                    # Sem isso, cada reimportação só acrescentava e nunca
                    # limpava, então a lista crescia com entradas quebradas
                    # (e a "Preview 1 de N" ficava presa em um arquivo morto).
                    atuais = obter_previews(estilo)
                    validos = [u for u in atuais if not _e_orfao(u)]
                    orfaos_removidos = len(atuais) - len(validos)
                    total_orfaos_removidos_geral[0] += orfaos_removidos
                    if validos != atuais:
                        definir_previews(estilo, validos)
                    adicionar_previews(estilo, encontrados)

                total_previews_vinculados += len(encontrados)
                if len(obter_previews(estilo)) > 1:
                    total_estilos_com_multiplos += 1
                total_estilos_atualizados += 1
                atualizado = True

            if atualizado:
                with open(arquivo_json, 'w', encoding='utf-8') as f:
                    json.dump(dados, f, ensure_ascii=False, indent=2)
                print(f"[Sucesso] Atualizado: {arquivo_json.name}")

        except Exception as e:
            print(f"[Erro] Falha ao processar {arquivo_json.name}: {e}")

    print("\n--- RESUMO DA IMPORTAÇÃO ---")
    print(f"Arquivos de categoria processados: {total_arquivos}")
    print(f"Estilos avaliados: {total_estilos}")
    print(f"Estilos atualizados: {total_estilos_atualizados}")
    print(f"Previews vinculados nesta execução: {total_previews_vinculados}")
    print(f"Estilos com mais de 1 preview: {total_estilos_com_multiplos}")
    print(f"Previews órfãos removidos automaticamente: {total_orfaos_removidos_geral[0]}")


def main():
    parser = argparse.ArgumentParser(
        description='Importa previews de áudio para os estilos do catálogo (casamento por subpasta ou nome de arquivo).'
    )
    parser.add_argument(
        '--substituir', action='store_true',
        help='substitui a lista de previews do estilo pelo que for encontrado agora (padrão: acrescenta, sem apagar)'
    )
    args = parser.parse_args()
    executar_importacao(substituir_existentes=args.substituir)


if __name__ == "__main__":
    main()
