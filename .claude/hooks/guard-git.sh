#!/usr/bin/env bash
# PreToolUse(Bash) guard: enforces the branch workflow in CONTRIBUTING.md for
# Claude. Exit 2 blocks the command and shows the reason to Claude.
set -euo pipefail

input="$(cat)"
cmd="$(jq -r '.tool_input.command // ""' <<<"$input")"
cwd="$(jq -r '.cwd // ""' <<<"$input")"
[[ -n "$cwd" ]] && cd "$cwd" 2>/dev/null || true

block() {
  echo "Blocked by .claude/hooks/guard-git.sh: $1" >&2
  exit 2
}

# Only inspect git/gh invocations.
grep -Eq '(^|[;&|(]|\s)(git|gh)\s' <<<"$cmd" || exit 0

if grep -Eq 'git\s.*--no-verify' <<<"$cmd"; then
  block "--no-verify bỏ qua git hooks (commit-msg / pre-push). Sửa lỗi thay vì bỏ qua."
fi

if grep -Eq 'git\s+push\b' <<<"$cmd"; then
  if grep -Eq '\s(-f|--force)(\s|$)' <<<"$cmd"; then
    block "force push bị cấm; dùng --force-with-lease trên nhánh task của chính bạn nếu thật sự cần."
  fi
  if grep -Eq 'git\s+push\b.*[[:space:]:+](master|dev)([[:space:]]|$)' <<<"$cmd"; then
    block "không push thẳng lên master/dev — mở PR (skill open-pr)."
  fi
fi

if grep -Eq 'git\s+(commit|merge|rebase|cherry-pick)\b' <<<"$cmd"; then
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
  if [[ "$branch" == "master" || "$branch" == "dev" ]]; then
    block "đang ở '$branch' — không commit/merge trực tiếp. Tạo nhánh task trước (skill start-task)."
  fi
fi

if grep -Eq 'gh\s+pr\s+merge\b' <<<"$cmd"; then
  block "merge PR là quyết định của người review — để người dùng tự merge trên GitHub."
fi

exit 0
