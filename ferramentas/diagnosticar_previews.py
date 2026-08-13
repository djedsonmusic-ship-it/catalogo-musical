#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Diagnóstico de correspondência de previews (não altera nada — só leitura).

Mostra, lado a lado:
  1) as subpastas/arquivos que existem em app/previews/ e a chave
     normalizada que o importar_previews.py usa pra comparar;
  2) os nomes de estilo do catálogo e a mesma chave normalizada;
  3) quais batem, quais de app/previews/ NÃO acharam estilo, e quais
     estilos NÃO têm nenhum preview em app/previews/.

Uso:
    python3 ferramentas/diagnosticar_previews.py
"""
import json
import re
import unicodedata
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DADOS_DIR = BASE_DIR / "app" / "dados" / "estilos"
PREVIEWS_DIR = BASE_DIR / "app" / "previews"
EXTENSOES_AUDIO = {".mp3", ".wav", ".ogg", ".aac", ".m4a"}


def normalizar_texto(texto):
    if not texto:
        return ""
    texto = unicodedata.normalize('NFKD', str(texto)).encode('ASCII', 'ignore').decode('utf-8')
    texto = texto.lower()
    texto = re.sub(r'\b(preview|demo|audio|amostra)\b', '', texto)
    texto = re.sub(r'[^a-z0-9]', '', texto)
    return texto.strip()


def coletar_previews():
    """Mesma lógica de mapeamento do importar_previews.py, só que aqui
    devolvemos (nome_original, chave) em vez de aplicar direto."""
    itens = []
    if not PREVIEWS_DIR.exists():
        print(f"[Erro] {PREVIEWS_DIR} não existe.")
        return itens
    for item in sorted(PREVIEWS_DIR.iterdir()):
        if item.is_dir():
            tem_audio = any(
                p.is_file() and p.suffix.lower() in EXTENSOES_AUDIO
                for p in item.iterdir()
            )
            if tem_audio:
                itens.append(("pasta", item.name, normalizar_texto(item.name)))
        elif item.is_file() and item.suffix.lower() in EXTENSOES_AUDIO:
            itens.append(("arquivo solto", item.stem, normalizar_texto(item.stem)))
    return itens


def coletar_estilos():
    estilos = []
    if not DADOS_DIR.exists():
        print(f"[Erro] {DADOS_DIR} não existe.")
        return estilos
    for arquivo in sorted(DADOS_DIR.glob("*.json")):
        with open(arquivo, encoding='utf-8') as f:
            dados = json.load(f)
        for estilo in dados.get("estilos", []):
            nome = estilo.get("nome", "")
            estilos.append((arquivo.name, estilo.get("id", "?"), nome, normalizar_texto(nome)))
    return estilos


def main():
    previews = coletar_previews()
    estilos = coletar_estilos()
    chaves_estilos = {chave: (arquivo, id_, nome) for arquivo, id_, nome, chave in estilos}

    print(f"=== {len(previews)} item(ns) em app/previews/ ===\n")
    for tipo, nome_original, chave in previews:
        alvo = chaves_estilos.get(chave)
        if alvo:
            print(f"  ✓ [{tipo}] \"{nome_original}\"  →  bate com estilo \"{alvo[2]}\" ({alvo[1]})")
        else:
            print(f"  ✗ [{tipo}] \"{nome_original}\"  →  SEM correspondência (chave: '{chave}')")
            # sugere os 3 nomes de estilo com chave mais parecida
            proximos = sorted(chaves_estilos.items(), key=lambda kv: _distancia(chave, kv[0]))[:3]
            for chave_estilo, (arquivo, id_, nome) in proximos:
                print(f"        parecido? \"{nome}\" (chave: '{chave_estilo}', arquivo: {arquivo})")

    print(f"\n=== {len(estilos)} estilo(s) no catálogo — sem NENHUM preview em app/previews/ ===\n")
    chaves_previews = {chave for _, _, chave in previews}
    sem_preview = [(arquivo, id_, nome) for arquivo, id_, nome, chave in estilos if chave not in chaves_previews]
    for arquivo, id_, nome in sem_preview[:50]:
        print(f"  - {nome}  ({id_}, {arquivo})")
    if len(sem_preview) > 50:
        print(f"  ...e mais {len(sem_preview) - 50}.")


def _distancia(a, b):
    """Distância de edição simples (Levenshtein), só para ordenar sugestões."""
    if a == b:
        return 0
    m, n = len(a), len(b)
    anterior = list(range(n + 1))
    for i in range(1, m + 1):
        atual = [i] + [0] * n
        for j in range(1, n + 1):
            custo = 0 if a[i - 1] == b[j - 1] else 1
            atual[j] = min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo)
        anterior = atual
    return anterior[n]


if __name__ == "__main__":
    main()
