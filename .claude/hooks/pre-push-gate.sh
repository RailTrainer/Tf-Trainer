#!/bin/bash
# PreToolUse-Hook (Bash): blockiert `git push`, solange /pre-push nicht für den
# aktuellen HEAD gelaufen ist. Die Freigabe schreibt /pre-push nach einem
# PASS/WARN des security-audit-Agenten nach auswertung-intern/.pre-push-gate.
# Leitplanke gegen versehentliche Pushes, keine Sicherheitsgrenze (Git-Aliase
# u. Ä. werden nicht erkannt) – der Gitleaks-Scan sitzt in .githooks/pre-push.

input=$(cat)
# Ohne jq das rohe JSON durchsuchen, damit das Gate nicht offen fällt.
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null) || cmd=$input

# git, optional globale Optionen (-C <dir>, -c <k=v>, --git-dir=…, --no-pager …), dann push
push_re='(^|[^[:alnum:]_-])git([[:space:]]+(-[Cc]|--git-dir|--work-tree|--namespace|--config-env)[[:space:]]+[^[:space:]]+|[[:space:]]+-[^[:space:]]+)*[[:space:]]+push([[:space:]"\\]|$)'
if ! printf '%s' "$cmd" | grep -Eq "$push_re"; then
  exit 0
fi

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
gate="$root/auswertung-intern/.pre-push-gate"
head=$(git -C "$root" rev-parse HEAD 2>/dev/null)

if [ -n "$head" ] && [ -f "$gate" ] && [ "$(tr -d '[:space:]' < "$gate")" = "$head" ]; then
  exit 0
fi

printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Push gesperrt: Für HEAD %s liegt keine Pre-Push-Freigabe vor. Führe zuerst /pre-push aus (struktur-pflege → doku-pflege → security-audit). Danach erneut pushen."}}\n' "${head:0:12}"
