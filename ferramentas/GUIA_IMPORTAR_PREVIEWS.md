# Guia rápido — como organizar os áudios de preview

Objetivo: colocar os arquivos de áudio no lugar certo, com o nome
certo, para que o script encontre e vincule ao estilo correto —
**sem programar nada**.

Pasta onde tudo entra: `app/previews/`

---

## Regra de ouro

**1 estilo, 1 ou mais previews → 1 subpasta com o nome EXATO do estilo.**

É a forma recomendada. Sempre que tiver dúvida, use ela.

```
app/previews/
└── Bossa Nova Anos 60/
    ├── parte-1.mp3
    ├── parte-2.mp3
    └── parte-3.mp3
```

- O nome da **pasta** = o nome do estilo, exatamente como aparece no
  catálogo (`Bossa Nova Anos 60`).
- Dentro da pasta, os nomes dos **arquivos** não importam — pode ser
  `parte-1.mp3`, `01.mp3`, `trecho-a.mp3`, tanto faz.
- A ORDEM de reprodução segue a ordem alfabética dos nomes de
  arquivo. Se quiser controlar a ordem, numere: `01.mp3`, `02.mp3`, `03.mp3`.
- Pode ter 1 arquivo só na pasta — funciona normalmente como preview único.

✅ Maiúscula/minúscula e acento não importam (`Bossa Nova` = `bossa nova`).
❌ Não precisa (e não deve) editar nenhum JSON à mão.

---

## Alternativa (só se não quiser criar pasta): arquivo solto numerado

Só use esta opção se **não conseguir** criar uma subpasta. Coloque o
arquivo direto em `app/previews/` (fora de qualquer pasta) terminando
em `-01`, `-02`, `-03`... (sempre 2 dígitos, com zero na frente):

```
app/previews/
├── rock-classico-01.mp3
├── rock-classico-02.mp3
└── rock-classico-03.mp3
```

⚠️ **Atenção — quando NÃO usar esta opção:**
Se o nome do estilo **já termina em número** (ex.: `Anos 60`,
`Anos 2000`, `House 90`), NÃO use arquivo solto numerado — o script
pode confundir o número do estilo com o número do preview. Nesses
casos, use sempre a **Regra de ouro** (pasta).

Um único arquivo solto, sem sufixo numérico, continua funcionando
normalmente como preview único (como sempre funcionou):
```
app/previews/rock-classico.mp3
```

---

## Checklist antes de rodar a importação

- [ ] O nome da pasta (ou do arquivo) bate com o nome do estilo no catálogo?
- [ ] Se o estilo tem mais de 1 preview, usei uma SUBPASTA (não arquivos soltos numerados)?
- [ ] Se o nome do estilo termina em número, usei SUBPASTA (nunca sufixo `-01`)?
- [ ] Extensão do arquivo é `.mp3`, `.wav`, `.ogg`, `.aac` ou `.m4a`?

## Rodando a importação

```bash
python3 ferramentas/importar_previews.py
```

- Por padrão, só **acrescenta** previews novos — nunca apaga um preview
  que você já tinha vinculado antes.
- Se quiser forçar a lista inteira a ser refeita do zero a partir do
  que está em `app/previews/` agora, use:
  ```bash
  python3 ferramentas/importar_previews.py --substituir
  ```

No final, o script imprime um resumo:
```
Estilos atualizados: X
Previews vinculados nesta execução: Y
Estilos com mais de 1 preview: Z
```

Depois, confira o resultado completo em:
```bash
python3 ferramentas/validar-enriquecimento.py
```
→ abre `ferramentas/relatorio-enriquecimento.md`.
