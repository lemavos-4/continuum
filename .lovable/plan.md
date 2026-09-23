# Transformar /editor em uma prévia configurável

## Objetivo
Fazer a tela `/editor` parecer o próprio editor enquanto o usuário configura aparência e leitura, usando a ideia da referência do WhatsApp — prévia dominante e controles diretamente ligados ao conteúdo — sem copiar seu visual.

## Alterações
- Criar uma simulação não editável do editor real, com barra superior, título de nota, texto formatado e barra de status.
- Aplicar imediatamente à prévia os tamanhos de título e corpo, além do wallpaper, blur e brilho escolhidos.
- Exibir o wallpaper real do usuário na simulação; quando não houver imagem, manter o fundo normal do Continuum.
- Reorganizar os controles abaixo/ao lado da prévia conforme o espaço disponível, preservando o design system e os botões atuais.
- Manter Reset, upload/remoção de wallpaper e Update funcionando como hoje.

## Validação
- Conferir a tela em celular e desktop.
- Confirmar que sliders atualizam a prévia sem salvar antes do botão Update.
- Confirmar que upload, remoção, reset e salvamento continuam funcionando.
