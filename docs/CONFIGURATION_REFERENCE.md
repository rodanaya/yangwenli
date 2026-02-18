# Configuration Reference for RUBLI

> Complete reference for all Claude Code configuration options.

---

## Table of Contents

1. [Settings Hierarchy](#settings-hierarchy)
2. [Permissions Configuration](#permissions-configuration)
3. [Agent Configuration](#agent-configuration)
4. [Rules Configuration](#rules-configuration)
5. [Commands Configuration](#commands-configuration)
6. [Hooks Configuration](#hooks-configuration)
7. [Environment Variables](#environment-variables)

---

## Settings Hierarchy

Claude Code loads settings in this order (later overrides earlier):

```
1. User settings    ~/.claude/settings.json     (all projects)
2. Project settings .claude/settings.json       (team shared)
3. Local settings   .claude/settings.local.json (personal)
```

### File Locations

| Purpose | Path | Committed to Git? |
|---------|------|-------------------|
| User (global) | `~/.claude/settings.json` | N/A |
| Project (team) | `.claude/settings.json` | Yes |
| Local (personal) | `.claude/settings.local.json` | No |

---

## Permissions Configuration

### Structure

```json
{
  "permissions": {
    "allow": [
      "Tool(pattern*)"
    ],
    "deny": [
      "Tool(pattern*)"
    ]
  }
}
```

### Pattern Matching

Patterns use **prefix matching** (not regex):

```json
"Bash(git status*)"    // Matches "git status", "git status --short"
"Read(.env*)"          // Matches ".env", ".env.local", ".env.production"
"Bash(rm -rf*)"        // Matches any rm -rf command
```

### Available Tools

| Tool | Description | Example Pattern |
|------|-------------|-----------------|
| `Read` | Read file contents | `Read(.env*)` |
| `Write` | Write new files | `Write(*.md)` |
| `Edit` | Modify existing files | `Edit(*.py)` |
| `Bash` | Execute shell commands | `Bash(python*)` |
| `Glob` | Search for files | `Glob` |
| `Grep` | Search file contents | `Grep` |
| `WebFetch` | Fetch web content | `WebFetch` |
| `WebSearch` | Search the web | `WebSearch` |

### Our Project Settings

`.claude/settings.json`:
```json
{
  "permissions": {
    "deny": [
      "Read(.env)",
      "Read(.env.*)",
      "Read(**/credentials*)",
      "Read(**/*secret*)",
      "Bash(rm -rf*)",
      "Bash(curl:*)",
      "Bash(wget:*)",
      "Bash(git push --force*)",
      "Bash(DROP TABLE*)"
    ],
    "allow": [
      "Bash(python backend/scripts/*)",
      "Bash(cd backend && uvicorn*)",
      "Bash(cd frontend && npm*)",
      "Bash(pytest*)",
      "Bash(sqlite3*)",
      "Bash(git status*)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(git add*)",
      "Bash(git commit*)"
    ]
  }
}
```

---

## Agent Configuration

### File Location

Agents are stored in `.claude/agents/` as markdown files.

### Frontmatter Structure

```yaml
---
name: agent-name              # Required: lowercase-with-hyphens
description: Short summary    # 1-2 sentences describing when to trigger
model: sonnet                 # Optional: inherit, sonnet, opus, haiku
tools:                        # Optional: restrict available tools
  - Read
  - Glob
  - Grep
  - Bash(pattern*)
---

# Agent Title

[Detailed instructions in markdown]
```

### Model Options

| Model | Use Case |
|-------|----------|
| `inherit` | Use same model as main conversation (default) |
| `sonnet` | Claude Sonnet - balanced capability/speed |
| `opus` | Claude Opus - highest capability |
| `haiku` | Claude Haiku - fastest, for simple tasks |

### Our Project Agents

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| `data-quality-guardian` | sonnet | Read, Glob, Grep, Bash(python*), Bash(sqlite3*) | Data validation |
| `schema-architect` | inherit | Read, Glob, Grep, Bash(python*), Bash(sqlite3*) | Database design |
| `risk-model-engineer` | inherit | Read, Glob, Grep, Bash(python*), Bash(sqlite3*) | Risk model tuning |
| `network-detective` | inherit | Read, Glob, Grep, Bash(python*), Bash(sqlite3*) | Collusion detection |
| `viz-storyteller` | inherit | Read, Glob, Grep, Write, Edit | Visualization design |
| `api-designer` | inherit | Read, Glob, Grep, Write, Edit, Bash(uvicorn*), Bash(curl*) | API design |
| `frontend-architect` | inherit | Read, Glob, Grep, Write, Edit, Bash(npm*), Bash(node*) | React development |

---

## Rules Configuration

### File Location

Rules are stored in `.claude/rules/` as markdown files.

### Structure

```markdown
---
paths: backend/**/*.py    # Optional: only load for these file patterns
---

# Rule Title

[Instructions that apply when working with matching files]
```

### Path Patterns

```yaml
paths: backend/**/*.py           # All Python files in backend/
paths: frontend/**/*.{ts,tsx}    # All TypeScript files in frontend/
paths: **/*.sql                  # All SQL files anywhere
```

If `paths` is omitted, the rule applies to all files.

### Our Project Rules

| File | Paths | Purpose |
|------|-------|---------|
| `data-validation.md` | (all) | Amount validation, outlier detection |
| `backend-patterns.md` | `backend/**/*.py` | FastAPI, SQLite patterns |
| `frontend-patterns.md` | `frontend/**/*.{ts,tsx}` | React, TypeScript patterns |
| `security.md` | (all) | Security requirements |

---

## Commands Configuration

### File Location

Commands are stored in `.claude/commands/` as markdown files.

### Structure

```markdown
---
name: command-name
description: What this command does
---

# Command Instructions

When the user runs `/command-name`, do the following:
[Detailed workflow instructions]
```

### Usage

```
/command-name              # Run with defaults
/command-name arg1 arg2    # Run with arguments
```

### Our Project Commands

| Command | Usage | Purpose |
|---------|-------|---------|
| `/validate-data` | `/validate-data [filepath]` | Profile and validate COMPRANET files |
| `/etl` | `/etl` | Run ETL pipeline with safety checks |
| `/dev` | `/dev [backend\|frontend\|all\|status]` | Manage development servers |

---

## Hooks Configuration

### File Location

Hooks are configured in `.claude/settings.json`.

### Structure

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "Tool(pattern*)",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/script.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### Available Events

| Event | When | Use Case |
|-------|------|----------|
| `PreToolUse` | Before tool executes | Block dangerous operations |
| `PostToolUse` | After tool completes | Validation, formatting |
| `UserPromptSubmit` | When user sends message | Context injection |
| `SessionStart` | On session startup | Environment setup |
| `SessionEnd` | On session end | Cleanup |
| `Stop` | When Claude finishes | Continuation logic |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - continue |
| 2 | Block - show stderr to Claude |
| Other | Failure |

### Example: Pre-ETL Validation Hook

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(python*etl*)",
        "hooks": [{
          "type": "command",
          "command": ".claude/hooks/validate-before-etl.sh",
          "timeout": 30
        }]
      }
    ]
  }
}
```

---

## Environment Variables

### Claude Code Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | API authentication |
| `CLAUDE_PROJECT_DIR` | Project root (in hooks) |
| `CLAUDE_CODE_REMOTE` | "true" if web environment |
| `MAX_MCP_OUTPUT_TOKENS` | Limit MCP output (default: 25000) |

### Project Variables

Set in `.claude/settings.json`:

```json
{
  "env": {
    "PYTHONPATH": "backend",
    "NODE_ENV": "development"
  }
}
```

Or in `.env` (not readable by Claude for security):

```
DATABASE_URL=sqlite:///backend/RUBLI_NORMALIZED.db
API_PORT=8001
FRONTEND_PORT=3009
```

---

## Quick Reference

### Check Current Configuration

```
/config          # Interactive configuration
/permissions     # View/modify permissions
/agents          # View/modify agents
/hooks           # View/modify hooks
```

### Override Temporarily

```bash
# Allow specific tool for session
claude --allowedTools "Bash(my-command*)"

# Use specific model
claude --model opus
```

### Debug Hooks

```bash
claude --debug-hooks
```

---

## Configuration Checklist

When setting up a new project:

- [ ] Create `CLAUDE.md` with project context
- [ ] Create `.claude/settings.json` with security rules
- [ ] Create `.claude/agents/` with specialized agents
- [ ] Create `.claude/rules/` with coding standards
- [ ] Create `.claude/commands/` with common workflows
- [ ] Add `CLAUDE.local.md` and `.claude/settings.local.json` to `.gitignore`

---

*"Configuration is not about control - it's about enabling focused work."*
