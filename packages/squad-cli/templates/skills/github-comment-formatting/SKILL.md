---
name: "GitHub Comment Formatting with Backticks"
description: "Post markdown with code blocks to GitHub issues via gh CLI without backtick escaping"
domain: "github-cli, devops, ci-cd"
confidence: "high"
source: "observed (issue #52 MVP draft comment)"
tools:
  - name: "gh issue comment"
    description: "GitHub CLI command to post comments to issues"
    when: "posting formatted content to GitHub issues"
---

## Context

When posting markdown content with code blocks to GitHub issues using `gh issue comment --body-file`, backticks get escaped with backslashes (`` ` `` becomes `` \` ``, and `` ``` `` becomes `` \\\ ``). This breaks code block rendering and makes inline code render as literal text.

**Affected versions:** Windows PowerShell (may affect other shells too)

**Root cause:** PowerShell interprets backticks as escape characters when passing strings to external commands via pipes or file write operations. When a markdown file is written through PowerShell's output redirection or piping, backticks are escaped before `gh` receives the file content.

## Patterns

### ❌ Anti-Pattern: PowerShell pipes that escape backticks

```powershell
# WRONG - backticks get escaped
$content | Out-File content.md
$content | gh issue comment 52 --body-file -

# WRONG - here-string piped through PowerShell functions
@'
Test `code` and ``` blocks ```
'@ | Set-Content -Path content.md
```

### ✅ Pattern 1: Use the `create` file tool or Python

**Recommended for agents:** Use the `create` file tool to write markdown files. This tool writes files directly without PowerShell escaping:

```powershell
# Using create tool (recommended for Copilot agents)
# create --path ./content.md --file_text 'Test `code` and ``` blocks ```'
```

### ✅ Pattern 2: PowerShell Set-Content with single-quoted strings

Use `Set-Content` with single-quoted strings to preserve backticks literally:

```powershell
$content = @'
## Test Document

Test `inline code` here.

Test code block:

```
code block content
```
'@

Set-Content -Path content.md -Value $content -Encoding UTF8
gh issue comment 52 --repo diberry/squad --body-file content.md
```

**Why this works:** Single quotes in PowerShell are literal strings — no escaping occurs.

### ✅ Pattern 3: Python for cross-platform compatibility

Use Python to write the file outside PowerShell's escaping:

```powershell
python -c "
with open('content.md', 'w') as f:
    f.write('''## Title
Test \`inline\` and \`\`\`blocks\`\`\`
''')
"

gh issue comment 52 --repo diberry/squad --body-file content.md
```

### ✅ Pattern 4: Escape backticks manually if needed

If you must use double-quoted strings in PowerShell, escape backticks with a backtick:

```powershell
$content = "Test \`\`\`code block\`\`\` here"
```

## Examples

**Complete workflow for posting MVP draft:**

```powershell
cd C:\Users\diberry\repos\project-squad\squad

# Write markdown with code blocks - use Set-Content with single quotes
$mvpContent = @'
## 📝 MVP Draft v2 — Example

Example code block:

```json
{
  "status": "complete"
}
```

Example inline: `const x = 5;`
'@

Set-Content -Path mvp-draft.md -Value $mvpContent -Encoding UTF8

# Post to GitHub - backticks will NOT be escaped
gh issue comment 52 --repo diberry/squad --body-file mvp-draft.md
```

## Anti-Patterns

❌ **Don't:** Pipe markdown content through PowerShell functions to file
- `$content | Out-File file.md` — backticks will be escaped
- `Write-Output $content | gh issue comment` — backticks will be escaped

❌ **Don't:** Use `echo` command (deprecated, may escape backticks)
- `echo $content > file.md` — unreliable

❌ **Don't:** Use double-quoted strings without escaping backticks
- `"Test ```code```"` — backticks will be escaped; use `@'...'@` or escape them

## Verification

After posting to GitHub, verify the comment renders correctly:
1. Navigate to the issue comment
2. Check that code blocks are properly formatted (with syntax highlighting box)
3. Check that inline code is properly formatted (monospace)
4. If you see literal backslashes or plain text instead, the backticks were escaped

## Related Issues

- Issue #52: MVP Draft v2 comment had backticks escaped
- Issue #49, #50, #51: Check if similar issue exists in other MVP comments
