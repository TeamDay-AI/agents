# TeamDay Agents & Skills Library

Central library for AI agents, skills, and plugins.

## Structure

```
├── skills/          # Standalone skills (copy to .claude/skills/)
├── agents/          # Standalone agents (copy to .claude/agents/)
└── plugins/         # Claude Code plugins (commands + skills + scripts)
```

## Skills

Available skills for document processing, web testing, and development:

| Skill | Description | Source |
|-------|-------------|--------|
| `pdf` | PDF processing - extract text, fill forms, merge/split | anthropics/skills |
| `docx` | Word document creation and manipulation | anthropics/skills |
| `xlsx` | Excel spreadsheet operations | anthropics/skills |
| `pptx` | PowerPoint presentation creation | anthropics/skills |
| `mcp-builder` | Build MCP servers for Claude | anthropics/skills |
| `webapp-testing` | Automated web application testing | anthropics/skills |

## Plugins

Pre-packaged functionality with commands and scripts:

| Plugin | Description |
|--------|-------------|
| `blog-image-generator` | Generate AI images for blog posts |
| `compliance-agents` | SOC 2 compliance automation |

## Usage

### For TeamDay App

Skills and agents are copied to spaces on-demand:
- Skills → `.claude/skills/{skill-name}/`
- Agents → `.claude/agents/{agent-name}.md`

### For Claude Code

```bash
# Add as marketplace
/plugin marketplace add TeamDay-AI/agents

# Install a plugin
/plugin install blog-image-generator@teamday-agents
```

## Adding Skills

1. Create folder in `skills/{skill-name}/`
2. Add `SKILL.md` with frontmatter:
   ```yaml
   ---
   name: skill-name
   description: What this skill does and when to use it
   ---
   ```
3. Add supporting files (scripts/, references/, etc.)

## License

Skills imported from anthropics/skills retain their original licenses.
See individual `LICENSE.txt` files in each skill directory.
