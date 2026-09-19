# Reorganizar o Perfil e expor a reconexão

## Objetivo
Deixar `/profile` mais claro e compacto, com as funções agrupadas por intenção, e disponibilizar a reconexão de entidades sem exigir uma nova importação.

## Alterações
- Reorganizar o topo para destacar identidade, plano e edição básica da conta sem informações repetidas.
- Agrupar a página em blocos claros: conta e plano, aparência, dados e sincronização, aplicativo, suporte e sessão.
- Manter todas as funções atuais: edição do nome, assinatura, idioma, tipografia, wallpaper, sincronização offline, importação, exportação, instalação, suporte e logout.
- Adicionar em “Dados e sincronização” uma ação permanente **Reconectar entidades**, com descrição, estado de processamento e resultado traduzido.
- Reutilizar a mesma chamada já existente no fluxo de importação; nenhuma regra do servidor será alterada.
- Ajustar o layout para leitura e toque confortáveis no celular, seguindo o sistema visual do Continuum.
- Completar os novos textos em inglês, espanhol, português e francês.

## Validação
- Verificar que a página abre e se adapta a celular e desktop.
- Confirmar que os diálogos de importação, assinatura, confirmação de salvamento e logout continuam acessíveis.
- Confirmar que a reconexão mostra progresso, impede cliques duplicados e apresenta sucesso ou erro.
