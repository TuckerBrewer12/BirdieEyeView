#!/usr/bin/env bash
# Run one review or fix prompt through the Cursor CLI.
#
# Sourced by run-bot.sh, run-coverage.sh, run-fix.sh, and run-slop.sh.
# Expects WORK (a temp dir outside the repo). Optional BOT_MODEL.
#
#   cursor_run ask  PROMPT_FILE STDOUT_FILE   # read-only; final text to STDOUT_FILE
#   cursor_run edit PROMPT_FILE               # may edit the worktree; no shell
#
# The prompt stays in WORK so a large diff is not an argv, and so run-fix.sh
# and run-slop.sh `git add -A` cannot commit it. Shell, network, MCP, and env files are denied.
# Sandbox is off: GitHub-hosted Ubuntu cannot start it (AppArmor), and the
# CLI then refuses to run. The deny list is the allowlist-mode gate instead.
set -euo pipefail

cursor_run() {
  local mode="$1"
  local prompt_file="$2"
  local stdout_file="${3:-}"
  local model="${BOT_MODEL:-grok-4.7-high}"
  local config_dir="${WORK}/cursor-config"
  local instruction

  mkdir -p "$config_dir"
  python3 - "$config_dir/cli-config.json" "$mode" "$prompt_file" <<'PY'
import json
import sys

path, mode, prompt = sys.argv[1:]
deny = [
    "Shell(*)",
    "WebFetch(*)",
    "Mcp(*:*)",
    "Read(**/.env*)",
    "Read(.env*)",
]
allow = ["Read(**)", f"Read({prompt})"]
if mode == "edit":
    allow.append("Write(**)")
    deny.extend(["Write(**/.env*)", "Write(**/*.key)"])
else:
    deny.append("Write(**)")

cfg = {
    "version": 1,
    "editor": {"vimMode": False},
    "permissions": {"allow": allow, "deny": deny},
}
with open(path, "w", encoding="utf-8") as fh:
    json.dump(cfg, fh)
PY

  if [[ "$mode" == "edit" ]]; then
    instruction="Read ${prompt_file} and follow it. Apply the edit in the working tree. Do not run shell commands or use the network."
  else
    instruction="Read ${prompt_file} and follow it exactly. Do not run shell commands or use the network. Your final message must be only the reply that file asks for."
  fi

  export CURSOR_CONFIG_DIR="$config_dir"
  local -a cmd=(
    agent -p
    --output-format text
    --model "$model"
    --trust
    --sandbox disabled
    --add-dir "$WORK"
  )
  if [[ "$mode" == "edit" ]]; then
    cmd+=(--force)
  else
    cmd+=(--mode ask)
  fi
  cmd+=("$instruction")

  if [[ -n "$stdout_file" ]]; then
    "${cmd[@]}" >"$stdout_file"
  else
    "${cmd[@]}"
  fi
}
