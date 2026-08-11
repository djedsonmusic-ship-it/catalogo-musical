# app/previews/

Pasta de origem dos áudios de preview — é aqui que `ferramentas/importar_previews.py` procura.

Como organizar (resumo — guia completo em `ferramentas/GUIA_IMPORTAR_PREVIEWS.md`):

- **Mais de 1 preview no mesmo estilo →** crie uma subpasta com o nome
  exatamente igual ao do estilo:
  ```
  app/previews/Bossa Nova Anos 60/parte-1.mp3
  app/previews/Bossa Nova Anos 60/parte-2.mp3
  ```
- **1 preview só →** arquivo solto com o nome do estilo:
  ```
  app/previews/rock-classico.mp3
  ```

Extensões aceitas: `.mp3 .wav .ogg .aac .m4a`

Este arquivo (e a pasta) pode ficar vazio de áudios — ele só existe
para a pasta `previews/` já estar criada e versionada no Git antes da
primeira importação.
