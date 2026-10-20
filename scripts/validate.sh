#!/usr/bin/env bash
# Pre-PR gate — must pass before opening a PR into dev (CI runs the same).
#
#   scripts/validate.sh [--skip-build] [--base <ref>]
#
# --base defaults to origin/dev (falls back to local dev). Steps: branch name,
# commit messages since base, lint, typecheck, node tests, vitest, build.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

SKIP_BUILD=0
BASE=""
while (($#)); do
  case "$1" in
    --skip-build) SKIP_BUILD=1 ;;
    --base) BASE="${2:?--base needs a ref}"; shift ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done
if [[ -z "$BASE" ]]; then
  if git rev-parse -q --verify origin/dev >/dev/null; then BASE=origin/dev; else BASE=dev; fi
fi

step() { printf '\n▶ %s\n' "$1"; }

BRANCH="${GITHUB_HEAD_REF:-$(git rev-parse --abbrev-ref HEAD)}"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "⚠ Working tree có thay đổi chưa commit — gate đang kiểm tra cả chúng."
fi

step "Branch name ($BRANCH)"
bash scripts/git-conventions.sh branch "$BRANCH"

step "Commit messages ($BASE..HEAD)"
bash scripts/git-conventions.sh commits "$BASE"

step "Lint"
pnpm lint

step "Typecheck"
pnpm typecheck

step "Node tests"
pnpm run test:node

step "Component tests"
pnpm run test:vitest:ci

if ((SKIP_BUILD)); then
  step "Build (skipped: --skip-build)"
else
  step "Build"
  pnpm build
fi

printf '\n✅ Gate passed on %s (%s)\n' "$BRANCH" "$(git rev-parse --short HEAD)"
