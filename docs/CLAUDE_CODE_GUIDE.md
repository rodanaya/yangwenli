# Claude Code Guide for RUBLI


This guide teaches you how to use Claude Code effectively with the RUBLI procurement analysis platform.

---

## Quick Start

### Your First Commands

```
/validate-data                    # Validate COMPRANET data files
/etl                              # Run the ETL pipeline
/dev                              # Start development servers
```

### Available Agents

When you describe a task, Claude will automatically delegate to specialized agents:

| Agent | Trigger Keywords | What It Does |
|-------|-----------------|--------------|
| `data-quality-guardian` | "validate", "ETL", "data quality" | Catches bad data before it corrupts analytics |
| `schema-architect` | "schema", "migration", "slow query" | Designs database structures |
| `risk-model-engineer` | "risk score", "weights", "false positive" | Tunes corruption detection models |
| `network-detective` | "vendor", "collusion", "relationship" | Investigates suspicious patterns |
| `viz-storyteller` | "visualize", "chart", "dashboard" | Creates compelling visualizations |
| `api-designer` | "endpoint", "API", "pagination" | Designs clean REST APIs |
| `frontend-architect` | "React", "component", "state" | Builds UI features |

---

## The "Ask Before Acting" Philosophy

This project follows the RUBLI philosophy of **thoughtful action**:

```
┌─────────────────────────────────────────────────────────────┐
│  1. Claude analyzes context                                  │
│                    ↓                                         │
│  2. Claude asks clarifying questions  ← YOU DECIDE          │
│                    ↓                                         │
│  3. Claude proposes approach with explanation                │
│                    ↓                                         │
│  4. You approve/modify/reject  ← YOU DECIDE                 │
│                    ↓                                         │
│  5. Claude implements with running commentary                │
│                    ↓                                         │
│  6. Claude summarizes what was learned                       │
└─────────────────────────────────────────────────────────────┘
```

**Key principle**: Claude will **ask before acting** on anything irreversible.

---

## Configuration Overview

### File Hierarchy

```
rubli/
├── CLAUDE.md                    # Main project instructions (shared)
├── CLAUDE.local.md              # Your personal preferences (not committed)
├── .claude/
│   ├── settings.json            # Team security settings (shared)
│   ├── settings.local.json      # Your personal settings (not committed)
│   ├── agents/                  # 7 specialized agents
│   │   ├── data-quality-guardian.md
│   │   ├── schema-architect.md
│   │   ├── risk-model-engineer.md
│   │   ├── network-detective.md
│   │   ├── viz-storyteller.md
│   │   ├── api-designer.md
│   │   └── frontend-architect.md
│   ├── rules/                   # Context-specific rules
│   │   ├── data-validation.md
│   │   ├── backend-patterns.md
│   │   ├── frontend-patterns.md
│   │   └── security.md
│   ├── commands/                # Custom slash commands
│   │   ├── validate-data.md
│   │   ├── etl.md
│   │   └── dev.md
│   └── hooks/                   # Automation scripts
└── docs/
    ├── CLAUDE_CODE_GUIDE.md     # (this file)
    ├── WORKFLOW_PATTERNS.md     # Step-by-step workflows
    └── CONFIGURATION_REFERENCE.md # All settings explained
```

### What Gets Committed to Git

| File/Directory | Committed? | Why |
|----------------|------------|-----|
| `CLAUDE.md` | Yes | Team shares project instructions |
| `CLAUDE.local.md` | No | Personal preferences |
| `.claude/settings.json` | Yes | Team security settings |
| `.claude/settings.local.json` | No | Personal overrides |
| `.claude/agents/` | Yes | Team shares agent definitions |
| `.claude/rules/` | Yes | Team shares coding rules |
| `.claude/commands/` | Yes | Team shares workflows |

---

## Essential Best Practices

### 1. Be Specific in Instructions

