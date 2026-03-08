### 2026-03-08T21:03:14Z: User directive — Squad file handling in PRs
**By:** Dina Berry (via Copilot)
**What:**
1. Squad history and state changes (`.squad/` file modifications) should be saved into Dina's own fork (`diberry/squad`) on branch `diberry/squad`, not the upstream repo, unless explicitly told otherwise.
2. Do NOT include `.squad/` file changes in PRs unless Dina explicitly says to.
3. When Dina does request squad file changes in a PR, validate the changes before committing them.
**Why:** User request — captured for team memory. Keeps squad operational state separate from feature work by default.
