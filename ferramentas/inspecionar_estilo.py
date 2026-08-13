#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Inspeção detalhada de UM estilo (só leitura — não altera nada).

Mostra, para cada preview salvo no JSON: o valor exato salvo (com
aspas, pra flagrar espaço/caractere invisível), se o arquivo existe no
disco EXATAMENTE com esse nome (diferenciando maiúscula/minúscula,
já que o Windows local ignora isso mas um servidor de deploy Linux
costuma ser case-sensitive), o tamanho em bytes (pra flagrar arquivo
vazio/corrompido), e por fim lista o que realmente existe na pasta.

Uso:
    python3 ferramentas/inspecionar_estilo.py --nome "Freestyle anos 80"
    python3 ferramentas/inspecionar_estilo.py --id est_freestyle_001
"""
import argparse
import json
import unicodedata
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DADOS_DIR = BASE_DIR / "app" / "dados" / "estilos"
APP_DIR = BASE_DIR / "app"


def normalizar_texto(texto):
    if not texto:
        return ""
    texto = unicodedata.normalize('NFKD', str(texto)).encode('ASCII', 'ignore').decode('utf-8')
    texto = texto.lower()
    texto = re.sub(r'[^a-z0-9]', '', texto)
    return texto.strip()


def localizar_estilo(nome=None, estilo_id=None):
    for arquivo in sorted(DADOS_DIR.glob("*.json")):
        with open(arquivo, encoding='utf-8') as f:
            dados = json.load(f)
        for estilo in dados.get("estilos", []):
            if estilo_id and estilo.get("id") == estilo_id:
                return arquivo, estilo
            if nome and normalizar_texto(estilo.get("nome", "")) == normalizar_texto(nome):
                return arquivo, estilo
    return None, None


def checar_arquivo_case_sensitive(caminho_relativo):
    """Confere se o arquivo existe e se bate byte-a-byte (maiúscula/minúscula
    inclusive) com o que está no disco — não apenas 'existe de algum jeito'."""
    partes = caminho_relativo.split('/')
    atual = APP_DIR
    for parte in partes:
        if not atual.exists() or not atual.is_dir():
            return False, f"pasta '{atual.name}' não existe"
        nomes_reais = {p.name for p in atual.iterdir()}
        if parte in nomes_reais:
            atual = atual / parte
            continue
        # existe com outra caixa (maiúscula/minúscula)?
        candidatos = [n for n in nomes_reais if n.lower() == parte.lower()]
        if candidatos:
            return False, f"existe como '{candidatos[0]}', não '{parte}' (diferença de maiúscula/minúscula)"
        return False, f"'{parte}' não encontrado em '{atual.relative_to(BASE_DIR)}'"
    return True, atual


def main():
    parser = argparse.ArgumentParser(description="Inspeciona os previews de um estilo específico.")
    parser.add_argument("--nome", help="nome do estilo, exatamente como aparece no catálogo")
    parser.add_argument("--id", dest="estilo_id", help="id do estilo (ex.: est_freestyle_001)")
    args = parser.parse_args()

    if not args.nome and not args.estilo_id:
        parser.error("informe --nome ou --id")

    arquivo, estilo = localizar_estilo(args.nome, args.estilo_id)
    if not estilo:
        print("[Erro] Estilo não encontrado com esse nome/id.")
        return

    print(f"Estilo: {estilo.get('nome')}  (id: {estilo.get('id')}, arquivo: {arquivo.name})\n")

    previews_raw = estilo.get('previewUrls')
    legado_raw = estilo.get('previewUrl')
    print(f"Campo previewUrls (bruto, direto do JSON): {json.dumps(previews_raw, ensure_ascii=False)}")
    print(f"Campo previewUrl legado (bruto): {json.dumps(legado_raw, ensure_ascii=False)}\n")

    lista = previews_raw if isinstance(previews_raw, list) else ([legado_raw] if legado_raw else [])

    print(f"=== {len(lista)} preview(s) neste estilo ===\n")
    for i, url in enumerate(lista, start=1):
        print(f"[{i}] valor salvo: {url!r}")
        ok, detalhe = checar_arquivo_case_sensitive(url)
        if ok:
            tamanho = detalhe.stat().st_size
            print(f"    ✓ existe em disco, {tamanho} bytes" + (" — ARQUIVO VAZIO!" if tamanho == 0 else ""))
        else:
            print(f"    ✗ PROBLEMA: {detalhe}")
        print()

    # se der pra achar a pasta correspondente ao nome do estilo, lista o que tem nela de verdade
    pasta_estilo = APP_DIR / "previews" / estilo.get("nome", "")
    if pasta_estilo.exists() and pasta_estilo.is_dir():
        print(f"=== Conteúdo real de app/previews/{estilo.get('nome')}/ ===")
        for item in sorted(pasta_estilo.iterdir()):
            print(f"  - {item.name!r}  ({item.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
