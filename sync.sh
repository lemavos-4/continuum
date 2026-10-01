#!/usr/bin/env bash
# continuum-sync.sh
#
# Script único com os 3 fluxos de sincronização do repo continuum:
#
#   1) Dev -> Principal
#      lemavos-N/continuum (REMOTE) -> repo principal local
#      Reestrutura para frontend/+backend/, preservando o .git local
#      do principal.
#
#   2) Principal -> Dev
#      repo principal local -> lemavos-N/continuum (REMOTE)
#      O conteúdo remoto do destino é substituído pelo conteúdo local
#      do principal e depois enviado para o GitHub.
#
#   3) Dev -> Dev
#      lemavos-X/continuum (REMOTE) -> lemavos-Y/continuum
#      O conteúdo remoto da origem substitui o conteúdo do destino,
#      preservando somente o .git do destino.
#
# REGRAS:
#   - O destino NÃO precisa estar commitado ou clean.
#   - Alterações não commitadas do destino serão sobrescritas.
#   - A origem de Dev é SEMPRE o estado mais recente do GitHub.
#   - sync.sh / continuum-sync.sh do destino nunca é apagado.
#
# USO:
#   ./sync.sh [caminho-do-repo-principal-local]
#
# Requer:
#   gh (GitHub CLI) autenticado.

set -euo pipefail

REPO_NAME="continuum"
MAIN_OWNER="continuumnodes"

OPTIONS=("lemavos-1" "lemavos-2" "lemavos-3" "lemavos-4")

command -v gh >/dev/null 2>&1 || {
  echo "ERRO: GitHub CLI (gh) não encontrado no PATH." >&2
  exit 1
}

# Pasta original de onde o script foi executado.
ORIG_DIR="$(pwd)"

# ── Helpers ────────────────────────────────────────────────────────────────

pick_owner() {
  echo "$1" >&2

  local opt

  select opt in "${OPTIONS[@]}"; do
    if [ -n "${opt:-}" ]; then
      echo "$opt"
      return
    fi

    echo "Opção inválida, escolha um número da lista." >&2
  done
}

check_repo() {
  local owner="$1"

  if ! gh repo view "${owner}/${REPO_NAME}" >/dev/null 2>&1; then
    echo "ERRO: ${owner}/${REPO_NAME} não existe ou você não tem acesso." >&2
    exit 1
  fi
}

# Preserva os arquivos de sincronização existentes no DESTINO.
#
# Eles não pertencem ao conteúdo que será sincronizado.
# Portanto, antes de substituir o destino, copiamos os scripts para um
# diretório temporário e depois restauramos.
preserve_sync_scripts() {
  local source_dir="$1"
  local backup_dir="$2"

  mkdir -p "$backup_dir"

  for file in \
    "sync.sh" \
    "continuum-sync.sh"
  do
    if [ -f "$source_dir/$file" ]; then
      cp -p "$source_dir/$file" "$backup_dir/$file"
    fi
  done
}

restore_sync_scripts() {
  local backup_dir="$1"
  local destination_dir="$2"

  if [ -d "$backup_dir" ]; then
    for file in \
      "sync.sh" \
      "continuum-sync.sh"
    do
      if [ -f "$backup_dir/$file" ]; then
        cp -p "$backup_dir/$file" "$destination_dir/$file"
      fi
    done
  fi
}

# ── Modo 1: Dev -> Principal ──────────────────────────────────────────────

