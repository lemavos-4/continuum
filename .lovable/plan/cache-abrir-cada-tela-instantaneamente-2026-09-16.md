# Cache: abrir cada tela instantaneamente

## Resposta curta

Sim, dá para guardar tudo em cache. Hoje o app já salva as respostas do servidor no celular, mas só usa essa cópia quando você está sem internet. Em uso normal, cada clique espera o servidor responder antes de mostrar qualquer coisa — por isso a sensação de lentidão.

A mudança é usar a cópia salva **sempre**: a tela aparece na hora com os dados da última visita e se atualiza sozinha em segundo plano quando a resposta nova chega.

## O que muda para você

- Notas, entidades, atividades, projetos, insights e vault abrem instantâneos depois da primeira visita.
- Voltar para uma tela já visitada não mostra mais tela de carregamento.
- Fechar e reabrir o app (ou o APK) também abre instantâneo — o cache sobrevive ao reinício.
- Dados continuam corretos: o app sempre busca a versão nova por baixo e troca quando chega.
- Ações de escrita (criar, editar, apagar) limpam o pedaço de cache afetado na hora.

## O que será feito

1. **Camada de dados única com cache persistente**
   - Configurar defaults globais do React Query (`staleTime` por tipo de dado, `gcTime` longo, sem refetch agressivo em foco).
   - Adicionar um persister que grava o cache do React Query no IndexedDB já existente (`continuum-offline`), restaurando no boot antes do primeiro render de dados.
   - Versionar o cache pela versão de build, para nunca restaurar formato antigo.

2. **Leitura instantânea a partir do cache existente**
   - A camada `axios-offline` passa a expor a cópia salva como valor inicial (`initialData`) e não apenas como fallback de erro.
   - Padrão stale-while-revalidate: mostra salvo → revalida → atualiza.

3. **Telas hoje sem cache migram para o mesmo padrão**
   - `Notes`, `Entities`, `Activities`, `Projects`, `Insights`, `Vault`, `EntityDetail` e `NoteEditor` buscam dados em `useEffect` manual, sem cache. Passam a usar chaves de consulta compartilhadas em `src/lib/queries.ts` (chaves + tempos por recurso), sem mudar lógica de negócio nem layout.

4. **Invalidação precisa nas escritas**
   - Cada mutação (nota, entidade, tempo, hábito, vault) invalida apenas as chaves relacionadas, mantendo o resto do cache quente.

5. **Pré-carregamento**
   - Ao entrar no app, pré-carregar em segundo plano as listas principais.
   - Pré-carregar a nota/entidade ao tocar e segurar ou passar o mouse sobre o item da lista.

6. **Conteúdo pesado**
   - Imagens e arquivos do vault já têm cache de blobs; estender o mesmo caminho para anexos abertos no editor.

## Detalhes técnicos

- Sem service worker novo para cache de dados; o worker existente de timer não é tocado.
- `persistQueryClient` com persister próprio sobre o wrapper IndexedDB atual (`src/lib/offline/db.ts`), evitando dependência extra e o limite de 5 MB do localStorage.
- Tempos sugeridos: listas 60s, detalhes 30s, insights/métricas 5 min, preferências 10 min; `gcTime` de 24h para persistência.
- Dados sensíveis de sessão continuam fora do cache persistido (`/api/auth/*`), como já ocorre na lista de rotas não cacheáveis.
- Limpeza total do cache no logout.

## Riscos

- Ver dados desatualizados por alguns segundos após mudanças feitas em outro aparelho — mitigado pela revalidação imediata em cada abertura de tela.
- Cache maior no aparelho (ordem de poucos MB), com limpeza automática por idade.
