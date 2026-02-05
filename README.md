# TeamDay Agents & Skills Library

Central library for AI agents, skills, and plugins. Agents can be used for:
- **Chat**: Direct conversation with specialized AI personas
- **Subagents**: Invoked by other agents via Task tool
- **Squads**: Pre-composed teams for common use cases

## Structure

```
├── agents/              # 🆕 Agent library
│   ├── registry.json    # Searchable index for discovery
│   ├── schema.ts        # TypeScript types
│   ├── librarian/       # Discovery/onboarding agent
│   ├── specialists/     # Individual expert agents
│   └── squads/          # Pre-composed agent teams
├── skills/              # Skill library (by provider)
│   ├── anthropic/       # git submodule → anthropics/skills
│   ├── huggingface/     # git submodule → huggingface/skills
│   ├── community/       # Community contributed
│   └── teamday/         # Our own skills
└── plugins/             # Claude Code plugins
```

## 🤖 Agents

Agents are AI personas with specialized expertise. They can be used as:
- **Chat agents** in TeamDay UI (with avatar, greeting, etc.)
- **Subagents** invoked via the Task tool in Claude Agent SDK

### Available Agents

| Agent | Category | Description |
|-------|----------|-------------|
| 📚 [Agent Librarian](agents/librarian/agent-librarian.md) | productivity | Discovers and installs agents/squads |
| 🔍 [SEO Specialist](agents/specialists/seo-specialist.md) | marketing | Search performance and optimization |
| ✍️ [Content Writer](agents/specialists/content-writer.md) | marketing | Blog posts, copy, documentation |
| 🎨 [Frontend Developer](agents/specialists/frontend-developer.md) | development | UI/UX with React, Vue, Tailwind |
| ⚙️ [Backend Developer](agents/specialists/backend-developer.md) | development | APIs, databases, security |
| 🚀 [DevOps Engineer](agents/specialists/devops-engineer.md) | operations | CI/CD, cloud, infrastructure |
| 📊 [Data Analyst](agents/specialists/data-analyst.md) | data | Analytics, SQL, visualization |

### Squads (Agent Teams)

| Squad | Agents | Use Case |
|-------|--------|----------|
| 🏆 [SEO Website Squad](agents/squads/seo-website-squad.md) | SEO + Content + Frontend | Build SEO-optimized websites |
| 🔧 [Full-Stack Squad](agents/squads/full-stack-squad.md) | Frontend + Backend + DevOps | Build complete web applications |

### Agent Format

Agents are defined as Markdown files with YAML frontmatter:

```yaml
---
id: seo-specialist
name: SEO Specialist
description: Analyzes search performance...  # For auto-invocation
version: 1.0.0
avatar: "🔍"                                  # Emoji or image URL
greeting: |                                   # First message in chat
  Hey! I'm your SEO Specialist...
category: marketing
tags: [seo, analytics, keywords]
tier: pro                                     # free | pro | enterprise
tools: [Read, Glob, Grep, WebSearch]          # Allowed tools
model: sonnet                                 # sonnet | opus | haiku
requires:
  mcps: [search-console]                      # Required MCP servers
  credentials: [GOOGLE_ANALYTICS_CREDENTIALS] # Required secrets
worksWellWith: [content-writer, data-analyst] # Complementary agents
---

# SEO Specialist

[System prompt defining the agent's behavior...]
```

### Using Agents

**In TeamDay (Chat):**
Agents appear in the agent selector with their avatar and greeting.

**As Subagent (SDK):**
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk'

for await (const msg of query({
  prompt: "Use the seo-specialist agent to audit this site",
  options: {
    agents: {
      'seo-specialist': {
        description: 'SEO analysis and optimization',
        prompt: '...', // Loaded from .md file
        tools: ['Read', 'Grep', 'WebSearch']
      }
    }
  }
})) { ... }
```

**Install to Space:**
```bash
cp agents/specialists/seo-specialist.md {space}/.claude/agents/
```

## Skills by Provider

### anthropic (git submodule)

Official Anthropic skills from [anthropics/skills](https://github.com/anthropics/skills):

| Skill | Description |
|-------|-------------|
| `anthropic/pdf` | PDF processing, form filling, merge/split |
| `anthropic/docx` | Word document creation |
| `anthropic/xlsx` | Excel spreadsheet operations |
| `anthropic/pptx` | PowerPoint presentations |
| `anthropic/mcp-builder` | Build MCP servers |
| `anthropic/webapp-testing` | Web automation testing |

To update: `cd skills/anthropic && git pull`

### huggingface (git submodule)

Official HuggingFace skills from [huggingface/skills](https://github.com/huggingface/skills):

| Skill | Description |
|-------|-------------|
| `huggingface/hugging-face-datasets` | Create and manage HF datasets |
| `huggingface/hugging-face-model-trainer` | Train models on HF |
| `huggingface/hugging-face-evaluation` | Evaluate models |
| `huggingface/hugging-face-paper-publisher` | Publish papers to HF |
| `huggingface/hugging-face-tool-builder` | Build HF tools |

To update: `cd skills/huggingface && git pull`

### teamday

TeamDay custom skills:

| Skill | Description |
|-------|-------------|
| `teamday/skills-manager` | Import and maintain skills from various sources |

## Skill Naming Convention

Skills are referenced as `{provider}/{skill-name}`:
- `anthropic/pdf`
- `anthropic/docx`
- `teamday/seo-analyst`

Or with prefix for flat namespaces:
- `anthropic-pdf`
- `teamday-seo-analyst`

## Usage

### For TeamDay App

When installing a skill to a space:
```bash
# Copy skill directory
cp -r skills/anthropic/skills/pdf /sandbox/{org}/{space}/.claude/skills/pdf
```

Agent references:
```yaml
skills: ["pdf", "docx"]  # or ["anthropic/pdf", "anthropic/docx"]
```

### For Claude Code

```bash
/plugin marketplace add TeamDay-AI/agents
/plugin install blog-image-generator@teamday-agents
```

## Adding New Providers

```bash
# Add as submodule
git submodule add https://github.com/{org}/{repo}.git skills/{provider-name}
```

## Updating Skills

```bash
# Update all submodules
git submodule update --remote

# Update specific provider
cd skills/anthropic && git pull origin main
```

## Cloning This Repo

```bash
# Clone with submodules
git clone --recursive https://github.com/TeamDay-AI/agents.git

# Or init submodules after clone
git clone https://github.com/TeamDay-AI/agents.git
cd agents
git submodule init
git submodule update
```