run_dev_to_main() {
  local local_repo_dir="${1:-$(pwd)}"
  local_repo_dir="$(realpath "$local_repo_dir")"

  local work_parent
  work_parent="$(dirname "$local_repo_dir")"

  local tmp_name
  tmp_name="$(basename "$local_repo_dir").old.$$"

  local sync_backup
  sync_backup="$(mktemp -d)"

  local owner
  owner="$(pick_owner "Qual repositório de dev usar como ORIGEM?")"

  check_repo "$owner"

  echo ""
  echo "ORIGEM: ${owner}/${REPO_NAME}"
  echo "DESTINO: ${local_repo_dir}"
  echo ""

  [ -d "$local_repo_dir/.git" ] || {
    echo "ERRO: '$local_repo_dir/.git' não existe — nada pra preservar." >&2
    rm -rf "$sync_backup"
    exit 1
  }

  # O destino pode estar sujo.
  # Não verificamos git status.
  #
  # Preserva:
  #   - .git
  #   - sync.sh / continuum-sync.sh
  preserve_sync_scripts "$local_repo_dir" "$sync_backup"

  cd "$work_parent"

  rm -rf "$tmp_name"

  # Guarda o checkout atual inteiro.
  mv "$local_repo_dir" "$tmp_name"

  # ============================================================
  # A ORIGEM VEM SEMPRE DO REMOTO
  # ============================================================

  gh repo clone "${owner}/${REPO_NAME}" "$local_repo_dir"

  # Remove o .git da cópia da origem.
  # O histórico/remote do PRINCIPAL será restaurado abaixo.
  rm -rf "$local_repo_dir/.git"

  # Restaura o .git do destino original.
  mv "$tmp_name/.git" "$local_repo_dir/"

  # Restaura o script do destino.
  restore_sync_scripts "$sync_backup" "$local_repo_dir"

  rm -rf "$tmp_name"
  rm -rf "$sync_backup"

  cd "$local_repo_dir"

  # Arquivos específicos da origem que não devem entrar no principal.
  rm -rf .lovable/

  # ── Reestruturação Dev -> Principal ─────────────────────────────

  mkdir -p frontend

  for item in *; do
    [ "$item" = "frontend" ] && continue

    mv "$item" frontend/
  done

  # Arquivos ocultos específicos da raiz.
  for f in .env .env.example .gitignore; do
    if [ -e "$f" ]; then
      mv "$f" frontend/
    fi
  done

  # README/LICENSE/vercel ficam na raiz.
  for f in README.md LICENSE vercel.json; do
    if [ -e "frontend/$f" ]; then
      mv "frontend/$f" .
    fi
  done

  # Backend continua na raiz do principal.
  if [ -d "frontend/backend" ]; then
    mv frontend/backend .
  fi

  # Garante novamente que o script do destino existe.
  restore_sync_scripts "$sync_backup" "$local_repo_dir" 2>/dev/null || true

  echo ""
  echo "────────────────────────────────────────"
  echo "Sincronização concluída."
  echo "Origem:  ${owner}/${REPO_NAME}"
  echo "Destino: repo principal local"
  echo ""
  echo "O conteúdo veio do GitHub."
  echo "O .git do principal foi preservado."
  echo "O sync.sh do destino foi preservado."
  echo "Revise e faça o commit manualmente."
  echo "────────────────────────────────────────"
  echo ""

  ls -la "$local_repo_dir"
}

# ── Modo 2: Principal -> Dev ──────────────────────────────────────────────

