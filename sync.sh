#!/usr/bin/env bash
# continuum-sync.sh
#
# Script único com os 3 fluxos de sincronização do repo continuum,
# escolhidos por um menu no início da execução:
#
#   1) Dev -> Principal
#      lemavos-N/continuum (flat) -> cópia local do repo principal
#      (continuumnodes/continuum), reestruturando em frontend/+backend/
#      e preservando o .git local (histórico/remote do principal).
#      NÃO comita/empurra sozinho — deixa pronto pra você revisar e
#      commitar na mão.
#
#   2) Principal -> Dev
#      cópia local do repo principal (frontend/+backend/) -> lemavos-N/
#      continuum, achatando frontend/ de volta pra raiz (backend/ e os
#      arquivos de raiz continuam como já estão). Comita e empurra
#      automaticamente pro repo de dev escolhido.
#
#   3) Dev -> Dev
#      lemavos-X/continuum -> lemavos-Y/continuum: troca o conteúdo do
#      destino pelo da origem, mantendo só o .git do destino. Comita e
#      empurra automaticamente.
#
# USO:
#   ./continuum-sync.sh [caminho-do-repo-principal-local]
#   (sem argumento, usa a pasta atual — só usado pelos modos 1 e 2)
#
# Requer: gh (GitHub CLI) autenticado (`gh auth login`).

set -euo pipefail

REPO_NAME="continuum"
MAIN_OWNER="continuumnodes"
# Só existem lemavos-1 a lemavos-4 por enquanto — edite a lista abaixo
# quando surgir uma conta nova.
OPTIONS=("lemavos-1" "lemavos-2" "lemavos-3" "lemavos-4")

command -v gh >/dev/null 2>&1 || { echo "ERRO: GitHub CLI (gh) não encontrado no PATH." >&2; exit 1; }

# pasta de onde o script foi chamado, antes de qualquer cd — usado pra
# detectar se é o checkout local de um dos repos envolvidos (ver Modo 3)
ORIG_DIR="$(pwd)"

# ── Helpers ────────────────────────────────────────────────────────────────

