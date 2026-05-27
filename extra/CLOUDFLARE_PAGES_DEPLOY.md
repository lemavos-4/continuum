# Deploy no Cloudflare Pages (monorepo frontend/backend)

Este projeto é um SPA React/Vite. O deploy no Cloudflare Pages deve publicar apenas o frontend, enquanto o backend continua em `backend/` (Spring Boot) ou em outro host/API.

> Estrutura recomendada no monorepo:
>
> - `frontend/` → aplicação React/Vite
> - `backend/` → serviço Java/Spring Boot
>
> Se o frontend ainda estiver na raiz, o mesmo guia funciona, mas o comando de build e o diretório de saída devem apontar para essa pasta.

---

## 1. Estrutura esperada

```text
/
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── public/
│   │   ├── _redirects
│   │   ├── robots.txt
│   │   └── manifest.json
│   ├── src/
│   └── dist/   (gerado no build)
├── backend/
│   ├── pom.xml
│   └── src/
└── README.md
```

### Arquivos importantes no frontend

- `frontend/package.json` com scripts de build/test.
- `frontend/vite.config.ts` com `build.outDir: "dist"`.
- `frontend/public/_redirects` contendo SPA fallback.
- `frontend/.env` / variáveis do projeto no Cloudflare Pages.

---

## 2. Preparar o frontend para Pages

### 2.1 Build

O build deve gerar arquivos estáticos em `frontend/dist`.

Exemplo de `frontend/package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### 2.2 SPA fallback

Crie ou garanta o arquivo `frontend/public/_redirects`:

```text
/* /index.html 200
```

Esse arquivo será copiado para `frontend/dist` durante o build.

### 2.3 Variáveis de ambiente

Defina no Cloudflare Pages:

- `VITE_API_URL` → URL pública do backend (por exemplo `https://api.seudominio.com`)
- Opcionalmente outras variáveis como `VITE_APP_ENV`, `VITE_ANALYTICS_KEY`, etc.

> Se o backend estiver na mesma origem ou atrás de proxy, pode deixar `VITE_API_URL` vazio e usar `/api`.

---

## 3. Configuração no Cloudflare Pages

### Opção A — usar o root do projeto com build em subpasta

Se o projeto for importado do repositório inteiro, configure:

- **Build command:** `cd frontend && npm install && npm run build`
- **Build output directory:** `frontend/dist`
- **Node version:** 20.x ou 22.x

### Opção B — usar o diretório de projeto `frontend`

Se o Cloudflare Pages suportar root em subdiretório (ou se você organizar o projeto para apontar para `frontend/`), configure:

- **Project root:** `frontend`
- **Build command:** `npm install && npm run build`
- **Output directory:** `dist`

Essa opção simplifica o deploy quando o projeto frontend estiver isolado.

---

## 4. Como o build deve ser executado

### Localmente

```bash
cd frontend
npm install
npm run build
```

Verifique o resultado em `frontend/dist`.

### Preview local

```bash
cd frontend
npm run preview
```

---

## 5. Integração com o backend

O frontend não precisa ser construído junto com o backend.

### Recomendação

1. Deploie o backend em outro serviço (Spring Boot em VM, container, Cloudflare Worker, Render, Railway, Fly.io, etc).
2. Configure `VITE_API_URL` com a URL pública desse backend.
3. Se a API precisar ser proxyada pelo frontend, faça isso em um gateway/worker externo, não no build do Vite.

### Exemplo

```env
VITE_API_URL=https://api.continuum.example.com
```

---

## 6. Checklist de deploy

Antes de publicar:

- [ ] `frontend/public/_redirects` existe;
- [ ] `frontend/package.json` possui `build` funcionando;
- [ ] `VITE_API_URL` está definido no Cloudflare Pages;
- [ ] O build gera arquivos em `frontend/dist`;
- [ ] O `dist` contém `index.html`, assets e `_redirects`;
- [ ] O domínio customizado aponta para o projeto Pages.

---

## 7. Exemplo de configuração de build no Pages

### Se o repo estiver no nível raiz

- **Build command:** `cd frontend && npm install && npm run build`
- **Output directory:** `frontend/dist`

### Se o repo estiver configurado com root `frontend`

- **Build command:** `npm install && npm run build`
- **Output directory:** `dist`

---

## 8. Observações importantes

- O Cloudflare Pages faz o deploy estático; não há servidor Node em produção.
- O roteamento do React Router precisa do fallback SPA (`_redirects`).
- O backend `backend/` deve ser tratado como um serviço independente.
- Em monorepo, o deploy do frontend deve ser explícito para evitar publicação de arquivos do Java ou de outros artefatos.

---

## 9. Fluxo recomendado

1. Garantir que o frontend esteja em `frontend/`.
2. Verificar o build local com `npm run build` em `frontend/`.
3. Configurar o Cloudflare Pages com `cd frontend && npm install && npm run build`.
4. Definir `VITE_API_URL`.
5. Publicar e validar o site.

---

## 10. Se quiser automatizar com CI

Exemplo de script em `package.json` no root:

```json
{
  "scripts": {
    "build:frontend": "cd frontend && npm install && npm run build"
  }
}
```

Depois, use esse script em qualquer pipeline.
