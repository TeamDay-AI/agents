# TeamDay Agents & Skills Library

Central library for AI agents, skills, and plugins.

## Structure

```
├── skills/              # Skill library (by provider)
│   ├── anthropic/       # git submodule → anthropics/skills
│   │   └── skills/      # pdf, docx, xlsx, pptx, etc.
│   └── teamday/         # Our own skills
│       └── {skill}/
├── agents/              # Standalone agents (copy to .claude/agents/)
└── plugins/             # Claude Code plugins
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
