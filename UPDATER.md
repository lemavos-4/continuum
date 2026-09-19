# Continuum Android Auto-Updater — progresso

Sistema de atualização automática do APK via GitHub Releases.
Este arquivo registra o estado da implementação (para retomar entre sessões).

## Status

- [x] Configuração via ENV (`src/config/updater.ts`)
- [x] Parser/comparador semver (`src/lib/updater/semver.ts`)
- [x] Serviço GitHub Releases (`src/lib/updater/github.ts`)
- [x] Ponte nativa Capacitor (`src/lib/updater/native.ts`)
- [x] Update manager + cache (`src/lib/updater/manager.ts`)
- [x] Hook + UI (`src/hooks/useAppUpdater.ts`, `src/components/updater/UpdateDialog.tsx`)
- [x] i18n (`src/i18n/updater.ts`)
- [x] Montagem no App (`src/App.tsx`)
- [x] Testes de versão (`src/test/updater.test.ts`)
- [x] Workflow: versionName/versionCode, plugin nativo, FileProvider, permissões

## ENV

`.env.example`:

```
VITE_GITHUB_REPO=lemavos/continuum
VITE_GITHUB_APK_ASSET=continuum-release.apk
```

Único ponto de leitura: `src/config/updater.ts`. Nenhum outro arquivo cita o
repositório ou o nome do APK.

## Regras

- Só releases estáveis (não draft, não prerelease) com tag `vMAJOR.MINOR.PATCH`.
- `build-YYYYMMDD-HHMMSS` e qualquer tag não-semver são ignoradas.
- Maior versão semver vence (`1.10.0 > 1.9.0`).
- Downgrade e reinstalação da mesma versão são bloqueados — validação antes do
  download e novamente antes de abrir o instalador.
- Asset obrigatoriamente com o nome de `VITE_GITHUB_APK_ASSET`; a URL usada é
  sempre o `browser_download_url` do próprio asset.

## Versão instalada

`ApkInstaller.getAppInfo()` (plugin nativo) lê `PackageManager` →
`versionName`/`versionCode`. Fora do Android, cai no `VITE_BUILD_VERSION`.

## Android (gerado no CI)

O diretório `android/` não existe no repositório — é criado por
`npx cap add android`. Por isso todo o código nativo é escrito pelo workflow
`.github/workflows/build-apk.yml`:

- `ApkInstallerPlugin.java` (download com progresso + install intent)
- registro do plugin na `MainActivity`
- `REQUEST_INSTALL_PACKAGES` no `AndroidManifest.xml`
- `<external-files-path name="apk_updates" path="apk/" />` no `file_paths.xml`
  (FileProvider `${applicationId}.fileprovider`, sempre `content://`)
- `versionName` = semver da tag; `versionCode` = major*10000 + minor*100 + patch

`applicationId`, keystore e assinatura permanecem inalterados.

## Política de versão pelo servidor (atual)

O servidor é a fonte da verdade. Configure por variáveis de ambiente:

| Variável | Para que serve | Valor publicado agora |
| --- | --- | --- |
| `APP_LATEST_VERSION` | versão mais recente | `2.0.100` |
| `APP_MINIMUM_VERSION` | versão mínima permitida (abaixo dela o app é bloqueado) | `2.0.0` |
| `APP_UPDATE_URL` | link de download mostrado a quem está bloqueado | release mais recente no GitHub |
| `APP_UPDATE_NOTES` | recado curto opcional na janela de atualização | vazio |

Esses são os padrões em `application.properties`; qualquer variável definida no servidor
(por exemplo no Render) tem prioridade e vale imediatamente após reiniciar.

### Como funciona
- Toda requisição do app envia `X-App-Version` e `X-App-Platform`.
- `GET /api/app-version` (público) responde a cada abertura/retomada do app: versão atual,
  mínima, link, `mandatory` e `outdated`.
- Versões do Android abaixo da mínima recebem `426 Upgrade Required` em qualquer rota `/api/`,
  e o app abre a janela obrigatória — sem botão "Depois" e sem fechar.
- Atualizações opcionais (versão nova, mas acima da mínima) podem ser adiadas.
- Na web nunca há bloqueio: recarregar a página já traz a versão nova.

### Tornar uma atualização obrigatória
Suba `APP_MINIMUM_VERSION` para a versão lançada e reinicie o servidor.
