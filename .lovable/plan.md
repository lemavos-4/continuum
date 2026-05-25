## Objetivo

Entrega única cobrindo: estabilidade de sessão, performance de popups, dados ausentes no Dashboard, e refresh visual minimalista (preto total + branco total) em todas as telas, com componente `spotlight-table` em `/entities`.

---

## 1) Bug — Logout aleatório

Causa raiz no interceptor de `src/lib/api.ts`:
- Trata `403` como falha de auth (mas o backend retorna `403` para `PlanLimitException` e regras de negócio → desloga injustamente).
- Em qualquer 401/403 sem refresh token, faz `window.location.href = "/"` (hard reload + perda de estado).
- Em refresh malsucedido, mesma ação agressiva.

Correções:
- Tratar **somente 401** como sessão expirada (403 nunca desloga).
- Não fazer hard redirect: apenas limpar tokens e deixar o `AuthContext` reagir via `onAuthStateChange` próprio (evento custom `auth:logout`).
- Pular interceptor para endpoints públicos (`/api/auth/*`, `/api/plans`, etc.) para não disparar refresh em telas de login.
- Em `AuthContext.fetchUser()`: em 401, manter o `auth_user` em cache e tentar refresh **uma vez** antes de derrubar a sessão (evita logout em F5 quando o backend está frio).
- Adicionar listener `window.addEventListener("auth:logout")` no `AuthProvider` para sincronizar estado sem reload.

## 2) Bug — Popups lentos

Origem provável: componentes Radix (Dialog, Popover, DropdownMenu) com `bg-card`/`backdrop-blur` pesado e re-renders por context global (`EntityContext`/`UsageContext` re-renderizando a árvore inteira).

Correções:
- Remover `backdrop-blur-3xl` e sombras pesadas dos popups; usar fundo sólido (`bg-popover`) com borda 1px sutil.
- Adicionar `React.memo` nos itens de lista pesados (Sidebar, CommandPalette).
- Garantir que `DialogContent`/`PopoverContent` use animações curtas (150ms) em vez das padrão.

## 3) Bug — Dashboard sem Activities/Timer

Investigado em `src/pages/Dashboard.tsx`:
- `todayActivities` depende de `entitiesApi.list()` filtrado por `type === "ACTIVITY"` E de `trackingApi.today()`. Se uma das duas falha silenciosa (ex: 403 ignorado), o array fica vazio.
- `timerSummaries` vem de `timeTrackingApi.getAllSummaries()` — provavelmente endpoint OK mas sem dados, e o estado vazio hoje só mostra "No timers yet."

Correções:
- Adicionar `onError` nas queries para logar e mostrar estado de erro (não silencioso).
- Trocar filtro `type === "ACTIVITY"` por união `["ACTIVITY", "PROJECT"]` (consistente com `/activities` e `/projects`).
- Mostrar shimmer enquanto carrega (em vez do placeholder vazio que parece bug).
- Ajustar `navigate("/time-tracking")` → `/activities` (rota correta no `App.tsx`).

## 4) Refresh visual minimalista preto/branco

Direção: estética monocromática refinada — preto puro `#000`, branco puro `#FFF`, tipografia serif (Instrument Serif) para títulos + Inter para corpo, sem cinzas coloridos, sem glows, hairlines em `rgba(255,255,255,.08)`.

### `src/index.css`
- Forçar `dark` como único tema (remover light-mode tokens).
- Tokens novos:
  - `--background: 0 0% 0%` (preto puro)
  - `--foreground: 0 0% 100%`
  - `--card: 0 0% 4%`
  - `--popover: 0 0% 6%`
  - `--border: 0 0% 100% / 0.08`
  - `--muted-foreground: 0 0% 60%`
- Remover `bento-card:hover` com sombras dramáticas; trocar por `border-color` sutil.
- Padronizar `--radius: 0.5rem` (cantos mais retos, menos AI-look).

### Telas refeitas com novo design
- `Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`: layout split-screen, card central com hairline, sem ícones decorativos, foco em tipografia.
- `Dashboard.tsx`: grid mais sóbrio, sem gradientes, números grandes em serif.
- `Entities.tsx`: substituir tabela atual pelo novo `spotlight-table`.
- `Notes.tsx`, `NoteEditor.tsx`, `Vault.tsx`, `KnowledgeGraph.tsx`, `Profile.tsx`, `Subscription.tsx`, `TimeTracking.tsx`: aplicar mesmo sistema (cards lisos, sem `bento-card`).
- `LandingPage.tsx`: simplificar (remover cyan, usar tokens novos).
- Sidebar: remover `bg-[#0f1117]/95 backdrop-blur-3xl`, usar `bg-card border-r border-border`.

### Componente `spotlight-table` em `/entities`
- Criar `src/components/ui/spotlight-table.tsx` adaptado ao código fornecido, mas:
  - Recebe `data` real do `entitiesApi.list()` (não mock).
  - Colunas: Nome, Tipo, Última atualização, Ações.
  - Mantém o efeito "spotlight" (linhas que não casam com a busca recebem `opacity-20`).
  - Usa `Link` do react-router para abrir `/entities/:id`.
- Integrar em `Entities.tsx` mantendo o header e botão "Create entity".

---

## Detalhes técnicos

- **Não tocar no backend.** Só ajustar contrato no front (status codes, rotas).
- **Sem mudança no roteamento** (`HashRouter` mantido).
- **Tailwind**: extender `fontFamily.serif` com `Instrument Serif`.
- **Framer Motion** para entrada de cards (fade + 8px translate, 200ms).
- **Acessibilidade**: contraste AAA garantido pelo preto/branco puro.

---

## Arquivos afetados (estimativa)

```text
src/lib/api.ts                       (interceptor)
src/contexts/AuthContext.tsx         (refresh + listener)
src/index.css                        (tokens monocromáticos)
tailwind.config.ts                   (font serif)
src/components/ui/spotlight-table.tsx (NOVO)
src/components/ui/dialog.tsx         (peso visual)
src/components/ui/popover.tsx
src/components/sidebar/Sidebar.tsx
src/pages/Login.tsx
src/pages/Register.tsx
src/pages/ForgotPassword.tsx
src/pages/Dashboard.tsx
src/pages/Entities.tsx
src/pages/Notes.tsx
src/pages/Vault.tsx
src/pages/Profile.tsx
src/pages/Subscription.tsx
src/pages/TimeTracking.tsx
src/pages/KnowledgeGraph.tsx
src/pages/LandingPage.tsx + componentes landing/
```

## Riscos

- Refresh do CSS global pode quebrar visualmente telas que não vou reescrever (NoteEditor tem muito CSS local). Vou validar visualmente e ajustar.
- O endpoint `/activities` depende do backend retornar `type === "PROJECT"` corretamente; se não houver projetos, ainda vai aparecer vazio (esperado).
