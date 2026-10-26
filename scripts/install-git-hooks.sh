#!/usr/bin/env sh
# Run the same pre-commit checks for commits made outside Claude Code (terminal, phone Git apps with hooks).
set -e
root="$(git rev-parse --show-toplevel)"
cat > "$root/.git/hooks/pre-commit" <<'HOOK'
#!/usr/bin/env sh
exec python3 "$(git rev-parse --show-toplevel)/.claude/hooks/pre_commit.py" --git
HOOK
chmod +x "$root/.git/hooks/pre-commit"
echo "Installed .git/hooks/pre-commit (runs .claude/hooks/pre_commit.py --git)."
