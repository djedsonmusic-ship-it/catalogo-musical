#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Utilitário compartilhado de previews de áudio (Sprint 14 — suporte a
múltiplos previews por estilo).

Isolado aqui, e não duplicado em cada script, pela mesma razão que
`correcoes-texto.json` foi separado do código de migração: evitar que
a lógica de leitura/gravação do campo de preview divirja entre
enriquecer-estilo.py, importar_previews.py, validar-enriquecimento.py
e migrar-csv-para-catalogo.py.

SCHEMA:
  - Campo atual: `previewUrls` — lista de strings (0, 1 ou várias).
    É o campo que o front-end já lê primeiro
    (ver `obterPreviewUrlsDoEstilo()` em previewPlayer.js).
  - Campo legado: `previewUrl` — string única, de antes desta sprint.
    Continua sendo LIDO como fallback (para não quebrar dados
    antigos), mas nunca é mais ESCRITO por estes scripts: ao gravar
    qualquer preview, o campo é sempre migrado para `previewUrls` e o
    `previewUrl` legado é removido do registro — evita os dois campos
    coexistindo com informação divergente.
"""


def _normalizar_barras(url):
    """Sempre usa barra normal ('/'), nunca invertida ('\\'), e nunca
    barra no início ('/previews/...' vira 'previews/...'). Necessário
    porque:
    (a) um caminho salvo com barra invertida (comum no Windows, se
        algum dia foi gravado com str(Path) em vez de Path.as_posix())
        não é um separador de URL válido no navegador;
    (b) um caminho com barra no início muda o significado da URL (URL
        absoluta a partir da raiz do site, não relativa à página) e
        também escapava da checagem de "está dentro de
        app/previews/" usada para limpar órfãos, então uma entrada
        quebrada assim ficava presa na lista para sempre.
    Chamado sempre que um preview é lido OU gravado, então uma entrada
    antiga com qualquer um desses dois problemas se autocorrige na
    próxima vez que qualquer script tocar no estilo — não precisa
    editar o JSON à mão."""
    url = url.strip().replace('\\', '/')
    while url.startswith('/'):
        url = url[1:]
    return url


def obter_previews(estilo):
    """Lê os previews de um estilo, aceitando tanto o schema novo
    (previewUrls: list) quanto o legado (previewUrl: str) — mesma
    regra de fallback que previewPlayer.js usa no front-end."""
    urls = estilo.get('previewUrls')
    if isinstance(urls, list):
        return [_normalizar_barras(u) for u in urls if isinstance(u, str) and u.strip()]
    legado = estilo.get('previewUrl')
    if isinstance(legado, str) and legado.strip():
        return [_normalizar_barras(legado)]
    return []


def definir_previews(estilo, lista):
    """Substitui a lista inteira de previews (schema novo: previewUrls)
    e remove o campo legado (previewUrl), se existir."""
    lista_limpa = [_normalizar_barras(u) for u in lista if isinstance(u, str) and u.strip()]
    estilo['previewUrls'] = lista_limpa
    estilo.pop('previewUrl', None)
    return estilo


def adicionar_previews(estilo, novos, evitar_duplicados=True):
    """Acrescenta `novos` à lista já existente, SEM apagar o que já
    está lá — usado no modo padrão (não-destrutivo) de importação e
    enriquecimento em lote."""
    atuais = obter_previews(estilo)
    for url in novos:
        if not isinstance(url, str) or not url.strip():
            continue
        url = _normalizar_barras(url)
        if evitar_duplicados and url in atuais:
            continue
        atuais.append(url)
    definir_previews(estilo, atuais)
    return estilo
