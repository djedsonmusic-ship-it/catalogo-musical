# Arquitetura do Preview de Áudio (Sprint 08)

Infraestrutura apenas — não há milhares de previews nesta fase, só 2
arquivos de exemplo gerados localmente (tons simples, sem dependência
de rede), para validar a arquitetura de ponta a ponta.

## Peças

```
core/previewService.js         → motor central (estado + regras)
design-system/previewPlayer.js → componente de UI (botão + progresso)
app/previews/<categoriaId>/<estiloId>.mp3 → estrutura oficial de arquivos (Sprint 15, ver GUIA_PREVIEWS.md)
dados/audio-exemplo/*.wav      → 2 arquivos de exemplo da Sprint 08 (legado, sem estilo real referenciando)
```

> **Atualização (Sprint 15)**: a estrutura oficial e definitiva de
> armazenamento passou a ser `app/previews/<categoriaId>/<estiloId>.mp3`
> — ver `GUIA_PREVIEWS.md` na raiz do projeto para o padrão completo
> de produção (bitrate, duração, fade, nomeação). Os arquivos de
> `dados/audio-exemplo/` da Sprint 08 continuam no projeto só como
> histórico; nenhum estilo real os referencia.

## Por que um único `<audio>` reutilizado (não um por card)

Com milhares de estilos, criar um `HTMLAudioElement` por card seria
memória e conexões desperdiçadas na maioria nunca tocada. O
`PreviewService` cria **um único** elemento `<audio>`, sob demanda
(na primeira reprodução), e o reaproveita para qualquer preview
pedido depois. Isso resolve, por construção e não por convenção:

- **"Somente um preview por vez"** — trocar de preview é só trocar o
  `src` do mesmo elemento; o anterior para automaticamente.
- **"Nenhum preview carregado automaticamente"** — `preload="none"` e
  o `src` só é atribuído dentro de `reproduzir(id, url)`, nunca ao
  montar a tela ou renderizar um card.
- **Memória estável em escala** — não importa se há 10 ou 10 mil
  estilos na tela: continua existindo 1 elemento de áudio.

## Máquina de estados

`ESTADOS_PREVIEW`: `inativo → carregando → tocando ⇄ pausado`, com
`erro` a partir de `carregando` ou `tocando` se o navegador falhar
(ex.: URL inválida). O componente `PreviewPlayer` só reflete o que o
`PreviewService` já sabe — nenhuma tela guarda seu próprio estado de
áudio.

## Contrato do componente `PreviewPlayer`

```js
renderPreviewPlayer(estilo)              // devolve o HTML (string)
vincularPreviewPlayer(raizNoDOM, estilo) // liga o comportamento, devolve função de limpeza
```

Qualquer tela futura (ex.: um card com preview inline na grade) só
precisa chamar essas duas funções — nenhuma lógica de áudio precisa
ser reimplementada. Hoje o player está integrado apenas no painel de
detalhe de `explorar-estilos` (ver "Pendências").

## Lazy loading — o que já é real e o que é preparação

- **Já é real nesta sprint**: o arquivo de áudio só é baixado quando
  o usuário aperta Play (não ao abrir a tela, não ao renderizar a
  grade).
- **Preparado para o futuro**: com milhares de estilos, o próprio
  `catalogService` (Sprint 04) já carrega os módulos de estilos por
  categoria; o preview seguindo o mesmo princípio (arquivo só
  referenciado por URL, nunca embutido no JSON) significa que
  streaming/CDN podem ser trocados no futuro só mudando o valor de
  `previewUrls` ou `previewUrl` — nenhuma mudança de código.

## O que NÃO foi feito (por instrução explícita)

Sem biblioteca de áudio externa (só `HTMLAudioElement` nativo), sem
streaming adaptativo, sem cache próprio (o cache é só o do navegador,
padrão), sem milhares de arquivos de preview reais.
