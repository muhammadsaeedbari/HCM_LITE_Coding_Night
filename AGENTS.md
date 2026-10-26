# AI & Developer Safety Rules (HCM Lite)

1. **No Git Commits or Pushes:**
   - NEVER run `git commit`, `git push`, or push any code changes to GitHub automatically.
   - All git operations and repository pushes must be performed manually by the user.

2. **LLM API Keys & Secrets Protection:**
   - NEVER hardcode any LLM API key, `MONGODB_URI`, or `JWT_SECRET` in source files.
   - As specified in the Hackathon PDF (Section 5 — Smart Helper): *"Use a demo key only and never commit it to GitHub."*
   - Any optional LLM demo key entered in the Smart Helper UI must only be kept in temporary client memory/session and never written to the codebase or committed to Git.
   - `.env` files must always remain ignored in `.gitignore`.
