/**
 * Painel Admin — Estilos em Destaque (Sprint 17).
 *
 * Resolve o problema de "quem escolhe os destaques é o script" (o
 * fallback automático de `home.js` pega os 4 primeiros por
 * `ordemExibicao`). Aqui o dono do catálogo escolhe manualmente quais
 * estilos aparecem em "Em destaque" na Home, na ordem que quiser.
 *
 * Não existe backend/servidor neste projeto (é só HTML/JS estático),
 * então este painel não GRAVA o arquivo sozinho — ele gera o
 * `configuracoes.json` atualizado e oferece para baixar. O usuário
 * move esse arquivo baixado para `app/dados/configuracoes.json`,
 * substituindo o antigo. `core/configService.js` já lê esse arquivo
 * normalmente — nenhuma outra mudança é necessária.
 */
import { carregarCatalogo, listarEstilos, listarCategorias } from '../core/catalogService.js';
import { carregarConfiguracoes } from '../core/configService.js';
import { montarToast, mostrarToast } from '../core/feedback.js';

async function iniciar() {
  const elApp = document.getElementById('admin-app');
  const elToast = document.getElementById('toast');
  montarToast(elToast);

  elApp.innerHTML = `<p class="admin-vazio">Carregando catálogo…</p>`;

  let catalogo, estilos, categorias, configuracoes;
  try {
    catalogo = await carregarCatalogo();
    estilos = listarEstilos(catalogo);
    categorias = listarCategorias(catalogo);
    configuracoes = await carregarConfiguracoes();
  } catch (erro) {
    elApp.innerHTML = `<p class="admin-vazio">Não foi possível carregar o catálogo: ${erro.message}</p>`;
    return;
  }

  // Estado local: ordem = ordem de seleção = ordem de exibição na Home.
  let selecionados = (configuracoes.destaquesHome || [])
    .map(id => estilos.find(e => e.id === id))
    .filter(Boolean);

  let importacao = {
    fase: 'inicial',
    mensagem: 'Use o botão abaixo para importar previews em lote.',
    detalhes: null,
    erros: [],
    arquivos: []
  };

  render();

  function render() {
    elApp.innerHTML = `
      <div class="admin-header">
        <h1>Estilos em destaque na Home</h1>
        <p>Escolha quais estilos aparecem na seção "Em destaque" da tela inicial, e em
          que ordem. Se nada for selecionado, a Home volta a mostrar os 4 primeiros
          estilos automaticamente (comportamento padrão).</p>
      </div>

      <section class="admin-import">
        <div class="admin-import__descricao">
          <h2>Importar Previews</h2>
          <p>Selecione a pasta de prévias e o projeto local para copiar os arquivos ao diretório correto e atualizar os estilos com as referências de preview.</p>
        </div>
        <div class="admin-import__acoes">
          <button class="btn btn-primary" id="admin-importar">Importar Previews</button>
        </div>
        <div id="admin-import-summary" class="admin-import-summary"></div>
      </section>

      <div class="admin-grid">
        <div>
          <p class="admin-col-title">Todos os estilos (${estilos.length})</p>
          <label class="search-field" for="admin-busca" style="margin-bottom: var(--space-4);">
            🔎 <input id="admin-busca" type="text" placeholder="Buscar por nome ou categoria..." autocomplete="off" />
          </label>
          <div id="admin-lista"></div>
        </div>

        <div class="admin-selecionados">
          <p class="admin-col-title">Selecionados (${selecionados.length})</p>
          <div id="admin-selecionados-lista" class="admin-selecionados-lista"></div>

          <div class="admin-acoes">
            <button class="btn btn-primary" id="admin-baixar" ${selecionados.length === 0 ? 'disabled' : ''}>
              Baixar configuracoes.json
            </button>
            <button class="btn btn-ghost" id="admin-limpar" ${selecionados.length === 0 ? 'disabled' : ''}>
              Limpar seleção
            </button>
          </div>

          <div class="admin-passo-a-passo">
            <strong>Como aplicar:</strong> baixe o arquivo, depois substitua
            <code>app/dados/configuracoes.json</code> pelo arquivo baixado (mesmo nome)
            e atualize a página inicial do site.
          </div>
        </div>
      </div>
    `;

    renderListaCompleta();
    renderSelecionados();

    document.getElementById('admin-importar').addEventListener('click', iniciarImportacao);
    document.getElementById('admin-busca').addEventListener('input', renderListaCompleta);
    document.getElementById('admin-baixar').addEventListener('click', baixarConfiguracoes);
    document.getElementById('admin-limpar').addEventListener('click', () => {
      selecionados = [];
      render();
      mostrarToast('Seleção limpa.', 'remocao');
    });
    renderImportSummary();
  }

  function renderListaCompleta() {
    const elLista = document.getElementById('admin-lista');
    const termo = (document.getElementById('admin-busca')?.value || '').toLowerCase().trim();

    const idsSelecionados = new Set(selecionados.map(e => e.id));

    elLista.innerHTML = categorias.map(categoria => {
      const estilosDaCategoria = estilos.filter(e => {
        if (e.categoriaId !== categoria.id) return false;
        if (!termo) return true;
        return e.nome.toLowerCase().includes(termo) || categoria.nome.toLowerCase().includes(termo);
      });
      if (estilosDaCategoria.length === 0) return '';

      return `
        <div class="admin-lista-categoria">
          <h3>${categoria.nome}</h3>
          ${estilosDaCategoria.map(estilo => `
            <label class="admin-item ${idsSelecionados.has(estilo.id) ? 'is-selecionado' : ''}">
              <input type="checkbox" data-id="${estilo.id}" ${idsSelecionados.has(estilo.id) ? 'checked' : ''} />
              <div>
                <div class="admin-item__nome">${estilo.nome}</div>
                <div class="admin-item__meta">${estilo.id}</div>
              </div>
            </label>
          `).join('')}
        </div>
      `;
    }).join('') || `<p class="admin-vazio">Nenhum estilo encontrado para "${termo}".</p>`;

    elLista.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', () => {
        const id = chk.dataset.id;
        if (chk.checked) {
          const estilo = estilos.find(e => e.id === id);
          if (estilo) selecionados.push(estilo);
        } else {
          selecionados = selecionados.filter(e => e.id !== id);
        }
        render();
        document.getElementById('admin-busca').value = termo;
      });
    });
  }

  function renderSelecionados() {
    const elSel = document.getElementById('admin-selecionados-lista');
    if (selecionados.length === 0) {
      elSel.innerHTML = `<p class="admin-vazio">Nenhum estilo selecionado ainda — marque na lista ao lado.</p>`;
      return;
    }
    elSel.innerHTML = selecionados.map((estilo, indice) => `
      <div class="admin-selecionado">
        <span class="admin-selecionado__ordem">${indice + 1}</span>
        <span class="admin-selecionado__nome">${estilo.nome}</span>
        <div class="admin-selecionado__acoes">
          <button type="button" data-mover="cima" data-indice="${indice}" ${indice === 0 ? 'disabled' : ''} title="Mover para cima" aria-label="Mover para cima">↑</button>
          <button type="button" data-mover="baixo" data-indice="${indice}" ${indice === selecionados.length - 1 ? 'disabled' : ''} title="Mover para baixo" aria-label="Mover para baixo">↓</button>
          <button type="button" data-remover="${indice}" title="Remover" aria-label="Remover">✕</button>
        </div>
      </div>
    `).join('');

    elSel.querySelectorAll('[data-mover]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.indice);
        const alvo = btn.dataset.mover === 'cima' ? i - 1 : i + 1;
        [selecionados[i], selecionados[alvo]] = [selecionados[alvo], selecionados[i]];
        render();
      });
    });
    elSel.querySelectorAll('[data-remover]').forEach(btn => {
      btn.addEventListener('click', () => {
        selecionados.splice(Number(btn.dataset.remover), 1);
        render();
      });
    });
  }

  function renderImportSummary() {
    const elResumo = document.getElementById('admin-import-summary');
    if (!elResumo) return;

    if (importacao.erros.length) {
      elResumo.innerHTML = `
        <div class="admin-import-summary admin-import-summary--erro">
          <strong>Erro:</strong>
          <p>${importacao.erros.join('<br>')}</p>
          <p>Use um navegador compatível com <strong>File System Access API</strong> (Chrome/Edge) ou a ferramenta <code>ferramentas/importar_previews.py</code>.</p>
        </div>
      `;
      return;
    }

    if (importacao.fase === 'inicial') {
      elResumo.innerHTML = `<p class="admin-import-summary__texto">${importacao.mensagem}</p>`;
      return;
    }

    if (importacao.fase === 'resumo' && importacao.detalhes) {
      const { totalArquivos, estilosIdentificados, arquivosSemCorrespondencia, conflitos } = importacao.detalhes;
      const semCorrespondenciaHtml = arquivosSemCorrespondencia.length
        ? `<div class="admin-import-summary__grupo"><strong>Sem correspondência</strong><ul>${arquivosSemCorrespondencia.map(nome => `<li>${nome}</li>`).join('')}</ul></div>`
        : '';
      const conflitosHtml = conflitos.length
        ? `<div class="admin-import-summary__grupo"><strong>Conflitos</strong><ul>${conflitos.map(item => `<li>${item}</li>`).join('')}</ul></div>`
        : '';
      const podeConfirmar = conflitos.length === 0 && estilosIdentificados > 0;

      elResumo.innerHTML = `
        <div class="admin-import-summary admin-import-summary--resumo">
          <p><strong>Total de arquivos encontrados:</strong> ${totalArquivos}</p>
          <p><strong>Estilos identificados:</strong> ${estilosIdentificados}</p>
          <p><strong>Arquivos sem correspondência:</strong> ${arquivosSemCorrespondencia.length}</p>
          <p><strong>Possíveis conflitos:</strong> ${conflitos.length}</p>
          ${semCorrespondenciaHtml}
          ${conflitosHtml}
          <button class="btn btn-primary" id="admin-importar-confirmar" ${podeConfirmar ? '' : 'disabled'}>Confirmar importação</button>
        </div>
      `;
      document.getElementById('admin-importar-confirmar')?.addEventListener('click', confirmarImportacao);
      return;
    }

    if (importacao.fase === 'concluido') {
      elResumo.innerHTML = `
        <div class="admin-import-summary admin-import-summary--sucesso">
          <p><strong>Importação concluída.</strong></p>
          <p>${importacao.mensagem}</p>
        </div>
      `;
      return;
    }

    elResumo.innerHTML = `<p class="admin-import-summary__texto">${importacao.mensagem}</p>`;
  }

  async function iniciarImportacao() {
    importacao = { fase: 'carregando', mensagem: 'Aguardando seleção de pasta do projeto...', detalhes: null, erros: [], arquivos: [] };
    renderImportSummary();

    if (typeof window.showDirectoryPicker !== 'function') {
      importacao = {
        fase: 'erro',
        erros: ['Seu navegador não suporta acesso de gravação ao sistema de arquivos.'],
        detalhes: null,
        arquivos: []
      };
      renderImportSummary();
      return;
    }

    try {
      const projectRoot = await window.showDirectoryPicker({ id: 'project-root', mode: 'readwrite' });
      const dadosHandle = await projectRoot.getDirectoryHandle('dados');
      const estilosHandle = await dadosHandle.getDirectoryHandle('estilos');
      const previewsHandle = await projectRoot.getDirectoryHandle('previews', { create: true });

      importacao.mensagem = 'Aguardando seleção da pasta de previews...';
      renderImportSummary();

      const sourceRoot = await window.showDirectoryPicker({ id: 'source-previews', mode: 'read' });
      const arquivos = await coletarArquivosDeAudio(sourceRoot);
      if (!arquivos.length) {
        importacao = {
          fase: 'erro',
          erros: ['Nenhum arquivo de áudio compatível foi encontrado na pasta selecionada.'],
          detalhes: null,
          arquivos: []
        };
        renderImportSummary();
        return;
      }

      const estilosDisponiveis = listarEstilos(await carregarCatalogo(), { incluirInativos: true });
      const detalhes = await prepararResumoDeImportacao(arquivos, estilosDisponiveis, previewsHandle);
      importacao = {
        fase: 'resumo',
        mensagem: 'Revise o resultado antes de confirmar a importação.',
        detalhes,
        erros: [],
        arquivos,
        projectRoot,
        previewsHandle,
        estilosHandle,
        sourceRoot,
        estilosDisponiveis
      };
      renderImportSummary();
    } catch (erro) {
      if (erro.name === 'AbortError' || erro.name === 'NotAllowedError') {
        importacao = { fase: 'inicial', mensagem: 'Importação cancelada pelo usuário.', detalhes: null, erros: [], arquivos: [] };
      } else {
        importacao = { fase: 'erro', erros: [erro.message || String(erro)], detalhes: null, arquivos: [] };
      }
      renderImportSummary();
    }
  }

  async function coletarArquivosDeAudio(diretorio, prefixo = '') {
    const arquivos = [];
    for await (const [nome, handle] of diretorio.entries()) {
      const caminhoRelativo = prefixo ? `${prefixo}/${nome}` : nome;
      if (handle.kind === 'file') {
        const extensao = nome.slice(nome.lastIndexOf('.')).toLowerCase();
        if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(extensao)) {
          arquivos.push({ nome, caminhoRelativo, extensao, handle });
        }
      } else if (handle.kind === 'directory') {
        arquivos.push(...await coletarArquivosDeAudio(handle, caminhoRelativo));
      }
    }
    return arquivos;
  }

  async function obterHandlesDoProjeto(projectRoot) {
    try {
      const dadosHandle = await projectRoot.getDirectoryHandle('dados');
      const estilosHandle = await dadosHandle.getDirectoryHandle('estilos');
      const previewsHandle = await projectRoot.getDirectoryHandle('previews', { create: true });
      return { dadosHandle, estilosHandle, previewsHandle };
    } catch (erro) {
      const appHandle = await projectRoot.getDirectoryHandle('app');
      const dadosHandle = await appHandle.getDirectoryHandle('dados');
      const estilosHandle = await dadosHandle.getDirectoryHandle('estilos');
      const previewsHandle = await appHandle.getDirectoryHandle('previews', { create: true });
      return { dadosHandle, estilosHandle, previewsHandle };
    }
  }

  function normalizarTexto(texto) {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();
  }

  function normalizarNomeBase(nomeArquivo) {
    return nomeArquivo.replace(/\.[^.]+$/, '');
  }

  function construirMapaDeEstilos(estilos) {
    const mapa = new Map();
    estilos.forEach(estilo => {
      const chaves = new Set([
        normalizarTexto(estilo.id),
        normalizarTexto(estilo.nome),
        normalizarTexto(estilo.id.replace(/[_-]/g, '')),
        normalizarTexto(estilo.nome.replace(/[_-]/g, ''))
      ]);
      chaves.forEach(chave => {
        if (!chave) return;
        const lista = mapa.get(chave) || [];
        lista.push(estilo);
        mapa.set(chave, lista);
      });
    });
    return mapa;
  }

  function encontrarEstiloPorArquivo(nomeBaseNormalizado, mapaEstilos) {
    if (mapaEstilos.has(nomeBaseNormalizado)) {
      const candidatos = mapaEstilos.get(nomeBaseNormalizado);
      if (candidatos.length === 1) return { estilo: candidatos[0], suffix: '' };
    }

    for (const [chave, candidatos] of mapaEstilos.entries()) {
      if (nomeBaseNormalizado.startsWith(chave)) {
        const restante = nomeBaseNormalizado.slice(chave.length);
        if (!restante || /^[a-z0-9]{1,3}$/.test(restante)) {
          if (candidatos.length === 1) {
            return { estilo: candidatos[0], suffix: restante ? `_${restante}` : '' };
          }
        }
      }
    }
    return null;
  }

  function gerarNomeDestino(estilo, arquivo, indexNoEstilo) {
    const nomeBase = normalizarTexto(normalizarNomeBase(arquivo.nome));
    const estiloIdNormalizado = normalizarTexto(estilo.id);
    const match = nomeBase.startsWith(estiloIdNormalizado) ? nomeBase.slice(estiloIdNormalizado.length) : '';
    let sufixo = '';
    if (match && /^[a-z0-9]{1,3}$/.test(match)) {
      sufixo = `_${match}`;
    } else if (indexNoEstilo > 0) {
      sufixo = `_${String.fromCharCode(97 + indexNoEstilo)}`;
    }
    return `${estilo.id}${sufixo}${arquivo.extensao}`;
  }

  async function prepararResumoDeImportacao(arquivos, estilos, previewsHandle) {
    const mapaEstilos = construirMapaDeEstilos(estilos);
    const itens = arquivos.map(arquivo => {
      const baseNormalizado = normalizarTexto(normalizarNomeBase(arquivo.nome));
      const match = encontrarEstiloPorArquivo(baseNormalizado, mapaEstilos);
      return {
        ...arquivo,
        estilo: match ? match.estilo : null,
        sufixo: match ? match.suffix : '',
      };
    });

    const porEstilo = new Map();
    itens.forEach(item => {
      if (!item.estilo) return;
      const lista = porEstilo.get(item.estilo.id) || [];
      lista.push(item);
      porEstilo.set(item.estilo.id, lista);
    });

    let conflitos = [];
    let destinoExistente = new Set();
    const arquivosSemCorrespondencia = itens.filter(item => !item.estilo).map(item => item.caminhoRelativo);

    for (const [estiloId, lista] of porEstilo.entries()) {
      lista.forEach((item, index) => {
        const nomeDestino = gerarNomeDestino(item.estilo, item, index);
        const targetRelative = `./previews/${item.estilo.categoriaId}/${nomeDestino}`;
        item.targetRelative = targetRelative;
        item.targetFileName = nomeDestino;
      });

      const destinos = new Set();
      lista.forEach(item => {
        if (destinos.has(item.targetRelative)) {
          conflitos.push(`Destino duplicado: ${item.targetRelative} para ${item.caminhoRelativo}`);
        }
        destinos.add(item.targetRelative);
      });
    }

    for (const item of itens.filter(item => item.estilo)) {
      if (item.targetRelative) {
        try {
          const categoriaHandle = await previewsHandle.getDirectoryHandle(item.estilo.categoriaId, { create: true });
          await categoriaHandle.getFileHandle(item.targetFileName, { create: false });
          destinoExistente.add(item.targetRelative);
        } catch {
          // arquivo ainda não existe ou não foi possível ler
        }
      }
    }

    destinoExistente.forEach(caminho => conflitos.push(`Arquivo já existe no destino: ${caminho}`));

    const estilosIdentificados = new Set(itens.filter(item => item.estilo).map(item => item.estilo.id)).size;
    return {
      totalArquivos: arquivos.length,
      estilosIdentificados,
      arquivosSemCorrespondencia,
      conflitos,
      itensIdentificados: itens.filter(item => item.estilo)
    };
  }

  async function confirmarImportacao() {
    if (importacao.fase !== 'resumo' || !importacao.detalhes) return;
    const { itensIdentificados } = importacao.detalhes;
    if (!itensIdentificados.length) return;

    const previewsHandle = importacao.previewsHandle;
    const estilosHandle = importacao.estilosHandle;

    const estiloPorCategoriaArquivo = new Map();
    itensIdentificados.forEach(item => {
      const chave = `${item.estilo.categoriaId}/${item.targetFileName}`;
      estiloPorCategoriaArquivo.set(chave, item.estilo);
    });

    const gruposPorCategoria = new Map();
    itensIdentificados.forEach(item => {
      const lista = gruposPorCategoria.get(item.estilo.categoriaId) || [];
      lista.push(item);
      gruposPorCategoria.set(item.estilo.categoriaId, lista);
    });

    for (const [categoriaId, itens] of gruposPorCategoria.entries()) {
      const categoriaHandle = await previewsHandle.getDirectoryHandle(categoriaId, { create: true });
      for (const item of itens) {
        const sourceFile = await item.handle.getFile();
        const conteudo = await sourceFile.arrayBuffer();
        const destHandle = await categoriaHandle.getFileHandle(item.targetFileName, { create: true });
        const writable = await destHandle.createWritable();
        await writable.write(new Uint8Array(conteudo));
        await writable.close();
      }
    }

    const estilosPorArquivo = new Map();
    itensIdentificados.forEach(item => {
      const categoria = item.estilo.categoriaId;
      const lista = estilosPorArquivo.get(categoria) || [];
      lista.push(item);
      estilosPorArquivo.set(categoria, lista);
    });

    for (const [categoriaId, itens] of estilosPorArquivo.entries()) {
      const nomeArquivoJson = `${categoriaId}.json`;
      const estiloFileHandle = await estilosHandle.getFileHandle(nomeArquivoJson);
      const arquivoJson = await estiloFileHandle.getFile();
      const texto = await arquivoJson.text();
      const json = JSON.parse(texto);
      const estilosJson = Array.isArray(json.estilos) ? json.estilos : [];

      itens.forEach(item => {
        const estiloJson = estilosJson.find(e => e.id === item.estilo.id);
        if (!estiloJson) return;
        const previewUrl = item.targetRelative;
        const urls = Array.isArray(estiloJson.previewUrls) ? estiloJson.previewUrls.slice() : [];
        if (typeof estiloJson.previewUrl === 'string' && estiloJson.previewUrl.trim()) {
          if (!urls.includes(estiloJson.previewUrl.trim())) {
            urls.unshift(estiloJson.previewUrl.trim());
          }
        }
        if (!urls.includes(previewUrl)) {
          urls.push(previewUrl);
        }
        estiloJson.previewUrls = urls;
      });

      const writable = await estiloFileHandle.createWritable();
      await writable.write(JSON.stringify(json, null, 2));
      await writable.close();
    }

    importacao.fase = 'concluido';
    importacao.mensagem = `${itensIdentificados.length} arquivo(s) importado(s). Atualize a página para ver as alterações nos dados de catálogo.`;
    renderImportSummary();
    mostrarToast('Importação concluída com sucesso.', 'adicao');
  }

  function baixarConfiguracoes() {
    const conteudo = {
      aviso: "IDs de estilos que aparecem em 'Em Destaque' na Home, na ordem desejada. Use o campo 'id' de app/dados/estilos/<categoria>.json. Se ficar vazio ou algum id não existir, a Home volta a mostrar os 4 primeiros estilos automaticamente. Gerado pelo painel admin.html.",
      destaquesHome: selecionados.map(e => e.id)
    };
    const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'configuracoes.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    mostrarToast('Arquivo baixado — mova para app/dados/configuracoes.json', 'adicao');
  }
}

iniciar();

