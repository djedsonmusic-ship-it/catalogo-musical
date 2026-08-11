#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Relatório de enriquecimento (Sprint 13 — validação dos campos críticos).

Só LÊ os dados e gera um relatório — nunca altera nenhum arquivo e
nunca impede o site de funcionar (estilos incompletos continuam
aparecendo normalmente no catálogo, só com os campos vazios/zerados).

Uso:
    python3 ferramentas/validar-enriquecimento.py

Gera:
    ferramentas/relatorio-enriquecimento.md (sobrescrito a cada execução)
"""
import glob
import json
import os

from previews_util import obter_previews

PASTA_RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA_ESTILOS = os.path.join(PASTA_RAIZ, 'app', 'dados', 'estilos')
SAIDA = os.path.join(PASTA_RAIZ, 'ferramentas', 'relatorio-enriquecimento.md')


def carregar_todos_estilos():
    todos = []
    for caminho in sorted(glob.glob(os.path.join(PASTA_ESTILOS, '*.json'))):
        with open(caminho, encoding='utf-8') as f:
            conteudo = json.load(f)
        for estilo in conteudo.get('estilos', []):
            todos.append(estilo)
    return todos


def gerar_relatorio():
    estilos = carregar_todos_estilos()
    total = len(estilos)

    sem_descricao = [e for e in estilos if not e.get('descricaoCurta', '').strip()]
    sem_preco = [e for e in estilos if not e.get('valorEstimadoCentavos')]
    sem_musicas = [e for e in estilos if not e.get('quantidadeMusicasEstimada')]
    sem_espaco = [e for e in estilos if not e.get('espacoEstimadoMb')]
    sem_tags = [e for e in estilos if not e.get('tags')]
    sem_preview = [e for e in estilos if not obter_previews(e)]
    com_multiplos_previews = [e for e in estilos if len(obter_previews(e)) > 1]

    # Os 3 campos que alimentam o Resumo do Pedido (mesmos de
    # CAMPOS_CRITICOS em enriquecer-estilo.py). Um estilo só está
    # "crítico completo" quando os 3 estão preenchidos ao mesmo tempo —
    # é essa combinação, e não cada campo isoladamente, que decide se
    # o Resumo do Pedido consegue mostrar preço/músicas/espaço.
    sem_algum_critico = [
        e for e in estilos
        if not e.get('valorEstimadoCentavos')
        or not e.get('quantidadeMusicasEstimada')
        or not e.get('espacoEstimadoMb')
    ]

    def pct(lista):
        return f'{len(lista)}/{total} ({round(100 * len(lista) / total) if total else 0}%)'

    linhas = []
    linhas.append('# Relatório de Enriquecimento — gerado automaticamente')
    linhas.append('')
    linhas.append('Este arquivo é sobrescrito toda vez que o script roda. Não editar à mão.')
    linhas.append('')
    linhas.append(f'**Total de estilos no catálogo: {total}**')
    linhas.append('')
    linhas.append(f'**Pendência crítica (falta Preço, Músicas OU Espaço): {pct(sem_algum_critico)}**')
    linhas.append('')
    linhas.append('| Campo | Estilos faltando |')
    linhas.append('|---|---|')
    linhas.append(f'| Preço (valorEstimadoCentavos) — crítico | {pct(sem_preco)} |')
    linhas.append(f'| Quantidade de músicas — crítico | {pct(sem_musicas)} |')
    linhas.append(f'| Espaço estimado — crítico | {pct(sem_espaco)} |')
    linhas.append(f'| Descrição curta | {pct(sem_descricao)} |')
    linhas.append(f'| Tags | {pct(sem_tags)} |')
    linhas.append(f'| Preview de áudio (opcional) | {pct(sem_preview)} |')
    linhas.append('')
    linhas.append(f'_Estilos com mais de 1 preview: {len(com_multiplos_previews)}/{total}_')
    linhas.append('')
    linhas.append('> Preço, quantidade de músicas e espaço são os campos mais')
    linhas.append('> importantes para o Resumo do Pedido — priorize-os via')
    linhas.append('> `enriquecer-estilo.py --lote`. Preview de áudio é opcional e')
    linhas.append('> não precisa ser preenchido para todos.')
    linhas.append('')

    def secao_lista(titulo, lista, limite=30):
        linhas.append(f'## {titulo} ({len(lista)})')
        linhas.append('')
        if not lista:
            linhas.append('_Nenhum — todos preenchidos._')
        else:
            for e in lista[:limite]:
                linhas.append(f"- `{e['id']}` — {e['nome']}")
            if len(lista) > limite:
                linhas.append(f'- ...e mais {len(lista) - limite}.')
        linhas.append('')

    secao_lista('Estilos com pendência crítica (Preço, Músicas ou Espaço)', sem_algum_critico)
    secao_lista('Estilos sem preço', sem_preco)
    secao_lista('Estilos sem quantidade de músicas', sem_musicas)
    secao_lista('Estilos sem espaço estimado', sem_espaco)
    secao_lista('Estilos sem descrição', sem_descricao)
    secao_lista('Estilos sem tags', sem_tags)
    secao_lista('Estilos sem preview (opcional)', sem_preview)

    conteudo = '\n'.join(linhas)
    with open(SAIDA, 'w', encoding='utf-8') as f:
        f.write(conteudo)

    return {
        'total': total, 'sem_descricao': len(sem_descricao), 'sem_preco': len(sem_preco),
        'sem_musicas': len(sem_musicas), 'sem_espaco': len(sem_espaco),
        'sem_tags': len(sem_tags), 'sem_preview': len(sem_preview),
        'sem_algum_critico': len(sem_algum_critico),
        'com_multiplos_previews': len(com_multiplos_previews),
    }


if __name__ == '__main__':
    resumo = gerar_relatorio()
    print(f"Total de estilos: {resumo['total']}")
    print(f"Pendência crítica (Preço/Músicas/Espaço): {resumo['sem_algum_critico']}")
    print(f"  Sem preço: {resumo['sem_preco']}")
    print(f"  Sem quantidade de músicas: {resumo['sem_musicas']}")
    print(f"  Sem espaço estimado: {resumo['sem_espaco']}")
    print(f"Sem descrição: {resumo['sem_descricao']}")
    print(f"Sem tags: {resumo['sem_tags']}")
    print(f"Sem preview (opcional): {resumo['sem_preview']}")
    print(f"Com mais de 1 preview: {resumo['com_multiplos_previews']}")
    print(f"\nRelatório completo salvo em: {SAIDA}")
