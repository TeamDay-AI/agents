# Installation Guide

Quick guide to install and use the SOC 2 Compliance Agents plugin.

## Prerequisites

- Claude Code installed on your machine
- Git repository initialized in your project
- (Optional) GitHub CLI installed for issue creation
- (Optional) Slack webhook URL for alerts

## Installation Methods

### Method 1: Via HTTPS (Easiest - Available Now)

```bash
# Start Claude Code
claude

# Add TeamDay marketplace via HTTPS
/plugin marketplace add https://teamday.ai/plugins/marketplace.json

# Install the plugin
/plugin install compliance-agents@teamday

# Restart Claude Code
# The plugin is now available!
```

### Method 2: Via GitHub (When Available)

```bash
# Will be available when we publish to GitHub
/plugin marketplace add teamday-ai/compliance-agents

# Install the plugin
/plugin install compliance-agents@teamday
```

### Method 2: Local Installation (for testing/development)

```bash
# Clone or copy the plugin to your project
git clone https://github.com/teamday-ai/compliance-agents .claude-plugins/compliance-agents

# Or if you already have it
cp -r /path/to/compliance-agents .claude-plugins/

# Start Claude Code
claude

# Add local marketplace
/plugin marketplace add ./.claude-plugins

# Install the plugin
/plugin install compliance-agents@local

# Restart Claude Code
```

### Method 3: Team-Wide Installation

Add to your repository's `.claude/settings.json`:

```json
{
  "plugins": {
    "marketplaces": [
      {
        "name": "teamday",
        "source": "teamday-ai/claude-plugins"
      }
    ],
    "installed": [
      {
        "name": "compliance-agents",
        "marketplace": "teamday",
        "autoEnable": true
      }
    ]
  }
}
```

When team members trust the repository folder, the plugin installs automatically.

## Configuration

### 1. Set Environment Variables

Create a `.env` file in your project root:

```bash
# GitHub (for creating issues)
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPO=your-org/your-repo

# Slack (optional, for alerts)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx

# Firebase (if using Firestore for logs)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT=/path/to/service-account.json
```

### 2. Initialize Directory Structure

The plugin will create these directories when first run:

```bash
docs/
├── audit/               # SOC 2 documentation
├── policies/            # Security policies
├── log-monitoring/      # Log Monitor reports
├── security-scans/      # Vulnerability scan reports
├── access-reviews/      # Access review reports
├── dr-drills/          # DR drill reports
└── policy-audits/      # Policy audit reports
```

Or create them manually:

```bash
mkdir -p docs/{audit,policies,log-monitoring,security-scans,access-reviews,dr-drills,policy-audits}
```

### 3. Verify Installation

```bash
# Check that the plugin is installed
/plugin

# You should see "compliance-agents" listed

# Check available commands
/help

# You should see:
# - /compliance-status
# - /run-compliance-check

# Test the plugin
/compliance-status
```

## First Use

### Quick Start

```bash
# Check your current SOC 2 readiness
/compliance-status

# Run all compliance checks
/run-compliance-check
```

### Conversational Use (Recommended)

```
"Claude, show me our compliance status"
"Claude, run a security scan"
"Claude, are we ready for SOC 2?"
"Claude, check the logs for any issues"
```

### Using Individual Skills

```bash
# Run specific agents
claude --skill log-monitor
claude --skill vulnerability-scan
claude --skill policy-audit
```

## Testing

### 1. Test Compliance Status

```bash
/compliance-status
```

Expected output:
- SOC 2 readiness percentage
- List of critical gaps
- Upcoming tasks
- Recent agent activity

### 2. Test Log Monitor

```
"Claude, check the logs for anomalies"
```

Expected output:
- Analysis of recent logs
- Security findings (if any)
- Report generated in `docs/log-monitoring/`

### 3. Test Vulnerability Scanner

```
"Claude, scan for vulnerabilities"
```

Expected output:
- Dependency scan results
- Security rule analysis
- Report in `docs/security-scans/`
- GitHub issues created (if findings)

## Troubleshooting

### Plugin Not Found

```bash
# Check marketplace is added
/plugin marketplace list

# If not listed, add it
/plugin marketplace add teamday-ai/claude-plugins
```

### Commands Not Working

```bash
# Restart Claude Code after installation
# Exit and restart: Ctrl+C then `claude`

# Verify installation
/plugin

# The plugin should show as "Enabled"
```

### Skills Not Available

```bash
# Check if skills are loaded
/skills

# You should see:
# - log-monitor
# - vulnerability-scan
# - access-review
# - dr-drill
# - policy-audit
```

### Environment Variables Not Set

```bash
# Verify .env file exists
cat .env

# Load environment variables
source .env

# Or export manually
export GITHUB_TOKEN=ghp_xxx
```

### Reports Not Generated

```bash
# Check directory exists and is writable
ls -la docs/

# Create if missing
mkdir -p docs/{log-monitoring,security-scans,access-reviews,dr-drills,policy-audits}

# Check permissions
chmod -R u+w docs/
```

### GitHub Issues Not Created

```bash
# Test GitHub CLI
gh auth status

# If not authenticated
gh auth login

# Test issue creation
gh issue create --title "Test" --body "Test" --repo your-org/your-repo
```

## Next Steps

1. **Run your first compliance check**: `/run-compliance-check`
2. **Review the reports**: Check `docs/` directories
3. **Set up automation**: See `DEPLOYMENT.md` for scheduling
4. **Customize for your environment**: Modify skills in `.claude-plugins/compliance-agents/skills/`
5. **Read the docs**: See `README.md` and `docs/audit/AI-NATIVE-COMPLIANCE-GUIDE.md`

## Support

- **Documentation**: See `README.md` and `docs/audit/`
- **Issues**: Report bugs on GitHub
- **Questions**: support@teamday.ai
- **Community**: Join our Discord

## Uninstallation

```bash
# Disable the plugin
/plugin disable compliance-agents@teamday

# Or completely uninstall
/plugin uninstall compliance-agents@teamday

# Remove reports (optional)
rm -rf docs/{log-monitoring,security-scans,access-reviews,dr-drills,policy-audits}
```

---

**Ready to get started?** Run `/compliance-status` to see your current SOC 2 readiness! 🚀
