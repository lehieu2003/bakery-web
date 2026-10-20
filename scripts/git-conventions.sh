#!/usr/bin/env bash
# Single source of truth for branch-name and commit-message rules (see
# CONTRIBUTING.md). Used by .githooks/*, scripts/validate.sh, CI and Claude.
#
#   scripts/git-conventions.sh branch  <branch-name>
#   scripts/git-conventions.sh message <commit-msg-file>
#   scripts/git-conventions.sh title   <text>          # PR title / one header
#   scripts/git-conventions.sh commits <base-ref>      # every commit in base..HEAD
set -euo pipefail

COMMIT_TYPES='feat|fix|chore|docs|refactor|test|perf|build|ci|style|revert'
BRANCH_TYPES='feature|fix|chore|docs|refactor|test|perf|ci|hotfix|release'
HEADER_RE="^(${COMMIT_TYPES})(\([a-z0-9._/-]+\))?!?: [^ ].*$"
BRANCH_RE="^(${BRANCH_TYPES})/[a-z0-9][a-z0-9._-]*$"
MAX_HEADER=100

fail() {
  printf '✖ %s\n' "$1" >&2
  shift
  for line in "$@"; do printf '  %s\n' "$line" >&2; done
  exit 1
}

check_header() {
  local header="$1"
  # Git-generated headers are exempt.
  case "$header" in
    'Merge '* | 'Revert "'* | 'fixup! '* | 'squash! '* | 'amend! '*) return 0 ;;
  esac
  [[ "$header" =~ $HEADER_RE ]] || fail "Commit header không đúng Conventional Commits: \"$header\"" \
    "Dạng: <type>(<scope>): <mô tả>   — type ∈ ${COMMIT_TYPES//|/, }" \
    "Ví dụ: feat(orders): add CSV export"
  ((${#header} <= MAX_HEADER)) || fail "Commit header dài ${#header} ký tự (tối đa ${MAX_HEADER}): \"$header\""
}

cmd="${1:-}"
case "$cmd" in
  branch)
    name="${2:?branch name required}"
    case "$name" in master | dev | HEAD) exit 0 ;; esac
    [[ "$name" =~ $BRANCH_RE ]] || fail "Tên nhánh không hợp lệ: \"$name\"" \
      "Dạng: <type>/<mô-tả-kebab>   — type ∈ ${BRANCH_TYPES//|/, }" \
      "Ví dụ: feature/orders-csv-export, fix/checkout-vnpay-callback"
    ;;
  message)
    file="${2:?commit message file required}"
    header="$(grep -v '^#' "$file" | sed -n '/[^[:space:]]/{p;q;}')"
    check_header "$header"
    ;;
  title)
    check_header "${2:?text required}"
    ;;
  commits)
    base="${2:?base ref required}"
    while IFS= read -r subject; do
      check_header "$subject"
    done < <(git log --no-merges --format=%s "$base..HEAD")
    ;;
  *)
    fail "Usage: $0 {branch <name>|message <file>|title <text>|commits <base-ref>}"
    ;;
esac
