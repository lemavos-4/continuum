# Planos e Limites do Continuum

## Como os planos funcionam hoje

O frontend usa os dados do usuário para aplicar limites de plano. As regras estão em `src/hooks/usePlanGate.ts` e `src/lib/plan.ts`.

### O que é verificado

Para cada usuário, o app lê estes limites:
- `maxEntities`
- `maxNotes`
- `historyDays`
- `maxVaultSizeMB`

Esses valores vêm do objeto `user`, e se estiverem ausentes o código trata como `-1` (ou seja, ilimitado).

### Quais ações são bloqueadas pelo plano

O hook `usePlanGate` fornece:
- `canCreateNote` — permite criar nota se ainda não atingiu `maxNotes`
- `canCreateEntity` — permite criar entidade se ainda não atingiu `maxEntities`
- `canCreateActivity` — é igual a `canCreateEntity`
- `canUploadVault(fileSizeMB)` — permite upload se o tamanho total do Vault não passar de `maxVaultSizeMB`

Então:
- notas são limitadas pelo contador de notas
- entidades e atividades usam o mesmo contador de entidades
- upload de arquivo no Vault é limitado pelo tamanho armazenado

### O que acontece quando o limite é atingido

Nos formulários de criação de notas ou entidades (`src/pages/Notes.tsx`, `src/pages/Entities.tsx`), se o limite tiver sido alcançado:
- o app não deixa criar novo item
- abre um `UpgradeModal`
- mostra uma mensagem de limite

Também existe uma função `getLimitMessage(...)` que monta algo como:
- `x/y notas utilizados`
- `x/y entidades utilizados`
- `x/y MB de armazenamento`

## Planos e tiers premium

Os planos definidos no frontend são:
- `FREE`
- `PLUS`
- `PRO`
- `VISION`

Os tiers premium aparecem no modal de upgrade em `src/components/UpgradeModal.tsx` com estas características:

- `PLUS`
  - 100 entities
  - 500 notes
  - 180 days history
  - 1 GB Vault

- `PRO`
  - Unlimited entities
  - Unlimited notes
  - 2 years history
  - 2 GB Vault

- `VISION`
  - Unlimited entities
  - Unlimited notes
  - Unlimited history
  - 4 GB Vault

## O que o premium afeta

Subir de plano libera principalmente:
- mais entidades criáveis
- mais notas criáveis
- retenção de histórico maior
- mais armazenamento no Vault

Além disso, o código indica que planos premium podem dar acesso a recursos especiais via limites extras no objeto `User`, mas o principal controle visível hoje é esse de limites.

## Resumo

- `FREE` é o plano padrão.
- O app bloqueia criação de notas/entidades quando alcança o limite.
- `PLUS`, `PRO` e `VISION` aumentam esses limites.
- `activities` contam junto com entidades.
- Vault é limitado por tamanho, não por número de arquivos.