run_main_to_dev() {
  local main_repo_dir="${1:-$(pwd)}"
  main_repo_dir="$(realpath "$main_repo_dir")"

  [ -d "$main_repo_dir/frontend" ] || {
    echo "ERRO: '$main_repo_dir/frontend' não existe — essa pasta não parece o repo principal estruturado." >&2
    exit 1
  }

  local owner
  owner="$(pick_owner "Pra qual repositório de dev ENVIAR?")"

  check_repo "$owner"

  echo ""
  echo "ORIGEM: repo principal local"
  echo "DESTINO: ${owner}/${REPO_NAME}"
  echo ""

  local work_dir
  work_dir="$(mktemp -d)"

  trap 'rm -rf "$work_dir"' RETURN

  # ============================================================
  # Baixa o DESTINO atual do GitHub.
  #
  # Isso é feito para preservar o .git e o sync.sh dele.
  # ============================================================

  gh repo clone "${owner}/${REPO_NAME}" "$work_dir/target"

  local sync_backup="$work_dir/sync-backup"

  preserve_sync_scripts "$work_dir/target" "$sync_backup"

  # ============================================================
  # LIMPA O CONTEÚDO DO DESTINO.
  #
  # Não importa se o remoto tinha commits, arquivos ou conteúdo
  # diferente. Ele será substituído.
  #
  # O .git permanece.
  # ============================================================

  find "$work_dir/target" \
    -mindepth 1 \
    -maxdepth 1 \
    ! -name '.git' \
    -exec rm -rf {} +

  # ============================================================
  # Copia o conteúdo ATUAL do principal local.
  #
  # Aqui a origem é o checkout principal fornecido pelo usuário.
  # ============================================================

  (
    cd "$main_repo_dir"

    find . \
      -mindepth 1 \
      -maxdepth 1 \
      ! -name '.git' \
      -exec cp -R {} "$work_dir/target/" \;
  )

  # ============================================================
  # O conteúdo do principal possui frontend/.
  # O repo Dev precisa ficar flat.
  # ============================================================

  cd "$work_dir/target"

  if [ -d frontend ]; then
    shopt -s dotglob nullglob

    for item in frontend/*; do
      # Não mover o script caso exista dentro de frontend.
      case "$(basename "$item")" in
        sync.sh|continuum-sync.sh)
          continue
          ;;
      esac

      mv "$item" .
    done

    shopt -u dotglob nullglob

    rm -rf frontend
  fi

  # ============================================================
  # RESTAURA O SCRIPT DO DESTINO.
  #
  # Importante:
  # O sync.sh NÃO vem da origem.
  # O sync.sh pertence ao destino.
  # ============================================================

  restore_sync_scripts "$sync_backup" "$work_dir/target"

  cd "$work_dir/target"

  # ============================================================
  # Agora o destino está exatamente com o conteúdo desejado.
  # ============================================================

  git add -A

  if git diff --cached --quiet; then
    echo "Nada mudou — nada pra commitar."
  else
    git commit -m "sync from ${MAIN_OWNER}/${REPO_NAME}"
    git push
  fi

  echo ""
  echo "────────────────────────────────────────"
  echo "Enviado para ${owner}/${REPO_NAME}."
  echo "Conteúdo do principal sincronizado."
  echo "sync.sh do destino preservado."
  echo "────────────────────────────────────────"
}

# ── Modo 3: Dev -> Dev ─────────────────────────────────────────────────────
#
# Destino:
#   checkout local onde o script está sendo executado.
#
# Origem:
#   SEMPRE o repositório remoto escolhido no GitHub.
#
# O destino pode estar completamente sujo.
# O conteúdo dele será sobrescrito.
#
# Apenas:
#   - .git
#   - sync.sh / continuum-sync.sh
#
# são preservados do destino.

run_dev_to_dev() {
  local local_repo_dir="${1:-$(pwd)}"
  local_repo_dir="$(realpath "$local_repo_dir")"

  local work_parent
  work_parent="$(dirname "$local_repo_dir")"

  local tmp_name
  tmp_name="$(basename "$local_repo_dir").old.$$"

  [ -d "$local_repo_dir/.git" ] || {
    echo "ERRO: '$local_repo_dir/.git' não existe — nada pra preservar." >&2
    exit 1
  }

  # Descobre o repositório remoto do DESTINO.
  local target_owner

  target_owner="$(
    cd "$local_repo_dir" &&
    gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null ||
    true
  )"

  [ -n "$target_owner" ] || {
    echo "ERRO: não consegui identificar o repositório de '$local_repo_dir' via gh." >&2
    exit 1
  }

  local source_owner
  source_owner="$(pick_owner "Repositório de ORIGEM (de onde copiar o conteúdo)?")"

  check_repo "$source_owner"

  if [ "${source_owner}/${REPO_NAME}" = "$target_owner" ]; then
    echo "ERRO: origem e destino são o mesmo repositório ($target_owner)." >&2
    exit 1
  fi

  echo ""
  echo "ORIGEM: ${source_owner}/${REPO_NAME} [REMOTE]"
  echo "DESTINO: ${target_owner}"
  echo ""

  local sync_backup
  sync_backup="$(mktemp -d)"

  # Preserva os scripts existentes no destino.
  preserve_sync_scripts "$local_repo_dir" "$sync_backup"

  cd "$work_parent"

  rm -rf "$tmp_name"

  # Guarda o destino atual inteiro.
  # Não importa se está sujo.
  mv "$local_repo_dir" "$tmp_name"

  # ============================================================
  # A ORIGEM É SEMPRE CLONADA DO GITHUB.
  # ============================================================

  gh repo clone "${source_owner}/${REPO_NAME}" "$local_repo_dir"

  # Remove o .git da origem.
  rm -rf "$local_repo_dir/.git"

  # Coloca de volta o .git do DESTINO.
  mv "$tmp_name/.git" "$local_repo_dir/"

  # Restaura os scripts do DESTINO.
  restore_sync_scripts "$sync_backup" "$local_repo_dir"

  rm -rf "$tmp_name"
  rm -rf "$sync_backup"

  cd "$local_repo_dir"

  # ============================================================
  # O conteúdo agora é da origem.
  # O histórico continua sendo do destino.
  # ============================================================

  git add -A

  if git diff --cached --quiet; then
    echo "Nada mudou — nada pra commitar."
  else
    git commit -m "sync content from ${source_owner}/${REPO_NAME}"
    git push
  fi

  echo ""
  echo "────────────────────────────────────────"
  echo "${target_owner} atualizado."
  echo ""
  echo "Origem:  ${source_owner}/${REPO_NAME} [REMOTE]"
  echo "Destino: ${target_owner}"
  echo "Histórico do destino preservado."
  echo "sync.sh do destino preservado."
  echo "────────────────────────────────────────"
}

# ── Menu principal ─────────────────────────────────────────────────────────

echo ""
echo "Qual fluxo rodar?"
echo ""
echo "  1) Dev -> Principal"
echo "     lemavos-N/continuum -> repo principal local"
echo ""
echo "  2) Principal -> Dev"
echo "     repo principal local -> lemavos-N/continuum"
echo ""
echo "  3) Dev -> Dev"
echo "     lemavos-X/continuum -> lemavos-Y/continuum"
echo ""

read -rp "Escolha [1-3]: " FLOW_CHOICE

case "$FLOW_CHOICE" in
  1)
    run_dev_to_main "${1:-$(pwd)}"
    ;;

  2)
    run_main_to_dev "${1:-$(pwd)}"
    ;;

  3)
    run_dev_to_dev
    ;;

  *)
    echo "Opção inválida." >&2
    exit 1
    ;;
esac