pick_owner() {
  # $1 = texto da pergunta. Imprime a escolha em stdout (use com $(...)).
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

check_clean_or_abort() {
  # Aborta se a pasta tiver mudanças não commitadas — essa pasta está
  # prestes a ter seu conteúdo substituído, e mudanças não commitadas
  # seriam perdidas sem aviso.
  local dir="$1"
  if [ -d "$dir/.git" ] && [ -n "$(git -C "$dir" status --porcelain 2>/dev/null)" ]; then
    echo "ERRO: '$dir' tem mudanças não commitadas. Resolva antes de continuar:" >&2
    echo "  git -C '$dir' status" >&2
    echo "  (commite com 'git commit' ou guarde de lado com 'git stash')" >&2
    exit 1
  fi
}

# ── Modo 1: Dev -> Principal ──────────────────────────────────────────────

run_dev_to_main() {
  local local_repo_dir="${1:-$(pwd)}"
  local_repo_dir="$(realpath "$local_repo_dir")"
  local work_parent; work_parent="$(dirname "$local_repo_dir")"
  local tmp_name; tmp_name="$(basename "$local_repo_dir").old.$$"

  local owner; owner="$(pick_owner "Qual repositório de dev usar como ORIGEM?")"
  check_repo "$owner"
  echo "Usando: ${owner}/${REPO_NAME}"

  [ -d "$local_repo_dir/.git" ] || { echo "ERRO: '$local_repo_dir/.git' não existe — nada pra preservar." >&2; exit 1; }
  check_clean_or_abort "$local_repo_dir"

  cd "$work_parent"
  rm -rf "$tmp_name"
  mv "$local_repo_dir" "$tmp_name"

  gh repo clone "${owner}/${REPO_NAME}" "$local_repo_dir"
  rm -rf "$local_repo_dir/.git"
  mv "$tmp_name/.git" "$local_repo_dir/"
  rm -rf "$tmp_name"

  cd "$local_repo_dir"
  rm -rf .lovable/

  mkdir -p frontend
  for item in *; do
    [ "$item" = "frontend" ] && continue
    mv "$item" frontend/
  done
  for f in .env .env.example .gitignore; do
    [ -e "$f" ] && mv "$f" frontend/
  done
  # só README.md volta pra raiz; os outros .md (about, terms, support,
  # versions, etc.) ficam dentro de frontend/ de propósito
  for f in README.md LICENSE vercel.json; do
    [ -e "frontend/$f" ] && mv "frontend/$f" .
  done
  [ -d "frontend/backend" ] && mv frontend/backend .

  echo ""
  echo "Resincronizado com ${owner}/${REPO_NAME}. Revise e dê commit manualmente:"
  ls -la "$local_repo_dir"
}

# ── Modo 2: Principal -> Dev ──────────────────────────────────────────────

run_main_to_dev() {
  local main_repo_dir="${1:-$(pwd)}"
  main_repo_dir="$(realpath "$main_repo_dir")"

  [ -d "$main_repo_dir/frontend" ] || { echo "ERRO: '$main_repo_dir/frontend' não existe — essa pasta não parece o repo principal estruturado." >&2; exit 1; }

  local owner; owner="$(pick_owner "Pra qual repositório de dev ENVIAR?")"
  check_repo "$owner"
  echo "Enviando pra: ${owner}/${REPO_NAME}"

  local work_dir; work_dir="$(mktemp -d)"
  trap 'rm -rf "$work_dir"' RETURN

  gh repo clone "${owner}/${REPO_NAME}" "$work_dir/target"

  # esvazia o conteúdo rastreado do destino, preservando o .git dele
  find "$work_dir/target" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

  # copia o conteúdo atual do repo principal (sem o .git dele)
  ( cd "$main_repo_dir" && find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec cp -R {} "$work_dir/target/" \; )

  # o próprio script não deve ser sincronizado entre os repos
  rm -f "$work_dir/target/sync.sh" "$work_dir/target/continuum-sync.sh"
  rm -f "$work_dir/target/frontend/sync.sh" "$work_dir/target/frontend/continuum-sync.sh"

  cd "$work_dir/target"

  # achata frontend/ de volta pra raiz; backend/ e arquivos de raiz
  # (README.md, LICENSE, vercel.json) já estão no lugar certo
  if [ -d frontend ]; then
    shopt -s dotglob nullglob
    for item in frontend/*; do
      mv "$item" .
    done
    shopt -u dotglob nullglob
    rm -rf frontend
  fi

  git add -A
  if git diff --cached --quiet; then
    echo "Nada mudou — nada pra commitar."
  else
    git commit -m "sync from ${MAIN_OWNER}/${REPO_NAME}"
    git push
  fi

  echo ""
  echo "Enviado pra ${owner}/${REPO_NAME}."
}

# ── Modo 3: Dev -> Dev ─────────────────────────────────────────────────────
# O destino é sempre a pasta local de onde o script é rodado (você já está
# dentro do Codespace/checkout do repo de dev que vai receber o conteúdo —
# não tem sentido perguntar "pra qual destino", só a origem).

run_dev_to_dev() {
  local local_repo_dir="${1:-$(pwd)}"
  local_repo_dir="$(realpath "$local_repo_dir")"
  local work_parent; work_parent="$(dirname "$local_repo_dir")"
  local tmp_name; tmp_name="$(basename "$local_repo_dir").old.$$"

  [ -d "$local_repo_dir/.git" ] || { echo "ERRO: '$local_repo_dir/.git' não existe — nada pra preservar." >&2; exit 1; }

  local target_owner
  target_owner="$(cd "$local_repo_dir" && gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
  [ -n "$target_owner" ] || { echo "ERRO: não consegui identificar o repositório (owner/nome) de '$local_repo_dir' via gh." >&2; exit 1; }

  local source_owner; source_owner="$(pick_owner "Repositório de ORIGEM (de onde copiar o conteúdo)?")"
  check_repo "$source_owner"

  if [ "${source_owner}/${REPO_NAME}" = "$target_owner" ]; then
    echo "ERRO: origem e destino são o mesmo repositório ($target_owner)." >&2
    exit 1
  fi

  check_clean_or_abort "$local_repo_dir"

  cd "$work_parent"
  rm -rf "$tmp_name"
  mv "$local_repo_dir" "$tmp_name"

  gh repo clone "${source_owner}/${REPO_NAME}" "$local_repo_dir"
  # o próprio script não deve ser sincronizado entre os repos — se tiver
  # sido commitado ali por engano, não entra na cópia
  rm -f "$local_repo_dir/sync.sh" "$local_repo_dir/continuum-sync.sh"
  rm -rf "$local_repo_dir/.git"
  mv "$tmp_name/.git" "$local_repo_dir/"
  rm -rf "$tmp_name"

  cd "$local_repo_dir"
  git add -A
  if git diff --cached --quiet; then
    echo "Nada mudou — nada pra commitar."
  else
    git commit -m "sync content from ${source_owner}/${REPO_NAME}"
    git push
  fi

  echo ""
  echo "${target_owner} atualizado com o conteúdo de ${source_owner}/${REPO_NAME}."
}

# ── Menu principal ─────────────────────────────────────────────────────────

echo "Qual fluxo rodar?"
echo "  1) Dev -> Principal   (lemavos-N/continuum -> repo principal local)"
echo "  2) Principal -> Dev   (repo principal local -> lemavos-N/continuum)"
echo "  3) Dev -> Dev         (lemavos-X/continuum -> lemavos-Y/continuum)"
read -rp "Escolha [1-3]: " FLOW_CHOICE

case "$FLOW_CHOICE" in
  1) run_dev_to_main "${1:-$(pwd)}" ;;
  2) run_main_to_dev "${1:-$(pwd)}" ;;
  3) run_dev_to_dev ;;
  *) echo "Opção inválida." >&2; exit 1 ;;
esac