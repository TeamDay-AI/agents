# Self-Scheduling Agent System

A complete system for autonomous agents to schedule their own future executions.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AGENT EXECUTION                               │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │ self-scheduler  │───▶│  notify-user    │◀───│   credential-   │ │
│  │     skill       │    │     skill       │    │   activation    │ │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘ │
│           │                      │                      │          │
│           ▼                      ▼                      ▼          │
│  .claude/scheduled/        Mailgun API           Environment       │
│     {job}.md                                      Variables         │
└───────────┬─────────────────────┬───────────────────────┬──────────┘
            │                     │                       │
            ▼                     │                       │
┌───────────────────────┐         │         ┌─────────────────────────┐
│  Scheduled File       │         │         │   TeamDay UI            │
│  Watcher Service      │         │         │   (Secrets Config)      │
│  (computer package)   │         │         └───────────┬─────────────┘
└───────────┬───────────┘         │                     │
            │                     │                     ▼
            ▼                     │         ┌─────────────────────────┐
┌───────────────────────┐         │         │   Firestore             │
│   Firestore           │◀────────┴─────────│   (secrets, tasks)      │
│   scheduledTasks      │                   └─────────────────────────┘
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│   CronService         │
│   (existing)          │
│   - Executes jobs     │
│   - Injects creds     │
│   - Tracks runs       │
└───────────────────────┘
```

## Skill Dependencies

```
credential-activation
        │
        │ (provides credentials to)
        ▼
   notify-user ◀──────── self-scheduler
        │                      │
        │                      │ (uses for termination
        │                      │  notifications)
        ▼                      ▼
   Mailgun API          .claude/scheduled/
```

## Data Flow

### 1. Agent Creates Scheduled Job

```
Agent (with self-scheduler skill)
    │
    │ 1. Discovers working directory (pwd)
    │ 2. Captures system prompt from session
    │ 3. Writes job spec to .claude/scheduled/job.md
    ▼
.claude/scheduled/daily-monitor.md
    │
    │ (file watcher detects new/changed file)
    ▼
ScheduledFileWatcher (computer service)
    │
    │ (parses frontmatter, creates Firestore doc)
    ▼
Firestore: scheduledTasks/{taskId}
    │
    │ (real-time listener picks up new task)
    ▼
CronService schedules job
```

### 2. Job Executes on Schedule

```
CronService (cron triggers)
    │
    │ 1. Fetches task from Firestore
    │ 2. Fetches credentials from org/space
    │ 3. Injects credentials as env vars
    ▼
ClaudeAgentService.executeClaudeAgent()
    │
    │ (runs in space directory with prompt from job spec)
    ▼
Agent executes with:
    - System prompt (from job's .md file)
    - Session instructions (from job's .md file)
    - Credentials (from environment)
```

### 3. Job Terminates and Notifies

```
Agent (during scheduled execution)
    │
    │ 1. Completes objective OR encounters blocker
    │ 2. Updates .claude/scheduled/job.md (enabled: false)
    │ 3. Uses notify-user skill
    ▼
notify-user skill
    │
    │ (reads MAILGUN_* from environment)
    ▼
Mailgun API
    │
    ▼
User receives email notification
```

## File Formats

### Scheduled Job Spec (.claude/scheduled/{name}.md)

```yaml
---
name: job-name
schedule: "0 9 * * *"      # Cron expression
enabled: true
timezone: America/Los_Angeles
max_turns: 25
model: claude-sonnet-4-20250514

# Context (auto-discovered by agent)
space_id: s-abc123
organization_id: org-xyz789
created_at: 2025-01-20T10:00:00Z
created_by: self-scheduler

# Termination state (set when job ends)
termination_reason: null
terminated_at: null
---

# System Prompt

[Agent's full system prompt, copied verbatim]

---

# Session Instructions

[Instructions for each scheduled run]

## Session State

[Persistent state between runs]
```

## Integration Points

### Computer Service (packages/computer)

New service needed: `ScheduledFileWatcherService`
- Watches for `.claude/scheduled/*.md` files across all spaces
- Parses YAML frontmatter
- Syncs to Firestore `scheduledTasks` collection
- Handles create/update/delete

### Existing CronService

Already handles:
- Listening to Firestore changes
- Executing scheduled tasks
- Credential injection
- Session management

### Firestore Schema Extension

The existing `ScheduledTask` type needs one new field:
```typescript
interface ScheduledTask {
  // ... existing fields ...

  // New: reference to file-based spec
  sourceFile?: string  // e.g., ".claude/scheduled/daily-monitor.md"
}
```

## Security Considerations

1. **Credentials never in files** - Only in Firestore, injected at runtime
2. **System prompt preservation** - Agents must copy their prompt explicitly
3. **Isolated execution** - Each job runs in its space directory
4. **Audit trail** - All executions logged in `scheduledTaskExecutions`

## Usage Example

```bash
# Agent discovers context
pwd
# /data/sandbox/org-abc/spaces/s-xyz/

# Agent creates scheduled job
mkdir -p .claude/scheduled
cat > .claude/scheduled/daily-check.md << 'EOF'
---
name: daily-check
schedule: "0 9 * * *"
enabled: true
space_id: s-xyz
organization_id: org-abc
created_at: 2025-01-20T10:00:00Z
---

# System Prompt

You are a monitoring agent...
[full system prompt]

---

# Session Instructions

Check for updates and report findings.
EOF

# Job will be picked up by file watcher and scheduled automatically
```

## Related Skills

- **self-scheduler**: Create and manage scheduled jobs
- **notify-user**: Send email notifications via Mailgun
- **credential-activation**: Configure API credentials for skills