```
BAD:  "Add tests"
GOOD: "Write tests for validate_amount() covering edge cases:
       - Amount exactly at 10B threshold
       - Amount exceeding 100B threshold
       - Negative amounts"
```

### 2. Use Context Reset Between Tasks

After completing a major task, type `/clear` to reset context. This:
- Frees up context window
- Prevents confusion from previous discussions
- Starts fresh with CLAUDE.md context

### 3. Provide Visual Feedback

For UI work, drag-drop screenshots or paste them (Cmd+V on Mac). Claude can:
- See what you see
- Compare to design mocks
- Iterate on visual details

### 4. Reference Files Explicitly

```
"Look at @backend/scripts/etl_pipeline.py and improve error handling"
```

The `@` syntax ensures Claude reads the exact file.

### 5. Ask for Plans First

For complex tasks:
```
"Before implementing, create a plan for adding vendor deduplication to the ETL pipeline"
```

Claude will outline steps for your review before writing code.

---

## Common Commands Reference

| Action | Command |
|--------|---------|
| Validate data file | `/validate-data original_data/2025.csv` |
| Run ETL pipeline | `/etl` |
| Start dev servers | `/dev all` |
| Check server status | `/dev status` |
| Clear context | `/clear` |
| Get help | `/help` |
| Manage permissions | `/permissions` |
| Configure hooks | `/hooks` |

---

## Working with Agents

### Automatic Delegation

Claude automatically delegates to agents based on your request. You don't need to invoke them manually.

**Example:**
```
You: "The vendor concentration query is taking 15 seconds"
Claude: "Let me use the schema-architect agent to analyze this..."
```

### Manual Invocation

You can also explicitly request an agent:
```
You: "Use the network-detective agent to investigate vendor ABC123"
```

### Agent Outputs

Agents always:
1. Explain what they're analyzing
2. Ask clarifying questions
3. Present options with trade-offs
4. Wait for your approval
5. Explain their reasoning

---

## Security Awareness

### Protected Operations

These operations will be blocked or require confirmation:

```
BLOCKED (by .claude/settings.json):
- Reading .env files
- Running rm -rf commands
- Running curl/wget commands
- Force pushing to git
- DROP TABLE / DELETE FROM without WHERE
```

### Safe Operations

These are pre-approved for efficiency:

```
ALLOWED:
- Running Python scripts in backend/scripts/
- Starting uvicorn server
- Running npm commands in frontend/
- Git status, diff, log, add, commit
- SQLite queries
```

---

## Troubleshooting

### "Claude keeps asking for permission"

Add frequently used commands to `.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": [
      "Bash(python -m pytest*)",
      "Bash(your-command-here)"
    ]
  }
}
```

### "Claude doesn't know about my project"

Ensure CLAUDE.md is in the project root. Claude reads it automatically at session start.

### "Agents aren't being triggered"

Check that `.claude/agents/` contains the agent files. Run `/agents` to verify they're loaded.

### "Context seems confused"

Run `/clear` to reset, then start fresh with your question.

---

## Learning Resources

### From Anthropic

- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Hooks Reference](https://code.claude.com/docs/en/hooks)
- [MCP Integration](https://code.claude.com/docs/en/mcp)

### Project-Specific

- `docs/WORKFLOW_PATTERNS.md` - Step-by-step workflows
- `docs/CONFIGURATION_REFERENCE.md` - All settings explained
- `docs/RISK_METHODOLOGY.md` - Risk scoring methodology
- `docs/SCHEMA_DECISIONS.md` - Database design decisions

---

## Summary

1. **Use slash commands** for common workflows (`/validate-data`, `/etl`, `/dev`)
2. **Let agents help** - they're automatically triggered based on your task
3. **Be specific** in your instructions
4. **Trust but verify** - Claude asks before doing anything irreversible
5. **Reset context** with `/clear` between major tasks
6. **Read the docs** - especially WORKFLOW_PATTERNS.md for step-by-step guides

---

*"The most important thing is not to win, but to understand."* - RUBLI
