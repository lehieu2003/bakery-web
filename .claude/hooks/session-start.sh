#!/usr/bin/env bash
# SessionStart: make sure the repo's git hooks are active and remind Claude
# which branch it is on (stdout is added to Claude's context).
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git config core.hooksPath .githooks 2>/dev/null || true
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
echo "Git: đang ở nhánh '$branch'."
if [[ "$branch" == "master" || "$branch" == "dev" ]]; then
  echo "Đây là nhánh được bảo vệ — trước khi sửa code, tạo nhánh task bằng skill start-task."
fi
