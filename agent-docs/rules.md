# Project Rules

## Git Pre-Commit Hook

A pre-commit hook prevents committing sensitive files to the repository.

**Hook location:** `hooks/pre-commit`

**Protected files:**
- `.env` — environment variables (may contain API keys, secrets)
- `.skrybe.json` — configuration (may contain sensitive data)

**Behavior:** Rejects any commit that includes either file in the staged changes.

**Cross-machine setup:**

To propagate to other machines, the hook lives in a committed `hooks/` directory:

```bash
# After cloning, run once:
git config core.hooksPath "$(git rev-parse --show-toplevel)/hooks"
```

This config is stored in `.git/config` and persists. Alternative: run this as part of your project setup/install script.
